# 🎯 ANÁLISE COMPLETA: TRIGGERS CRM (Visão de 20 anos de experiência)

## 📊 **1. ESTADO ATUAL DO BANCO**

### ✅ **Tabela `contacts` JÁ TEM:**
```sql
- id SERIAL PRIMARY KEY
- name VARCHAR(255)
- email VARCHAR(255)
- phone VARCHAR(255)
- source VARCHAR(50) DEFAULT 'manual'
- temperature VARCHAR(20) DEFAULT 'cold'  ← JÁ EXISTE!
- tags TEXT[] (array PostgreSQL)          ← JÁ EXISTE!
- custom_fields JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP
- last_user_message_at TIMESTAMP (recém adicionado)
```

### ✅ **Tags Disponíveis:**
Preciso consultar quais tags existem no sistema para popular o dropdown.

---

## 🏗️ **2. ARQUITETURA DA SOLUÇÃO**

### **DECISÃO TÉCNICA: Trigger em Tempo Real (Opção B)**

#### ❌ **Por que NÃO usar:**
- **PostgreSQL Triggers:** Complexo, difícil de debugar, poluí o banco
- **Scheduler Periódico:** Lag, não é tempo real, gasta recursos

#### ✅ **Por que usar CÓDIGO (Tempo Real):**
```
API PUT /api/clients/:id (linha 632)
  ↓
ANTES de salvar: Buscar valores antigos
  ↓
Comparar: old vs new
  ↓
Detectar mudanças e disparar triggers
  ↓
DEPOIS: Salvar no banco
```

**Vantagens:**
- ✅ Tempo real (instantâneo)
- ✅ Fácil debug (logs claros)
- ✅ Controle total
- ✅ Sem overhead de banco
- ✅ Já temos o código centralizado

---

## 🔄 **3. FLUXO DETALHADO**

### **A) LEAD CRIADO**
```javascript
app.post('/api/clients', async (req, res) => {
  // Criar contato
  const contact = await createContact(data);
  
  // Disparar trigger
  await funnelScheduler.checkCRMTriggers(userId, contact.id, {
    event: 'lead_created',
    data: contact
  });
});
```

### **B) TEMPERATURA MUDOU**
```javascript
app.put('/api/clients/:id', async (req, res) => {
  // Buscar OLD values
  const oldContact = await getContact(id);
  const { temperature } = req.body;
  
  // Detectar mudança
  if (oldContact.temperature !== temperature) {
    // ANTES de salvar, disparar trigger
    await funnelScheduler.checkCRMTriggers(userId, id, {
      event: 'temperature_changed',
      from: oldContact.temperature,  // "cold"
      to: temperature                // "hot"
    });
  }
  
  // DEPOIS salvar
  await updateContact(id, data);
});
```

### **C) TAG ADICIONADA**
```javascript
// Detectar novas tags
const oldTags = oldContact.tags || [];
const newTags = req.body.tags || [];
const addedTags = newTags.filter(t => !oldTags.includes(t));

for (const tag of addedTags) {
  await funnelScheduler.checkCRMTriggers(userId, id, {
    event: 'tag_added',
    tag: tag
  });
}
```

---

## 💻 **4. ESTRUTURA DE DADOS**

### **Frontend (NodeConfigurationPanel.jsx)**

```javascript
{
  type: "trigger_crm",
  config: {
    triggerEvent: "lead_created",  // ou "temperature_changed", "tag_added"
    
    // Para temperature_changed:
    fromTemperature: "any" | "cold" | "warm" | "hot",
    toTemperature: "cold" | "warm" | "hot",
    
    // Para tag_added:
    tagName: "VIP" | "Interessado" | etc
  }
}
```

### **Backend (FunnelScheduler.js)**

Novo método:
```javascript
async checkCRMTriggers(userId, contactId, eventData) {
  const { event, from, to, tag, data } = eventData;
  
  // 1. Buscar funnels ativos do usuário
  const funnels = await this.pool.query(`
    SELECT * FROM funnels
    WHERE user_id = $1 AND is_active = true
  `, [userId]);
  
  for (const funnel of funnels.rows) {
    const triggerNode = funnel.config.nodes.find(n => n.type === 'trigger_crm');
    
    if (!triggerNode) continue;
    
    const config = triggerNode.config;
    
    let isMatch = false;
    
    // LEAD CRIADO
    if (event === 'lead_created' && config.triggerEvent === 'lead_created') {
      isMatch = true;
    }
    
    // TEMPERATURA MUDOU
    if (event === 'temperature_changed' && config.triggerEvent === 'temperature_changed') {
      const fromMatch = config.fromTemperature === 'any' || config.fromTemperature === from;
      const toMatch = config.toTemperature === to;
      isMatch = fromMatch && toMatch;
    }
    
    // TAG ADICIONADA
    if (event === 'tag_added' && config.triggerEvent === 'tag_added') {
      isMatch = config.tagName === tag;
    }
    
    if (isMatch) {
      // Verificar se já existe execução ativa
      const existing = await this.pool.query(`
        SELECT 1 FROM funnel_executions
        WHERE funnel_id = $1 AND contact_id = $2
        AND status IN ('running', 'waiting')
      `, [funnel.id, contactId]);
      
      if (existing.rows.length === 0) {
        // Disparar funnel
        await this.funnelEngine.startFunnelForContact(
          funnel.id,
          contactId,
          { triggeredBy: event, ...eventData }
        );
      }
    }
  }
}
```

