const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { randomUUID } = require('crypto');
const multer = require('multer');
const FormData = require('form-data');
const { sendEvolutionTextMessage, sendEvolutionMediaMessage } = require('./evolutionHelpers');
const FunnelEngine = require('./FunnelEngine');
const FunnelScheduler = require('./FunnelScheduler');

// Config multer para armazenar em memória
const upload = multer({ storage: multer.memoryStorage() });


const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

// Inicializar Funnel Scheduler
const funnelScheduler = new FunnelScheduler(pool);
funnelScheduler.start();

pool.connect((err, client, release) => {
    if (err) { return console.error('ERRO CRÍTICO AO CONECTAR COM O BANCO DE DADOS:', err.stack); }
    client.query('SELECT NOW()', async (err, result) => {
        if (err) {
            release();
            return console.error('ERRO CRÍTICO: Erro ao executar query de teste:', err.stack);
        }
        console.log('✅ Conexão com o banco de dados bem-sucedida!');

        // --- INICIALIZAÇÃO DO SCHEMA (NOVAS TABELAS) ---
        // COMENTADO: Schema aplicado manualmente via schema_completo.sql
        /*
        try {
            await client.query(`
                -- ============================================
                -- MULTI-USER SYSTEM - Companies & Users
                -- ============================================
                
                -- Tabela de Empresas (identificadas por CNPJ/CPF)
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    document VARCHAR(18) UNIQUE NOT NULL, -- CNPJ ou CPF (com formatação)
                    document_type VARCHAR(4) NOT NULL CHECK (document_type IN ('CPF', 'CNPJ')),
                    plan VARCHAR(50) DEFAULT 'basic',
                    max_users INT DEFAULT 4, -- 1 admin + 3 sub-users
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_companies_document ON companies(document);
        
                -- Tabela de Usuários (refatorada para multi-user)
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
                    permissions JSONB DEFAULT '{"all": true}',
                    is_active BOOLEAN DEFAULT true,
                    invited_by INT REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        
                -- ============================================
                -- EXISTING TABLES - Adding company_id column
                -- ============================================
                
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
                ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
                
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
                ALTER TABLE ads_data ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_ads_data_company ON ads_data(company_id);
                
                -- ALTER TABLE clients ADD COLUMN IF NOT EXISTS utms JSONB DEFAULT '{}'; -- Comentado: tabela clients não existe
                
                -- WhatsApp Instances (Evolution API)
                CREATE TABLE IF NOT EXISTS whatsapp_instances (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL,
                    display_name VARCHAR(255),
                    instance_name VARCHAR(255) UNIQUE NOT NULL,
                    instance_uuid VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'disconnected',
                    token VARCHAR(255),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON whatsapp_instances(company_id);
                
                -- Adiciona colunas se não existirem (para upgrade)
                ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS token VARCHAR(255);
                ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS instance_uuid VARCHAR(255);
                ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS avatar_url TEXT; 
                
                -- FORCE ADD COLUMNS FOR AI (Robust check)
                DO $$ 
                BEGIN 
                    BEGIN
                        ALTER TABLE whatsapp_chats ADD COLUMN is_ai_active BOOLEAN DEFAULT FALSE;
                    EXCEPTION
                        WHEN duplicate_column THEN NULL;
                    END;
                    BEGIN
                        ALTER TABLE whatsapp_chats ADD COLUMN ai_agent_id UUID;
                    EXCEPTION
                        WHEN duplicate_column THEN NULL;
                    END;
                END $$; 
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(50);
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_mimetype VARCHAR(100);
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS caption TEXT;
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
                
                -- Adiciona colunas novas para contacts (fonte e termômetro)
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS temperature VARCHAR(20) DEFAULT 'cold';
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
        
        
                -- Tabela de Chats (Ajustada para bater com INSERT)
                CREATE TABLE IF NOT EXISTS whatsapp_chats (
                    id SERIAL PRIMARY KEY,
                    user_id INT, -- Adicionado para vínculo
                    instance_name VARCHAR(255),
                    jid VARCHAR(255),
                    title VARCHAR(255), -- name -> title
                    image_url TEXT,
                    unread_count INT DEFAULT 0,
                    last_message TEXT, -- Adicionado para preview
                    last_message_time TIMESTAMP,
                    is_group BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, instance_name, jid)
                );
                ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_company ON whatsapp_chats(company_id);
        
                -- Tabela de Mensagens (Ajustada para bater com INSERT)
                CREATE TABLE IF NOT EXISTS whatsapp_messages (
                    id SERIAL PRIMARY KEY,
                    user_id INT, -- Adicionado
                    instance_name VARCHAR(255),
                    message_id VARCHAR(255),
                    chat_jid VARCHAR(255),
                    sender_jid VARCHAR(255),
                    text TEXT, -- content -> text
                    media_url TEXT,
                    media_type VARCHAR(50),
                    status VARCHAR(50),
                    from_me BOOLEAN DEFAULT FALSE,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    raw JSONB, -- Adicionado para debug/payload completo
                    created_at TIMESTAMP DEFAULT NOW()
                );
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);
                
                -- Adiciona coluna status para read receipts (WhatsApp style)
                ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';
                
                -- CORRIGIR: Dropar constraint antiga se existir e recriar
                DO $$
                BEGIN
                    -- Remove constraint antiga se existir
                    ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_name_message_id_key;
                    -- Cria nova constraint
                    ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_unique_msg UNIQUE(instance_name, message_id);
                EXCEPTION
                    WHEN duplicate_table THEN NULL;
                    WHEN others THEN NULL;
                END $$;
                
                -- Meta API (WhatsApp Cloud, Facebook, Instagram)
                CREATE TABLE IF NOT EXISTS meta_connections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    page_id TEXT,
                    page_name TEXT,
                    page_access_token TEXT,
                    instagram_account_id TEXT,
                    whatsapp_phone_number_id TEXT,
                    platform TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_meta_connections_company ON meta_connections(company_id);
                
                CREATE TABLE IF NOT EXISTS unified_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    connection_id UUID,
                    platform TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    sender_name TEXT,
                    message_id TEXT,
                    message_type TEXT DEFAULT 'text',
                    content TEXT,
                    media_url TEXT,
                    direction TEXT NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    raw JSONB
                );
                ALTER TABLE unified_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_unified_messages_company ON unified_messages(company_id);
        
                -- Tabela de Automações (Social)
                CREATE TABLE IF NOT EXISTS automations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    config JSONB NOT NULL, -- { post_scope, post_id, condition, keywords }
                    action JSONB NOT NULL, -- { type, config: { reply_message, ai_agent_id } }
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
        
                -- CORREÇÃO: Garantir que as colunas existam se a tabela já foi criada anteriormente
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS user_id INT;
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS config JSONB;
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS action JSONB;
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
                ALTER TABLE automations ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);
        
                -- AI AGENTS UPDATES
                CREATE TABLE IF NOT EXISTS ai_agents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    provider VARCHAR(50) DEFAULT 'OpenAI',
                    prompt TEXT,
                    api_key VARCHAR(255),
                    custom_agent_id VARCHAR(255),
                    knowledge_base_url TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    config JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
                ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'OpenAI';
                ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS knowledge_base_url TEXT;
                ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON ai_agents(company_id);
        
                -- ============================================
                -- FUNNEL BUILDER SYSTEM - COMPLETE AUTOMATION
                -- ============================================
                
                -- Tabela principal de Funis
                CREATE TABLE IF NOT EXISTS funnels (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    config JSONB NOT NULL DEFAULT '{"nodes": [], "connections": []}',
                    stats JSONB DEFAULT '{"total_executions": 0, "completed": 0, "active": 0, "failed": 0}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                ALTER TABLE funnels ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
                CREATE INDEX IF NOT EXISTS idx_funnels_company ON funnels(company_id);
        
                -- Tabela de Execuções de Funil (Tracking em tempo real)
                CREATE TABLE IF NOT EXISTS funnel_executions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
                    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
                    current_node_id VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused', 'waiting'
                    started_at TIMESTAMP DEFAULT NOW(),
                    completed_at TIMESTAMP,
                    last_action_at TIMESTAMP DEFAULT NOW(),
                    context_data JSONB DEFAULT '{}', -- Variáveis do funil, dados do lead, etc
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
        
                -- Histórico de Ações do Funil (Logs detalhados)
                CREATE TABLE IF NOT EXISTS funnel_action_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    execution_id UUID REFERENCES funnel_executions(id) ON DELETE CASCADE,
                    node_id VARCHAR(255) NOT NULL,
                    node_type VARCHAR(100) NOT NULL,
                    action_type VARCHAR(100),
                    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'skipped'
                    input_data JSONB,
                    output_data JSONB,
                    error_message TEXT,
                    duration_ms INT,
                    executed_at TIMESTAMP DEFAULT NOW()
                );
        
                -- Templates de Funil (Prontos para usar)
                CREATE TABLE IF NOT EXISTS funnel_templates (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100), -- 'ecommerce', 'saas', 'infoproduct', 'service', 'support'
                    thumbnail_url TEXT,
                    config JSONB NOT NULL,
                    is_public BOOLEAN DEFAULT FALSE,
                    created_by INT, -- user_id do criador
                    usage_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
        
                -- A/B Tests de Funis
                CREATE TABLE IF NOT EXISTS funnel_split_tests (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    variants JSONB NOT NULL, -- [{ id: 'A', weight: 50, node_id: 'xxx' }, ...]
                    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'running', 'completed'
                    winner_variant VARCHAR(10),
                    started_at TIMESTAMP,
                    ended_at TIMESTAMP,
                    results JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                );
        
                -- Lead Scoring (Sistema de pontuação)
                CREATE TABLE IF NOT EXISTS lead_scores (
                    id SERIAL PRIMARY KEY,
                    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
                    total_score INT DEFAULT 0,
                    last_interaction TIMESTAMP,
                    score_breakdown JSONB DEFAULT '{}', -- { "email_opened": 15, "whatsapp_replied": 30, ... }
                    temperature VARCHAR(20) DEFAULT 'cold', -- 'cold', 'warm', 'hot'
                    updated_at TIMESTAMP DEFAULT NOW()
                );
        
                -- Índices para performance
                CREATE INDEX IF NOT EXISTS idx_funnels_user_active ON funnels(user_id, is_active);
                CREATE INDEX IF NOT EXISTS idx_executions_status ON funnel_executions(status);
                CREATE INDEX IF NOT EXISTS idx_executions_contact ON funnel_executions(contact_id);
                CREATE INDEX IF NOT EXISTS idx_executions_funnel ON funnel_executions(funnel_id);
                CREATE INDEX IF NOT EXISTS idx_action_logs_execution ON funnel_action_logs(execution_id);
                CREATE INDEX IF NOT EXISTS idx_lead_scores_contact ON lead_scores(contact_id);
        
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
                ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_funnel_interaction TIMESTAMP;
        
                -- ============================================
                -- KANBAN & TASKS SYSTEM
                -- ============================================
                
                -- Colunas do Kanban (customizáveis, até 10 por empresa)
                CREATE TABLE IF NOT EXISTS kanban_columns (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    title VARCHAR(100) NOT NULL,
                    color VARCHAR(50) DEFAULT '#a78bfa',
                    position INT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(company_id, position)
                );
                CREATE INDEX IF NOT EXISTS idx_kanban_columns_company ON kanban_columns(company_id);
                
                -- Listas de Tarefas (tipo Trello)
        CREATE TABLE IF NOT EXISTS task_lists (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    title VARCHAR(100) NOT NULL,
                    position INT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(company_id, position)
                );
                CREATE INDEX IF NOT EXISTS idx_task_lists_company ON task_lists(company_id);
                
                -- Tarefas (sistema completo de task management)
                CREATE TABLE IF NOT EXISTS tasks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    list_id UUID NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
                    created_by INT NOT NULL REFERENCES users(id),
                    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
                    deadline TIMESTAMP,
                    position INT NOT NULL,
                    completed BOOLEAN DEFAULT false,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
                CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
        
            `);
            console.log('✅ Schema do banco de dados atualizado (Sales, Ads, Automations, AI Agents).');
        } catch (schemaErr) {
            console.error('Erro ao atualizar schema:', schemaErr);
        }
        */
        release();
    });
});

// ============================================
// SEED DATA HELPER - Colunas Kanban e Task Lists
// ============================================
async function createDefaultKanbanAndTasks(companyId) {
    try {
        console.log(`[SEED] Criando dados padrão para company_id: ${companyId}`);

        // 1. Verificar se já existem colunas Kanban
        const existingColumns = await pool.query(
            'SELECT COUNT(*) as count FROM kanban_columns WHERE company_id = $1',
            [companyId]
        );

        if (existingColumns.rows[0].count == 0) {
            // Criar colunas padrão do Kanban
            const defaultColumns = [
                { title: 'Lead', color: '#60a5fa', position: 1 },
                { title: 'Qualificação', color: '#a78bfa', position: 2 },
                { title: 'Proposta', color: '#f59e0b', position: 3 },
                { title: 'Negociação', color: '#fbbf24', position: 4 },
                { title: 'Fechamento', color: '#34d399', position: 5 },
                { title: 'Perdido', color: '#ef4444', position: 6 }
            ];

            for (const col of defaultColumns) {
                await pool.query(
                    'INSERT INTO kanban_columns (company_id, title, color, position, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [companyId, col.title, col.color, col.position]
                );
            }
            console.log(`[SEED] ✅ ${defaultColumns.length} colunas Kanban criadas`);
        }

        // 2. Verificar se já existem listas de tarefas
        const existingLists = await pool.query(
            'SELECT COUNT(*) as count FROM task_lists WHERE company_id = $1',
            [companyId]
        );

        if (existingLists.rows[0].count == 0) {
            // Criar listas padrão de Tarefas
            const defaultLists = [
                { title: 'A Fazer', position: 1 },
                { title: 'Em Progresso', position: 2 },
                { title: 'Concluído', position: 3 }
            ];

            for (const list of defaultLists) {
                await pool.query(
                    'INSERT INTO task_lists (company_id, title, position, created_at) VALUES ($1, $2, $3, NOW())',
                    [companyId, list.title, list.position]
                );
            }
            console.log(`[SEED] ✅ ${defaultLists.length} listas de Tarefas criadas`);
        }

        return { success: true, message: 'Dados padrão criados com sucesso' };
    } catch (error) {
        console.error('[SEED] Erro ao criar dados padrão:', error);
        return { success: false, error: error.message };
    }
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) { return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' }); }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar informações completas do usuário incluindo company_id
        const userResult = await pool.query(
            'SELECT id, email, company_id, role, permissions, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(403).json({ error: 'Usuário não encontrado ou inativo.' });
        }

        const user = userResult.rows[0];
        req.user = {
            userId: user.id,
            email: user.email,
            companyId: user.company_id,
            role: user.role,
            permissions: user.permissions
        };

        next();
    } catch (error) {
        console.error('Erro no verifyToken:', error);
        res.status(403).json({ error: 'Token inválido.' });
    }
};

