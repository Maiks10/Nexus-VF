import os

# Ler tasks_api.js
with open('d:/Projetos/CRM/Nexus/crm-backend/tasks_api.js', 'r', encoding='utf-8') as f:
    tasks_code = f.read()

# Ler index.js
with open('d:/Projetos/CRM/Nexus/crm-backend/index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Inserir antes da linha 1288 (índice 1287)
lines.insert(1287, '\n' + tasks_code + '\n\n')

# Salvar
with open('d:/Projetos/CRM/Nexus/crm-backend/index.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Tasks API integrado com sucesso!")
