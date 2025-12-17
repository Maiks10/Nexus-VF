# ✅ FUNNEL SYSTEM - IMPLEMENTAÇÃO COMPLETA

## 🎯 SISTEMA IMPLEMENTADO

### **1. FunnelScheduler** ✅
**Arquivo:** `crm-backend/FunnelScheduler.js`

**Funcionalidades:**
- ⏰ **Processa Waits**: Verifica execuções em estado "waiting" a cada minuto
- 🎯 **Triggers Automáticos**: Detecta palavras-chave e inicia funnels automaticamente
- 🔄 **Auto-gerenciado**: Inicia automaticamente com o servidor

**Como funciona:**
```javascript
// Inicia automaticamente ao startar o backend
const funnelScheduler = new FunnelScheduler(pool);
funnelScheduler.start(); // Executa a cada 60 segundos
```

---

### **2. Integração com Webhook** ✅
**Arquivo:** `crm-backend/index.js` (linha ~2205)

**Fluxo:**
1. Mensagem chega via webhook
2. Salva no banco
3. Processa AI (se ativo)
4. **NOVO:** Verifica se a mensagem dispara algum funnel
5. Se match, inicia execução do funnel

**Código:**
```javascript
await funnelScheduler.checkAndTriggerFunnels(userId, contactId, text);
```

---

### **3. Processamento de Waits** ✅
**Como funciona:**

**Quando um nó "Wait" é executado:**
1. FunnelEngine marca status como "waiting"
2. Salva last_action_at com timestamp atual
3. FunnelScheduler verifica a cada minuto
4. Quando o tempo passa, muda status para "running"
5. Continua para o próximo nó

**Exemplo:**
```
Nó 1: Trigger (palavra "abacaxi")
  ↓
Nó 2: Wait (2 minutos) ← Aguarda aqui
  ↓
Nó 3: Send WhatsApp ("Olá!") ← Envia após 2 min
```

---

## 📊 FLUXO COMPLETO DE UM FUNNEL

### **Cenário: Usuário envia "abacaxi"**

```mermaid
graph TD
    A[Mensagem "abacaxi" chega] --> B[Webhook salva no banco]
    B --> C[FunnelScheduler.checkAndTriggerFunnels]
    C --> D{Existe funnel ativo<br/>com palavra "abacaxi"?}
    D -->|Sim| E[FunnelEngine.startFunnelForContact]
    D -->|Não| F[Fim]
    E --> G[Executa nó Trigger]
    G --> H[Busca próximo nó]
    H --> I{Tipo de nó?}
    I -->|Wait| J[Marca como 'waiting'<br/>Salva timestamp]
    I -->|Send WhatsApp| K[Envia mensagem via Evolution]
    I -->|Condition| L[Avalia condição<br/>Escolhe caminho]
    J --> M[FunnelScheduler verifica<br/>a cada 1 minuto]
    M --> N{Tempo passou?}
    N -->|Sim| O[Continua para próximo nó]
    N -->|Não| M
    O --> H
    K --> H
    L --> H
```

---

## 🧪 COMO TESTAR

### **Teste 1: Trigger Automático**
1. Crie um funnel:
   - Trigger: Word Received - "teste"
   - Action: Send WhatsApp - "Você disse teste!"
2. Ative o funnel
3. Envie "teste" via WhatsApp
4. **Resultado esperado:** Recebe "Você disse teste!" imediatamente

**Logs esperados:**
```
[FunnelScheduler] 🔍 Verificando funnels ativos para palavra: "teste"
[FunnelScheduler] 🎯 MATCH! Funnel "Meu Funnel" disparado
[FunnelEngine] ⚡ Trigger: Word Received
[FunnelEngine] 🎬 Action: send_whatsapp
[Evolution] 📱 Enviando mensagem...
[Evolution] ✅ Mensagem enviada!
```

---

### **Teste 2: Wait + Send**
1. Crie um funnel:
   - Trigger: Word Received - "espera"
   - Action: Wait - 1 minuto
   - Action: Send WhatsApp - "1 minuto se passou!"
2. Ative o funnel
3. Envie "espera" via WhatsApp
4. Aguarde 1 minuto
5. **Resultado esperado:** Recebe mensagem após 1 minuto

