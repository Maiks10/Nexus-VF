-- ============================================
-- SCHEMA COMPLETO CRM - Nexus Flow
-- TODAS as tabelas + Multi-User + Kanban + Tasks
-- ============================================

-- 1. COMPANIES (nova)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(18) UNIQUE NOT NULL,
    document_type VARCHAR(4) NOT NULL CHECK (document_type IN ('CPF', 'CNPJ')),
    plan VARCHAR(50) DEFAULT 'basic',
    max_users INT DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_document ON companies(document);

-- 2. USERS (refatorada)
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

-- 3. CONTACTS (tabela principal de leads/clientes)
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(50) DEFAULT 'manual',
    temperature VARCHAR(20) DEFAULT 'cold',
    kanban_stage VARCHAR(100),
    value DECIMAL(10,2),
    utms JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    lead_score INT DEFAULT 0,
    last_funnel_interaction TIMESTAMP,
    custom_fields JSONB DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
); CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- 4. SALES
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
    user_id INT NOT NULL,
    client_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50),
    platform VARCHAR(50),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);

-- 5. ADS_DATA
CREATE TABLE IF NOT EXISTS ads_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
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
CREATE INDEX IF NOT EXISTS idx_ads_data_company ON ads_data(company_id);

-- 6. WHATSAPP_INSTANCES
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    user_id INT NOT NULL,
    display_name VARCHAR(255),
    instance_name VARCHAR(255) UNIQUE NOT NULL,
    instance_uuid VARCHAR(255),
    status VARCHAR(50) DEFAULT 'disconnected',
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON whatsapp_instances(company_id);

-- 7. WHATSAPP_CHATS
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    user_id INT,
    instance_name VARCHAR(255),
    jid VARCHAR(255),
    title VARCHAR(255),
    avatar_url TEXT,
    image_url TEXT,
    unread_count INT DEFAULT 0,
    last_message TEXT,
    last_message_time TIMESTAMP,
    is_group BOOLEAN DEFAULT FALSE,
    is_ai_active BOOLEAN DEFAULT FALSE,
    ai_agent_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, instance_name, jid)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_company ON whatsapp_chats(company_id);

-- 8. WHATSAPP_MESSAGES
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    user_id INT,
    instance_name VARCHAR(255),
    message_id VARCHAR(255),
    chat_jid VARCHAR(255),
    sender_jid VARCHAR(255),
    text TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    media_mimetype VARCHAR(100),
    caption TEXT,
    filename VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent',
    from_me BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW(),
    raw JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT whatsapp_messages_unique_msg UNIQUE(instance_name, message_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);

-- 9. META_CONNECTIONS
CREATE TABLE IF NOT EXISTS meta_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
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
CREATE INDEX IF NOT EXISTS idx_meta_connections_company ON meta_connections(company_id);

-- 10. UNIFIED_MESSAGES
CREATE TABLE IF NOT EXISTS unified_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
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
CREATE INDEX IF NOT EXISTS idx_unified_messages_company ON unified_messages(company_id);

-- 11. AUTOMATIONS
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,
    action JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);

-- 12. AI_AGENTS
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
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
CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON ai_agents(company_id);

-- 13. FUNNELS
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT REFERENCES companies(id),
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{"nodes": [], "connections": []}',
    stats JSONB DEFAULT '{"total_executions": 0, "completed": 0, "active": 0, "failed": 0}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funnels_company ON funnels(company_id);
CREATE INDEX IF NOT EXISTS idx_funnels_user_active ON funnels(user_id, is_active);

-- 14. FUNNEL_EXECUTIONS
CREATE TABLE IF NOT EXISTS funnel_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    current_node_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    last_action_at TIMESTAMP DEFAULT NOW(),
    context_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_executions_status ON funnel_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_contact ON funnel_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_executions_funnel ON funnel_executions(funnel_id);

-- 15. FUNNEL_ACTION_LOGS
CREATE TABLE IF NOT EXISTS funnel_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES funnel_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    action_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    duration_ms INT,
    executed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_logs_execution ON funnel_action_logs(execution_id);

-- 16. FUNNEL_TEMPLATES
CREATE TABLE IF NOT EXISTS funnel_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    thumbnail_url TEXT,
    config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INT,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 17. FUNNEL_SPLIT_TESTS
CREATE TABLE IF NOT EXISTS funnel_split_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variants JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    winner_variant VARCHAR(10),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 18. LEAD_SCORES
CREATE TABLE IF NOT EXISTS lead_scores (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
    total_score INT DEFAULT 0,
    last_interaction TIMESTAMP,
    score_breakdown JSONB DEFAULT '{}',
    temperature VARCHAR(20) DEFAULT 'cold',
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_scores_contact ON lead_scores(contact_id);

-- 19. KANBAN_COLUMNS (nova)
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

-- 20. TASK_LISTS (nova)
CREATE TABLE IF NOT EXISTS task_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, position)
);
CREATE INDEX IF NOT EXISTS idx_task_lists_company ON task_lists(company_id);

-- 21. TASKS (nova)
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

-- ============================================
-- SEED DATA: Empresa Nexus Flow
-- ============================================
DO $$
DECLARE v_company_id INT; v_user_id INT;
BEGIN
    -- Criar empresa
    INSERT INTO companies (document, document_type, name, plan, max_users)
    VALUES ('46155879000141', 'CNPJ', 'Nexus Flow', 'premium', 10)
    ON CONFLICT (document) DO NOTHING RETURNING id INTO v_company_id;
    
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM companies WHERE document = '46155879000141';
    END IF;
    RAISE NOTICE 'Empresa criada: ID %', v_company_id;
    
    -- Atualizar ou criar usuário admin
    UPDATE users SET company_id = v_company_id, name = 'Administrador', role = 'admin', is_active = true
    WHERE email = 'admin@nexusflow.info';
    
    GET DIAGNOSTICS v_user_id = ROW_COUNT;
    IF v_user_id = 0 THEN
        RAISE NOTICE 'Usuário admin@nexusflow.info não encontrado (será criado no primeiro login)';
    END IF;
    
    -- Kanban columns padrão
    INSERT INTO kanban_columns (company_id, title, color, position) VALUES 
        (v_company_id, 'Novo Lead', '#60a5fa', 1),
        (v_company_id, 'Em Contato', '#a78bfa', 2),
        (v_company_id, 'Proposta Enviada', '#f59e0b', 3),
        (v_company_id, 'Em Negociação', '#fbbf24', 4),
        (v_company_id, 'Fechado/Aluno', '#34d399', 5),
        (v_company_id, 'Perdido', '#ef4444', 6)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    -- Task lists padrão
    INSERT INTO task_lists (company_id, title, position) VALUES 
        (v_company_id, 'A Fazer', 1),
        (v_company_id, 'Em Progresso', 2),
        (v_company_id, 'Concluído', 3)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    RAISE NOTICE 'MIGRATION COMPLETA! ✅';
END $$;
