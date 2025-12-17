# ✅ FUNNEL ENGINE - CORREÇÕES APLICADAS

## 📝 RESUMO DAS MUDANÇAS

### 1. ✅ Criado `evolutionHelpers.js`
**Arquivo novo:** `crm-backend/evolutionHelpers.js`

**Funcionalidades:**
- `sendEvolutionTextMessage(instanceName, number, text)` - Envia mensagem de texto
- `sendEvolutionMediaMessage(instanceName, number, mediaUrl, caption, mediaType)` - Envia mídia

**Características:**
- ✅ Usa Evolution API v3 correta
- ✅ Endpoint`/message/sendText/:instanceName`
- ✅ Autenticação via header `apikey`
- ✅ Tratamento de erros robusto
- ✅ Logging detalhado

---

### 2. ✅ Corrigido `FunnelEngine.js`

**Mudança principal:**
```javascript
// ❌ ANTES - Apenas console.log
console.log(`[FunnelEngine] 📱 Enviando WhatsApp...`);
return { success: true, data: { sent: true } };

// ✅ DEPOIS - Envio real
const result = await sendEvolutionTextMessage(instanceName, cleanPhone, message);
return { success: true, data: { sent: true, messageId: result.data?.key?.id } };
```

**Melhorias:**
- ✅ Import do `evolutionHelpers`
- ✅ Limpeza do número (remove não-numéricos)
- ✅ Validação de mensagem vazia
- ✅ Envio real via Evolution API
- ✅ Try/catch com erro detalhado

---

### 3. ✅ Corrigido `index.js` (Processamento AI)

**Mudança principal:**
```javascript
// ❌ ANTES - Funções inexistentes
const instanceToken = await fetchInstanceToken(instanceName);
const instanceAPI = createEvolutionAPI(instanceToken);
await instanceAPI.post('/send/text', {...}); // ❌ Endpoint errado

// ✅ DEPOIS - Função correta
await sendEvolutionTextMessage(instanceName, number, responseText);
```

**Melhorias:**
- ✅ Import do `evolutionHelpers`
- ✅ Removidas funções inexistentes
- ✅ Try/catch específico para envio
- ✅ Logging melhorado

---

## 🔧 PONTOS DE ATENÇÃO

### ⚠️ Ainda Falta Implementar

**Trigger Automático de Funnels:**
O sistema ainda NÃO detecta automaticamente quando uma palavra é recebida para iniciar um funnel. 

**O que precisa ser feito:**
1. No webhook (`/api/webhooks/evolution`), após salvar a mensagem
2. Buscar funnels ativos com `trigger_keyword`
3. Verificar se a mensagem contém a keyword
4. Chamar `FunnelEngine.startFunnelForContact()` se match

**Localização:** `crm-backend/index.js` linha ~2198 (após processAIResponse)

---

## 🚀 PRÓXIMOS PASSOS

### Teste 1: Envio AI
1. Envie uma mensagem para o bot
2. Verifique se o AI responde
3. **Esperado:** Mensagem deve chegar via WhatsApp (sem erro 502)

### Teste 2: Funnel Manual
1. Acesse Funnel Builder
2. Crie um funnel:
   - Trigger: Word Received ("teste")
   - Action: Wait 1 minuto
   - Action: Send WhatsApp ("Mensagem de teste")
3. Ative o funnel
4. No banco, execute manualmente:
```sql
SELECT * FROM start_funnel_for_contact(funnel_id, contact_id);
```
5. **Esperado:** Após 1 minuto, a mensagem deve ser enviada

### Teste 3: Funnel Automático (após implementar trigger)
1. Envie a palavra "teste" via WhatsApp
2. **Esperado:** Funnel inicia automaticamente
3. **Esperado:** Após 1 minuto, recebe mensagem

---

## 📊 STATUS ATUAL

| Item | Status | Descrição |
|------|--------|-----------|
| Evolution Helpers | ✅ | Criadas funções de envio |
| FunnelEngine Send WhatsApp | ✅ | Implementado envio real |
| AI Send Message | ✅ | Corrigido erro 502 |
| Trigger Automático Funnel | ⏳ | Ainda não implementado |
| Teste AI Response | 🧪 | Aguardando teste |
| Teste Funnel Manual | 🧪 | Aguardando teste |

---

## 🐛 COMO TESTAR O ERRO 502

**Antes da correção:**
```bash
tail -f /root/.pm2/logs/crm-backend-out.log | grep "502"
```
Deveria mostrar: `Request failed with status code 502`

**Depois da correção:**
```bash
tail -f /root/.pm2/logs/crm-backend-out.log | grep "Evolution"
```
Deveria mostrar:
```
[Evolution] 📱 Enviando mensagem para 5511999999999 via instanceName
[Evolution] ✅ Mensagem enviada com sucesso!
[AI] ✅ Mensagem enviada com sucesso para 5511999999999
```

---

**Data das correções:** 2025-12-15  
**Arquivos modificados:** 3  
**Linhas adicionadas:** ~100  
**Linhas removidas:** ~20