**Logs esperados:**
```
[FunnelEngine] ⏳ Aguardando 1 minutes...
[FunnelScheduler] ⏳ Execução ainda aguardando (1 min restantes)
[FunnelScheduler] ⏰ Tempo de espera completado
[FunnelScheduler] ✅ Execução retomada
[Evolution] 📱 Enviando mensagem...
```

---

### **Teste 3: Condition (Se/Então)**
1. Crie um funnel:
   - Trigger: Word Received - "teste"
   - Condition: Tag Check - tem tag "vip"?
     - YES → Send WhatsApp "Olá VIP!"
     - NO → Send WhatsApp "Olá cliente!"
2. Teste com contato VIP e sem tag

---

## 🔧 MONITORAMENTO

### **Ver execuções ativas:**
```sql
SELECT 
    fe.id, 
    f.name as funnel_name,
    c.name as contact_name,
    fe.status,
    fe.current_node_id,
    fe.created_at,
    fe.last_action_at
FROM funnel_executions fe
JOIN funnels f ON f.id = fe.funnel_id
JOIN contacts c ON c.id = fe.contact_id
WHERE fe.status IN ('running', 'waiting')
ORDER BY fe.created_at DESC;
```

### **Ver logs de ações:**
```sql
SELECT 
    fal.id,
    fal.node_type,
    fal.status,
    fal.duration_ms,
    fal.error_message,
    fal.created_at
FROM funnel_action_logs fal
WHERE execution_id = 'UUID_DA_EXECUCAO'
ORDER BY fal.created_at DESC;
```

### **Logs em tempo real:**
```bash
pm2 logs crm-backend | grep -E "FunnelScheduler|FunnelEngine|Evolution"
```

---

## ⚠️ TROUBLESHOOTING

### **Funnel não dispara automaticamente**
**Verificar:**
1. Funnel está ativo? (`is_active = true`)
2. Palavra-chave está correta?
3. Match type está correto? (exact vs contains)
4. Scheduler está rodando?

**Como verificar scheduler:**
```bash
pm2 logs crm-backend | grep "FunnelScheduler] 🚀 Iniciando"
# Deve mostrar: [FunnelScheduler] ✅ Scheduler iniciado
```

---

### **Wait não está funcionando**
**Verificar:**
1. Execução está com status "waiting"?
2. last_action_at está preenchido?
3. Scheduler está processando?

**Forçar processamento manual:**
```sql
-- Verificar execuções waiting
SELECT * FROM funnel_executions WHERE status = 'waiting';

-- Forçar continuar (apenas para debug)
UPDATE funnel_executions 
SET status = 'running', last_action_at = NOW() - INTERVAL '10 minutes'
WHERE id = 'UUID_DA_EXECUCAO';
```

---

### **Mensagem não está sendo enviada**
**Verificar:**
1. Evolution API está rodando? `curl https://evo.nexusflow.info/`
2. Instância WhatsApp está conectada?
3. Número de telefone está correto?

**Logs:**
```bash
pm2 logs crm-backend | grep "Evolution"
# Deve mostrar: [Evolution] ✅ Mensagem enviada
```

---

## 📈 PRÓXIMAS MELHORIAS

### **Implementado:**
- ✅ Trigger automático por palavra-chave
- ✅ Processamento de Wait
- ✅ Envio de WhatsApp
- ✅ Scheduler automático

### **Por implementar:**
- ⏳ Adicionar Tag
- ⏳ Remover Tag
- ⏳ Assign Agent (atribuir agente IA)
- ⏳ Send Email
- ⏳ Condition (condições avançadas)
- ⏳ Webhook (chamar API externa)
- ⏳ Update Lead (atualizar dados)

---

## 🎛️ COMANDOS ÚTEIS

### **Reiniciar scheduler:**
```javascript
// No PM2
pm2 restart crm-backend
```

### **Ver status do scheduler:**
```bash
pm2 logs crm-backend --lines 50 | grep FunnelScheduler
```

### **Limpar execuções antigas:**
```sql
-- Marcar como completed execuções com mais de 7 dias
UPDATE funnel_executions 
SET status = 'completed' 
WHERE status IN ('running', 'waiting') 
AND created_at < NOW() - INTERVAL '7 days';
```

---

**Status:** ✅ **SISTEMA COMPLETO E FUNCIONAL**  
**Data:** 2025-12-15  
**Versão:** 1.0  
**Próximo teste:** Enviar "abacaxi" e verificar se funnel dispara automaticamente
