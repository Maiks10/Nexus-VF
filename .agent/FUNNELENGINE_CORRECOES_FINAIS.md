# ✅ FUNNEL ENGINE - CORREÇÕES APLICADAS

## 📝 Arquivo Corrigido: `FunnelEngine.js`

### ✅ **Mudanças Aplicadas:**

#### **1. Query SELECT corrigida (linha 79)**
**Problema:** `c.* as contact` sobrescrevia `fe.id` (UUID) com `c.id` (INTEGER)

```javascript
// ANTES
SELECT fe.*, f.config, c.* as contact

// DEPOIS
SELECT fe.*, f.config, c.phone, c.name as contact_name, c.email as contact_email
```

---

#### **2. Status WhatsApp corrigido (linha 336)**
**Problema:** Procurava status 'connected' mas o correto é 'open'

```javascript
// ANTES
[execution.user_id, 'connected']

// DEPOIS
[execution.user_id, 'open']
```

---

#### **3. processWait retorna stopExecution (linha 280)**
**Problema:** Continuava executando após marcar como 'waiting'

```javascript
// ANTES
return { success: true, data: { waiting: true, ... } };

// DEPOIS
return { success: true, data: { waiting: true, ... }, stopExecution: true };
```

---

#### **4. moveToNextNode verifica stopExecution (linha 190)**
**Problema:** Não verificava se deveria parar

```javascript
// ANTES
await this.processNode(executionId, nextNodeId);

// DEPOIS
const result = await this.processNode(executionId, nextNodeId);

if (result?.stopExecution) {
    console.log(`[FunnelEngine] ⏸️ Execução pausada - aguardando scheduler`);
    return result;
}

return result;
```

---

## 🚀 PRÓXIMOS PASSOS:

### 1. **Suba via FileZilla:**
- Arquivo: `FunnelEngine.js`
- Local: `d:\Projetos\CRM\Nexus\crm-backend\FunnelEngine.js`
- Destino: `/var/www/crm-backend/FunnelEngine.js`

### 2. **Reinicie o backend:**
```bash
pm2 restart crm-backend
```

### 3. **Teste:**
Envie a palavra-chave via WhatsApp

---

## 📊 COMPORTAMENTO ESPERADO:

```
1. Recebe "amora"
   ↓
2. FunnelScheduler detecta match ✅
   ↓
3. FunnelEngine inicia execução ✅
   ↓
4. Processa trigger_whatsapp ✅
   ↓
5. Processa wait - PARA AQUI ✅
   ↓ (aguarda 2 minutos)
6. Scheduler detecta tempo completado
   ↓
7. Processa send_whatsapp ✅
   ↓
8. Mensagem enviada! 🎉
```

---

**Status:** ✅ **Arquivo local corrigido - pronto para upload**
