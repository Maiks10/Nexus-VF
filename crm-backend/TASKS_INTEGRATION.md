Para integrar os endpoints de Tasks no index.js, adicione o código do arquivo `tasks_api.js` ANTES da linha 1288 (antes de "// --- ROTAS DE AGENDAMENTOS").

Ou copie e cole este bloco completo no index.js na linha 1284 (após o fechamento do Kanban routes):

```javascript
// ============================================
// TASKS LISTS API - Sprint 5  
// ============================================

[COPIE TODO O CONTEÚDO DE tasks_api.js AQUI]
```

Alternativamente, rode no terminal:
```bash
# Inserir na linha correta automaticamente
sed -i '1288 r tasks_api.js' index.js
```
