# 🗑️ COMANDOS PARA RESETAR BANCO DE FUNNELS

## ⚠️ ATENÇÃO: Isso vai DELETAR todos os funnels e execuções!

Execute estes comandos no PostgreSQL:

```sql
-- 1. Dropar todas as tabelas de funnel (ordem importa por causa de foreign keys)
DROP TABLE IF EXISTS funnel_action_logs CASCADE;
DROP TABLE IF EXISTS funnel_executions CASCADE;
DROP TABLE IF EXISTS funnel_split_tests CASCADE;
DROP TABLE IF EXISTS funnel_templates CASCADE;
DROP TABLE IF EXISTS funnels CASCADE;

-- 2. Recriar tabelas com tipos corretos

-- Tabela principal de Funis
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{"nodes": [], "connections": []}',
    is_active BOOLEAN DEFAULT false,
    stats JSONB DEFAULT '{"total_executions": 0, "completed": 0, "failed": 0, "avg_duration_ms": 0}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Execuções (CONTACT_ID COMO INTEGER!)
CREATE TABLE funnel_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    contact_id INT NOT NULL,  -- ✅ INTEGER ao invés de UUID
    current_node_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'running',
    context_data JSONB DEFAULT '{}',
    completed_at TIMESTAMP,
    last_action_at TIMESTAMP DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de Ações
CREATE TABLE funnel_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES funnel_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Templates de Funis
CREATE TABLE funnel_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    config JSONB NOT NULL,
    preview_image TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INT,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- A/B Tests
CREATE TABLE funnel_split_tests (
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

-- Criar índices para performance
CREATE INDEX idx_funnel_executions_status ON funnel_executions(status);
CREATE INDEX idx_funnel_executions_contact ON funnel_executions(contact_id);
CREATE INDEX idx_funnel_executions_funnel ON funnel_executions(funnel_id);
CREATE INDEX idx_funnel_executions_waiting ON funnel_executions(status, last_action_at) WHERE status = 'waiting';
CREATE INDEX idx_funnels_active ON funnels(user_id, is_active) WHERE is_active = true;

-- Confirmar
SELECT 'Tabelas de funnel recriadas com sucesso!' as status;
```

## 📝 COMO EXECUTAR:

### Opção 1: Via psql
```bash
psql -h 127.0.0.1 -U nexus_user -d nexus_crm -f reset_funnels.sql
```

### Opção 2: Via pgAdmin
1. Conecte no banco `nexus_crm`
2. Abra Query Tool
3. Cole o SQL acima
4. Execute (F5)

### Opção 3: Via código Node.js
```javascript
const { Pool } = require('pg');
const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'nexus_user',
    password: 'vP7!gRz4#Q8xZyT@vW9kL',
    database: 'nexus_crm'
});

async function resetFunnelTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Dropar tabelas
        await client.query('DROP TABLE IF EXISTS funnel_action_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS funnel_executions CASCADE');
        await client.query('DROP TABLE IF EXISTS funnel_split_tests CASCADE');
        await client.query('DROP TABLE IF EXISTS funnel_templates CASCADE');
        await client.query('DROP TABLE IF EXISTS funnels CASCADE');
        
        // Recriar (cole o CREATE TABLE aqui)
        
        await client.query('COMMIT');
        console.log('✅ Tabelas recriadas com sucesso!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
    } finally {
        client.release();
    }
}

resetFunnelTables();
```

---

## ✅ DEPOIS DE EXECUTAR:

1. **Reinicie o backend:**
   ```bash
   pm2 restart crm-backend
   ```

2. **Reverta o código do FunnelEngine:**
   - Remova o `::text` e `.toString()`
   - Volte para: `VALUES ($1, $2, $3, 'running', $4)`

3. **Teste novamente:**
   - Crie um funnel novo
   - Envie "abacaxi"
   - Deve funcionar perfeitamente!

---

**Pronto para executar?** 🚀
