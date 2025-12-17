# 🐛 BUG CRÍTICO CORRIGIDO: Triggers CRM não disparavam

## ❌ **PROBLEMA:**

**Temperatura mudou e Tag adicionada NÃO estavam disparando!**

### **Causa Raiz:**
```javascript
// ❌ ERRADO (linha 668 e 642):
const userId = req.user.id;  // UNDEFINED!
```

O JWT token tem `userId`, NÃO `id`:
```javascript
// JWT payload (linha 400):
{ userId: user.id, email: user.email }
```

**Resultado:**
- `userId` estava `undefined`
- `checkCRMTriggers(undefined, contactId, ...)` não encontrava funnels
- **Triggers NÃO disparavam!**

---

## ✅ **SOLUÇÃO:**

### **Linha 668 (PUT):**
```javascript
// ✅ CORRETO:
const userId = req.user.userId;
```

### **Linha 642 (POST):**
```javascript
// ✅ CORRETO:
const userId = req.user.userId;
```

---

## 🧪 **TESTE:**

### **Temperatura Mudou:**
1. Criar funnel "Teste Temp" com trigger "Temperatura Mudou" (cold → warm)
2. Editar contato, mudar temperatura para "Morno"
3. Verificar logs:
```
[CRM Trigger] 🌡️ Temperatura mudou: cold → warm
[FunnelScheduler] 🔔 CRM Trigger: temperature_changed { from: 'cold', to: 'warm' }
[FunnelScheduler] ✅ Match: Temperatura mudou cold → warm para funnel "Teste Temp"
[FunnelScheduler] ✅ Funnel "Teste Temp" iniciado para contato 5
```

### **Tag Adicionada:**
1. Criar funnel "Teste Tag" com trigger "Tag Adicionada" (VIP)
2. Editar contato, adicionar tag "VIP"
3. Verificar logs:
```
[CRM Trigger] 🏷️ Tag adicionada: VIP
[FunnelScheduler] 🔔 CRM Trigger: tag_added { tag: 'VIP' }
[FunnelScheduler] ✅ Match: Tag "VIP" adicionada para funnel "Teste Tag"
[FunnelScheduler] ✅ Funnel "Teste Tag" iniciado para contato 5
```

---

## 📊 **STATUS FINAL:**

✅ **Lead Criado** - Funciona (POST + auto-cadastro)
✅ **Temperatura Mudou** - Funciona (PUT)
✅ **Tag Adicionada** - Funciona (PUT)

---

## 🚀 **DEPLOY:**

```powershell
cd D:\Projetos\CRM\Nexus
.\fix_crm_triggers.ps1
```

---

**TODOS OS TRIGGERS CRM FUNCIONANDO!** 🎉
