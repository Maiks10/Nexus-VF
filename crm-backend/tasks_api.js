// ============================================
// TASKS LISTS API - Sprint 5
// ============================================

// GET /api/tasks/lists - Listar listas de tarefas da empresa
app.get('/api/tasks/lists', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM task_lists WHERE company_id = $1 ORDER BY position ASC',
            [req.user.companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar task lists:', error);
        res.status(500).json({ message: 'Erro ao listar listas' });
    }
});

// POST /api/tasks/lists - Criar nova lista
app.post('/api/tasks/lists', verifyToken, async (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Título é obrigatório' });
    }

    try {
        // Buscar próxima posição
        const posResult = await pool.query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM task_lists WHERE company_id = $1',
            [req.user.companyId]
        );

        const nextPosition = posResult.rows[0].next_pos;

        const result = await pool.query(
            `INSERT INTO task_lists (company_id, title, position) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [req.user.companyId, title, nextPosition]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar task list:', error);
        res.status(500).json({ message: 'Erro ao criar lista' });
    }
});

// PUT /api/tasks/lists/:id - Atualizar lista
app.put('/api/tasks/lists/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;

    try {
        const result = await pool.query(
            `UPDATE task_lists 
             SET title = $1
             WHERE id = $2 AND company_id = $3
             RETURNING *`,
            [title, id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar task list:', error);
        res.status(500).json({ message: 'Erro ao atualizar lista' });
    }
});

// DELETE /api/tasks/lists/:id - Deletar lista (e todas as tasks)
app.delete('/api/tasks/lists/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM task_lists WHERE id = $1 AND company_id = $2 RETURNING *',
            [id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }

        res.json({ message: 'Lista deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar task list:', error);
        res.status(500).json({ message: 'Erro ao deletar lista' });
    }
});

// PUT /api/tasks/lists/reorder - Reordenar listas
app.put('/api/tasks/lists/reorder', verifyToken, async (req, res) => {
    const { listIds } = req.body;

    if (!Array.isArray(listIds)) {
        return res.status(400).json({ message: 'listIds deve ser um array' });
    }

    try {
        for (let i = 0; i < listIds.length; i++) {
            await pool.query(
                'UPDATE task_lists SET position = $1 WHERE id = $2 AND company_id = $3',
                [i + 1, listIds[i], req.user.companyId]
            );
        }

        const result = await pool.query(
            'SELECT * FROM task_lists WHERE company_id = $1 ORDER BY position ASC',
            [req.user.companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao reordenar task lists:', error);
        res.status(500).json({ message: 'Erro ao reordenar listas' });
    }
});

// ============================================
// TASKS API
// ============================================

// GET /api/tasks - Listar todas as tarefas da empresa (com filtros opcionais)
app.get('/api/tasks', verifyToken, async (req, res) => {
    const { list_id, assigned_to, completed } = req.query;

    try {
        let query = `
            SELECT t.*, 
                   u1.name as assigned_to_name,
                   u2.name as created_by_name,
                   tl.title as list_title
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.created_by = u2.id
            LEFT JOIN task_lists tl ON t.list_id = tl.id
            WHERE t.company_id = $1
        `;

        const params = [req.user.companyId];
        let paramIndex = 2;

        if (list_id) {
            query += ` AND t.list_id = $${paramIndex}`;
            params.push(list_id);
            paramIndex++;
        }

        if (assigned_to) {
            query += ` AND t.assigned_to = $${paramIndex}`;
            params.push(assigned_to);
            paramIndex++;
        }

        if (completed !== undefined) {
            query += ` AND t.completed = $${paramIndex}`;
            params.push(completed === 'true');
            paramIndex++;
        }

        query += ' ORDER BY t.position ASC, t.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar tasks:', error);
        res.status(500).json({ message: 'Erro ao listar tarefas' });
    }
});

// POST /api/tasks - Criar nova tarefa
app.post('/api/tasks', verifyToken, async (req, res) => {
    const { list_id, title, description, assigned_to, priority, deadline } = req.body;

    if (!list_id || !title) {
        return res.status(400).json({ message: 'list_id e title são obrigatórios' });
    }

    try {
        // Verificar se a lista pertence à empresa
        const listCheck = await pool.query(
            'SELECT id FROM task_lists WHERE id = $1 AND company_id = $2',
            [list_id, req.user.companyId]
        );

        if (listCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }

        // Buscar próxima posição na lista
        const posResult = await pool.query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM tasks WHERE list_id = $1',
            [list_id]
        );

        const nextPosition = posResult.rows[0].next_pos;

        const result = await pool.query(
            `INSERT INTO tasks (company_id, list_id, title, description, assigned_to, created_by, priority, deadline, position) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [req.user.companyId, list_id, title, description, assigned_to, req.user.userId, priority || 'medium', deadline, nextPosition]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar task:', error);
        res.status(500).json({ message: 'Erro ao criar tarefa' });
    }
});

// PUT /api/tasks/:id - Atualizar tarefa
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, assigned_to, priority, deadline, completed } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tasks 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 assigned_to = COALESCE($3, assigned_to),
                 priority = COALESCE($4, priority),
                 deadline = COALESCE($5, deadline),
                 completed = COALESCE($6, completed),
                 completed_at = CASE WHEN $6 = true THEN NOW() ELSE completed_at END,
                 updated_at = NOW()
             WHERE id = $7 AND company_id = $8
             RETURNING *`,
            [title, description, assigned_to, priority, deadline, completed, id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tarefa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar task:', error);
        res.status(500).json({ message: 'Erro ao atualizar tarefa' });
    }
});

// PATCH /api/tasks/:id/move - Mover tarefa entre listas (drag & drop)
app.patch('/api/tasks/:id/move', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { list_id, position } = req.body;

    if (!list_id || position === undefined) {
        return res.status(400).json({ message: 'list_id e position são obrigatórios' });
    }

    try {
        const result = await pool.query(
            `UPDATE tasks 
             SET list_id = $1, position = $2, updated_at = NOW()
             WHERE id = $3 AND company_id = $4
             RETURNING *`,
            [list_id, position, id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tarefa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao mover task:', error);
        res.status(500).json({ message: 'Erro ao mover tarefa' });
    }
});

// DELETE /api/tasks/:id - Deletar tarefa
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND company_id = $2 RETURNING *',
            [id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tarefa não encontrada' });
        }

        res.json({ message: 'Tarefa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar task:', error);
        res.status(500).json({ message: 'Erro ao deletar tarefa' });
    }
});
