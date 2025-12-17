-- ============================================
-- ADICIONAR company_id nas tabelas existentes
-- ============================================

-- 1. USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"all": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by INT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- 2. CONTACTS
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

-- 3. SALES
ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);

-- 4. ADS_DATA
ALTER TABLE ads_data ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ads_data_company ON ads_data(company_id);

-- 5. WHATSAPP_INSTANCES
ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON whatsapp_instances(company_id);

-- 6. WHATSAPP_CHATS
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_company ON whatsapp_chats(company_id);

-- 7. WHATSAPP_MESSAGES
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);

-- 8. META_CONNECTIONS
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_meta_connections_company ON meta_connections(company_id);

-- 9. UNIFIED_MESSAGES
ALTER TABLE unified_messages ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_company ON unified_messages(company_id);

-- 10. AUTOMATIONS
ALTER TABLE automations ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);

-- 11. AI_AGENTS
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON ai_agents(company_id);

-- 12. FUNNELS
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_funnels_company ON funnels(company_id);

-- ============================================
-- SEED DATA: Empresa + migrar dados existentes
-- ============================================
DO $$
DECLARE v_company_id INT; v_user_id INT;
BEGIN
    -- Criar empresa Nexus Flow
    INSERT INTO companies (document, document_type, name, plan, max_users)
    VALUES ('46155879000141', 'CNPJ', 'Nexus Flow', 'premium', 10)
    ON CONFLICT (document) DO NOTHING RETURNING id INTO v_company_id;
    
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM companies WHERE document = '46155879000141';
    END IF;
    RAISE NOTICE 'Empresa: %', v_company_id;
    
    -- Atualizar usuário admin
    UPDATE users SET company_id = v_company_id, name = 'Administrador', role = 'admin', is_active = true
    WHERE email = 'admin@nexusflow.info';
    
    -- Migrar TODOS os dados para essa empresa
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
    
    -- Kanban columns
    INSERT INTO kanban_columns (company_id, title, color, position) VALUES 
        (v_company_id, 'Novo Lead', '#60a5fa', 1),
        (v_company_id, 'Em Contato', '#a78bfa', 2),
        (v_company_id, 'Proposta Enviada', '#f59e0b', 3),
        (v_company_id, 'Em Negociação', '#fbbf24', 4),
        (v_company_id, 'Fechado/Aluno', '#34d399', 5),
        (v_company_id, 'Perdido', '#ef4444', 6)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    -- Task lists
    INSERT INTO task_lists (company_id, title, position) VALUES 
        (v_company_id, 'A Fazer', 1),
        (v_company_id, 'Em Progresso', 2),
        (v_company_id, 'Concluído', 3)
    ON CONFLICT (company_id, position) DO NOTHING;
    
    RAISE NOTICE '✅ MIGRATION COMPLETA!';
END $$;
