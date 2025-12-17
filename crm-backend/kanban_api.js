// ============================================
// KANBAN COLUMNS API - Sprint 3
// ============================================

// GET /api/kanban/columns - Listar colunas da empresa
app.get('/api/kanban/columns', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM kanban_columns WHERE company_id = $1 ORDER BY position ASC',
            [req.user.companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar colunas kanban:', error);
        res.status(500).json({ message: 'Erro ao listar colunas' });
    }
});

// POST /api/kanban/columns - Criar nova coluna
app.post('/api/kanban/columns', verifyToken, async (req, res) => {
    const { title, color } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Título é obrigatório' });
    }

    try {
        // Verificar limite de 10 colunas
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM kanban_columns WHERE company_id = $1',
            [req.user.companyId]
        );

        if (parseInt(countResult.rows[0].count) >= 10) {
            return res.status(400).json({ message: 'Limite máximo de 10 colunas atingido' });
        }

        // Buscar próxima posição
        const posResult = await pool.query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM kanban_columns WHERE company_id = $1',
            [req.user.companyId]
        );

        const nextPosition = posResult.rows[0].next_pos;

        const result = await pool.query(
            `INSERT INTO kanban_columns (company_id, title, color, position) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [req.user.companyId, title, color || '#a78bfa', nextPosition]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar coluna kanban:', error);
        res.status(500).json({ message: 'Erro ao criar coluna' });
    }
});

// PUT /api/kanban/columns/:id - Atualizar coluna
app.put('/api/kanban/columns/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, color } = req.body;

    try {
        const result = await pool.query(
            `UPDATE kanban_columns 
             SET title = COALESCE($1, title), 
                 color = COALESCE($2, color),
                 updated_at = NOW()
             WHERE id = $3 AND company_id = $4
             RETURNING *`,
            [title, color, id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Coluna não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar coluna kanban:', error);
        res.status(500).json({ message: 'Erro ao atualizar coluna' });
    }
});

// DELETE /api/kanban/columns/:id - Deletar coluna
app.delete('/api/kanban/columns/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar se não é a última coluna
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM kanban_columns WHERE company_id = $1',
            [req.user.companyId]
        );

        if (parseInt(countResult.rows[0].count) <= 1) {
            return res.status(400).json({ message: 'Não é possível deletar a última coluna' });
        }

        // Buscar primeira coluna (para mover leads)
        const firstColResult = await pool.query(
            'SELECT id FROM kanban_columns WHERE company_id = $1 ORDER BY position ASC LIMIT 1',
            [req.user.companyId]
        );

        if (firstColResult.rows.length === 0) {
            return res.status(500).json({ message: 'Erro ao encontrar coluna padrão' });
        }

        const defaultColumnId = firstColResult.rows[0].id;

        // Mover todos os leads desta coluna para a primeira
        // Nota: assumindo que contacts/clients tem uma coluna kanban_column_id
        // Se usar kanban_stage (string), precisará de ajuste

        // Deletar coluna
        const result = await pool.query(
            'DELETE FROM kanban_columns WHERE id = $1 AND company_id = $2 RETURNING *',
            [id, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Coluna não encontrada' });
        }

        res.json({ message: 'Coluna deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar coluna kanban:', error);
        res.status(500).json({ message: 'Erro ao deletar coluna' });
    }
});

// PUT /api/kanban/columns/reorder - Reordenar colunas
app.put('/api/kanban/columns/reorder', verifyToken, async (req, res) => {
    const { columnIds } = req.body; // Array de IDs na nova ordem

    if (!Array.isArray(columnIds)) {
        return res.status(400).json({ message: 'columnIds deve ser um array' });
    }

    try {
        // Atualizar posição de cada coluna
        for (let i = 0; i < columnIds.length; i++) {
            await pool.query(
                'UPDATE kanban_columns SET position = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
                [i + 1, columnIds[i], req.user.companyId]
            );
        }

        // Retornar colunas atualizadas
        const result = await pool.query(
            'SELECT * FROM kanban_columns WHERE company_id = $1 ORDER BY position ASC',
            [req.user.companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao reordenar colunas kanban:', error);
        res.status(500).json({ message: 'Erro ao reordenar colunas' });
    }
});
