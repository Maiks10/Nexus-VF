# 📊 ANÁLISE COMPLETA: Trigger "Sem Resposta há X Tempo"

## 🎯 OBJETIVO
Implementar trigger que dispara funnel quando contato não responde há X tempo.

---

## 🗄️ 1. BANCO DE DADOS - Requisitos

### ✅ O que já temos:
- `whatsapp_messages` - armazena mensagens (com `timestamp`, `from_me`)
- `contacts` - dados do contato
- `funnels` - configuração dos funnels
- `funnel_executions` - execuções ativas

### 🔧 O que precisa:

#### A) **Tabela `contacts`** - Adicionar colunas de rastreamento:
```sql
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMP;  -- Última msg do CONTATO (from_me=false)
```

**Por quê?** Otimização! Evita query pesada em `whatsapp_messages` a cada minuto.

#### B) **Atualizar `last_user_message_at` no webhook:**
Quando contato envia mensagem, atualizar `contacts.last_user_message_at = NOW()`.

#### C) **Evitar triggers duplicados:**
Query deve verificar se JÁ existe execução ativa para este contato neste funnel.

---

## 🔄 2. FLUXO COMPLETO DO TRIGGER

### **Tipo 1: "Palavra Recebida" (JÁ FUNCIONA)**
```
Webhook recebe msg → Match keyword → Inicia funnel
```

### **Tipo 2: "Sem Resposta há X tempo" (NOVO)**
```
Scheduler (a cada 5min) → 
  Busca funnels ativos com trigger "no_response" →
  Para cada funnel:
    Busca contatos que:
      - last_user_message_at < NOW() - X minutos
      - NÃO tem execução ativa neste funnel
      - Tem mensagens trocadas (não é contato novo)
    → Inicia funnel para esses contatos
```

---

## 🏗️ 3. ESTRUTURA DE DADOS

### **Trigger Config no Frontend:**
```javascript
{
  type: "trigger_whatsapp",
  config: {
    triggerEvent: "no_response",  // ou "received_message_keyword"
    noResponseTime: 60,  // minutos
    noResponseUnit: "minutes"  // ou "hours", "days"
  }
}
```

### **Exemplo Funnel "Recuperação de Leads":**
```json
{
  "name": "Recuperação de Leads",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger_whatsapp",
      "config": {
        "triggerEvent": "no_response",
        "noResponseTime": 24,
        "noResponseUnit": "hours"
      }
    },
    {
      "id": "msg-1",
      "type": "send_whatsapp",
      "config": {
        "message": "Olá {{nome}}! Ainda está interessado?"
      }
    }
  ]
}
```

---

## 💻 4. IMPLEMENTAÇÃO TÉCNICA

### **A) Frontend (FunnelEditor.jsx)**

1. **UI do Trigger:**
   - Radio button: "Palavra recebida" / "Sem resposta há"
   - Se "Sem resposta": mostrar input numérico + select (minutos/horas/dias)

2. **Salvar config:**
   ```javascript
   {
     triggerEvent: "no_response",
     noResponseTime: 24,
     noResponseUnit: "hours"
   }
   ```

### **B) Backend (index.js - Webhook)**

**Atualizar `last_user_message_at` quando contato envia msg:**
```javascript
// No webhook, após salvar mensagem:
if (!fromMe) {
  await pool.query(
    'UPDATE contacts SET last_user_message_at = NOW() WHERE id = $1',
    [contactId]
  );
}
```

### **C) Backend (FunnelScheduler.js)**

1. **Nova função `checkNoResponseTriggers()`:**
   ```javascript
   async checkNoResponseTriggers() {
     // 1. Buscar funnels com trigger no_response
     const funnels = await this.pool.query(`
       SELECT * FROM funnels 
       WHERE is_active = true 
       AND config->'nodes' @> '[{"type":"trigger_whatsapp"}]'::jsonb
     `);

     for (const funnel of funnels.rows) {
       const triggerNode = funnel.config.nodes.find(n => n.type === 'trigger_whatsapp');
       
       if (triggerNode.config?.triggerEvent === 'no_response') {
         const timeAmount = triggerNode.config.noResponseTime;
         const timeUnit = triggerNode.config.noResponseUnit;
         
         // 2. Calcular intervalo
         const interval = `${timeAmount} ${timeUnit}`;
         
         // 3. Buscar contatos sem resposta
         const contacts = await this.pool.query(`
           SELECT c.id, c.phone, c.name
           FROM contacts c
           WHERE c.last_user_message_at < NOW() - INTERVAL '${interval}'
           AND c.last_user_message_at IS NOT NULL  -- Contato já interagiu antes
           AND NOT EXISTS (
             SELECT 1 FROM funnel_executions fe
             WHERE fe.funnel_id = $1 
             AND fe.contact_id = c.id
             AND fe.status IN ('running', 'waiting')
           )
         `, [funnel.id]);
         
         // 4. Iniciar funnel para cada contato
         for (const contact of contacts.rows) {
           await this.funnelEngine.startFunnelForContact(
             funnel.id, 
             contact.id, 
             { trigger: 'no_response' }
           );
         }
       }
     }
   }
   ```

2. **Adicionar ao scheduler:**
   ```javascript
   async start() {
     setInterval(() => this.processWaitingExecutions(), 60000);  // 1min
     setInterval(() => this.checkNoResponseTriggers(), 300000);  // 5min
   }
   ```

---

## ⚠️ 5. SEGURANÇA & OTIMIZAÇÕES

### **Evitar Spam:**
- ✅ Verificar se já existe execução ativa
- ✅ Não disparar se contato nunca interagiu
- ✅ Limitar quantidade de disparos por verificação (ex: max 100 contatos)

### **Performance:**
- ✅ Usar índice em `contacts.last_user_message_at`
- ✅ Executar `checkNoResponseTriggers()` a cada 5 minutos (não todo minuto)

### **SQL Otimizado:**
```sql
-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contacts_last_user_message 
ON contacts(last_user_message_at) 
WHERE last_user_message_at IS NOT NULL;
```

---

## 📋 6. CHECKLIST DE IMPLEMENTAÇÃO

### **Ordem de Execução:**

1. ✅ **Banco:** Adicionar colunas `last_user_message_at` em `contacts`
2. ✅ **Banco:** Criar índice
3. ✅ **Backend (index.js):** Atualizar `last_user_message_at` no webhook
4. ✅ **Backend (FunnelScheduler.js):** Implementar `checkNoResponseTriggers()`
5. ✅ **Frontend (FunnelEditor.jsx):** UI para configurar tempo
6. ✅ **Teste:** Verificar funcionamento end-to-end

---

## 🧪 7. TESTE COMPLETO

### **Cenário de Teste:**

1. Criar funnel "Teste No Response" com:
   - Trigger: "Sem resposta há 2 minutos"
   - Ação: Enviar "Olá! Ainda aí?"

2. Enviar mensagem como contato
3. Aguardar 2 minutos
4. Verificar se funnel disparou automaticamente

---

**Status:** 📝 **ANÁLISE COMPLETA - PRONTO PARA IMPLEMENTAR**