---

## 🎨 **5. UI - FRONTEND**

### **A) elements.js**
Já existe `trigger_crm` na linha 71!

### **B) NodeConfigurationPanel.jsx**

```javascript
// Lead Criado - SEM configuração extra
if (config.triggerEvent === 'lead_created') {
  // Nada! Apenas dispara quando cria
}

// Temperatura Mudou
if (config.triggerEvent === 'temperature_changed') {
  return (
    <div className="space-y-3">
      <Label>De (temperatura anterior):</Label>
      <Select 
        value={config.fromTemperature || 'any'} 
        onValueChange={(v) => handleSelectChange('fromTemperature', v)}
      >
        <SelectItem value="any">Qualquer</SelectItem>
        <SelectItem value="cold">Frio</SelectItem>
        <SelectItem value="warm">Morno</SelectItem>
        <SelectItem value="hot">Quente</SelectItem>
      </Select>
      
      <Label>Para (temperatura nova):</Label>
      <Select 
        value={config.toTemperature || 'warm'} 
        onValueChange={(v) => handleSelectChange('toTemperature', v)}
      >
        <SelectItem value="cold">Frio</SelectItem>
        <SelectItem value="warm">Morno</SelectItem>
        <SelectItem value="hot">Quente</SelectItem>
      </Select>
    </div>
  );
}

// Tag Adicionada
if (config.triggerEvent === 'tag_added') {
  return (
    <div className="space-y-3">
      <Label>Quando adicionar tag:</Label>
      <Select 
        value={config.tagName || ''} 
        onValueChange={(v) => handleSelectChange('tagName', v)}
      >
        {availableTags.map(tag => (
          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
```

---

## 🗄️ **6. BUSCAR TAGS EXISTENTES**

### **API Endpoint:**
```javascript
app.get('/api/contacts/tags', verifyToken, async (req, res) => {
  const result = await pool.query(`
    SELECT DISTINCT unnest(tags) as tag_name
    FROM contacts
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
    ORDER BY tag_name
  `);
  
  const tags = result.rows.map(r => r.tag_name);
  res.json({ tags });
});
```

### **Frontend:**
```javascript
const [availableTags, setAvailableTags] = useState([]);

useEffect(() => {
  if (node.type === 'trigger_crm') {
    apiClient.get('/contacts/tags').then(res => {
      setAvailableTags(res.data.tags);
    });
  }
}, [node.type]);
```

---

## 📝 **7. ORDEM DE IMPLEMENTAÇÃO**

1. ✅ **Backend API:** Criar `/api/contacts/tags` (buscar tags)
2. ✅ **Backend Scheduler:** Adicionar `checkCRMTriggers()`
3. ✅ **Backend API:** Modificar PUT `/api/clients/:id` para detectar mudanças
4. ✅ **Backend API:** Modificar POST `/api/clients` para trigger "lead criado"
5. ✅ **Frontend UI:** Adicionar configurações em `NodeConfigurationPanel.jsx`
6. ✅ **Frontend:** Fetch tags quando trigger_crm é selecionado
7. ✅ **Teste:** Criar funnel, mudar temperatura, verificar disparo

---

## ⚠️ **8. PROBLEMAS POTENCIAIS & SOLUÇÕES**

### **Problema 1: Loop Infinito**
**Cenário:** Funnel muda temperatura → dispara outro funnel → muda temperatura de novo...

**Solução:**
```javascript
// Adicionar flag para não disparar recursivamente
const context = { skipTriggers: true };
await updateContact(id, data, context);
```

### **Problema 2: Múltiplos Disparos**
**Cenário:** Muda temperatura E adiciona tag ao mesmo tempo

**Solução:** Já tem! Verifica se existe execução ativa antes de disparar.

### **Problema 3: Tag Removida (não queremos)**
**Solução:** Só detectar `addedTags`, ignorar `removedTags`.

---

## 📊 **9. EXEMPLO DE USO REAL**

### **Caso 1: Lead Quente → Notificar Vendedor**
```
Trigger: Temperatura mudou de "morno" para "quente"
Ação: Enviar WhatsApp para vendedor
```

### **Caso 2: Novo Lead → Boas-vindas**
```
Trigger: Lead criado
Ação: Enviar email de boas-vindas
```

### **Caso 3: Tag "VIP" → Atendimento Premium**
```
Trigger: Tag adicionada "VIP"
Ação: Atribuir agente especial + Enviar mensagem
```

---

## ✅ **10. CHECKLIST FINAL**

**Banco de Dados:**
- ✅ `contacts.temperature` existe
- ✅ `contacts.tags` existe (array)
- ✅ Não precisa criar nada!

**Backend:**
- [ ] Criar GET `/api/contacts/tags`
- [ ] Criar método `FunnelScheduler.checkCRMTriggers()`
- [ ] Modificar PUT `/api/clients/:id`
- [ ] Modificar POST `/api/clients`

**Frontend:**
- [ ] Adicionar UI para configurar triggers CRM
- [ ] Buscar tags disponíveis
- [ ] Selects de temperatura

**Testes:**
- [ ] Criar lead → verificar disparo
- [ ] Mudar temperatura → verificar disparo
- [ ] Adicionar tag → verificar disparo

---

**Status:** 📝 **ANÁLISE COMPLETA - PRONTO PARA IMPLEMENTAR!**
