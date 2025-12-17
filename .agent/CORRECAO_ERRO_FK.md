# 🚨 CORREÇÃO DE ERRO - FUNIL BUILDER

## ❌ Problema Identificado

**Erro**: Foreign key incompatível  
**Causa**: Tabela `contacts` usa `id` como **INTEGER**, mas criamos as tabelas de funil com **UUID**

## ✅ Correção Aplicada

1. ✅ Schema corrigido em `crm-backend/index.js`
2. ✅ Script SQL criado: `fix_funnel_tables.sql`
3. ✅ Script Node.js criado: `fix_funnel_db.js`

---

## 🔧 COMO CORRIGIR (3 Opções)

### **Opção 1: Script Node.js Automático** ⭐ RECOMENDADO

No servidor VPS, execute:

```bash
cd /var/www/crm-backend
node fix_funnel_db.js
```

Isso vai:
- ✅ Dropar tabelas antigas com erro
- ✅ Recriar com tipos corretos
- ✅ Criar índices
- ✅ Adicionar colunas em contacts

Depois:
```bash
pm2 restart crm-backend
```

---

### **Opção 2: SQL Manual**

Se preferir, execute o arquivo SQL diretamente:

```bash
psql -U postgres -d seu_database < fix_funnel_tables.sql
```

Depois reinicie o backend.

---

### **Opção 3: Deixar o Backend Criar** (Mais Lento)

1. Pare o backend: `pm2 stop crm-backend`
2. Conecte no PostgreSQL e drope as tabelas manualmente:
   ```sql
   DROP TABLE IF EXISTS funnel_action_logs CASCADE;
   DROP TABLE IF EXISTS funnel_executions CASCADE;
   DROP TABLE IF EXISTS funnel_split_tests CASCADE;
   DROP TABLE IF EXISTS lead_scores CASCADE;
   DROP TABLE IF EXISTS funnel_templates CASCADE;
   DROP TABLE IF EXISTS funnels CASCADE;
   ```
3. Faça upload do `index.js` corrigido
4. Reinicie: `pm2 start crm-backend`

O backend vai criar as tabelas automaticamente na inicialização.

---

## 📝 MUDANÇAS FEITAS

### **Antes (Com Erro)**
```sql
contact_id UUID REFERENCES contacts(id) -- ❌ ERRADO
```

### **Depois (Correto)**
```sql
contact_id INTEGER REFERENCES contacts(id) -- ✅ CORRETO
```

### **Tabelas Afetadas:**
- `funnel_executions` - contact_id agora é INTEGER
- `lead_scores` - contact_id agora é INTEGER, id agora é SERIAL

---

## 🎯 APÓS CORREÇÃO

1. Reinicie o backend
2. Acesse: `https://nexusflow.info/api/funnels`
3. Deve retornar: `[]` (array vazio) ou lista de funis
4. Interface de funis deve carregar normalmente

---

## 🐛 SE AINDA DER ERRO

Me avise e me mande:
1. Log completo do erro
2. Resultado de: `SELECT * FROM information_schema.tables WHERE table_name LIKE 'funnel%';`
3. Screenshot do erro no navegador

---

## 📦 ARQUIVOS CRIADOS

1. `crm-backend/fix_funnel_tables.sql` - Script SQL
2. `crm-backend/fix_funnel_db.js` - Script Node.js
3. `crm-backend/index.js` - **ATUALIZADO** (já corrigido)

---

**Status**: 🔧 Pronto para corrigir  
**Ação**: Execute a **Opção 1** no servidor agora! 🚀
