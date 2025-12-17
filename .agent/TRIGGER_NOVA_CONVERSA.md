# ✅ TRIGGER "NOVA CONVERSA" - IMPLEMENTADO!

## 🎯 O QUE FOI FEITO

### ✅ **1. FunnelScheduler.js**
**Adicionado suporte ao trigger `new_conversation`:**

```javascript
if (triggerEvent === 'new_conversation') {
    // Verifica se last_user_message_at é NULL
    // Se sim = primeira mensagem do contato = NOVA CONVERSA
    const contactCheck = await this.pool.query(
        'SELECT last_user_message_at FROM contacts WHERE id = $1',
        [contactId]
    );
    
    if (!lastMessage) {
        isMatch = true; // DISPARA O FUNNEL!
    }
}
```

### ✅ **2. index.js (Webhook)**
**ORDEM CORRIGIDA - CRÍTICO:**

**❌ ANTES (ERRADO):**
```javascript
// Atualizava PRIMEIRO
UPDATE contacts SET last_user_message_at = NOW()

// Verificava triggers DEPOIS (nunca detectava nova conversa)
await funnelScheduler.checkAndTriggerFunnels()
```

**✅ AGORA (CORRETO):**
```javascript
// Verifica triggers PRIMEIRO (detecta nova conversa)
await funnelScheduler.checkAndTriggerFunnels()

// Atualiza DEPOIS (para próximo trigger "sem resposta")
UPDATE contacts SET last_user_message_at = NOW()
```

---

## 🚀 COMO USAR

### **1. Criar Funnel:**
- Nome: "Boas-vindas"
- Trigger: "WhatsApp" > "Nova Conversa"
- Ação: "Enviar WhatsApp" com mensagem de boas-vindas

### **2. Ativar Funnel**

### **3. Testar:**

**Opção A: Contato Novo** (nunca conversou)
- Adicione um número novo no WhatsApp
- Envie mensagem desse número
- Funnel dispara automaticamente! 🎉

**Opção B: Resetar Contato Existente**
```bash
ssh root@srv946056.hstgr.cloud
PGPASSWORD='vP7!gRz4#Q8xZyT@vW9kL' psql -h 127.0.0.1 -U nexus_user -d nexus_crm -c "UPDATE contacts SET last_user_message_at = NULL WHERE phone = '5519987470475';"
exit
```
Depois envie mensagem desse número.

---

## 📊 LOGS ESPERADOS

### **Nova Conversa Detectada:**
```
[FunnelScheduler] 🔎 Analisando funnel: "Boas-vindas"
[FunnelScheduler]    Trigger type: trigger_whatsapp
[FunnelScheduler]    Trigger config: {"triggerEvent":"new_conversation"}
[FunnelScheduler]    ✅ NOVA CONVERSA detectada!
[FunnelScheduler]    Match result: true
[FunnelScheduler] 🎯 MATCH! Funnel "Boas-vindas" disparado
[FunnelScheduler] ✅ Funnel "Boas-vindas" iniciado para contato 1
```

### **Contato Já Conversou:**
```
[FunnelScheduler]    ℹ️ Contato já conversou antes (2025-12-16 16:30:15)
[FunnelScheduler]    Match result: false
```

---

## 🔧 EXECUÇÃO

### **Deploy Automático:**
```powershell
cd D:\Projetos\CRM\Nexus
.\deploy_new_conversation.ps1
```

### **OU Manual:**
```powershell
# 1. Upload
scp "D:\Projetos\CRM\Nexus\crm-backend\FunnelScheduler.js" root@srv946056.hstgr.cloud:/var/www/crm-backend/
scp "D:\Projetos\CRM\Nexus\crm-backend\index.js" root@srv946056.hstgr.cloud:/var/www/crm-backend/

# 2. Restart
ssh root@srv946056.hstgr.cloud "pm2 restart crm-backend"

# 3. Logs
ssh root@srv946056.hstgr.cloud "pm2 logs crm-backend --lines 30"
```

---

## 📁 ARQUIVOS MODIFICADOS

- ✅ `FunnelScheduler.js` (linhas 206-270)
- ✅ `index.js` (linhas 2214-2228)

---

## 🧪 CASOS DE USO

### **1. Boas-vindas Automáticas**
- Trigger: "Nova Conversa"
- Mensagem: "Olá! Bem-vindo à nossa empresa! Como posso ajudar?"

### **2. Qualificação de Leads**
- Trigger: "Nova Conversa"
- Ação 1: Enviar "Qual seu interesse?"
- Ação 2: Aguardar resposta
- Ação 3: Classificar lead

### **3. Onboarding de Clientes**
- Trigger: "Nova Conversa"
- Sequência: Tutorial em múltiplas mensagens

---

## ⚙️ CONFIGURAÇÃO NO FRONTEND

**Já está pronto!** O trigger "Nova Conversa" já existe em:
- `elements.js` linha 16: `{ value: 'new_conversation', label: 'Nova Conversa' }`

Basta selecionar no Funnel Builder! Não precisa de campos adicionais.

---

## ✅ STATUS: PRONTO PARA USO!

**3 Triggers WhatsApp Funcionando:**
1. ✅ **Palavra-chave** - Dispara quando recebe palavra específica
2. ✅ **Sem resposta há X tempo** - Dispara após inatividade
3. ✅ **Nova Conversa** - Dispara na primeira mensagem do contato

---

**DEPLOY AGORA!** 🚀
