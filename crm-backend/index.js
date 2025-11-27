const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { randomUUID } = require('crypto');


const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

pool.connect((err, client, release) => {
    if (err) { return console.error('ERRO CRÍTICO AO CONECTAR COM O BANCO DE DADOS:', err.stack); }
    client.query('SELECT NOW()', async (err, result) => {
        if (err) {
            release();
            return console.error('ERRO CRÍTICO: Erro ao executar query de teste:', err.stack);
        }
        console.log('✅ Conexão com o banco de dados bem-sucedida!');

        // --- INICIALIZAÇÃO DO SCHEMA (NOVAS TABELAS) ---
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS sales (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    client_id UUID,
                    amount DECIMAL(10, 2) NOT NULL,
                    status VARCHAR(50),
                    platform VARCHAR(50),
                    transaction_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS ads_data (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    campaign_name VARCHAR(255),
                    adset_name VARCHAR(255),
                    ad_name VARCHAR(255),
                    spend DECIMAL(10, 2),
                    impressions INT,
                    clicks INT,
                    leads INT,
                    date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                ALTER TABLE clients ADD COLUMN IF NOT EXISTS utms JSONB DEFAULT '{}';
            `);
            console.log('✅ Schema do banco de dados atualizado (Sales, Ads, UTMs).');
        } catch (schemaErr) {
            console.error('Erro ao atualizar schema:', schemaErr);
        }
        release();
    });
});

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) { return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' }); }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) { res.status(403).json({ error: 'Token inválido.' }); }
};

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const query = 'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at';
        const values = [email, password_hash];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro interno ao registrar usuário. O email já pode existir.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: "Login bem-sucedido!",
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.get('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// --- ROTAS DE DASHBOARD & ROI ---
app.get('/api/dashboard/roi', verifyToken, async (req, res) => {
    try {
        // Mock de dados de Ads (enquanto não integra com API do Facebook)
        // Em produção, isso viria da tabela ads_data
        const adsMock = {
            spend_today: 150.00,
            spend_last_7_days: 1200.00,
            campaigns: [
                { id: 1, name: 'Campanha Vendas - Frio', spend: 80.00, leads: 12, clicks: 150 },
                { id: 2, name: 'Remarketing - Checkout', spend: 70.00, leads: 5, clicks: 40 }
            ]
        };

        // Dados Reais de Vendas
        const salesQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_sales_today,
                COUNT(*) as sales_count_today
            FROM sales 
            WHERE user_id = $1 AND created_at::date = CURRENT_DATE AND status = 'approved'
        `;
        const salesResult = await pool.query(salesQuery, [req.user.userId]);
        const salesData = salesResult.rows[0];

        // Dados Reais de Leads
        const leadsQuery = `
            SELECT COUNT(*) as leads_today 
            FROM clients 
            WHERE user_id = $1 AND created_at::date = CURRENT_DATE
        `;
        const leadsResult = await pool.query(leadsQuery, [req.user.userId]);
        const leadsData = leadsResult.rows[0];

        // Cálculo de ROAS
        const revenue = parseFloat(salesData.total_sales_today);
        const spend = adsMock.spend_today;
        const roas = spend > 0 ? (revenue / spend).toFixed(2) : 0;

        res.json({
            sales_today: revenue,
            spend_today: spend,
            roas: roas,
            leads_today: parseInt(leadsData.leads_today),
            ads_data: adsMock
        });
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// --- ROTAS DE TRÁFEGO (ADS) ---
app.get('/api/ads', verifyToken, async (req, res) => {
    try {
        // Mock Data para a tabela de tráfego
        const mockAdsData = [
            { id: 1, campaign: 'Lançamento Agosto - Frio', adset: 'Interesses Marketing', ad: 'Vídeo 01 - Chamada', status: 'active', spend: 450.50, ctr: 2.1, cpc: 1.50, leads: 45, cost_per_lead: 10.00 },
            { id: 2, campaign: 'Lançamento Agosto - Frio', adset: 'Lookalike 1%', ad: 'Imagem Estática - Prova Social', status: 'active', spend: 320.00, ctr: 1.8, cpc: 2.10, leads: 20, cost_per_lead: 16.00 },
            { id: 3, campaign: 'Remarketing - Boleto', adset: 'Boletos 7 dias', ad: 'Lembrete Vencimento', status: 'paused', spend: 100.00, ctr: 3.5, cpc: 0.80, leads: 15, cost_per_lead: 6.66 },
        ];
        res.json(mockAdsData);
    } catch (error) {
        console.error('Erro ao buscar dados de ads:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// --- WEBHOOKS DE VENDAS (Hotmart/Kiwify/etc) ---
app.post('/api/webhooks/sales', async (req, res) => {
    // Exemplo genérico. Na prática, adaptar para o payload de cada plataforma.
    const { transaction_id, status, amount, email, product_name, utm_source, utm_medium, utm_campaign } = req.body;

    // Tenta identificar o usuário dono do produto (simplificado: pegando o primeiro user ou via token na URL se implementado)
    // Para MVP, vamos assumir que o webhook manda um "custom_field" com o user_id ou que só tem 1 usuário no sistema local.
    // Vamos usar um user_id fixo ou buscar pelo email do produtor se vier no payload.
    // AQUI: Vamos pegar o primeiro usuário do banco para teste, ou esperar um parametro ?user_id=X na URL do webhook
    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({ error: 'User ID não fornecido na URL do webhook (?user_id=...)' });
    }

    try {
        // 1. Registrar Venda
        const insertSale = `
            INSERT INTO sales (user_id, amount, status, platform, transaction_id)
            VALUES ($1, $2, $3, 'generic', $4)
            RETURNING id
        `;
        await pool.query(insertSale, [userId, amount || 0, status || 'pending', transaction_id]);

        // 2. Atualizar ou Criar Cliente (Lead)
        if (email) {
            const checkClient = 'SELECT id FROM clients WHERE email = $1 AND user_id = $2';
            const clientRes = await pool.query(checkClient, [email, userId]);

            if (clientRes.rowCount > 0) {
                // Atualiza status para Aluno se aprovado
                if (status === 'approved') {
                    await pool.query("UPDATE clients SET kanban_stage = 'student', status = 'Active' WHERE email = $1 AND user_id = $2", [email, userId]);
                }
            } else {
                // Cria novo cliente
                const insertClient = `
                    INSERT INTO clients (name, email, status, kanban_stage, user_id, utms)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `;
                const utms = { source: utm_source, medium: utm_medium, campaign: utm_campaign };
                const newStatus = status === 'approved' ? 'Active' : 'Lead';
                const newStage = status === 'approved' ? 'student' : 'new_lead';
                await pool.query(insertClient, [email.split('@')[0], email, newStatus, newStage, userId, utms]);
            }
        }

        res.status(200).json({ message: 'Webhook processado com sucesso.' });
    } catch (error) {
        console.error('Erro ao processar webhook de vendas:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});


// --- ROTAS DE CLIENTES ---
app.get('/api/clients', verifyToken, async (req, res) => {
    const { search } = req.query;
    try {
        const query = search
            ? 'SELECT * FROM clients WHERE user_id = $1 AND (name ILIKE $2 OR email ILIKE $2) ORDER BY created_at DESC'
            : 'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC';
        const values = search ? [req.user.userId, `%${search}%`] : [req.user.userId];
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/clients', verifyToken, async (req, res) => {
    const { name, email, phone, value, status, segment, kanban_stage, temperature } = req.body;
    try {
        const query = `
            INSERT INTO clients 
            (name, email, phone, value, status, segment, kanban_stage, temperature, user_id, utms) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`;
        const values = [
            name, email || null, phone || null, value || 0,
            status || 'Lead', segment || null, kanban_stage || 'new_lead',
            temperature || 'cold', req.user.userId, req.body.utms || {}
        ];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro interno ao criar cliente.' });
    }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, value, status, segment, kanban_stage, temperature } = req.body;
    try {
        const query = `
            UPDATE clients 
            SET name = $1, email = $2, phone = $3, value = $4, status = $5, segment = $6, kanban_stage = $7, temperature = $8
            WHERE id = $9 AND user_id = $10 RETURNING *`;
        const values = [name, email, phone, value, status, segment, kanban_stage, temperature, id, req.user.userId];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a você.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar cliente.' });
    }
});

app.delete('/api/clients/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não autorizado.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/clients/import', verifyToken, async (req, res) => {
    const { clients } = req.body;
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: 'Nenhum cliente para importar.' });
    }
    let clientsAdded = 0;
    let clientsSkipped = 0;
    const dbClient = await pool.connect();
    try {
        await dbClient.query('BEGIN');
        for (const c of clients) {
            if (!c.email || c.email.trim() === '') {
                clientsSkipped++;
                continue;
            }
            const checkQuery = 'SELECT id FROM clients WHERE email = $1 AND user_id = $2';
            const checkResult = await dbClient.query(checkQuery, [c.email, req.user.userId]);
            if (checkResult.rowCount > 0) {
                clientsSkipped++;
            } else {
                const insertQuery = 'INSERT INTO clients (name, email, phone, platform, status, value, kanban_stage, temperature, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
                const values = [c.name, c.email, c.phone, c.platform, c.status, c.value, c.kanban_stage, c.temperature, req.user.userId];
                await dbClient.query(insertQuery, values);
                clientsAdded++;
            }
        }
        await dbClient.query('COMMIT');
        res.status(201).json({
            message: `Importação concluída! ${clientsAdded} clientes adicionados, ${clientsSkipped} ignorados (já existiam ou sem email).`
        });
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Erro ao importar clientes:', error);
        res.status(500).json({ error: 'Erro interno ao importar clientes.' });
    } finally {
        dbClient.release();
    }
});

app.patch('/api/clients/:id/stage', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { kanban_stage } = req.body;
    if (!kanban_stage) {
        return res.status(400).json({ error: 'A etapa do kanban é obrigatória.' });
    }
    try {
        const query = 'UPDATE clients SET kanban_stage = $1 WHERE id = $2 AND user_id = $3 RETURNING *';
        const values = [kanban_stage, id, req.user.userId];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não autorizado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar etapa do Kanban:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// --- ROTAS DE AGENDAMENTOS (CALENDÁRIO) ---
app.get('/api/appointments', verifyToken, async (req, res) => {
    try {
        const query = 'SELECT * FROM appointments WHERE user_id = $1 ORDER BY start_time ASC';
        const result = await pool.query(query, [req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/appointments', verifyToken, async (req, res) => {
    const { title, description, start_time, end_time, status } = req.body;
    if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: 'Título, data de início e data de fim são obrigatórios.' });
    }
    try {
        const query = `
            INSERT INTO appointments (title, description, start_time, end_time, status, user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`;
        const values = [title, description, start_time, end_time, status || 'confirmed', req.user.userId];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro interno ao criar agendamento.' });
    }
});

app.put('/api/appointments/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time } = req.body;
    try {
        const query = `
            UPDATE appointments 
            SET title = $1, description = $2, start_time = $3, end_time = $4
            WHERE id = $5 AND user_id = $6 RETURNING *`;
        const values = [title, description, start_time, end_time, id, req.user.userId];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado ou não autorizado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar agendamento.' });
    }
});

app.delete('/api/appointments/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM appointments WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado ou não autorizado.' });
        }
        res.status(200).json({ message: 'Agendamento deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar agendamento:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// --- ROTAS DE CHAT DE EQUIPE ---
app.get('/api/team-chat/messages', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT tm.*, u.email as "senderEmail"
            FROM team_messages tm
            JOIN users u ON tm.user_id = u.id
            ORDER BY tm.created_at ASC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar mensagens do chat:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/team-chat/messages', verifyToken, async (req, res) => {
    const { content } = req.body;
    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'O conteúdo da mensagem não pode ser vazio.' });
    }
    try {
        const query = `
            INSERT INTO team_messages (content, user_id)
            VALUES ($1, $2)
            RETURNING *`;
        const values = [content, req.user.userId];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro interno ao enviar mensagem.' });
    }
});


// --- ROTAS DE AGENTES DE IA ---
app.get('/api/ai-agents', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ai_agents WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agentes:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// --- ROTAS DE INTEGRAÇÃO WHATSAPP ---
const createEvolutionAPI = () => axios.create({
    baseURL: process.env.EVOLUTION_API_URL,
    headers: { 'apikey': process.env.EVOLUTION_API_KEY }
});

app.get('/api/whatsapp/instances', verifyToken, async (req, res) => {
    try {
        const query = 'SELECT * FROM whatsapp_instances WHERE user_id = $1 ORDER BY created_at ASC';
        const result = await pool.query(query, [req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar instâncias do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/whatsapp/instances', verifyToken, async (req, res) => {
    const { displayName } = req.body;
    if (!displayName || displayName.trim() === '') {
        return res.status(400).json({ error: 'O nome da conta é obrigatório.' });
    }
    try {
        const instance_name = `crm_${req.user.userId.toString().slice(0, 8)}_${Date.now()}`;
        const query = `
            INSERT INTO whatsapp_instances (display_name, instance_name, status, user_id)
            VALUES ($1, $2, 'disconnected', $3)
            RETURNING *`;
        const values = [displayName, instance_name, req.user.userId];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar instância do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno ao criar instância.' });
    }
});

app.delete('/api/whatsapp/instances/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM whatsapp_instances WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Instância não encontrada ou não autorizada.' });
        }
        res.status(200).json({ message: 'Instância deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar instância do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/whatsapp/instances/:id/sync-status', verifyToken, async (req, res) => {
    const { id } = req.params;
    const evolutionAPI = createEvolutionAPI();
    try {
        const instanceResult = await pool.query("SELECT instance_name FROM whatsapp_instances WHERE id = $1 AND user_id = $2", [id, req.user.userId]);
        const instanceName = instanceResult.rows[0]?.instance_name;
        if (!instanceName) return res.status(404).json({ error: 'Instância não encontrada.' });

        await pool.query("UPDATE whatsapp_instances SET status = 'connected' WHERE id = $1", [id]);

        const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:3001/api/webhooks/evolution`;
        const webhookPayload = {
            url: webhookUrl,
            enabled: true,
            webhook_by_events: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
            headers: {
                "x-webhook-secret": process.env.EVOLUTION_WEBHOOK_SECRET
            }
        };

        await evolutionAPI.post(`/webhook/set/${instanceName}`, webhookPayload);

        res.status(200).json({ message: 'Status sincronizado e webhook configurado.' });
    } catch (error) {
        console.error("Erro ao sincronizar status e configurar webhook:", error.response?.data || error.message);
        res.status(500).json({ error: 'Erro ao sincronizar status.' });
    }
});

app.post('/api/whatsapp/session', verifyToken, async (req, res) => {
    const { action, instanceName } = req.body;
    const evolutionAPI = axios.create({
        baseURL: process.env.EVOLUTION_API_URL,
        headers: {
            'apikey': process.env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 60000 // Aumentado para 60 segundos devido à lentidão da rede
    });
    try {
        let response;
        switch (action) {
            case 'generate_qr':
                try {
                    // WORKAROUND: Deleta a instância antes de criar para evitar o loop infinito
                    // Referência: https://github.com/EvolutionAPI/evolution-api/issues
                    try {
                        await evolutionAPI.delete(`/instance/delete/${instanceName}`);
                        console.log(`Instância ${instanceName} deletada (cleanup antes de criar)`);
                        // Aguarda 2 segundos para garantir que a instância foi removida
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (deleteError) {
                        // Ignora erro se a instância não existir
                        console.log(`Instância ${instanceName} não existia ou já foi deletada`);
                    }

                    const createResponse = await evolutionAPI.post(`/instance/create`, {
                        instanceName,
                        token: "",
                        qrcode: true,
                        integration: "WHATSAPP-BAILEYS",
                        webhook: {
                            url: process.env.WEBHOOK_URL || "http://172.17.0.1:3001/api/webhooks/evolution",
                            byEvents: false,
                            base64: true,
                            headers: {
                                "x-webhook-secret": process.env.EVOLUTION_WEBHOOK_SECRET
                            },
                            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
                        }
                    });

                    // Se a criação retornar o QR Code, usamos ele diretamente
                    if (createResponse.data && (createResponse.data.qrcode?.base64 || createResponse.data.base64)) {
                        response = createResponse;
                        console.log('QR Code obtido na criação da instância.');
                    } else {
                        console.log('QR Code não veio na criação. Verificando estratégia de conexão...');

                        // ESTRATÉGIA HÍBRIDA: QR Code (Polling) ou Pairing Code

                        // Se veio um número de telefone no request, tentamos Pairing Code
                        if (req.body.number) {
                            console.log(`Tentando gerar Pairing Code para o número: ${req.body.number}`);
                            try {
                                // Pequeno delay para garantir que a instância subiu
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                const pairingResponse = await evolutionAPI.get(`/instance/connect/${instanceName}?number=${req.body.number}`);
                                if (pairingResponse.data && pairingResponse.data.pairingCode) {
                                    console.log('Pairing Code gerado com sucesso:', pairingResponse.data.pairingCode);
                                    response = {
                                        data: {
                                            pairingCode: pairingResponse.data.pairingCode,
                                            code: pairingResponse.data.code,
                                            count: pairingResponse.data.count
                                        }
                                    };
                                } else {
                                    console.log('Falha ao gerar Pairing Code:', pairingResponse.data);
                                    throw new Error('Pairing Code não retornado pela API');
                                }
                            } catch (pairingError) {
                                console.error('Erro ao solicitar Pairing Code:', pairingError.message);
                                // Não falha aqui, deixa cair no polling de QR como fallback (embora improvável funcionar se for v2.3)
                            }
                        }

                        // Se não conseguiu Pairing Code (ou não tinha número), tenta Polling de QR Code
                        if (!response || !response.data?.pairingCode) {
                            console.log('Iniciando polling ativo para QR Code...');
                            let attempts = 0;
                            const maxAttempts = 15; // 15 segundos (15 x 1s)

                            while (attempts < maxAttempts) {
                                try {
                                    // Primeiro: verifica o cache do webhook (se chegou)
                                    if (qrCodeCache[instanceName]) {
                                        console.log(`[Tentativa ${attempts + 1}] QR Code encontrado no cache webhook!`);
                                        response = {
                                            data: {
                                                qrcode: {
                                                    base64: qrCodeCache[instanceName]
                                                }
                                            }
                                        };
                                        break;
                                    }

                                    // Segundo: tenta buscar diretamente do endpoint de estado
                                    const stateResponse = await evolutionAPI.get(`/instance/connectionState/${instanceName}`);
                                    if (stateResponse.data?.qrcode?.code || stateResponse.data?.qr || stateResponse.data?.base64) {
                                        console.log(`[Tentativa ${attempts + 1}] QR Code encontrado via connectionState!`);
                                        response = { data: { qrcode: { base64: stateResponse.data.qrcode?.code || stateResponse.data.qr || stateResponse.data.base64 } } };
                                        break;
                                    }

                                    console.log(`[Tentativa ${attempts + 1}/${maxAttempts}] QR Code ainda não disponível. Aguardando...`);
                                } catch (pollError) {
                                    console.log(`[Tentativa ${attempts + 1}] Erro ao buscar QR: ${pollError.message}`);
                                }

                                await new Promise(resolve => setTimeout(resolve, 1000));
                                attempts++;
                            }

                            // Fallback final: tenta /instance/connect (apenas se não for pairing code)
                            if (!response || (!response.data?.qrcode?.base64 && !response.data?.pairingCode)) {
                                console.log('Fallback final: chamando /instance/connect...');
                                try {
                                    const fallbackResponse = await evolutionAPI.get(`/instance/connect/${instanceName}`);
                                    // Se o fallback retornar pairing code (algumas versões retornam aqui)
                                    if (fallbackResponse.data?.pairingCode) {
                                        response = fallbackResponse;
                                    } else {
                                        response = fallbackResponse;
                                    }
                                }
                                catch (fallbackError) {
                                    console.log('Fallback /connect também falhou:', fallbackError.message);
                                }
                            }
                        }
                    }
                } catch (error) {
                    if (error.response?.data?.error === 'Forbidden' || error.response?.data?.response?.message?.[0]?.includes('already in use')) {
                        console.log(`Instância ${instanceName} já existe. Atualizando webhook...`);
                        await evolutionAPI.post(`/webhook/set/${instanceName}`, {
                            webhook: {
                                url: process.env.WEBHOOK_URL || "http://172.17.0.1:3001/api/webhooks/evolution",
                                enabled: true,
                                byEvents: false,
                                base64: true,
                                headers: {
                                    "x-webhook-secret": process.env.EVOLUTION_WEBHOOK_SECRET
                                },
                                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
                            }
                        });

                        // Se já existe, verifica cache ou tenta conectar
                        if (qrCodeCache[instanceName]) {
                            response = { data: { qrcode: { base64: qrCodeCache[instanceName] } } };
                        } else {
                            response = await evolutionAPI.get(`/instance/connect/${instanceName}`);
                        }
                    } else {
                        throw error;
                    }
                }

                console.log('--- DEBUG QR CODE GENERATION ---');
                console.log('Instance:', instanceName);
                if (response?.data) {
                    // console.log('Response Data:', JSON.stringify(response.data, null, 2));
                }
                break;
            case 'status':
                response = await evolutionAPI.get(`/instance/connectionState/${instanceName}`);
                // Se tivermos QR code em cache e o status for connecting/qr, injetamos na resposta
                if (qrCodeCache[instanceName] && (!response.data?.instance?.state || response.data.instance.state === 'connecting' || response.data.instance.state === 'qr')) {
                    if (!response.data) response.data = {};
                    if (!response.data.instance) response.data.instance = {};
                    // Injeta como qrcode.base64 para o frontend pegar
                    response.data.qrcode = { base64: qrCodeCache[instanceName] };
                }
                break;
            case 'logout':
                response = await evolutionAPI.delete(`/instance/logout/${instanceName}`);
                await pool.query("UPDATE whatsapp_instances SET status = 'disconnected' WHERE instance_name = $1 AND user_id = $2", [instanceName, req.user.userId]);
                break;
            default:
                return res.status(400).json({ error: 'Ação desconhecida.' });
        }
        res.json(response.data);
    } catch (error) {
        console.error(`Erro na ação '${action}' da Evolution API:`, error.response?.data || error.message);
        res.status(500).json({
            error: 'Falha na comunicação com a API do WhatsApp.',
            details: error.response ? error.response.data : error.message
        });
    }
});

// --- ROTAS DE ATENDIMENTO (WHATSAPP) ---
app.get('/api/whatsapp/chats', verifyToken, async (req, res) => {
    const { instanceName } = req.query;
    if (!instanceName) return res.status(400).json({ error: "Nome da instância é obrigatório" });
    try {
        const query = `
            SELECT * FROM whatsapp_chats 
            WHERE user_id = $1 AND instance_name = $2
            ORDER BY updated_at DESC`;
        const result = await pool.query(query, [req.user.userId, instanceName]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar chats do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.get('/api/whatsapp/messages', verifyToken, async (req, res) => {
    const { instanceName, chat_jid } = req.query; // Corrigido para query params
    try {
        const query = `
            SELECT * FROM whatsapp_messages
            WHERE user_id = $1 AND instance_name = $2 AND chat_jid = $3
            ORDER BY timestamp ASC`;
        const result = await pool.query(query, [req.user.userId, instanceName, chat_jid]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar mensagens do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/whatsapp/send-message', verifyToken, async (req, res) => {
    const { instanceName, to, text } = req.body;
    const evolutionAPI = createEvolutionAPI();
    try {
        const number = to.split('@')[0];
        await evolutionAPI.post(`/message/sendText/${instanceName}`, { number, textMessage: { text } });
        res.status(200).json({ message: 'Mensagem enviada.' });
    } catch (error) {
        console.error('Erro ao enviar mensagem via Evolution API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao enviar mensagem.' });
    }
});

app.patch('/api/whatsapp/chats/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }
    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    try {
        const query = `UPDATE whatsapp_chats SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`;
        const result = await pool.query(query, [...values, id, req.user.userId]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar chat:', error);
        res.status(500).json({ error: 'Erro ao atualizar chat.' });
    }
});

app.patch('/api/whatsapp/chats/:id/read', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("UPDATE whatsapp_chats SET unread_count = 0 WHERE id = $1 AND user_id = $2", [id, req.user.userId]);
        res.status(200).json({ message: 'Chat marcado como lido.' });
    } catch (error) {
        console.error('Erro ao marcar chat como lido:', error);
        res.status(500).json({ error: 'Erro ao marcar chat.' });
    }
});


// --- ROTA DE WEBHOOK PARA WHATSAPP (VERSÃO CORRIGIDA E MAIS ROBUSTA) ---

// Função helper para extrair o texto da mensagem, baseada na sua função do Supabase
function pickText(m) {
    try {
        return m?.message?.conversation || m?.message?.extendedTextMessage?.text ||
            m?.message?.ephemeralMessage?.message?.conversation ||
            m?.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
            m?.message?.imageMessage?.caption || m?.message?.videoMessage?.caption ||
            m?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
            m?.body || m?.text || "";
    } catch {
        return "";
    }
}

// Cache simples em memória para QRs
const qrCodeCache = {};

app.post('/api/webhooks/evolution', async (req, res) => {
    const webhookData = req.body;
    const instance = webhookData?.instance;
    const token = req.headers['x-webhook-secret'];

    if (process.env.EVOLUTION_WEBHOOK_SECRET && token !== process.env.EVOLUTION_WEBHOOK_SECRET) {
        console.warn(`Webhook recebido com token inválido para instância ${instance}`);
        return res.status(401).send('Unauthorized');
    }

    console.log(`--- WEBHOOK RECEBIDO (${webhookData.event}) PARA INSTÂNCIA: ${instance} ---`);
    // console.log('DADOS COMPLETOS:', JSON.stringify(webhookData, null, 2)); // Comentado para reduzir log

    if (webhookData.event === 'qrcode.updated') {
        const { qrcode } = webhookData.data;
        if (qrcode && qrcode.base64) {
            qrCodeCache[instance] = qrcode.base64;
            console.log(`QR Code recebido e cacheado para instância ${instance}`);
        }
    }

    if (webhookData.event === 'connection.update') {
        const { state } = webhookData.data;
        const status = state === 'open' ? 'connected' : (state === 'close' ? 'disconnected' : 'qr');

        // Limpa cache se conectar ou desconectar
        if (status === 'connected' || status === 'disconnected') {
            delete qrCodeCache[instance];
        }

        const dbClient = await pool.connect();
        try {
            await dbClient.query('BEGIN');
            await dbClient.query('UPDATE whatsapp_instances SET status = $1 WHERE instance_name = $2', [status, instance]);
            await dbClient.query('COMMIT');
            console.log(`Status da instância ${instance} atualizado para: ${status}`);
        } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error('ERRO AO ATUALIZAR STATUS VIA WEBHOOK:', error);
        } finally {
            dbClient.release();
        }
    } else if (webhookData.event === 'messages.upsert' && webhookData.data?.key?.fromMe === false) {
        const messageData = webhookData.data;
        const dbClient = await pool.connect();
        try {
            const instanceResult = await dbClient.query('SELECT user_id FROM whatsapp_instances WHERE instance_name = $1', [instance]);
            const userId = instanceResult.rows[0]?.user_id;
            if (!userId) {
                console.error(`Webhook ignorado: Instância "${instance}" não encontrada.`);
                return res.status(200).send('OK. Instance not found.');
            }

            const chat_jid = messageData.key.remoteJid;
            const contact_name = messageData.pushName || `Contato ${chat_jid.split('@')[0]}`;
            const text = pickText(messageData); // Usando a função helper
            const message_id = messageData.key.id || randomUUID();
            const timestamp = messageData.messageTimestamp;

            await dbClient.query('BEGIN');

            const upsertChatQuery = `
                INSERT INTO whatsapp_chats (user_id, instance_name, jid, title, unread_count, last_message, updated_at)
                VALUES ($1, $2, $3, $4, 1, $5, NOW())
                ON CONFLICT (user_id, instance_name, jid) 
                DO UPDATE SET 
                    unread_count = whatsapp_chats.unread_count + 1,
                    last_message = EXCLUDED.last_message,
                    title = EXCLUDED.title,
                    updated_at = NOW();
            `;
            await dbClient.query(upsertChatQuery, [userId, instance, chat_jid, contact_name, text]);

            const insertMessageQuery = `
                INSERT INTO whatsapp_messages (user_id, instance_name, chat_jid, message_id, from_me, text, timestamp, raw)
                VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), $8)`;
            await dbClient.query(insertMessageQuery, [
                userId, instance, chat_jid, message_id,
                false, text, timestamp, webhookData
            ]);

            await dbClient.query('COMMIT');
            console.log(`Mensagem de ${contact_name} salva com sucesso para o usuário ${userId}`);

        } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error('ERRO AO PROCESSAR WEBHOOK:', error);
        } finally {
            dbClient.release();
        }
    }
    res.status(200).send('OK');
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});