// --- ROTAS DE AUTENTICAÇÃO ---

// ============================================
// CRIAR EMPRESA + USUÁRIO ADMIN + SEED DATA
// ============================================
app.post('/api/companies/create', async (req, res) => {
    const { document, document_type, name, adminEmail, adminPassword } = req.body;

    // Validações
    if (!document || !document_type || !name || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (!['CPF', 'CNPJ'].includes(document_type)) {
        return res.status(400).json({ error: 'document_type deve ser CPF ou CNPJ' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Criar empresa
        const companyResult = await client.query(
            `INSERT INTO companies (document, document_type, name, plan, max_users, created_at)
     VALUES ($1, $2, $3, 'basic', 4, NOW())
     RETURNING id, document, name`,
            [document, document_type, name]
        );

        const company = companyResult.rows[0];
        console.log(`[COMPANY] ✅ Empresa criada: ${company.name} (ID: ${company.id})`);

        // 2. Criar usuário admin
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(adminPassword, salt);

        const userResult = await client.query(
            `INSERT INTO users (company_id, email, password, name, role, permissions, is_active, created_at)
     VALUES ($1, $2, $3, $4, 'admin', '{"all": true}', true, NOW())
     RETURNING id, email, name, role`,
            [company.id, adminEmail, password_hash, name]
        );

        const user = userResult.rows[0];
        console.log(`[USER] ✅ Usuário admin criado: ${user.email} (ID: ${user.id})`);

        // 3. Criar dados padrão (Kanban + Tasks)
        const seedResult = await createDefaultKanbanAndTasks(company.id);
        if (!seedResult.success) {
            throw new Error(`Erro ao criar dados padrão: ${seedResult.error}`);
        }

        await client.query('COMMIT');

        // 4. Gerar token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Empresa criada com sucesso!',
            company: {
                id: company.id,
                document: company.document,
                name: company.name
            },
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token,
            seedData: seedResult
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[COMPANY CREATE] Erro:', error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'CNPJ/CPF ou email já cadastrado' });
        }

        res.status(500).json({ error: 'Erro ao criar empresa', details: error.message });
    } finally {
        client.release();
    }
});

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
        const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.companyId]);
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
    WHERE company_id = $1 AND created_at::date = CURRENT_DATE AND status = 'approved'
`;
        const salesResult = await pool.query(salesQuery, [req.user.companyId]);
        const salesData = salesResult.rows[0];

        // Dados Reais de Leads
        const leadsQuery = `
    SELECT COUNT(*) as leads_today 
    FROM clients 
    WHERE company_id = $1 AND created_at::date = CURRENT_DATE
