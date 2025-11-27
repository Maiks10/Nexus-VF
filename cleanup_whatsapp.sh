#!/bin/bash
# Script de limpeza completa do WhatsApp

echo "=== LIMPEZA COMPLETA DO WHATSAPP ==="
echo ""

# 1. Limpar banco do CRM (Nexus)
echo "1. Limpando tabela whatsapp_instances do CRM..."
docker exec -i postgres psql -U postgresuser -d nexusflow << EOF
DELETE FROM whatsapp_instances WHERE user_id = 2;
SELECT COUNT(*) as "Instâncias Restantes" FROM whatsapp_instances;
EOF

echo ""

# 2. Limpar banco da Evolution API
echo "2. Limpando instâncias da Evolution API..."
docker exec -i evolution-postgres psql -U postgres -d evolution << EOF
DELETE FROM "Instance";
SELECT COUNT(*) as "Instâncias Evolution Restantes" FROM "Instance";
EOF

echo ""

# 3. Limpar Redis
echo "3. Limpando cache do Redis..."
docker exec evolution-redis redis-cli FLUSHALL

echo ""

# 4. Reiniciar Evolution API
echo "4. Reiniciando Evolution API..."
docker restart evolution-api

echo ""
echo "=== AGUARDANDO 10 SEGUNDOS ==="
sleep 10

echo ""
echo "5. Verificando logs da Evolution API..."
docker logs evolution-api --tail 30

echo ""
echo "=== LIMPEZA CONCLUÍDA ==="
echo "Agora você pode:"
echo "1. Recarregar a página do CRM"
echo "2. Criar uma nova conta WhatsApp"
echo "3. Testar a conexão"
