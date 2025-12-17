# 🔧 FUNNEL ENGINE - PLANO DE CORREÇÃO

## 📋 PROBLEMAS IDENTIFICADOS

### 1. ⚠️ **Erro 502 ao Enviar Mensagem WhatsApp** 
**Localização:** `crm-backend/index.js` linha 1939  
**Erro:** `Request failed with status code 502`

**Código Atual:**
```javascript
await instanceAPI.post('/send/text', {
    number: number,
    text: responseText
});
```

**Problema:**
- Função `createEvolutionAPI()` **NÃO ESTÁ DEFINIDA**
- Endpoint `/send/text` provavelmente incorreto
- Faltam headers de autenticação

---

### 2. ⚠️ **FunnelEngine Não Envia Mensagens WhatsApp**
**Localização:** `crm-backend/FunnelEngine.js` linha 372

**Código Atual:**
```javascript
async sendWhatsAppAction(config, execution) {
    // ...
    console.log(`[FunnelEngine] 📱 Enviando WhatsApp para ${phone}: ${message}`);
    
    return { success: true, data: { sent: true, to: phone } }; // ❌ NÃO ENVIA!
}
```

**Problema:**
- Apenas faz `console.log`
- **NÃO FAZ CHAMADA À API** Evolution
- Retorna falso sucesso

---

### 3. ⚠️ **Funnels Não São Acionados Automaticamente**
**Problema:** Não há trigger para detectar palavras no webhook

**O que falta:**
1. Webhook detectar mensagens recebidas
2. Verificar funnels ativos com trigger "palavra esperada"  
3. Iniciar execução do funnel automaticamente

---

## 🎯 SOLUÇÕES

### **Solução 1: Corrigir Envio AI (index.js)**

1. **Criar função `createEvolutionAPI`**
2. **Corrigir endpoint** (deve ser `/message/sendText/:instanceName`)
3. **Adicionar autenticação** (Bearer token)

### **Solução 2: Implementar Envio no FunnelEngine**

1. **Importar axios** no FunnelEngine.js
2. **Buscar Evolution API URL** do .env
3. **Implementar chamada real** no `sendWhatsAppAction`

### **Solução 3: Ativar Funnels Automaticamente**

1. **No webhook** (quando recebe mensagem)
2. **Buscar funnels ativos** com trigger "keyword"
3. **Verificar se a mensagem contém** a palavra esperada
4. **Iniciar FunnelEngine** se match

---

## 📝 ARQUIVOS A MODIFICAR

1. ✅ `crm-backend/index.js`
   - Criar `createEvolutionAPI()`
   - Corrigir endpoint de envio
   
2. ✅ `crm-backend/FunnelEngine.js`
   - Implementar `sendWhatsAppAction()` real
   - Adicionar chamada HTTP para Evolution API
   
3. ✅ `crm-backend/index.js` (Webhook)
   - Adicionar lógica de trigger de funnels
   - Integrar com FunnelEngine

---

## 🔑 INFORMAÇÕES NECESSÁRIAS

Para implementar, preciso saber:

1. **Evolution API URL** - Está no .env?
2. **Formato do endpoint correto** - Qual a v3 usa?
3. **Autenticação** - Como é feita?

**Exemplo esperado:**
```javascript
POST https://evolution-v3.example.com/message/sendText/instanceName
Headers: {
  'apikey': 'xxx'
}
Body: {
  "number": "5511999999999",
  "textMessage": {
    "text": "Mensagem aqui"
  }
}
```

---

## 🚀 PRÓXIMOS PASSOS

1. Verificar variáveis de ambiente (.env)
2. Confirmar formato da API Evolution v3
3. Implementar correções
4. Testar envio de mensagem
5. Testar funnel completo

---

**Status**: Aguardando informações de configuração da Evolution API