`;
        const leadsResult = await pool.query(leadsQuery, [req.user.companyId]);
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
    }
});

// ============ HELPER: AUTO-CADASTRAR CONTATO ============
async function createOrUpdateContact(phone, name = null, source = 'whatsapp', companyId = null) {
    try {
        // Limpar telefone (remover tudo que não é número)
        const cleanPhone = phone.replace(/\D/g, '');

        if (!cleanPhone || cleanPhone.length < 10) {
            return null; // Número inválido
        }

        // Verificar se já existe
        const existingContact = await pool.query(
            'SELECT * FROM contacts WHERE phone = $1',
            [cleanPhone]
        );

        if (existingContact.rows.length > 0) {
            // Se já existe e tem nome novo, atualiza
            if (name && !existingContact.rows[0].name) {
                await pool.query(
                    'UPDATE contacts SET name = $1, updated_at = NOW() WHERE phone = $2',
                    [name, cleanPhone]
                );
            }
            return existingContact.rows[0];
        }

        // Criar novo contato
        const result = await pool.query(
            `INSERT INTO contacts (phone, name, source, company_id, temperature, custom_fields) 
     VALUES ($1, $2, $3, $4, 'cold', '{}') 
     RETURNING *`,
            [cleanPhone, name || `Contato ${cleanPhone}`, source, companyId]
        );

        const newContact = result.rows[0];
        console.log(`[AUTO-CADASTRO] ✅ Novo contato criado: ${name || cleanPhone} (${source})`);

        // Disparar trigger CRM "lead_created" (em background)
        if (companyId) {
            setImmediate(async () => {
                try {
                    console.log(`[CRM Trigger] 👤 Lead criado (auto-cadastro): ${newContact.name || newContact.phone}`);
                    await funnelScheduler.checkCRMTriggers(companyId, newContact.id, {
                        event: 'lead_created',
                        data: newContact
                    });
                } catch (triggerError) {
                    console.error('[CRM Trigger] Erro ao processar lead_created (auto-cadastro):', triggerError);
                }
            });
        }

        return newContact;
    } catch (error) {
        console.error('[AUTO-CADASTRO] Erro:', error.message);
        return null;
    }
}

// --- ROTAS DE CLIENTES ---
app.get('/api/clients', verifyToken, async (req, res) => {
    const { search } = req.query;
    try {
        const query = search
            ? 'SELECT * FROM contacts WHERE (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1) ORDER BY created_at DESC'
            : 'SELECT * FROM contacts ORDER BY created_at DESC';
        const values = search ? [`%${search}%`] : [];
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/clients', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const { name, email, phone, custom_fields, source, temperature } = req.body;
    try {
        const query = `
    INSERT INTO contacts 
    (name, email, phone, custom_fields, source, temperature) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *`;
        const values = [
            name || null,
            email || null,
            phone || null,
            custom_fields || {},
            source || 'manual',
            temperature || 'cold'
        ];
        const result = await pool.query(query, values);
        const newContact = result.rows[0];

        // Disparar trigger "lead_created" (em background)
        setImmediate(async () => {
            try {
                console.log(`[CRM Trigger] 👤 Lead criado: ${newContact.name || newContact.phone}`);
                await funnelScheduler.checkCRMTriggers(userId, newContact.id, {
                    event: 'lead_created',
                    data: newContact
                });
            } catch (triggerError) {
                console.error('[CRM Trigger] Erro ao processar lead_created:', triggerError);
            }
        });

        res.status(201).json(newContact);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro interno ao criar cliente.' });
    }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, email, phone, custom_fields, source, temperature, tags } = req.body;

    try {
        // PRIMEIRO: Buscar valores ANTIGOS (para detectar mudanças)
        const oldResult = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);

        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        const oldContact = oldResult.rows[0];

        // SEGUNDO: Atualizar no banco
        const query = `
    UPDATE contacts 
    SET name = $1, email = $2, phone = $3, custom_fields = $4, source = $5, temperature = $6, tags = $7, updated_at = NOW()
    WHERE id = $8 RETURNING *`;
        const values = [
            name,
            email,
            phone,
            custom_fields || {},
            source || 'manual',
            temperature || 'cold',
            tags || [],
            id
        ];
        const result = await pool.query(query, values);

        // TERCEIRO: Disparar triggers CRM (em background, não bloqueia resposta)
        setImmediate(async () => {
            try {
                // Detectar mudança de temperatura
                if (oldContact.temperature !== temperature && temperature) {
                    console.log(`[CRM Trigger] 🌡️ Temperatura mudou: ${oldContact.temperature} → ${temperature}`);
                    await funnelScheduler.checkCRMTriggers(userId, id, {
                        event: 'temperature_changed',
                        from: oldContact.temperature,
                        to: temperature
                    });
                }

                // Detectar tags adicionadas
                const oldTags = oldContact.tags || [];
                const newTags = tags || [];
                const addedTags = newTags.filter(t => !oldTags.includes(t));

                for (const tag of addedTags) {
                    console.log(`[CRM Trigger] 🏷️ Tag adicionada: ${tag}`);
                    await funnelScheduler.checkCRMTriggers(userId, id, {
                        event: 'tag_added',
                        tag: tag
                    });
                }
            } catch (triggerError) {
                console.error('[CRM Trigger] Erro ao processar triggers:', triggerError);
            }
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar cliente.' });
    }
});

app.delete('/api/clients/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Buscar todas as tags únicas dos contatos (para trigger CRM)
app.get('/api/contacts/tags', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
    SELECT DISTINCT unnest(tags) as tag_name
    FROM contacts
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
    ORDER BY tag_name
`);

        const tags = result.rows.map(r => r.tag_name);
        res.json({ tags });
    } catch (error) {
        console.error('Erro ao buscar tags:', error);
        res.status(500).json({ error: 'Erro ao buscar tags.' });
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
        // CORREÇÃO: Atualizar tabela 'contacts' em vez de 'clients' para consistência
        const query = 'UPDATE contacts SET kanban_stage = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        const values = [kanban_stage, id];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar etapa do Kanban:', error);

        // Auto-fix: Se o erro for coluna inexistente, tenta criar e retenta
        if (error.code === '42703') { // undefined_column
            try {
                await pool.query("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS kanban_stage VARCHAR(50) DEFAULT 'new_lead'");
                console.log("Coluna kanban_stage criada automaticamente em contacts.");
                // Retenta
                const retryResult = await pool.query('UPDATE contacts SET kanban_stage = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [kanban_stage, id]);
                return res.json(retryResult.rows[0]);
            } catch (retryErr) {
                console.error('Erro no retry:', retryErr);
            }
        }

        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


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




// --- ROTAS DE AGENDAMENTOS (CALENDÁRIO) ---
app.get('/api/appointments', verifyToken, async (req, res) => {
    try {
        const query = 'SELECT * FROM appointments WHERE company_id = $1 ORDER BY start_time ASC';
        const result = await pool.query(query, [req.user.companyId]);
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
        const result = await pool.query('SELECT * FROM ai_agents WHERE company_id = $1 ORDER BY created_at DESC', [req.user.companyId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar agentes:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/ai-agents', verifyToken, async (req, res) => {
    const { name, provider, prompt, description, api_key, custom_agent_id, knowledge_base_url, is_active, config } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome do agente é obrigatório' });

    try {
        const query = `
    INSERT INTO ai_agents 
    (user_id, name, provider, prompt, description, api_key, custom_agent_id, knowledge_base_url, is_active, config)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
`;
        const values = [
            req.user.userId,
            name,
            provider || 'OpenAI',
            prompt,
            description,
            api_key,
            custom_agent_id,
            knowledge_base_url,
            is_active !== undefined ? is_active : true,
            config || {}
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar agente:', error);
        res.status(500).json({ error: 'Erro interno ao criar agente.' });
    }
});

app.put('/api/ai-agents/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, provider, prompt, description, api_key, custom_agent_id, knowledge_base_url, is_active, config } = req.body;

    try {
        // Build dynamic query to only update provided fields
        // But for simplicity in this MVP, we update everything provided
        const query = `
    UPDATE ai_agents 
    SET name = $1, provider = $2, prompt = $3, description = $4, 
        api_key = $5, custom_agent_id = $6, knowledge_base_url = $7, 
        is_active = $8, config = $9, updated_at = NOW()
    WHERE id = $10 AND user_id = $11
    RETURNING *
`;
        const values = [
            name, provider, prompt, description,
            api_key, custom_agent_id, knowledge_base_url,
            is_active, config || {}, id, req.user.userId
        ];

        const result = await pool.query(query, values);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Agente não encontrado.' });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar agente:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar agente.' });
    }
});

app.patch('/api/ai-agents/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE ai_agents SET is_active = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [is_active, id, req.user.userId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Agente não encontrado.' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar status do agente:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

app.delete('/api/ai-agents/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM ai_agents WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Agente não encontrado.' });
        res.json({ message: 'Agente deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar agente:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});


// --- ROTAS DE INTEGRAÇÃO WHATSAPP ---
// --- ROTAS DE INTEGRAÇÃO WHATSAPP ---
const createEvolutionAPI = (instanceToken = null) => axios.create({
    baseURL: process.env.EVOLUTION_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'apikey': instanceToken || process.env.EVOLUTION_API_KEY
    }
});

// Helper para buscar o token da instância (necessário para v3)
const fetchInstanceToken = async (instanceName) => {
    try {
        // Primeiro tenta buscar do banco local (mais rápido e confiável)
        // CORREÇÃO: usar 'token' (nome correto da coluna) em vez de 'instance_token'
        const dbResult = await pool.query(
            'SELECT token, instance_uuid FROM whatsapp_instances WHERE instance_name = $1',
            [instanceName]
        );

        if (dbResult.rows.length > 0 && dbResult.rows[0].token) {
            return dbResult.rows[0].token;
        }

        // Fallback: busca da API usando UUID se não tiver no banco
        if (!dbResult.rows[0]?.instance_uuid) {
            console.error(`[Helper] Instância ${instanceName} não encontrada no banco.`);
            return null;
        }

        const instanceUUID = dbResult.rows[0].instance_uuid;
        const adminAPI = createEvolutionAPI(); // Usa Global Key
        const res = await adminAPI.get(`/instance/info/${instanceUUID}`);
        const token = res.data?.data?.token || res.data?.token;

        // Salva no banco para próximas consultas
        if (token) {
            await pool.query('UPDATE whatsapp_instances SET token = $1 WHERE instance_name = $2', [token, instanceName]);
        }

        return token;
    } catch (error) {
        console.error(`[Helper] Erro ao buscar token da instância ${instanceName}:`, error.message);
        return null;
    }
};

// --- ROTA WHATSAPP SESSION (ADAPTADA PARA EVOLUTION GO V3) ---
app.post('/api/whatsapp/session', verifyToken, async (req, res) => {
    const { action, instanceName } = req.body;

    console.log(`[Backend v3] Ação: ${action} | Instância: ${instanceName}`);

    try {
        if (action === 'generate_qr') {
            // 1. CRIAR INSTÂNCIA (Global Key)
            const adminAPI = createEvolutionAPI(); // Global Key
            const newToken = randomUUID(); // Geramos o token aqui para usar depois
            let created = false;
            let instanceUUID = null;

            console.log(`[DEBUG] Token gerado para instância: ${newToken.substring(0, 8)}...`);
            console.log(`[DEBUG] EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL}`);

            try {
                // Endpoint Admin: /instance/create
                const createRes = await adminAPI.post(`/instance/create`, {
                    name: instanceName,
                    token: newToken,
                    qrcode: false, // v3: QR code não vem no create
                    integration: "WHATSAPP-BAILEYS",
                    webhook: process.env.WEBHOOK_URL || "https://nexusflow.info/api/webhooks/evolution",
                    webhookEvents: ["messages.upsert", "connection.update", "qrcode.updated"]
                });

                // Extrair UUID da resposta
                instanceUUID = createRes.data?.data?.id || createRes.data?.id;

                console.log(`[DEBUG] Resposta CREATE:`, JSON.stringify(createRes.data));
                console.log(`[DEBUG] UUID da instância criada: ${instanceUUID}`);
                console.log(`[Backend] Instância criada v3.`);
                created = true;
            } catch (e) {
                console.log(`[DEBUG] Erro CREATE status: ${e.response?.status}`);
                console.log(`[DEBUG] Erro CREATE body:`, JSON.stringify(e.response?.data));
                // Ignora erro se já existe (403/400)
                if (e.response?.status !== 403) console.log(`[Backend] Aviso criação: ${e.response?.data?.error || e.message}`);
            }

            // 2. DEFINIR TOKEN, UUID E SALVAR NO BANCO
            // Se criamos agora, o token é o newToken. Se já existia, buscamos do BANCO LOCAL.
            let instanceToken = newToken;
            if (created) {
                // Salva o token E UUID no banco local para uso futuro
                await pool.query(
                    `UPDATE whatsapp_instances SET token = $1, instance_uuid = $2 WHERE instance_name = $3`,
                    [newToken, instanceUUID, instanceName]
                );
                console.log(`[DEBUG] Token e UUID salvos no banco local.`);
            } else {
                console.log(`[DEBUG] Instância já existia, buscando token e UUID do banco local...`);
                // Busca do banco local primeiro
                const dbResult = await pool.query(
                    `SELECT token, instance_uuid FROM whatsapp_instances WHERE instance_name = $1`,
                    [instanceName]
                );
                if (dbResult.rows[0]?.token) {
                    instanceToken = dbResult.rows[0].token;
                    instanceUUID = dbResult.rows[0].instance_uuid;
                    console.log(`[DEBUG] Token buscado do banco: ${instanceToken.substring(0, 8)}...`);
                    console.log(`[DEBUG] UUID buscado do banco: ${instanceUUID}`);
                } else {
                    // Fallback: tenta buscar da API
                    const fetchedToken = await fetchInstanceToken(instanceName);
                    if (fetchedToken) {
                        instanceToken = fetchedToken;
                        console.log(`[DEBUG] Token buscado da API: ${instanceToken.substring(0, 8)}...`);
                    } else {
                        console.log(`[DEBUG] Token NÃO encontrado, usando o gerado.`);
                    }
                }
            }

            console.log(`[DEBUG] Token final usado: ${instanceToken.substring(0, 8)}...`);

            const instanceAPI = createEvolutionAPI(instanceToken); // Instância Token

            // 3. Garantir Configuração do Webhook (Via connect ou create, removido endpoint inválido)
            // v3 define webhook no create ou no connect
            const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:3001/api/webhooks/evolution";

            // 4. Se conectar, retorna status. Se não, retorna QR. 
            // (Lógica de Polling Original mantida abaixo...)
            let connected = false;

            // (Mantém o resto do código original)

            // 3. VERIFICAR STATUS ANTES DE CONECTAR
            try {
                const preStatus = await instanceAPI.get('/instance/status');
                console.log(`[DEBUG] STATUS ANTES connect:`, JSON.stringify(preStatus.data));
            } catch (statErr) {
                console.log(`[DEBUG] Erro ao buscar status pré-connect: ${statErr.message}`);
            }

            // 4. INICIAR CONEXÃO (Instance Token)
            // Doc: POST /instance/connect
            try {
                const connectRes = await instanceAPI.post('/instance/connect', {
                    subscribe: ["MESSAGE", "CONNECTION_UPDATE", "QRCODE_UPDATED"], // Events em UPPERCASE conforme Evolution API v3
                    webhookUrl: webhookUrl
                });
                console.log(`[DEBUG] Resposta CONNECT:`, JSON.stringify(connectRes.data));
            } catch (connErr) {
                console.log(`[DEBUG] Erro CONNECT status: ${connErr.response?.status}`);
                console.log(`[DEBUG] Erro CONNECT body:`, JSON.stringify(connErr.response?.data));
                console.log(`[Backend] Aviso connect: ${connErr.response?.data?.error || connErr.message}`);
            }

            // 5. PEGAR O QR CODE (Instance Token)
            // Doc: GET /instance/qr
            // Implementando POLLING com Retry (v3 demora para iniciar o driver)
            let qrCodeData = null;
            let attempts = 0;
            const maxAttempts = 20; // Ajuste: 20 tentativas (pedido usuário)

            while (!qrCodeData && attempts < maxAttempts) {
                attempts++;
                try {
                    // Delay progressivo (4s) - Ajuste: 4 segundos
                    await new Promise(r => setTimeout(r, 4000));

                    // Verifica status antes de pedir QR
                    try {
                        const midStatus = await instanceAPI.get('/instance/status');
                        console.log(`[DEBUG] Tentativa ${attempts} - STATUS:`, JSON.stringify(midStatus.data?.data || midStatus.data));
                    } catch (e) { }

                    const qrResponse = await instanceAPI.get('/instance/qr');

                    // DEBUG: Mostrar resposta crua
                    console.log(`[DEBUG] Tentativa ${attempts} - Resposta QR CRUA:`, JSON.stringify(qrResponse.data));

                    // Se a API retornar sucesso com dados
                    // DOC diz: { data: { qrcode: "2@abc...", code: "data:image/png;base64,..." } }
                    // REALIDADE v3 Go: { data: { Qrcode: "...", Code: "..." } } (PascalCase!)
                    const qrData = qrResponse.data?.data;
                    if (qrData?.Qrcode || qrData?.Code || qrData?.qrcode || qrData?.code) {
                        qrCodeData = qrResponse.data;
                        console.log(`[Backend] QR Code obtido na tentativa ${attempts}.`);
                        console.log(`[DEBUG] QR Qrcode presente: ${!!qrData?.Qrcode}`);
                        console.log(`[DEBUG] QR Code (base64) presente: ${!!qrData?.Code}`);
                    } else {
                        console.log(`[Backend] Tentativa ${attempts}: QR ainda não disponível...`);
                    }

                } catch (qrError) {
                    const errMsg = qrError.response?.data?.error || qrError.message;
                    console.log(`[DEBUG] Tentativa ${attempts} - Erro HTTP ${qrError.response?.status}: ${errMsg}`);

                    // Se o erro for "no QR code available", continuamos tentando (driver iniciando)
                    // Se for outro erro crítico (ex: 401), paramos.
                    if (qrError.response?.status === 401 || qrError.response?.status === 403) {
                        console.log(`[DEBUG] Erro de autenticação detectado, parando polling.`);
                        break;
                    }
                }
            }

            if (qrCodeData) {
                console.log(`[DEBUG] Enviando qrCodeData para o frontend.`);
                res.json(qrCodeData);
            } else {
                // Se falhou após todos retries, tenta status como último recurso
                console.log(`[DEBUG] Polling esgotado, buscando status final...`);
                try {
                    const statusRes = await instanceAPI.get('/instance/status');
                    console.log(`[DEBUG] Status final:`, JSON.stringify(statusRes.data));
                    res.json(statusRes.data);
                } catch (e) {
                    res.status(500).json({ error: "O QR Code demorou muito para ser gerado. Por favor, tente novamente em alguns segundos." });
                }
            }

        } else if (action === 'status') {
            // Busca token do banco local
            let instanceToken = null;
            const dbRes = await pool.query('SELECT token FROM whatsapp_instances WHERE instance_name = $1', [instanceName]);
            if (dbRes.rows[0]?.token) instanceToken = dbRes.rows[0].token;

            // Fallback
            if (!instanceToken) instanceToken = await fetchInstanceToken(instanceName);

            if (!instanceToken) {
                console.log(`[DEBUG] Status: Token não encontrado para ${instanceName}`);
                return res.json({ status: 'disconnected', error: 'Token não encontrado' });
            }

            const instanceAPI = createEvolutionAPI(instanceToken);
            try {
                // Doc: GET /instance/status
                const r = await instanceAPI.get('/instance/status');
                console.log(`[DEBUG] Status Response (${instanceName}):`, JSON.stringify(r.data));

                // Self-healing: Atualiza o banco se estiver conectado na API
                const sData = r.data?.data || r.data;
                if (sData?.Connected) {
                    await pool.query("UPDATE whatsapp_instances SET status = 'connected' WHERE instance_name = $1", [instanceName]);
                }

                res.json(r.data);
            } catch (e) {
                console.error(`[DEBUG] Erro Status (${instanceName}):`, e.response?.data || e.message);
                res.json({ status: 'disconnected', error: e.message });
            }

        } else if (action === 'logout') {
            // Busca token E UUID do banco local
            const dbRes = await pool.query('SELECT token, instance_uuid FROM whatsapp_instances WHERE instance_name = $1', [instanceName]);
            let instanceToken = dbRes.rows[0]?.token;
            let instanceUUID = dbRes.rows[0]?.instance_uuid;

            if (!instanceToken) instanceToken = await fetchInstanceToken(instanceName);

            // Se não tiver UUID no banco, busca da API
            if (!instanceUUID) {
                try {
                    const adminAPI = createEvolutionAPI();
                    const infoRes = await adminAPI.get(`/instance/info/${instanceName}`);
                    instanceUUID = infoRes.data?.data?.id || infoRes.data?.id;
                    console.log(`[LOGOUT] UUID buscado da API: ${instanceUUID}`);
                } catch (e) {
                    console.error(`[LOGOUT] Erro ao buscar UUID: ${e.message}`);
                }
            }

            const adminAPI = createEvolutionAPI(); // Global Key para delete

            if (instanceToken) {
                const instanceAPI = createEvolutionAPI(instanceToken);
                // Doc: DELETE /instance/logout (Instance Token)
                try {
                    await instanceAPI.delete('/instance/logout');
                    console.log(`[LOGOUT] Logout executado`);
                } catch (e) {
                    console.error(`[LOGOUT] Erro ao executar logout: ${e.message}`);
                }
            }

            // Doc: DELETE /instance/delete/:instanceId (Admin / Global Key)
            // CORREÇÃO CRÍTICA: Usar UUID ao invés de instanceName
            if (instanceUUID) {
                try {
                    await adminAPI.delete(`/instance/delete/${instanceUUID}`);
                    console.log(`[LOGOUT] ✅ Instância deletada (UUID: ${instanceUUID})`);
                } catch (e) {
                    console.error(`[LOGOUT] ❌ Erro ao deletar: ${e.message}`);
                    if (e.response) console.error(`[LOGOUT] Detalhes:`, JSON.stringify(e.response.data));
                }
            } else {
                console.error(`[LOGOUT] ⚠️ UUID não encontrado, não foi possível deletar na API`);
            }

            await pool.query("UPDATE whatsapp_instances SET status = 'disconnected' WHERE instance_name = $1", [instanceName]);
            res.json({ status: 'logged_out' });
        }
    } catch (error) {
        console.error('[Backend] Erro Geral Session:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- ROTAS DE INSTÂNCIAS (SIMPLIFICADAS) ---
app.get('/api/whatsapp/instances', verifyToken, async (req, res) => {
    const r = await pool.query('SELECT * FROM whatsapp_instances WHERE company_id = $1', [req.user.companyId]);

    // Mapear display_name (snake_case do banco) para displayName (camelCase do frontend)
    const instances = r.rows.map(instance => ({
        ...instance,
        displayName: instance.display_name || instance.instance_name
    }));

    res.json(instances);
});

app.post('/api/whatsapp/instances', verifyToken, async (req, res) => {
    const instance_name = `crm_${req.user.userId}_${Date.now()}`;
    const r = await pool.query(`INSERT INTO whatsapp_instances (display_name, instance_name, status, user_id) VALUES ($1, $2, 'disconnected', $3) RETURNING *`, [req.body.displayName, instance_name, req.user.userId]);
    res.status(201).json(r.rows[0]);
});

app.delete('/api/whatsapp/instances/:id', verifyToken, async (req, res) => {
    const check = await pool.query('SELECT instance_name, instance_uuid FROM whatsapp_instances WHERE id = $1', [req.params.id]);
    if (check.rows.length) {
        const adminAPI = createEvolutionAPI(); // Global Key
        const instanceName = check.rows[0].instance_name;
        let instanceUUID = check.rows[0].instance_uuid;

        try {
            // Se não tiver UUID no banco, busca da API
            if (!instanceUUID) {
                const infoRes = await adminAPI.get(`/instance/info/${instanceName}`);
                instanceUUID = infoRes.data?.data?.id || infoRes.data?.id;
                console.log(`[DELETE] UUID buscado da API: ${instanceUUID}`);
            }

            if (instanceUUID) {
                console.log(`[DELETE] Deletando instância ${instanceName} (UUID: ${instanceUUID})`);
                await adminAPI.delete(`/instance/delete/${instanceUUID}`);
                console.log(`[DELETE] ✅ Instância ${instanceName} deletada na Evolution.`);
            } else {
                console.error(`[DELETE] ⚠️ UUID não encontrado para ${instanceName}`);
            }
        } catch (e) {
            console.error(`[DELETE] ❌ Erro ao deletar instância ${instanceName} na API:`, e.message);
            if (e.response) console.error(`[DELETE] Detalhes:`, JSON.stringify(e.response.data));
        }
    }
    await pool.query('DELETE FROM whatsapp_instances WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// --- ROTAS DE ATENDIMENTO (WHATSAPP) ---
// (Mantidas do código original para preservar funcionalidade de chat)
app.get('/api/whatsapp/chats', verifyToken, async (req, res) => {
    // REMOVIDO: instanceName não é mais necessário
    try {
        // Busca os chats mais recentes de cada JID, independente da instância
        const chatsQuery = `
    SELECT DISTINCT ON (jid) *
    FROM whatsapp_chats 
    WHERE company_id = $1
    ORDER BY jid, updated_at DESC`;
        const chatsResult = await pool.query(chatsQuery, [req.user.companyId]);

        // Depois busca os contatos para fazer match manual
        const contactsQuery = `SELECT id, name, phone FROM contacts LIMIT 1000`;
        const contactsResult = await pool.query(contactsQuery);
        const contactsMap = {};

        // Criar mapa de contatos por telefone limpo
        contactsResult.rows.forEach(contact => {
            if (contact.phone) {
                const cleanPhone = contact.phone.replace(/\D/g, ''); // Remove tudo que não é número
                contactsMap[cleanPhone] = contact;
            }
        });

        // Mapear chats com nomes de contatos
        const chats = chatsResult.rows.map(chat => {
            const jidPhone = chat.jid.split('@')[0].replace(/\D/g, ''); // Extrai e limpa telefone do JID
            const contact = contactsMap[jidPhone];

            return {
                ...chat,
                title: contact?.name || chat.title, // Prioriza nome do contato cadastrado
                contact_id: contact?.id || null
            };
        });

        // Retorna chats imediatamente
        res.json(chats);

        // Buscar nomes do WhatsApp em background
        const chatsNeedingName = chatsResult.rows.filter(chat =>
            !chat.jid.includes('@g.us') && // Não é grupo
            !chat.jid.includes('broadcast') && // Não é status
            (!chat.title || chat.title.toLowerCase().startsWith('contato')) // Precisa de nome
        );

        if (chatsNeedingName.length > 0) {
            // Executar em background, sem bloquear resposta
            (async () => {
                try {
                    // MODIFICADO: Buscar QUALQUER instância ATIVA do usuário ao invés de usar chat.instance_name
                    // (que pode ser de uma instância deletada)
                    const userInstancesResult = await pool.query(
                        'SELECT instance_name, token FROM whatsapp_instances WHERE company_id = $1 LIMIT 1',
                        [req.user.companyId]
                    );

                    if (userInstancesResult.rows.length === 0) {
                        console.log('[BG] ⚠️ Nenhuma instância ativa encontrada para o usuário');
                        return;
                    }

                    const activeInstance = userInstancesResult.rows[0];
                    const instanceToken = activeInstance.token;

                    if (!instanceToken) {
                        console.log('[BG] ⚠️ Instância sem token, pulando background job');
                        return;
                    }

                    const instanceAPI = createEvolutionAPI(instanceToken);

                    // Limitar a 3 por vez e adicionar delay para não sobrecarregar
                    for (const chat of chatsNeedingName.slice(0, 3)) {
                        try {
                            // Extrai APENAS os números do JID
                            const number = chat.jid.split('@')[0].replace(/\D/g, '');

                            // Pular se número inválido
                            if (!number || number.length < 10) {
                                continue;
                            }

                            // Buscar informações do usuário (nome)
                            const infoRes = await instanceAPI.post(`/user/info`, {
                                number: [number]
                            });

                            const userData = infoRes.data?.data?.Users?.[`${number}@s.whatsapp.net`];

                            if (userData) {
                                // Pegar nome do WhatsApp (PushName ou VerifiedName)
                                const whatsappName = userData.VerifiedName?.Details?.VerifiedName ||
                                    userData.PushName ||
                                    null;

                                if (whatsappName && (!chat.title || chat.title.toLowerCase().startsWith('contato'))) {
                                    // Atualizar pelo JID e user_id apenas (funciona com qualquer instância)
                                    await pool.query(
                                        'UPDATE whatsapp_chats SET title = $1, updated_at = NOW() WHERE user_id = $2 AND jid = $3',
                                        [whatsappName, req.user.userId, chat.jid]
                                    );
                                    console.log(`[BG] ✅ Nome atualizado: ${whatsappName} / ${chat.jid.substring(0, 15)}...`);

                                    // AUTO-CADASTRAR no CRM
                                    await createOrUpdateContact(number, whatsappName, 'whatsapp', req.user.userId);
                                }
                            }

                            // Delay de 800ms entre requisições para não sobrecarregar
                            await new Promise(resolve => setTimeout(resolve, 800));
                        } catch (infoErr) {
                            // Ignorar erros 500, 502 e 504 (sem info, sobrecarga ou timeout)
                            const status = infoErr.response?.status;
                            if (status !== 500 && status !== 502 && status !== 504) {
                                console.log(`[BG] ⚠️ Erro ao buscar nome de ${chat.jid.substring(0, 15)}: ${infoErr.message}`);
                            }
                        }
                    }
                } catch (bgErr) {
                    console.error('[BG] Erro ao buscar nomes em background:', bgErr.message);
                }
            })();
        }
    } catch (error) {
        console.error('Erro ao buscar chats do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.get('/api/whatsapp/messages', verifyToken, async (req, res) => {
    const { chat_jid } = req.query;
    if (!chat_jid) return res.status(400).json({ error: "chat_jid é obrigatório" });

    try {
        // REMOVIDO: instance_name - agora busca apenas por user_id e chat_jid
        const query = `
    SELECT * FROM whatsapp_messages
    WHERE company_id = $1 AND chat_jid = $2
    ORDER BY timestamp ASC`;
        const result = await pool.query(query, [req.user.companyId, chat_jid]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar mensagens do WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

app.post('/api/whatsapp/send-message', verifyToken, async (req, res) => {
    const { instanceName, to, text } = req.body;

    // v3: Precisa do token da instância
    const instanceToken = await fetchInstanceToken(instanceName);
    if (!instanceToken) return res.status(400).json({ error: 'Instância não conectada ou token não encontrado.' });

    const instanceAPI = createEvolutionAPI(instanceToken);

    try {
        const number = to.split('@')[0];
        // v3: POST /send/text
        // Body: { number, text, ... }
        const sendRes = await instanceAPI.post(`/send/text`, {
            number: number,
            text: text
        });

        // NOVO: Salvar mensagem enviada no banco
        try {
            const messageId = sendRes.data?.key?.id || `SENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Math.floor(Date.now() / 1000); // Converter para SEGUNDOS

            await pool.query(
                `INSERT INTO whatsapp_messages 
        (user_id, instance_name, message_id, chat_jid, text, from_me, timestamp, status, raw)
        VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), $8, $9)
        ON CONFLICT (instance_name, message_id) DO NOTHING`,
                [
                    req.user.userId,
                    instanceName,
                    messageId,
                    to,
                    text,
                    true, // from_me = true
                    timestamp, // Já em segundos
                    'sent',
                    JSON.stringify(sendRes.data)
                ]
            );

            console.log(`[SEND] ✅ Mensagem enviada e salva no banco: ${text.substring(0, 50)}`);

            // Foto de perfil removida por solicitacao do usuario (erro 404/performance)

        } catch (dbErr) {
            console.error('[SEND] ❌ Erro ao salvar mensagem no banco:', dbErr.message);
        }

        res.status(200).json({ message: 'Mensagem enviada.' });
    } catch (error) {
        console.error('Erro ao enviar mensagem via Evolution API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao enviar mensagem.' });
    }
});

// Endpoint para enviar mídia (image, document, audio, video)
app.post('/api/whatsapp/send-media', verifyToken, upload.single('file'), async (req, res) => {
    const { instanceName, to, type, caption } = req.body;
    const file = req.file;

    console.log('[SEND-MEDIA] 📤 Recebido:', { instanceName, to, type, file: file?.originalname, size: file?.size });

    if (!file) {
        return res.status(400).json({ error: 'Arquivo não enviado.' });
    }

    if (!['image', 'video', 'audio', 'document'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido. Use: image, video, audio ou document.' });
    }

    // v3: Precisa do token da instância
    const instanceToken = await fetchInstanceToken(instanceName);
    if (!instanceToken) return res.status(400).json({ error: 'Instância não conectada ou token não encontrado.' });

    const instanceAPI = createEvolutionAPI(instanceToken);

    try {
        const number = to.split('@')[0];

        // Criar FormData para enviar arquivo
        const formData = new FormData();
        formData.append('number', number);
        formData.append('type', type); // Evolution API v3 usa 'type'
        formData.append('file', file.buffer, file.originalname);
        if (caption) formData.append('caption', caption);

        // v3: POST /send/media
        const sendRes = await instanceAPI.post(`/send/media`, formData, {
            headers: {
                ...formData.getHeaders(),
                'apikey': instanceToken
            }
        });

        // Salvar mensagem de mídia enviada no banco
        try {
            const messageId = sendRes.data?.key?.id || `SENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Math.floor(Date.now() / 1000);

            // Tentar múltiplos caminhos para media_url na resposta da API
            let mediaUrl = sendRes.data?.message?.url
                || sendRes.data?.url
                || sendRes.data?.mediaUrl
                || sendRes.data?.media_url
                || null;

            // Se não vier URL, criar um data URL temporário (para preview local)
            if (!mediaUrl && file.buffer) {
                const base64 = file.buffer.toString('base64');
                mediaUrl = `data:${file.mimetype};base64,${base64}`;
                console.log('[SEND-MEDIA] ⚠️ URL não retornado pela API, criando data URL local');
            }

            await pool.query(
                `INSERT INTO whatsapp_messages 
        (user_id, instance_name, message_id, chat_jid, text, from_me, timestamp, status, raw, media_type, media_url, media_mimetype, caption, filename)
        VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (instance_name, message_id) DO NOTHING`,
                [
                    req.user.userId,
                    instanceName,
                    messageId,
                    to,
                    caption || file.originalname || `[${type}]`,
                    true, // from_me = true
                    timestamp,
                    'sent',
                    JSON.stringify(sendRes.data),
                    type,
                    mediaUrl,
                    file.mimetype,
                    caption || '',
                    file.originalname
                ]
            );

            console.log(`[SEND-MEDIA] ✅ Mídia ${type} enviada e salva: ${file.originalname}, media_url: ${mediaUrl ? 'OK' : 'NULL'}`);
        } catch (dbErr) {
            console.error('[SEND-MEDIA] ❌ Erro ao salvar no banco:', dbErr.message);
        }

        res.status(200).json({ message: 'Mídia enviada com sucesso.', data: sendRes.data });
    } catch (error) {
        // Retorna o erro exato da API para o frontend ver no alerta
        const apiError = error.response?.data || error.message;
        console.error('Erro ao enviar mídia via Evolution API:', apiError);
        res.status(500).json({
            error: 'Falha ao enviar mídia.',
            details: typeof apiError === 'object' ? JSON.stringify(apiError) : apiError
        });
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
        // LAZY MIGRATION: Se o erro for de coluna inexistente (42703), tenta criar e reexecutar
        if (error?.code === '42703') {
            try {
                console.log('Detectada falta de colunas. Tentando corrigir schema...');
                const client = await pool.connect();
                try {
                    await client.query(`ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_ai_active BOOLEAN DEFAULT FALSE;`);
                    await client.query(`ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS ai_agent_id UUID;`);
                } finally {
                    client.release();
                }

                // Retry
                const query = `UPDATE whatsapp_chats SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`;
                const result = await pool.query(query, [...values, id, req.user.userId]);
                return res.json(result.rows[0]);
            } catch (retryErr) {
                console.error('Erro ao tentar corrigir schema e reexecutar:', retryErr);
            }
        }

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

// --- WEBHOOK (SIMPLIFICADO) ---


// app.listen removido - duplicado (mantido apenas no final do arquivo linha ~1640)

// --- ROTA DE LIMPEZA DE FANTASMAS (NOVA) ---
app.delete('/api/admin/cleanup-instances', async (req, res) => {
    const evolutionAPI = createEvolutionAPI();
    try {
        console.log('Iniciando limpeza de instâncias na Evolution...');
        const instances = await evolutionAPI.get('/instance/fetchInstances');
        const list = instances.data || [];

        let deletedCount = 0;
        for (const inst of list) {
            // Deleta qualquer instancia que comece com "crm_"
            if (inst.instance?.instanceName && inst.instance.instanceName.startsWith('crm_')) {
                console.log(`Deletando fantasma: ${inst.instance.instanceName}`);
                await evolutionAPI.delete(`/instance/delete/${inst.instance.instanceName}`);
                deletedCount++;
            }
        }
        // Limpa também do banco para garantir sincronia
        await pool.query("DELETE FROM whatsapp_instances");

        res.json({ message: `Limpeza concluída. ${deletedCount} instâncias removidas.` });
    } catch (error) {
        console.error('Erro na limpeza:', error.message);
        res.status(500).json({ error: error.message });
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

// --- FUNÇÃO DE PROCESSAMENTO IA ---
async function processAIResponse(companyId, instanceName, chatJid, senderName, incomingText) {
    console.log(`[AI] Iniciando processamento para ${chatJid}...`);
    try {
        // 1. Verificar se IA está ativa para este chat
        const chatRes = await pool.query(
            "SELECT is_ai_active, ai_agent_id FROM whatsapp_chats WHERE company_id = $1 AND instance_name = $2 AND jid = $3",
            [companyId, instanceName, chatJid]
        );

        if (!chatRes.rows[0]?.is_ai_active || !chatRes.rows[0]?.ai_agent_id) {
            console.log(`[AI] IA inativa ou não configurada para este chat.`);
            return;
        }

        const agentId = chatRes.rows[0].ai_agent_id;

        // 2. Buscar configurações do Agente
        const agentRes = await pool.query("SELECT * FROM ai_agents WHERE id = $1", [agentId]);
        const agent = agentRes.rows[0];

        if (!agent) {
            console.log(`[AI] Agente ${agentId} não encontrado.`);
            return;
        }

        console.log(`[AI] Agente acionado: ${agent.name} (${agent.provider})`);

        // 3. Montar Histórico (Contexto)
        const historyRes = await pool.query(`
     SELECT from_me, text, media_type FROM whatsapp_messages 
     WHERE company_id = $1 AND instance_name = $2 AND chat_jid = $3 
     ORDER BY timestamp DESC LIMIT 10
 `, [companyId, instanceName, chatJid]);

        const history = historyRes.rows.reverse().map(m => ({
            role: m.from_me ? "assistant" : "user",
            content: m.text || (m.media_type ? `[${m.media_type}]` : "")
        }));

        let responseText = "";
        const apiKey = agent.api_key || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error('[AI] ❌ ERRO: Nenhuma API KEY encontrada (Agent ou ENV)');
            return;
        }

        console.log(`[AI] Usando API Key: ${apiKey.substring(0, 5)}...`);
        console.log(`[AI] 🎯 Provider Check: "${agent.provider}" (null check: ${!agent.provider})`);

        // 4. Chamar API do Provider
        console.log('[AI] 🟢 Entrando no bloco de Provider...');

        const providerLower = (agent.provider || '').toLowerCase();
        console.log(`[AI] 🟣 Provider Lowercase: "${providerLower}"`);

        // MOVIDO: Criar messages ANTES de escolher provider (usado por todos)
        const messages = [
            { role: "system", content: agent.prompt || "Você é um assistente útil." },
            ...history,
            { role: "user", content: incomingText }
        ];

        if (providerLower === 'openai' || !agent.provider) {
            console.log('[AI] 🟢 Provider é OpenAI, entrando no TRY block...');
            try {

                console.log('[AI] 🔵 PREPARANDO REQUISIÇÃO OPENAI...');
                console.log('[AI] Model:', agent.config?.model || 'gpt-4o');
                console.log('[AI] Messages Count:', messages.length);
                console.log('[AI] Last User Message:', incomingText);
                console.log('[AI] API Key presente?', !!apiKey);

                const payload = {
                    model: agent.config?.model || "gpt-4o",
                    messages: messages,
                    max_tokens: 500,
                    temperature: 0.7
                };

                console.log('[AI] 📤 ENVIANDO para OpenAI:', JSON.stringify(payload, null, 2));

                const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('[AI] 📥 RESPOSTA RECEBIDA da OpenAI');
                console.log('[AI] Status:', aiRes.status);
                console.log('[AI] Data:', JSON.stringify(aiRes.data, null, 2));

                responseText = aiRes.data.choices[0]?.message?.content || "";
                console.log('[AI] ✅ Conteúdo extraído:', responseText);

            } catch (openaiErr) {
                console.error('[AI] ❌ ERRO COMPLETO:', openaiErr);
                console.error('[AI] ❌ Erro Message:', openaiErr.message);
                console.error('[AI] ❌ Erro Code:', openaiErr.code);
                if (openaiErr.response) {
                    console.error('[AI] ❌ Response Status:', openaiErr.response.status);
                    console.error('[AI] ❌ Response Data:', JSON.stringify(openaiErr.response.data, null, 2));
                    console.error('[AI] ❌ Response Headers:', JSON.stringify(openaiErr.response.headers, null, 2));
                }
            }

        } else if (providerLower === 'gemini') {
            // IMPLEMENTAÇÃO COMPLETA GEMINI
            console.log('[AI] 🟢 Provider é Gemini, entrando no TRY block...');
            try {
                const apiKey = agent.api_key || process.env.GEMINI_API_KEY;

                if (!apiKey) {
                    console.error('[AI] ❌ Gemini API Key não encontrada');
                    responseText = "Erro: API Key do Gemini não configurada.";
                } else {
                    console.log('[AI] 🔵 PREPARANDO REQUISIÇÃO GEMINI...');
                    console.log('[AI] Model:', agent.config?.model || 'gemini-pro');
                    console.log('[AI] API Key presente?', !!apiKey);

                    // Gemini usa formato diferente: array of parts com role
                    // Converter mensagens do formato OpenAI para Gemini
                    const geminiMessages = messages.slice(1).map(msg => {
                        // Gemini usa "user" e "model" ao invés de "user" e "assistant"
                        const role = msg.role === 'assistant' ? 'model' : 'user';
                        return {
                            role: role,
                            parts: [{ text: msg.content }]
                        };
                    });

                    // MODIFICADO: API v1 não suporta systemInstruction
                    // Adicionar system message como primeira mensagem do usuário
                    geminiMessages.unshift({
                        role: 'user',
                        parts: [{ text: messages[0].content }] // System message
                    });

                    // Adicionar resposta fake do modelo para "consumir" a system instruction
                    geminiMessages.splice(1, 0, {
                        role: 'model',
                        parts: [{ text: 'Entendido. Vou seguir essas instruções.' }]
                    });

                    const payload = {
                        contents: geminiMessages,
                        generationConfig: {
                            temperature: agent.config?.temperature || 0.7,
                            maxOutputTokens: agent.config?.max_tokens || 500,
                        }
                    };

                    console.log('[AI] 📤 ENVIANDO para Gemini:', JSON.stringify(payload, null, 2));

                    // VALIDAÇÃO: Usar modelos REAIS da API (verificado via ListModels)
                    let geminiModel = agent.config?.model || 'gemini-2.5-flash';

                    // Mapear para modelos que REALMENTE existem
                    const modelMap = {
                        'gemini-pro': 'gemini-2.5-flash',           // Melhor custo-benefício
                        'gemini-1.5-flash': 'gemini-2.5-flash',
                        'gemini-1.5-flash-latest': 'gemini-flash-latest',
                        'gemini-flash': 'gemini-flash-latest',      // Latest sempre atualizado
                        'gemini-1.5-pro': 'gemini-2.5-pro',        // Mais poderoso
                        'gemini-1.5-pro-latest': 'gemini-pro-latest',
                        'gpt-4': 'gemini-2.5-flash',
                        'gpt-4o': 'gemini-2.5-flash',
                    };

                    if (modelMap[geminiModel]) {
                        console.log(`[AI] ⚠️ Modelo "${geminiModel}" → "${modelMap[geminiModel]}"`);
                        geminiModel = modelMap[geminiModel];
                    }

                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

                    const aiRes = await axios.post(geminiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('[AI] 📥 RESPOSTA RECEBIDA do Gemini');
                    console.log('[AI] Status:', aiRes.status);
                    console.log('[AI] Data:', JSON.stringify(aiRes.data, null, 2));

                    responseText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    console.log('[AI] ✅ Conteúdo extraído:', responseText);
                }
            } catch (geminiErr) {
                console.error('[AI] ❌ ERRO COMPLETO Gemini:', geminiErr);
                console.error('[AI] ❌ Erro Message:', geminiErr.message);
                if (geminiErr.response) {
                    console.error('[AI] ❌ Response Status:', geminiErr.response.status);
                    console.error('[AI] ❌ Response Data:', JSON.stringify(geminiErr.response.data, null, 2));
                }
                responseText = "Erro ao processar com Gemini.";
            }

        } else if (providerLower === 'claude') {
            const apiKey = agent.api_key || process.env.ANTHROPIC_API_KEY;
            responseText = "Integração Claude em breve.";
        }

        console.log(`[AI] Response Text Raw: "${responseText}"`);

        if (!responseText) {
            console.log('[AI] ⚠️ Nenhuma resposta gerada (vazia ou undefined).');
            return;
        }


        console.log(`[AI] Resposta gerada: ${responseText.substring(0, 50)}...`);

        // 5. Buscar token da instância
        const instanceResult = await pool.query(
            'SELECT token FROM whatsapp_instances WHERE instance_name = $1',
            [instanceName]
        );

        const instanceToken = instanceResult.rows[0]?.token;

        if (!instanceToken) {
            console.error(`[AI] ⚠️ Token não encontrado para instância ${instanceName}`);
        }

        // 6. Enviar Resposta no WhatsApp via Evolution API
        const number = chatJid.split('@')[0];

        try {
            await sendEvolutionTextMessage(instanceName, number, responseText, instanceToken);
            console.log(`[AI] ✅ Mensagem enviada com sucesso para ${number}`);
        } catch (sendError) {
            console.error(`[AI] ❌ Erro ao enviar mensagem:`, sendError.message);
            throw sendError;
        }

        // 6. Salvar resposta no banco
        const messageId = `AI_${Date.now()}`;
        const timestamp = Math.floor(Date.now() / 1000);

        // from_me = true
        await pool.query(
            `INSERT INTO whatsapp_messages 
    (user_id, instance_name, message_id, chat_jid, text, from_me, timestamp, status, raw)
    VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), 'sent', '{}')`,
            [userId, instanceName, messageId, chatJid, responseText, true, timestamp]
        );

        console.log('[AI] Ciclo concluído com sucesso.');

    } catch (error) {
        console.log(`[AI] Erro no processamento:`, error.message);
    }
}// --- WEBHOOK TEST ENDPOINT (para testar conectividade) ---
app.get('/api/webhooks/evolution', async (req, res) => {
    console.log('\n========================================');
    console.log('[WEBHOOK TEST] 🔔 GET REQUEST RECEBIDA!');
    console.log('[WEBHOOK TEST] Timestamp:', new Date().toISOString());
    console.log('[WEBHOOK TEST] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[WEBHOOK TEST] Query:', JSON.stringify(req.query, null, 2));
    console.log('========================================\n');
    res.status(200).send('Webhook endpoint is working!');
});

app.post('/api/webhooks/evolution', async (req, res) => {
    // ===== LOGGING CRÍTICO PARA DEBUG =====
    console.log('\n========================================');
    console.log('[WEBHOOK] 🔔 REQUISIÇÃO RECEBIDA!');
    console.log('[WEBHOOK] Timestamp:', new Date().toISOString());
    console.log('[WEBHOOK] URL:', req.url);
    console.log('[WEBHOOK] Method:', req.method);
    console.log('[WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[WEBHOOK] Body completo:', JSON.stringify(req.body, null, 2));
    console.log('========================================\n');

    const webhookData = req.body;
    // Evolution v3 usa "instanceName", não "instance"
    const instance = webhookData?.instanceName || webhookData?.instance;
    const token = req.headers['x-webhook-secret'];

    // TEMPORARIAMENTE desabilitado para testar conectividade
    // if (process.env.EVOLUTION_WEBHOOK_SECRET && token !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    //     console.warn(`[WEBHOOK] ⚠️ Token inválido! Esperado: ${process.env.EVOLUTION_WEBHOOK_SECRET?.substring(0, 5)}..., Recebido: ${token?.substring(0, 5)}...`);
    //     return res.status(401).send('Unauthorized');
    // }

    console.log(`[WEBHOOK] ✅ Evento: ${webhookData.event} | Instância: ${instance}`);
    console.log(`[WEBHOOK] Token recebido: ${token?.substring(0, 10)}...`);
    console.log(`[WEBHOOK] Token esperado: ${process.env.EVOLUTION_WEBHOOK_SECRET?.substring(0, 10)}...`);

    // Evolution v3 envia eventos com nomes diferentes
    // "Message" ao invés de "messages.upsert"
    if (webhookData.event === 'Message') {
        const messageData = webhookData.data;

        // Evolution v3 estrutura: data.Info.* e data.Message.*
        const messageInfo = messageData?.Info;
        const messageContent = messageData?.Message;

        // Ignora se não tiver Info ou Message
        if (!messageInfo || !messageContent) {
            console.log('[WEBHOOK] ⚠️ Mensagem sem Info ou Message, ignorando');
            return res.status(200).send('OK. Ignored - no Info/Message.');
        }

        const dbClient = await pool.connect();
        try {
            const instanceResult = await dbClient.query('SELECT company_id FROM whatsapp_instances WHERE instance_name = $1', [instance]);
            const companyId = instanceResult.rows[0]?.company_id;
            if (!companyId) {
                console.error(`Webhook ignorado: Instância "${instance}" não encontrada ou sem company_id.`);
                return res.status(200).send('OK. Instance not found.');
            }

            // Evolution v3 campos
            const isFromMe = messageInfo.IsFromMe || false;

            // CORREÇÃO: Para mensagens enviadas, usar RecipientAlt ao invés de Chat
            // Chat vem como LID (145303105712227@lid) mas precisamos do JID real
            let chat_jid = messageInfo.Chat;
            if (isFromMe && messageInfo.RecipientAlt) {
                chat_jid = messageInfo.RecipientAlt;
                console.log(`[WEBHOOK] Mensagem enviada: usando RecipientAlt: ${chat_jid}`);
            }

            const contact_name = messageInfo.PushName || (isFromMe ? "Eu" : `Contato ${chat_jid?.split('@')[0]}`);
            const message_id = messageInfo.ID;

            // Extrair texto da mensagem
            // Evolution v3: Message.conversation ou outras variações
            let text = messageContent.conversation ||
                messageContent.extendedTextMessage?.text ||
                messageContent.imageMessage?.caption ||
                messageContent.videoMessage?.caption ||
                messageContent.documentMessage?.caption ||
                "";

            // Extrair mídia (se existir)
            let media_url = null;
            let media_type = null;
            let media_mimetype = null;
            let caption = null;
            let filename = null;

            // Evolution API v3 JÁ ENVIA BASE64 NO WEBHOOK!
            const base64Data = messageContent.base64;

            if (messageContent.imageMessage) {
                media_type = 'image';
                media_mimetype = messageContent.imageMessage.mimetype || 'image/jpeg';
                caption = messageContent.imageMessage.caption || '';
                text = caption;

                // Base64 já vem no webhook
                if (base64Data) {
                    media_url = `data:${media_mimetype};base64,${base64Data}`;
                    console.log(`[WEBHOOK] 🖼️ Imagem recebida (base64): ${media_url.substring(0, 60)}...`);
                } else {
                    media_url = messageContent.imageMessage.URL || messageContent.imageMessage.url;
                    console.log(`[WEBHOOK] ⚠️ Imagem sem base64, usando URL`);
                }
            } else if (messageContent.documentMessage) {
                media_type = 'document';
                media_mimetype = messageContent.documentMessage.mimetype;
                filename = messageContent.documentMessage.fileName;
                caption = messageContent.documentMessage.caption || '';
                text = caption || filename || '';

                // Baixar documento
                try {
                    const instanceToken = await fetchInstanceToken(instance);
                    if (instanceToken) {
                        const instanceAPI = createEvolutionAPI(instanceToken);
                        const downloadRes = await instanceAPI.post('/message/downloadimage', {
                            message: messageContent
                        });

                        if (downloadRes.data?.base64) {
                            media_url = downloadRes.data.base64;
                            console.log(`[WEBHOOK] 📄 Documento baixado: ${filename}`);
                        }
                    }
                } catch (downloadErr) {
                    console.error(`[WEBHOOK] ❌ Erro ao baixar documento:`, downloadErr.message);
                    media_url = messageContent.documentMessage.URL || messageContent.documentMessage.url;
                }
            } else if (messageContent.audioMessage) {
                media_type = 'audio';
                media_mimetype = messageContent.audioMessage.mimetype || 'audio/ogg';
                text = messageContent.audioMessage.PTT ? '[Áudio]' : '[Áudio]';

                // Base64 já vem no webhook
                if (base64Data) {
                    media_url = `data:${media_mimetype};base64,${base64Data}`;
                    console.log(`[WEBHOOK] 🎤 Áudio recebido (base64): ${media_url.substring(0, 60)}...`);
                } else {
                    media_url = messageContent.audioMessage.URL || messageContent.audioMessage.url;
                    console.log(`[WEBHOOK] ⚠️ Áudio sem base64, usando URL`);
                }
            } else if (messageContent.videoMessage) {
                media_type = 'video';
                media_mimetype = messageContent.videoMessage.mimetype;
                caption = messageContent.videoMessage.caption || '';
                text = caption || '[Vídeo]';

                // Baixar vídeo
                try {
                    const instanceToken = await fetchInstanceToken(instance);
                    if (instanceToken) {
                        const instanceAPI = createEvolutionAPI(instanceToken);
                        const downloadRes = await instanceAPI.post('/message/downloadimage', {
                            message: messageContent
                        });

                        if (downloadRes.data?.base64) {
                            media_url = downloadRes.data.base64;
                            console.log(`[WEBHOOK] 🎥 Vídeo baixado: ${media_url.substring(0, 50)}...`);
                        }
                    }
                } catch (downloadErr) {
                    console.error(`[WEBHOOK] ❌ Erro ao baixar vídeo:`, downloadErr.message);
                    media_url = messageContent.videoMessage.URL || messageContent.videoMessage.url;
                }
            }

            // Evolution v3: Timestamp vem como string ISO
            // Ex: "2025-12-12T10:09:21-03:00"
            const timestampStr = messageInfo.Timestamp;
            const timestamp = timestampStr ? Math.floor(new Date(timestampStr).getTime() / 1000) : Math.floor(Date.now() / 1000);

            console.log(`[WEBHOOK] 📩 Processando mensagem:`);
            console.log(`  - Chat: ${chat_jid}`);
            console.log(`  - From: ${contact_name} (FromMe: ${isFromMe})`);
            console.log(`  - Text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            console.log(`  - MessageID: ${message_id}`);

            await dbClient.query('BEGIN');

            // BUSCAR AGENTE PADRÃO PARA NOVOS CHATS
            // Se o chat ainda não existe, vamos atribuir um agente padrão
            // Pega o primeiro agente ativo do usuário
            let defaultAgentId = null;
            let defaultAiActive = false;

            try {
                const agentResult = await dbClient.query('SELECT id FROM ai_agents WHERE company_id = $1 AND is_active = TRUE LIMIT 1', [companyId]);
                if (agentResult.rows.length > 0) {
                    defaultAgentId = agentResult.rows[0].id;
                    defaultAiActive = true; // Ativa IA por padrão se tiver agente
                }
            } catch (agentErr) {
                console.error('Erro ao buscar agente padrão:', agentErr);
            }

            const upsertChatQuery = `
        INSERT INTO whatsapp_chats (company_id, instance_name, jid, title, unread_count, last_message, is_ai_active, ai_agent_id, updated_at)
        VALUES ($1, $2, $3, $4, 1, $5, $7, $8, NOW())
        ON CONFLICT (company_id, instance_name, jid) 
        DO UPDATE SET 
            unread_count = whatsapp_chats.unread_count + (CASE WHEN $6 = true THEN 0 ELSE 1 END),
            last_message = EXCLUDED.last_message,
            title = CASE WHEN whatsapp_chats.title IS NULL OR whatsapp_chats.title = '' THEN EXCLUDED.title ELSE whatsapp_chats.title END,
            updated_at = NOW();
    `;
            await dbClient.query(upsertChatQuery, [companyId, instance, chat_jid, contact_name, text, isFromMe, defaultAiActive, defaultAgentId]);

            const insertMessageQuery = `
        INSERT INTO whatsapp_messages (company_id, instance_name, chat_jid, message_id, from_me, text, timestamp, raw, media_url, media_type, media_mimetype, caption, filename)
        VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), $8, $9, $10, $11, $12, $13)`;

            try {
                await dbClient.query(insertMessageQuery, [
                    companyId, instance, chat_jid, message_id,
                    isFromMe, text, timestamp, webhookData,
                    media_url, media_type, media_mimetype, caption, filename
                ]);
                console.log(`[WEBHOOK] ✅ Mensagem de ${contact_name} (FromMe: ${isFromMe}) salva com sucesso para a empresa ${companyId}`);

                // Auto-cadastro de cliente
                if (!isFromMe && !chat_jid.includes('@g.us')) {
                    try {
                        const number = chat_jid.split('@')[0];
                        await createOrUpdateContact(number, contact_name, 'whatsapp', companyId);
                        console.log(`[WEBHOOK]  Auto-cadastro acionado para ${contact_name} (${number})`);
                    } catch (autoClientErr) {
                        console.error('[WEBHOOK] ⚠️ Erro no auto-cadastro:', autoClientErr.message);
                    }

                    // --- TRIGGER AI AGENT ---
                    try {
                        processAIResponse(companyId, instance, chat_jid, contact_name, text);
                    } catch (aiErr) {
                        console.error('[WEBHOOK] AI Error:', aiErr.message);
                    }

                    // --- TRIGGER FUNNEL AUTOMÁTICO ---
                    try {
                        // Buscar contact_id baseado no número
                        const number = chat_jid.split('@')[0];
                        const contactResult = await pool.query(
                            'SELECT id FROM contacts WHERE phone = $1 LIMIT 1',
                            [number]
                        );

                        if (contactResult.rows.length > 0) {
                            const contactId = contactResult.rows[0].id;

                            // PRIMEIRO: Verificar triggers (antes de atualizar last_user_message_at)
                            await funnelScheduler.checkAndTriggerFunnels(userId, contactId, text);

                            // DEPOIS: Atualizar last_user_message_at (para próximo trigger "sem resposta")
                            if (!isFromMe) {
                                await pool.query(
                                    'UPDATE contacts SET last_user_message_at = NOW() WHERE id = $1',
                                    [contactId]
                                );
                            }
                        } else {
                            console.log(`[WEBHOOK] ⚠️ Contato não encontrado para acionar funnel: ${number}`);
                        }
                    } catch (funnelErr) {
                        console.error('[WEBHOOK] Funnel Trigger Error:', funnelErr.message);
                    }
                }

            } catch (insertError) {
                // Ignora erro de duplicata (código 23505)
                if (insertError.code !== '23505') {
                    throw insertError; // Re-throw se não for erro de duplicata
                }
                console.log(`[WEBHOOK] ⚠️ Mensagem duplicada ignorada: ${message_id}`);
            }

            await dbClient.query('COMMIT');
            console.log(`[WEBHOOK] ✅ Mensagem de ${contact_name} (FromMe: ${isFromMe}) salva com sucesso para o usuário ${userId}`);

        } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error('[WEBHOOK] ❌ ERRO AO PROCESSAR WEBHOOK:', error);
        } finally {
            dbClient.release();
        }
    }

    // Outros eventos (qrcode, connection, etc)
    else if (webhookData.event === 'qrcode.updated') {
        const { qrcode } = webhookData.data;
        if (qrcode && qrcode.base64) {
            qrCodeCache[instance] = qrcode.base64;
            console.log(`[WEBHOOK] QR Code recebido e cacheado para instância ${instance}`);
        }
    }
    else if (webhookData.event === 'connection.update') {
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
    }

    res.status(200).send('OK');
});


// --- ROTAS DE INTEGRAÇÃO META (WhatsApp Cloud + Facebook + Instagram) ---

// 1. Iniciar OAuth do Facebook
app.post('/api/integrations/meta/initiate-oauth', verifyToken, (req, res) => {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/integrations/meta/callback`;
    const scopes = [
        'pages_show_list',
        'pages_messaging',
        'pages_read_engagement',
        'pages_read_user_content',
        'pages_manage_posts',
        'pages_manage_engagement',
        'instagram_basic',
        'instagram_manage_messages',
        'whatsapp_business_management',
        'whatsapp_business_messaging'
    ].join(',');

    const state = Buffer.from(JSON.stringify({ userId: req.user.userId })).toString('base64');
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

    const authUrl = `https://www.facebook.com/${graphVersion}/dialog/oauth?` +
        `client_id=${process.env.META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${scopes}` +
        `&state=${state}`;

    console.log('[Meta OAuth] Iniciando OAuth, redirecionando para:', authUrl);
    res.json({ redirectUrl: authUrl });
});

// 2. Callback do OAuth
app.get('/api/integrations/meta/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

    if (error) {
        console.error('[Meta OAuth] Erro:', error, error_description);
        return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error_description || error)}`);
    }

    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;

        console.log('[Meta OAuth] Trocando code por access_token para userId:', userId);

        // Trocar code por access_token
        const tokenResponse = await axios.get(
            `https://graph.facebook.com/${graphVersion}/oauth/access_token`, {
            params: {
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                redirect_uri: `${backendUrl}/api/integrations/meta/callback`,
                code
            }
        });

        const userAccessToken = tokenResponse.data.access_token;
        console.log('[Meta OAuth] Token obtido com sucesso');

        // Salvar conexão temporária
        const result = await pool.query(
            `INSERT INTO meta_connections (user_id, platform, status, page_access_token) 
     VALUES ($1, 'pending', 'pending', $2) RETURNING id`,
            [userId, userAccessToken]
        );

        const connectionId = result.rows[0].id;

        // Redirecionar para o frontend para seleção de página
        res.redirect(`${frontendUrl}/?meta_action=select_page&connection_id=${connectionId}`);

    } catch (error) {
        console.error('[Meta OAuth] Erro:', error.response?.data || error.message);
        res.redirect(`${frontendUrl}/?error=Falha na autenticação com o Facebook`);
    }
});

// 3. Buscar páginas disponíveis
app.get('/api/integrations/meta/pages', verifyToken, async (req, res) => {
    const { connectionId } = req.query;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

    try {
        const conn = await pool.query(
            'SELECT page_access_token FROM meta_connections WHERE id = $1 AND user_id = $2',
            [connectionId, req.user.userId]
        );

        if (!conn.rows[0]) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }

        const userToken = conn.rows[0].page_access_token;

        // Buscar páginas do usuário
        const pagesResponse = await axios.get(
            `https://graph.facebook.com/${graphVersion}/me/accounts`,
            { params: { access_token: userToken, fields: 'id,name,category,picture,access_token' } }
        );

        console.log('[Meta Pages] Páginas encontradas:', pagesResponse.data.data?.length || 0);
        res.json({ available_pages: pagesResponse.data.data || [] });

    } catch (error) {
        console.error('[Meta Pages] Erro:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erro ao buscar páginas' });
    }
});

// 4. Finalizar conexão com página selecionada
app.post('/api/integrations/meta/finalize', verifyToken, async (req, res) => {
    const { connection_id, page_id, page_access_token } = req.body;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

    try {
        // Buscar info da página
        const pageInfo = await axios.get(
            `https://graph.facebook.com/${graphVersion}/${page_id}`,
            { params: { access_token: page_access_token, fields: 'id,name,instagram_business_account' } }
        );

        const instagramAccountId = pageInfo.data.instagram_business_account?.id || null;

        // Atualizar conexão
        await pool.query(
            `UPDATE meta_connections SET 
        page_id = $1, page_name = $2, page_access_token = $3, 
        instagram_account_id = $4, platform = 'facebook', status = 'active', updated_at = NOW()
     WHERE id = $5 AND user_id = $6`,
            [page_id, pageInfo.data.name, page_access_token, instagramAccountId, connection_id, req.user.userId]
        );

        console.log('[Meta Finalize] Conexão finalizada:', pageInfo.data.name);
        res.json({ success: true, page_name: pageInfo.data.name });

    } catch (error) {
        console.error('[Meta Finalize] Erro:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erro ao finalizar conexão' });
    }
});

// 5. Webhook para receber eventos da Meta (verificação GET)
app.get('/api/webhooks/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Meta Webhook] Verificação recebida:', { mode, token: token?.substring(0, 5) + '...' });

    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
        console.log('[Meta Webhook] Verificação bem-sucedida!');
        res.status(200).send(challenge);
    } else {
        console.log('[Meta Webhook] Verificação falhou');
        res.sendStatus(403);
    }
});

// 6. Webhook para receber eventos da Meta (mensagens POST)
app.post('/api/webhooks/meta', async (req, res) => {
    const body = req.body;
    console.log('[Meta Webhook] Evento recebido:', body.object);

    // Responde imediatamente para a Meta (obrigatório em 5s)
    res.sendStatus(200);

    try {
        // WhatsApp messages
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        const value = change.value;
                        const messages = value.messages || [];

                        for (const msg of messages) {
                            console.log('[WhatsApp Cloud] Mensagem de:', msg.from, '-', msg.text?.body?.substring(0, 50));

                            // Salvar no banco
                            await pool.query(
                                `INSERT INTO unified_messages 
                         (user_id, platform, sender_id, sender_name, message_id, content, direction, raw)
                         SELECT mc.user_id, 'whatsapp', $1, $2, $3, $4, 'inbound', $5
                         FROM meta_connections mc WHERE mc.whatsapp_phone_number_id = $6 LIMIT 1`,
                                [msg.from, value.contacts?.[0]?.profile?.name || msg.from, msg.id, msg.text?.body || '', body, value.metadata?.phone_number_id]
                            );
                        }
                    }
                }
            }
        }

        // Facebook/Instagram messages & FEED (Comentários)
        if (body.object === 'page' || body.object === 'instagram') {
            for (const entry of body.entry || []) {

                // 1. Mensagens Diretas (Inbox)
                for (const msg of entry.messaging || []) {
                    if (msg.message) {
                        console.log(`[${body.object}] Mensagem de DM:`, msg.sender?.id);
                        await pool.query(
                            `INSERT INTO unified_messages 
                     (user_id, platform, sender_id, message_id, content, direction, raw)
                     SELECT mc.user_id, $1, $2, $3, $4, 'inbound', $5
                     FROM meta_connections mc WHERE mc.page_id = $6 LIMIT 1`,
                            [body.object, msg.sender?.id, msg.message?.mid, msg.message?.text || '', body, entry.id]
                        );
                    }
                }

                // 2. Mudanças no Feed (Comentários)
                for (const change of entry.changes || []) {
                    if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
                        const comment = change.value;
                        const commentId = comment.comment_id;
                        const message = comment.message;
                        const senderId = comment.from.id;
                        const postId = comment.post_id;
                        const pageId = entry.id; // O ID da página que recebeu o evento

                        // Ignorar comentários feitos pela própria página
                        if (senderId === pageId) continue;

                        console.log(`[Meta Webhook] Novo comentário em ${postId}: "${message}"`);

                        // --- LÓGICA DE AUTOMAÇÃO ---
                        try {
                            // 1. Identificar o usuário dono da página e o token
                            const connResult = await pool.query(
                                "SELECT user_id, page_access_token FROM meta_connections WHERE page_id = $1 AND status = 'active' LIMIT 1",
                                [pageId]
                            );

                            if (connResult.rows.length === 0) continue;
                            const { user_id, page_access_token } = connResult.rows[0];

                            // 2. Buscar automações ativas deste usuário
                            const autosResult = await pool.query(
                                "SELECT * FROM automations WHERE company_id = $1 AND is_active = TRUE",
                                [user_id]
                            );

                            for (const auto of autosResult.rows) {
                                let match = false;
                                const { post_scope, post_id: targetPostId, condition, keywords } = auto.config;

                                // Verificação de Escopo (Post)
                                if (post_scope === 'all_posts') {
                                    match = true;
                                } else if (post_scope === 'single_post' && postId === targetPostId) {
                                    match = true;
                                } else {
                                    match = false;
                                }

                                if (!match) continue; // Se não bateu o post, pula

                                // Verificação de Condição (Keyword)
                                if (condition === 'any_comment') {
                                    match = true;
                                } else if (condition === 'contains_keyword') {
                                    const keywordsList = Array.isArray(keywords) ? keywords : [];
                                    match = keywordsList.some(k => message.toLowerCase().includes(k.toLowerCase()));
                                } else if (condition === 'exact_keyword') {
                                    const keywordsList = Array.isArray(keywords) ? keywords : [];
                                    match = keywordsList.some(k => message.toLowerCase() === k.toLowerCase());
                                }

                                if (match) {
                                    console.log(`[Automação] Gatilho "${auto.name}" disparado para comentário ${commentId}`);

                                    // Executar Ação
                                    const { type, config: actionConfig } = auto.action;

                                    if (type === 'reply_only' || type === 'reply_and_dm') {
                                        const replyText = actionConfig.reply_message;
                                        if (replyText) {
                                            const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';
                                            // Responder o comentário
                                            await axios.post(
                                                `https://graph.facebook.com/${graphVersion}/${commentId}/comments`,
                                                { message: replyText },
                                                { params: { access_token: page_access_token } }
                                            );
                                            console.log(`[Automação] Resposta enviada para ${commentId}`);
                                        }
                                    }

                                    // TODO: Implementar envio de DM e Integração com IA aqui se necessário
                                    // (Para DM precisa de permissão pages_messaging e obter PSID correto)
                                }
                            }

                        } catch (autoErr) {
                            console.error('[Automação] Erro ao processar:', autoErr);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Meta Webhook] Erro ao processar:', error);
    }
});

// 7. Enviar mensagem WhatsApp Cloud API
app.post('/api/whatsapp/cloud/send', verifyToken, async (req, res) => {
    const { to, text, template_name, template_language } = req.body;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

    if (!to) {
        return res.status(400).json({ error: 'Número de destino é obrigatório' });
    }

    try {
        let messagePayload;

        if (template_name) {
            // Enviar mensagem de template (para iniciar conversas)
            messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'template',
                template: {
                    name: template_name,
                    language: { code: template_language || 'pt_BR' }
                }
            };
        } else {
            // Enviar mensagem de texto (apenas em janela de 24h)
            messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text }
            };
        }

        const response = await axios.post(
            `https://graph.facebook.com/${graphVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            messagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('[WhatsApp Cloud] Mensagem enviada:', response.data.messages?.[0]?.id);
        res.json({ success: true, message_id: response.data.messages?.[0]?.id });

    } catch (error) {
        console.error('[WhatsApp Cloud] Erro ao enviar:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || 'Falha ao enviar mensagem' });
    }
});

// 8. Listar conexões Meta ativas
app.get('/api/integrations/meta/connections', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, page_id, page_name, instagram_account_id, platform, status, created_at
     FROM meta_connections WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC`,
            [req.user.companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('[Meta Connections] Erro:', error);
        res.status(500).json({ error: 'Erro ao buscar conexões' });
    }
});

// --- ROTAS DE SOCIAL FEED (Consumindo Graph API) ---

// 9. Buscar Feed (Posts e Comentários)
app.get('/api/social/feed', verifyToken, async (req, res) => {
    try {
        const { connection_id, after } = req.query;
        let conn;

        // Se passar ID, busca aquela conexão específica. Se não, busca a mais recente.
        if (connection_id) {
            conn = await pool.query(
                "SELECT id, page_access_token, page_id FROM meta_connections WHERE company_id = $1 AND id = $2 AND status = 'active'",
                [req.user.userId, connection_id]
            );
        } else {
            conn = await pool.query(
                "SELECT id, page_access_token, page_id FROM meta_connections WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                [req.user.companyId]
            );
        }

        if (!conn.rows[0]) {
            return res.status(200).json({ comments: [], posts: {} });
        }

        const { id: connId, page_access_token, page_id } = conn.rows[0];
        const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

        // 2. Buscar Posts da Página (com comentários)
        const params = {
            access_token: page_access_token,
            fields: 'id,message,created_time,full_picture,permalink_url,comments.summary(true){id,message,created_time,from,like_count,comments{id,message,created_time,from}}',
            limit: 10
        };

        if (after) {
            params.after = after;
        }

        const response = await axios.get(
            `https://graph.facebook.com/${graphVersion}/${page_id}/feed`,
            { params }
        );

        const postsData = response.data.data || [];
        const paging = response.data.paging || {};

        // 3. Formatar para o formato esperado pelo frontend
        const postsMap = {};
        const commentsList = [];

        postsData.forEach(post => {
            postsMap[post.id] = {
                id: post.id,
                message: post.message,
                created_time: post.created_time,
                full_picture: post.full_picture,
                permalink_url: post.permalink_url
            };

            if (post.comments && post.comments.data) {
                post.comments.data.forEach(comment => {
                    commentsList.push({
                        id: comment.id, // ID único para o front
                        comment_id: comment.id,
                        post_id: post.id,
                        message: comment.message,
                        commenter_name: comment.from?.name || 'Usuário',
                        commenter_id: comment.from?.id, // Útil para saber quem comentou
                        timestamp: comment.created_time,
                        platform: 'facebook',
                        is_liked: false,
                        meta_connection_id: connId,
                        replies: comment.comments?.data?.map(reply => ({
                            id: reply.id,
                            comment_id: reply.id,
                            parent_comment_id: comment.id,
                            post_id: post.id,
                            message: reply.message,
                            commenter_name: reply.from?.name || 'Usuário',
                            commenter_id: reply.from?.id,
                            timestamp: reply.created_time,
                            platform: 'facebook'
                        })) || []
                    });
                });
            }
        });

        res.json({ comments: commentsList, posts: postsMap, paging: { next: paging.next, cursors: paging.cursors }, page_id }); // Retorna page_id também para saber quem sou eu nas threads

    } catch (error) {
        console.error('[Social Feed] Erro Fatal:', error);

        // Tenta extrair erro da API do Facebook
        if (error.response) {
            console.error('[Social Feed] Erro Meta API:', JSON.stringify(error.response.data, null, 2));
            return res.status(error.response.status || 500).json({
                error: 'Erro na Meta API: ' + (error.response.data?.error?.message || 'Erro desconhecido')
            });
        }

        res.status(500).json({ error: 'Erro interno no servidor: ' + error.message });
    }
});

// NOVA ROTA: Listar Posts (para seleção em automações)
app.get('/api/social/posts', verifyToken, async (req, res) => {
    try {
        const { limit = 5, after, connection_id } = req.query; // Default 5 posts

        let conn;
        if (connection_id) {
            conn = await pool.query(
                "SELECT page_access_token, page_id FROM meta_connections WHERE company_id = $1 AND id = $2 AND status = 'active'",
                [req.user.userId, connection_id]
            );
        } else {
            conn = await pool.query(
                "SELECT page_access_token, page_id FROM meta_connections WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                [req.user.companyId]
            );
        }

        if (!conn.rows[0]) {
            return res.status(404).json({ error: 'Nenhuma página conectada encontrada.' });
        }

        const { page_access_token, page_id } = conn.rows[0];
        const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

        const params = {
            access_token: page_access_token,
            fields: 'id,message,created_time,full_picture',
            limit: limit
        };
        if (after) params.after = after;

        const response = await axios.get(
            `https://graph.facebook.com/${graphVersion}/${page_id}/posts`,
            { params }
        );

        res.json({
            posts: response.data.data || [],
            paging: response.data.paging || {}
        });

    } catch (error) {
        console.error('[Social Posts] Erro:', error.message);
        res.status(500).json({ error: 'Erro ao buscar posts.' });
    }
});

// 10. Responder Comentário
// 10. Responder Comentário
app.post('/api/social/comments/reply', verifyToken, async (req, res) => {
    const { comment_id, message, connection_id } = req.body;

    try {
        let conn;
        // Se connection_id for fornecido, usa ele. Senão, busca o mais recente.
        if (connection_id) {
            conn = await pool.query(
                "SELECT page_access_token FROM meta_connections WHERE company_id = $1 AND id = $2 AND status = 'active'",
                [req.user.userId, connection_id]
            );
        } else {
            conn = await pool.query(
                "SELECT page_access_token FROM meta_connections WHERE company_id = $1 AND status = 'active' LIMIT 1",
                [req.user.companyId]
            );
        }

        if (!conn.rows[0]) return res.status(400).json({ error: 'Nenhuma conta conectada.' });

        const { page_access_token } = conn.rows[0];
        const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

        const response = await axios.post(
            `https://graph.facebook.com/${graphVersion}/${comment_id}/comments`,
            { message },
            { params: { access_token: page_access_token } }
        );

        res.json({ success: true, id: response.data.id });
    } catch (error) {
        console.error('[Reply Comment] Erro:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao responder' });
    }
});

// 11. Curtir Comentário
app.post('/api/social/comments/like', verifyToken, async (req, res) => {
    const { comment_id, connection_id } = req.body;

    try {
        let conn;
        // Se connection_id for fornecido, usa ele. Senão, busca o mais recente.
        if (connection_id) {
            conn = await pool.query(
                "SELECT page_access_token FROM meta_connections WHERE company_id = $1 AND id = $2 AND status = 'active'",
                [req.user.userId, connection_id]
            );
        } else {
            conn = await pool.query(
                "SELECT page_access_token FROM meta_connections WHERE company_id = $1 AND status = 'active' LIMIT 1",
                [req.user.companyId]
            );
        }

        if (!conn.rows[0]) return res.status(400).json({ error: 'Nenhuma conta conectada.' });

        const { page_access_token } = conn.rows[0];
        const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

        await axios.post(
            `https://graph.facebook.com/${graphVersion}/${comment_id}/likes`,
            {},
            { params: { access_token: page_access_token } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[Like Comment] Erro:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao curtir' });
    }
});

// --- ROTAS DE AUTOMAÇÕES (CRUD) ---

// Listar Automações
app.get('/api/automations', verifyToken, async (req, res) => {
    try {
        // Ordena por ID DESC (mais recente primeiro)
        const result = await pool.query('SELECT * FROM automations WHERE company_id = $1 ORDER BY id DESC', [req.user.companyId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar automações:', error);
        res.status(500).json({ error: 'Erro interno ao listar automações.' });
    }
});

// Criar Automação
app.post('/api/automations', verifyToken, async (req, res) => {
    const { name, config, action } = req.body;
    try {
        // Adaptando para o schema existente:
        // type: Obrigatório. Vamos usar 'social_reply' para automações de resposta.
        // active/is_active: Vamos setar true em ambos para garantir.
        const type = 'social_reply';

        const result = await pool.query(
            'INSERT INTO automations (user_id, name, type, config, action, active, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.userId, name, type, config, action, true, true]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar automação:', error);
        res.status(500).json({ error: 'Erro interno ao criar automação.' });
    }
});

// Atualizar Automação
app.put('/api/automations/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, config, action } = req.body;
    try {
        const result = await pool.query(
            'UPDATE automations SET name = $1, config = $2, action = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *',
            [name, config, action, id, req.user.userId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Automação não encontrada.' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar automação:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar automação.' });
    }
});

// Excluir Automação
app.delete('/api/automations/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM automations WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Automação não encontrada.' });
        res.json({ message: 'Automação excluída com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir automação:', error);
        res.status(500).json({ error: 'Erro interno ao excluir automação.' });
    }
});

// Toggle Ativar/Desativar
app.patch('/api/automations/:id/toggle', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body; // Front manda is_active
    try {
        // Atualiza tanto active quanto is_active
        const result = await pool.query(
            'UPDATE automations SET is_active = $1, active = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [is_active, id, req.user.userId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Automação não encontrada.' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({ error: 'Erro interno ao alterar status.' });
    }
});


// ============================================
// WEBHOOK - EVOLUTION API (ATIVAR FUNIS AUTOMATICAMENTE)
// ============================================

// Webhook para receber eventos do WhatsApp e ativar funis
app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('[Webhook WhatsApp] 📨 Evento recebido:', event.event);

        // Buscar user_id pela instância
        const instanceResult = await pool.query(
            'SELECT user_id FROM whatsapp_instances WHERE instance_name = $1 LIMIT 1',
            [event.instance]
        );

        if (instanceResult.rows.length === 0) {
            console.log('[Webhook] ⚠️ Instância não encontrada:', event.instance);
            return res.json({ received: true });
        }

        const userId = instanceResult.rows[0].user_id;

        // Processar evento MESSAGES_UPSERT (nova mensagem)
        if (event.event === 'messages.upsert' && event.data?.key?.fromMe === false) {
            const messageData = event.data;
            const chatJid = messageData.key.remoteJid;
            const messageText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || '';

            console.log(`[Webhook] 💬 Nova mensagem de ${chatJid}: ${messageText.substring(0, 50)}`);

            // Auto-cadastrar contato
            const phone = chatJid.split('@')[0];
            let contact = await pool.query('SELECT * FROM contacts WHERE phone = $1', [phone]);

            if (contact.rows.length === 0) {
                // Criar contato
                const contactResult = await pool.query(
                    `INSERT INTO contacts (phone, name, source, temperature, custom_fields) 
            VALUES ($1, $2, 'whatsapp', 'cold', '{}') 
            RETURNING *`,
                    [phone, messageData.pushName || `Contato ${phone}`]
                );
                contact = contactResult;
                console.log('[Webhook] ✅ Contato criado:', phone);
            }

            const contactId = contact.rows[0].id;

            // Buscar funis ativos com trigger_whatsapp
            const funnelsResult = await pool.query(
                `SELECT * FROM funnels 
        WHERE company_id = $1 AND is_active = true`,
                [userId]
            );

            for (const funnel of funnelsResult.rows) {
                const config = funnel.config;
                if (!config || !config.nodes) continue;

                // Verificar se tem trigger_whatsapp
                const hasTrigger = config.nodes.some(node =>
                    node.type === 'trigger_whatsapp' &&
                    (!node.config?.triggerEvent || node.config.triggerEvent === 'new_conversation' || node.config.triggerEvent === 'received_message_keyword')
                );

                if (hasTrigger) {
                    // Verificar se já existe execução ativa para este contato
                    const existingExecution = await pool.query(
                        `SELECT id FROM funnel_executions 
                WHERE funnel_id = $1 AND contact_id = $2 AND status IN ('running', 'waiting')`,
                        [funnel.id, contactId]
                    );

                    if (existingExecution.rows.length === 0) {
                        // Iniciar funil
                        console.log(`[Webhook] 🚀 Iniciando funil "${funnel.name}" para contato ${phone}`);

                        const FunnelEngine = require('./FunnelEngine');
                        const funnelEngine = new FunnelEngine(pool);

                        await funnelEngine.startFunnelForContact(funnel.id, contactId, {
                            message: messageText,
                            chatJid,
                            instanceName: event.instance
                        });
                    }
                }
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[Webhook] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});


// ============================================
// FUNNEL BUILDER API ROUTES
// ============================================

// FunnelEngine já foi importado no topo do arquivo
const funnelEngine = new FunnelEngine(pool);

// 1. GET /api/funnels - Listar todos os funis
app.get('/api/funnels', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM funnels WHERE company_id = $1 ORDER BY created_at DESC',
            [req.user.companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('[Funnels] Erro ao listar:', error);
        res.status(500).json({ error: 'Erro interno ao buscar funis.' });
    }
});

// 2. POST /api/funnels - Criar novo funil
app.post('/api/funnels', verifyToken, async (req, res) => {
    const { name, description, config } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome do funil é obrigatório.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO funnels (user_id, name, description, config, is_active) 
    VALUES ($1, $2, $3, $4, false) 
    RETURNING *`,
            [
                req.user.userId,
                name,
                description || '',
                config || { nodes: [], connections: [] }
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Funnels] Erro ao criar:', error);
        res.status(500).json({ error: 'Erro interno ao criar funil.' });
    }
});

// 3. GET /api/funnels/:id - Buscar funil específico
app.get('/api/funnels/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM funnels WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[Funnels] Erro ao buscar:', error);
        res.status(500).json({ error: 'Erro interno ao buscar funil.' });
    }
});

// 4. PUT /api/funnels/:id - Atualizar funil
app.put('/api/funnels/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active, config } = req.body;

    try {
        const result = await pool.query(
            `UPDATE funnels 
    SET name = $1, description = $2, is_active = $3, config = $4, updated_at = NOW()
    WHERE id = $5 AND user_id = $6
    RETURNING *`,
            [name, description, is_active, config, id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[Funnels] Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar funil.' });
    }
});

// 5. DELETE /api/funnels/:id - Deletar funil
app.delete('/api/funnels/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM funnels WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        res.json({ message: 'Funil deletado com sucesso.' });
    } catch (error) {
        console.error('[Funnels] Erro ao deletar:', error);
        res.status(500).json({ error: 'Erro interno ao deletar funil.' });
    }
});

// 6. POST /api/funnels/:id/toggle - Ativar/Desativar funil
app.post('/api/funnels/:id/toggle', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE funnels 
    SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[Funnels] Erro ao toggle:', error);
        res.status(500).json({ error: 'Erro interno ao alterar status.' });
    }
});

// 7. POST /api/funnels/:id/execute - Executar funil para um contato
app.post('/api/funnels/:id/execute', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { contact_id, trigger_data } = req.body;

    if (!contact_id) {
        return res.status(400).json({ error: 'contact_id é obrigatório.' });
    }

    try {
        const execution = await funnelEngine.startFunnelForContact(id, contact_id, trigger_data || {});
        res.json({ success: true, execution });
    } catch (error) {
        console.error('[Funnels] Erro ao executar:', error);
        res.status(500).json({ error: error.message });
    }
});

// 8. GET /api/funnels/:id/executions - Listar execuções de um funil
app.get('/api/funnels/:id/executions', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status, limit = 50 } = req.query;

    try {
        let query = `
    SELECT fe.*, c.name as contact_name, c.email as contact_email 
    FROM funnel_executions fe
    JOIN funnels f ON f.id = fe.funnel_id
    JOIN contacts c ON c.id = fe.contact_id
    WHERE f.id = $1 AND f.user_id = $2
`;

        const params = [id, req.user.userId];

        if (status) {
            query += ` AND fe.status = $3`;
            params.push(status);
        }

        query += ` ORDER BY fe.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('[Funnels] Erro ao listar execuções:', error);
        res.status(500).json({ error: 'Erro interno ao listar execuções.' });
    }
});

// 9. GET /api/funnels/:id/analytics - Analytics de um funil
app.get('/api/funnels/:id/analytics', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar se funil pertence ao usuário
        const funnelCheck = await pool.query(
            'SELECT id FROM funnels WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (funnelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        // Buscar estatísticas
        const statsQuery = `
    SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
    FROM funnel_executions
    WHERE funnel_id = $1
`;

        const stats = await pool.query(statsQuery, [id]);

        // Buscar performance por nó
        const nodesQuery = `
    SELECT 
        node_id,
        node_type,
        COUNT(*) as executions,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        AVG(duration_ms) as avg_duration_ms
    FROM funnel_action_logs fal
    JOIN funnel_executions fe ON fe.id = fal.execution_id
    WHERE fe.funnel_id = $1
    GROUP BY node_id, node_type
`;

        const nodes = await pool.query(nodesQuery, [id]);

        res.json({
            overview: stats.rows[0],
            nodes: nodes.rows
        });
    } catch (error) {
        console.error('[Funnels] Erro ao buscar analytics:', error);
        res.status(500).json({ error: 'Erro interno ao buscar analytics.' });
    }
});

// 9.5 GET /api/funnels/:id/live-stats - Estatísticas em tempo real (quantos leads em cada nó)
app.get('/api/funnels/:id/live-stats', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar se funil pertence ao usuário
        const funnelCheck = await pool.query(
            'SELECT id, config FROM funnels WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (funnelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado.' });
        }

        const funnel = funnelCheck.rows[0];
        const config = funnel.config;

        // Buscar execuções ativas e waiting
        const activeExecutionsQuery = `
    SELECT 
        current_node_id,
        status,
        COUNT(*) as count
    FROM funnel_executions
    WHERE funnel_id = $1 AND status IN ('running', 'waiting')
    GROUP BY current_node_id, status
`;

        const activeExecutions = await pool.query(activeExecutionsQuery, [id]);

        // Montar estatísticas por nó
        const nodeStats = {};

        // Inicializar todos os nós com 0
        if (config && config.nodes) {
            config.nodes.forEach(node => {
                nodeStats[node.id] = {
                    node_id: node.id,
                    node_type: node.type,
                    node_title: node.title,
                    active_count: 0,
                    waiting_count: 0,
                    total_active: 0
                };
            });
        }

        // Preencher com dados reais
        activeExecutions.rows.forEach(row => {
            if (nodeStats[row.current_node_id]) {
                if (row.status === 'running') {
                    nodeStats[row.current_node_id].active_count = parseInt(row.count);
                } else if (row.status === 'waiting') {
                    nodeStats[row.current_node_id].waiting_count = parseInt(row.count);
                }
                nodeStats[row.current_node_id].total_active =
                    nodeStats[row.current_node_id].active_count +
                    nodeStats[row.current_node_id].waiting_count;
            }
        });

        // Buscar total de execuções ativas
        const totalActiveQuery = `
    SELECT COUNT(*) as total
    FROM funnel_executions
    WHERE funnel_id = $1 AND status IN ('running', 'waiting')
`;
        const totalActive = await pool.query(totalActiveQuery, [id]);

        res.json({
            funnel_id: id,
            total_active: parseInt(totalActive.rows[0].total),
            nodes: Object.values(nodeStats),
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Funnels] Erro ao buscar live stats:', error);
        res.status(500).json({ error: 'Erro interno ao buscar estatísticas.' });
    }
});

// 10. GET /api/funnel-templates - Listar templates
app.get('/api/funnel-templates', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM funnel_templates 
    WHERE is_public = true OR created_by = $1
    ORDER BY usage_count DESC, created_at DESC`,
            [req.user.companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('[Templates] Erro ao listar:', error);
        res.status(500).json({ error: 'Erro interno ao buscar templates.' });
    }
});

// 11. POST /api/funnel-templates - Criar template
app.post('/api/funnel-templates', verifyToken, async (req, res) => {
    const { name, description, category, config, is_public } = req.body;

    if (!name || !config) {
        return res.status(400).json({ error: 'Nome e configuração são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO funnel_templates (name, description, category, config, is_public, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
            [name, description, category, config, is_public || false, req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[Templates] Erro ao criar:', error);
        res.status(500).json({ error: 'Erro interno ao criar template.' });
    }
});

// 12. POST /api/funnels/from-template/:templateId - Criar funil a partir de template
app.post('/api/funnels/from-template/:templateId', verifyToken, async (req, res) => {
    const { templateId } = req.params;
    const { name } = req.body;

    try {
        // Buscar template
        const templateResult = await pool.query(
            'SELECT * FROM funnel_templates WHERE id = $1',
            [templateId]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template não encontrado.' });
        }

        const template = templateResult.rows[0];

        // Criar funil baseado no template
        const funnelResult = await pool.query(
            `INSERT INTO funnels (user_id, name, description, config, is_active)
    VALUES ($1, $2, $3, $4, false)
    RETURNING *`,
            [
                req.user.userId,
                name || template.name,
                template.description,
                template.config
            ]
        );

        // Incrementar usage_count
        await pool.query(
            'UPDATE funnel_templates SET usage_count = usage_count + 1 WHERE id = $1',
            [templateId]
        );

        res.status(201).json(funnelResult.rows[0]);
    } catch (error) {
        console.error('[Templates] Erro ao criar de template:', error);
        res.status(500).json({ error: 'Erro interno ao criar funil.' });
    }
});

// 13. POST /api/funnels/upload-attachment - Upload de anexos para WhatsApp
app.post('/api/funnels/upload-attachment', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        // TODO: Upload para serviço de storage (S3, Cloudinary, etc)
        // Por enquanto, retornar uma URL mock
        const mockUrl = `https://storage.example.com/funnels/${req.file.originalname}`;

        res.json({ url: mockUrl, filename: req.file.originalname });
    } catch (error) {
        console.error('[Upload] Erro:', error);
        res.status(500).json({ error: 'Erro no upload.' });
    }
});

// 14. Webhook genérico para triggers externos
app.post('/api/funnels/webhook/:funnelId', async (req, res) => {
    const { funnelId } = req.params;
    const webhookData = req.body;

    try {
        console.log(`[Webhook] Recebido para funil ${funnelId}:`, webhookData);

        // Verificar se funil existe e está ativo
        const funnelResult = await pool.query(
            'SELECT * FROM funnels WHERE id = $1 AND is_active = true',
            [funnelId]
        );

        if (funnelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funil não encontrado ou inativo.' });
        }

        // TODO: Processar webhook e iniciar funil
        // Extrair contact_id ou email do payload
        // Criar/buscar contato
        // Executar funil

        res.json({ success: true, message: 'Webhook recebido.' });
    } catch (error) {
        console.error('[Webhook] Erro:', error);
        res.status(500).json({ error: 'Erro ao processar webhook.' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});



