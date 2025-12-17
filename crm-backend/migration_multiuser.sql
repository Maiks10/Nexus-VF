-- MIGRATION: Single-User → Multi-User  
-- Execute: sudo -u postgres psql -d crm_database -f /var/www/crm-backend/migration_multiuser.sql

-- 1. COMPANIES
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

-- 2. USERS (adicionar colunas)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"all": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by INT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. ADICIONAR company_id NAS TABELAS
ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);

ALTER TABLE ads_data ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ads_data_company ON ads_data(company_id);

ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON whatsapp_instances(company_id);

ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_company ON whatsapp_chats(company_id);

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_meta_connections_company ON meta_connections(company_id);

ALTER TABLE unified_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_company ON unified_messages(company_id);

ALTER TABLE automations ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON ai_agents(company_id);

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_funnels_company ON funnels(company_id);

-- 4. KANBAN E TASKS TABLES
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

CREATE TABLE IF NOT EXISTS task_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, position)
);
CREATE INDEX IF NOT EXISTS idx_task_lists_company ON task_lists(company_id);

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

-- 5. MIGRATION DE DADOS
DO $$
DECLARE
    v_company_id INT;
BEGIN
    INSERT INTO companies (document, document_type, name, plan, max_users)
    VALUES ('46155879000141', 'CNPJ', 'Nexus Flow', 'premium', 10)
    ON CONFLICT (document) DO NOTHING
    RETURNING id INTO v_company_id;
    
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM companies WHERE document = '46155879000141';
    END IF;
    
    RAISE NOTICE 'Empresa ID: %', v_company_id;
    
    UPDATE users 
    SET company_id = v_company_id,
        name = 'Administrador',
        role = 'admin',
        is_active = true,
        permissions = '{"all": true}'
    WHERE email = 'admin@nexusflow.info';
    
    UPDATE sales SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE ads_data SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE whatsapp_instances SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE whatsapp_chats SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE whatsapp_messages SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE contacts SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE meta_connections SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE unified_messages SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE automations SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE ai_agents SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE funnels SET company_id = v_company_id WHERE company_id IS NULL;
    
    INSERT INTO kanban_columns (company_id, title, color, position)
    VALUES 
        (v_company_id, 'Novo Lead', '#60a5fa', 1),
        (v_company_id, 'Em Contato', '#a78bfa', 2),
        (v_company_id, 'Proposta Enviada', '#f59e0b', 3),
        (v_company_id, 'Em Negociação', '#fbbf24', 4),
        (v_company_id, 'Fechado/Aluno', '#34d399', 5),
        (v_company_id, 'Perdido', '#ef4444', 6)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    INSERT INTO task_lists (company_id, title, position)
    VALUES 
        (v_company_id, 'A Fazer', 1),
        (v_company_id, 'Em Progresso', 2),
        (v_company_id, 'Concluído', 3)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    RAISE NOTICE 'Migration completa!';
END $$;
