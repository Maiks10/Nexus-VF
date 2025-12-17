# 🚀 PROPOSTAS DE AUTOMAÇÃO - FUNNEL BUILDER NEXUS CRM

## 📊 ANÁLISE DO SISTEMA ATUAL

### Tecnologias Já Implementadas:
- ✅ **WhatsApp Integration** (Evolution API)
- ✅ **AI Agents** (OpenAI, Gemini, Claude)
- ✅ **Gatilhos de Plataformas**: Hotmart, Kiwify, Green, Ticto, Kirvano, Cakto
- ✅ **Email Marketing**
- ✅ **Sistema de Tags**
- ✅ **Gestão de Leads/Contatos**
- ✅ **Banco de Dados PostgreSQL**
- ✅ **Sistema de Temperatura de Leads** (Cold, Warm, Hot)

### Funcionalidades Existentes no Funnel Builder:
- Canvas visual com React Flow
- Triggers de plataformas de pagamento
- Ações: Email, WhatsApp, Atribuir Agente IA, Adicionar Tag
- Lógica: Condições e Aguardar
- Sistema de configuração por nó

---

## 💡 PROPOSTA 1: FUNIL DE QUALIFICAÇÃO E NURTURING INTELIGENTE

### 🎯 Objetivo
Qualificar leads automaticamente através de conversas no WhatsApp, atribuir temperatura e nutrir até a conversão, com integração completa de IA e ações condicionais.

### 📋 Cenário de Uso
**Para quem vende**: Infoprodutos, Cursos Online, Mentorias, Serviços de Alto Valor

### 🔄 Fluxo da Automação

```
┌─────────────────────────────────────────────────────┐
│ 1. GATILHO: Nova Conversa WhatsApp                 │
│    - Trigger: new_conversation (WhatsApp)          │
│    - Detecta primeiro contato do lead               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. AÇÃO: Auto-cadastrar Lead                       │
│    - Criar contato no CRM                          │
│    - Source: "whatsapp"                            │
│    - Temperature: "cold"                           │
│    - Extrair nome do push_name                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. AÇÃO: Atribuir Agente IA de Qualificação       │
│    - Agente: "Qualificador Master"                │
│    - Objetivo: Descobrir dor, orçamento, urgência  │
│    - Fazer 3-5 perguntas qualificadoras            │
│    - Armazenar respostas em custom_fields          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. AGUARDAR: 2 horas                               │
│    - Dar tempo para o lead responder               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. CONDIÇÃO: Lead respondeu?                       │
│    - Verificar se há mensagens do lead             │
│    - Tag: "respondeu_qualificacao"                 │
└─────────────────────────────────────────────────────┘
         ↓ SIM                        ↓ NÃO
         │                            │
         │                   ┌────────────────────┐
         │                   │ 6A. Enviar WhatsApp│
         │                   │ Lembrete suave     │
         │                   │ + Gatilho Mental   │
         │                   └────────────────────┘
         │                            ↓
         │                   ┌────────────────────┐
         │                   │ TAG: "no_response" │
         │                   │ Temperatura: cold  │
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 6B. ANÁLISE DE TEMPERATURA (por IA)               │
│    - IA analisa respostas do lead                  │
│    - Classifica: Cold/Warm/Hot                     │
│    - Atualiza campo "temperature" no DB            │
│    - Adiciona tags baseadas em interesse           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. CONDIÇÃO: Temperatura = HOT?                    │
└─────────────────────────────────────────────────────┘
         ↓ SIM                        ↓ NÃO
         │                            │
┌────────────────────┐      ┌──────────────────────────┐
│ 8A. Ação Imediata  │      │ 8B. Nurturing Programado │
│ - Notificar time   │      │ - Sequência de emails    │
│ - Tag: "hot_lead"  │      │ - Mensagens WhatsApp     │
│ - Agendar call     │      │ - Conteúdo educativo     │
│ - Enviar proposta  │      │ - Estudos de caso        │
└────────────────────┘      └──────────────────────────┘
         │                            │
         │                   ┌────────────────────┐
         │                   │ 9. AGUARDAR 3 dias│
         │                   └────────────────────┘
         │                            ↓
         │                   ┌────────────────────┐
         │                   │ 10. Re-engajamento│
         │                   │ - Oferta especial  │
         │                   │ - Bônus limitado   │
         │                   │ - Prova social     │
         │                   └────────────────────┘
         │                            │
         └────────────────┬───────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 11. GATILHO: Compra Aprovada (Hotmart/Kiwify)     │
│     - Webhook de venda                             │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 12. Atualizar Lead → Cliente                       │
│     - Status: "Active"                             │
│     - Stage: "student"                             │
│     - Tag: "cliente_ativo"                         │
│     - Temperatura: "hot"                           │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 13. Mensagem de Boas-vindas + Onboarding          │
│     - WhatsApp com dados de acesso                 │
│     - Email com material complementar              │
│     - Atribuir Agente IA de Suporte               │
└─────────────────────────────────────────────────────┘
```

### 🛠️ Funcionalidades a Implementar

#### 1. **Enhanced Triggers**
- ✅ Já existe: `new_conversation` (WhatsApp)
- 🆕 `keyword_detected` - Detectar palavras-chave específicas
- 🆕 `no_response_timeout` - Gatilho quando lead não responde
- 🆕 `temperature_changed` - Quando temperatura do lead muda
- 🆕 `custom_field_updated` - Quando campo personalizado é atualizado

#### 2. **Advanced Actions**
- 🆕 **Update Lead Data** (nova action)
  - Atualizar temperatura (cold/warm/hot)
  - Adicionar/remover tags múltiplas
  - Atualizar custom_fields
  - Mover para stage no Kanban
  
- 🆕 **AI Analysis** (nova action)
  - Enviar conversa para IA analisar
  - Classificar interesse/urgência/budget
  - Retornar classificação de temperatura
  - Sugerir próximas ações

- 🆕 **Send Notification** (nova action)
  - Notificar equipe de vendas
  - Interno (dentro do CRM)
  - Email para equipe
  - Slack/Discord webhook

- 🆕 **Create Task/Appointment** (nova action)
  - Criar tarefa para vendedor
  - Agendar follow-up automático
  - Integrar com calendário

#### 3. **Smart Conditions**
- 🆕 **Response Check**: Verificar se lead respondeu em X tempo
- 🆕 **Tag Verification**: Múltiplas tags (AND/OR logic)
- 🆕 **Temperature Check**: Verificar temperatura atual
- 🆕 **Time-based**: Dia da semana, hora do dia
- 🆕 **Custom Field Match**: Verificar valores em campos personalizados
- 🆕 **Message Count**: Quantas mensagens foram trocadas

#### 4. **Multi-Channel Actions**
- 🆕 Enviar para múltiplos canais simultaneamente
- Escolher canal preferido do lead
- Fallback automático (WhatsApp → Email se não responder)

---

## 💡 PROPOSTA 2: FUNIL DE RECUPERAÇÃO DE CARRINHO & MAXIMIZAÇÃO DE VENDAS

### 🎯 Objetivo
Recuperar carrinhos abandonados, fazer upsell/cross-sell pós-venda e prevenir cancelamentos através de automações inteligentes.

### 📋 Cenário de Uso
**Para quem vende**: E-commerce, Infoprodutos, Assinaturas, SaaS

### 🔄 Fluxo da Automação

```
┌─────────────────────────────────────────────────────┐
│ 1. GATILHO: Carrinho Abandonado                   │
│    - Hotmart: cart_abandonment                     │
│    - Kiwify: cart_abandoned                        │
│    - Webhook da plataforma                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Identificar Lead no CRM                         │
│    - Buscar por email do abandono                  │
│    - Se não existir, criar novo lead               │
│    - Tag: "carrinho_abandonado"                    │
│    - Salvar produto no custom_field                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. AGUARDAR: 1 hora                                │
│    - Tempo para o lead completar compra            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. CONDIÇÃO: Compra foi finalizada?                │
│    - Verificar tag "comprou"                       │
│    - Evitar mensagens desnecessárias               │
└─────────────────────────────────────────────────────┘
         ↓ NÃO                        ↓ SIM
         │                            │
         │                   ┌────────────────────┐
         │                   │ FIM - Comprou :)   │
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 5A. Email #1: Lembrete Suave                       │
│    - "Você esqueceu algo no carrinho"              │
│    - Mostrar produto                               │
│    - Botão direto para checkout                    │
│    - Sem desconto ainda                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. WhatsApp #1: Personalizado com IA               │
│    - Agente IA: "Recovery Specialist"              │
│    - Pergunta objeção principal                    │
│    - Responde dúvidas em tempo real                │
│    - Timing: 30min após email                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. AGUARDAR: 12 horas                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 8. CONDIÇÃO: Comprou?                              │
└─────────────────────────────────────────────────────┘
         ↓ NÃO                        ↓ SIM
         │                            │
         │                   ┌────────────────────┐
         │                   │ Tag: "recuperado"  │
         │                   │ FIM                │
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 9. Email #2: Desconto Exclusivo                    │
│    - Cupom de 10-15% OFF                           │
│    - Frase de escassez: "Válido por 24h"          │
│    - Countdown timer                               │
│    - Depoimentos de clientes                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 10. AGUARDAR: 24 horas                             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 11. CONDIÇÃO: Comprou?                             │
└─────────────────────────────────────────────────────┘
         ↓ NÃO                        ↓ SIM
         │                            │
         │                   ┌────────────────────┐
         │                   │ Tag: "cupom_usado" │
         │                   │ FIM                │
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 12. WhatsApp #2: Última Chance                     │
│     - "Seu cupom expira em 6h"                     │
│     - Oferta final                                 │
│     - Agente IA para negociar                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 13. Se não comprou: Adicionar em Nurturing         │
│     - Tag: "nao_converteu_abandono"                │
│     - Temperatura: "warm"                          │
│     - Incluir em sequência educacional             │
└─────────────────────────────────────────────────────┘

[FLUXO PARALELO - PÓS-VENDA]

┌─────────────────────────────────────────────────────┐
│ A. GATILHO: Compra Aprovada                        │
│    - Hotmart: purchase_approved                    │
│    - Kiwify: order_paid                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ B. Boas-vindas Imediata                            │
│    - Email com credenciais                         │
│    - WhatsApp com vídeo de boas-vindas            │
│    - Tag: "novo_cliente"                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ C. AGUARDAR: 3 dias                                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ D. Check-in de Satisfação                          │
│    - WhatsApp com IA: "Como está sendo?"           │
│    - Coletar feedback                              │
│    - Identificar problemas cedo                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ E. CONDIÇÃO: Cliente satisfeito?                   │
│    - Análise de sentimento por IA                  │
└─────────────────────────────────────────────────────┘
         ↓ SIM                        ↓ NÃO
         │                            │
         │                   ┌────────────────────┐
         │                   │ F. Suporte Humano  │
         │                   │ - Notificar time   │
         │                   │ - Resolver problema│
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ G. AGUARDAR: 7 dias                                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ H. Oferta de Upsell                                │
│    - Produto complementar                          │
│    - Desconto especial para cliente               │
│    - WhatsApp + Email                              │
│    - "Baseado no que você comprou..."             │
└─────────────────────────────────────────────────────┘
```

### 🛠️ Funcionalidades a Implementar

#### 1. **E-commerce Triggers**
- ✅ Já existe: cart_abandonment (Hotmart, Kiwify, etc)
- 🆕 `purchase_milestone` - 7 dias, 30 dias após compra
- 🆕 `product_viewed` - Lead visualizou página de vendas
- 🆕 `payment_pending` - Boleto gerado mas não pago
- 🆕 `chargeback_alert` - Prevenção de cancelamento

#### 2. **Dynamic Content Actions**
- 🆕 **Personalized Email/WhatsApp**
  - Variáveis dinâmicas: {nome}, {produto}, {valor}, {cupom}
  - Templates salvos no sistema
  - Preview antes de enviar
  - A/B testing de mensagens

- 🆕 **Generate Coupon**
  - Criar cupom único por lead
  - Definir % de desconto
  - Tempo de expiração
  - Tracking de uso

- 🆕 **Product Recommendation Engine**
  - IA sugere produtos baseado em:
    - Histórico de compras
    - Produtos relacionados
    - Comportamento similar de clientes

#### 3. **Anti-Churn Actions**
- 🆕 **Sentiment Analysis**
  - Analisar mensagens do cliente
  - Detectar insatisfação
  - Score de risco de cancelamento
  - Alertar equipe

- 🆕 **Win-back Campaign**
  - Para clientes que cancelaram
  - Oferta especial de retorno
  - Descobrir motivo do cancelamento

---

## 💡 PROPOSTA 3: FUNIL DE ATENDIMENTO OMNICHANNEL COM IA

### 🎯 Objetivo
Criar um atendimento 24/7 completo, integrando WhatsApp, Email, Instagram e Telegram, com roteamento inteligente e escalação automática para humanos quando necessário.

### 📋 Cenário de Uso
**Para quem precisa**: Empresas com alto volume de atendimento, E-commerce, SaaS, Serviços

### 🔄 Fluxo da Automação

```
┌─────────────────────────────────────────────────────┐
│ 1. GATILHOS MÚLTIPLOS (Omnichannel)               │
│    - WhatsApp: new_conversation                    │
│    - Instagram: dm_received                        │
│    - Telegram: message_received                    │
│    - Email: new_email                              │
│    - Formulário Web: form_submitted                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Unificar Conversa                               │
│    - Criar thread única no CRM                     │
│    - Identificar lead por phone/email              │
│    - Mesclar histórico de todos os canais          │
│    - Tag: "canal_{origem}"                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. CONDIÇÃO: Horário Comercial?                    │
│    - Seg-Sex 9h-18h                                │
│    - Fora do horário: IA Full                      │
│    - Dentro: IA + Possível Escalação               │
└─────────────────────────────────────────────────────┘
         ↓ COMERCIAL                  ↓ FORA
         │                            │
         │                   ┌────────────────────┐
         │                   │ 4A. IA Atendimento │
         │                   │ - Resolver dúvidas │
         │                   │ - Coletar dados    │
         │                   │ - Agendar callback │
         │                   │ - Tag: "fora_horário"│
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 4B. Classificar Tipo de Atendimento (IA)          │
│    - Suporte Técnico                               │
│    - Dúvida Pré-venda                             │
│    - Financeiro/Pagamento                          │
│    - Reclamação/Problema                           │
│    - Elogio/Feedback                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. Roteamento Inteligente                          │
│    - Suporte → Agente IA Técnico                  │
│    - Pré-venda → Agente IA Vendedor               │
│    - Reclamação → URGENTE (humano)                │
│    - Financeiro → Base conhecimento + IA          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. IA Inicia Atendimento                           │
│    - Confirma categoria detectada                  │
│    - Faz perguntas para contexto                   │
│    - Busca na base de conhecimento                 │
│    - Tenta resolver autonomamente                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. Score de Complexidade (em tempo real)          │
│    - IA avalia: Posso resolver? (0-100)           │
│    - < 50: Precisa humano                         │
│    - 50-80: Tenta resolver mas monitora           │
│    - > 80: IA resolve sozinha                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 8. CONDIÇÃO: Score < 50 OU Cliente insistiu?      │
└─────────────────────────────────────────────────────┘
         ↓ SIM                        ↓ NÃO
         │                            │
┌────────────────────┐      ┌──────────────────────────┐
│ 9A. Escalar Humano │      │ 9B. IA Continua          │
│ - Notificar equipe │      │ - Resolve problema       │
│ - Fila por prioridade│   │ - Registra solução      │
│ - Passar contexto  │      │ - Pede feedback         │
│ - Tag: "escalado"  │      │ - Tag: "resolvido_ia"   │
└────────────────────┘      └──────────────────────────┘
         │                            │
         │                            ↓
         │                   ┌────────────────────┐
         │                   │ 10B. Satisfação    │
         │                   │ - Emoji: 😀😐😞    │
         │                   │ - NPS score        │
         │                   │ - Guardar feedback │
         │                   └────────────────────┘
         │
┌─────────────────────────────────────────────────────┐
│ 10A. Atendente Humano Assume                       │
│     - Inbox com histórico completo                 │
│     - IA já coletou informações                    │
│     - Sugestões da IA para resolver                │
│     - Atendente resolve                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 11. Registrar Solução                              │
│     - Tempo de atendimento                         │
│     - Categoria final                              │
│     - Solução aplicada                             │
│     - Treinar IA com a solução                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 12. Follow-up Automático (24h depois)              │
│     - "Tudo resolvido?"                            │
│     - Se sim: pedir avaliação                      │
│     - Se não: reabrir atendimento                  │
└─────────────────────────────────────────────────────┘

[FLUXO PARALELO - PRÉ-VENDA]

┌─────────────────────────────────────────────────────┐
│ P1. Categoria: Dúvida Pré-venda                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ P2. Agente IA Vendas                               │
│     - Qualifica interesse                          │
│     - Identifica produto de interesse              │
│     - Envia materiais (PDF, vídeos, cases)        │
│     - Responde objeções                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ P3. CONDIÇÃO: Lead está quente?                    │
│     - IA detecta sinais de compra                  │
│     - Fez múltiplas perguntas                      │
│     - Perguntou sobre preço/condições              │
└─────────────────────────────────────────────────────┘
         ↓ SIM                        ↓ NÃO
         │                            │
┌────────────────────┐      ┌──────────────────────────┐
│ P4A. Urgência      │      │ P4B. Nurturing           │
│ - Notifica vendedor│      │ - Tag: "considerando"    │
│ - Enviar proposta  │      │ - Sequência educacional  │
│ - Agendar call     │      │ - Follow-up em 3 dias    │
│ - Oferta limitada  │      │ - Temperatura: "warm"    │
└────────────────────┘      └──────────────────────────┘
```

### 🛠️ Funcionalidades a Implementar

#### 1. **Omnichannel Inbox**
- 🆕 **Unified Conversation Thread**
  - Todas as mensagens em um só lugar
  - Histórico completo do lead
  - Identificação automática cross-channel
  - Respostas de qualquer canal

- 🆕 **Channel Preferences**
  - Detectar canal preferido do lead
  - Usar canal com maior taxa de abertura
  - Fallback automático

#### 2. **AI-Powered Routing**
- 🆕 **Intent Classification**
  - NLP para detectar intenção
  - Categorização automática
  - Confiança da classificação (%)

- 🆕 **Automatic Escalation**
  - Regras de escalação
  - Fila de prioridade
  - SLA tracking
  - Notificação de atendentes

- 🆕 **Smart Assignment**
  - Atribuir ao atendente certo
  - Baseado em especialidade
  - Carga de trabalho atual
  - Disponibilidade

#### 3. **Knowledge Base Integration**
- 🆕 **Vector Search**
  - Buscar em documentos/FAQs
  - RAG (Retrieval Augmented Generation)
  - IA responde com base em docs
  - Citar fonte da resposta

- 🆕 **Self-Learning**
  - IA aprende com soluções humanas
  - Sugere adições ao knowledge base
  - Melhora respostas com tempo

#### 4. **Analytics \u0026 Quality**
- 🆕 **Conversation Analytics**
  - Tempo médio de atendimento
  - Taxa de resolução IA vs Humano
  - Temas mais comuns
  - Horários de pico

- 🆕 **AI Performance**
  - Accuracy da classificação
  - Taxa de escalação
  - Satisfação por canal
  - ROI da automação

- 🆕 **Quality Assurance**
  - Review de conversas
  - Feedback para treinar IA
  - Alertas de qualidade baixa

---

## 🔧 FUNCIONALIDADES GLOBAIS A IMPLEMENTAR

### 1. **Sistema de Tags Avançado**
```javascript
// Múltiplas tags
tags: ["hot_lead", "produto_X", "objecao_preco"]

// Tags com expiração
tags: {
  "promocao_black_friday": { expires: "2024-12-01" },
  "trial_7_days": { expires: Date.now() + 7*24*60*60*1000 }
}

// Tags automáticas
auto_tags: {
  "primeira_compra": true,
  "ticket_medio": "alto", // baseado em compras
  "engajamento": "baixo" // baseado em interações
}
```

### 2. **Variáveis Dinâmicas em Mensagens**
```
Olá {{lead.name}}! 

Vi que você se interessou por {{product.name}}. 

{{#if lead.temperature == 'hot'}}
  Como você está bem qualificado, preparei uma proposta especial...
{{else}}
  Posso tirar alguma dúvida?
{{/if}}

{{#if lead.last_purchase}}
  Já faz {{days_since(lead.last_purchase)}} dias desde sua última compra!
{{/if}}
```

### 3. **Sistema de Pontuação (Lead Scoring)**
```javascript
// Calcular automaticamente
lead_score: {
  base_points: 0,
  actions: {
    "opened_email": +5,
    "clicked_link": +10,
    "responded_whatsapp": +15,
    "watched_video_50%": +20,
    "asked_about_price": +30,
    "visited_checkout": +40
  },
  decay: {
    type: "time_based",
    reduce_by: 5, // pontos
    every: 7 // dias sem interação
  }
}
```

### 4. **Webhooks Bidirecionais**
- 🆕 **Incoming Webhooks**: Receber de plataformas externas
- 🆕 **Outgoing Webhooks**: Enviar para sistemas externos
  - Quando lead atinge temperatura
  - Quando tag é adicionada
  - Quando funil é completado
  - Integrar com Zapier/Make/n8n

### 5. **Template Library**
- 🆕 **Templates prontos de funis**
  - E-commerce Básico
  - Infoproduto Lançamento
  - SaaS Trial Conversion
  - Serviços B2B
  - Eventos Online
  - Cada um com nodes pré-configurados

### 6. **A/B Testing de Funis**
```javascript
{
  "split_test": {
    "name": "Teste Desconto vs Bônus",
    "variants": [
      { "id": "A", "weight": 50, "path": "email_desconto" },
      { "id": "B", "weight": 50, "path": "email_bonus" }
    ],
    "metric": "conversion_rate",
    "duration_days": 14
  }
}
```

### 7. **Condições Avançadas**
```javascript
// Multi-condições
conditions: {
  operator: "AND", // ou "OR"
  rules: [
    { field: "temperature", operator: "equals", value: "hot" },
    { field: "tags", operator: "contains", value: "produto_X" },
    { field: "last_interaction", operator: "older_than", value: "3_days" },
    { field: "custom_fields.budget", operator: "greater_than", value: 5000 }
  ]
}
```

### 8. **Multi-Step Waits**
- 🆕 **Wait Until**: Aguardar até condição ser verdadeira
- 🆕 **Wait Until Time**: Aguardar até horário específico
- 🆕 **Wait for Action**: Aguardar ação do lead (abrir email, clicar link)

### 9. **Bulk Actions**
- 🆕 Aplicar funil a múltiplos leads de uma vez
- 🆕 Importar CSV e iniciar funil
- 🆕 Filtrar leads e iniciar campanha

### 10. **Funil Analytics Dashboard**
```
📊 Dashboard do Funil

┌─────────────────────────────────────┐
│ Funil: Qualificação Master          │
│ Status: 🟢 Ativo                    │
│                                     │
│ 📈 Métricas (últimos 30 dias)      │
│ • 1,234 leads entraram              │
│ • 856 completaram (69%)             │
│ • 412 converteram em venda (33%)    │
│ • R$ 186.400 em receita            │
│                                     │
│ 🎯 Taxa de Conversão por Etapa     │
│ 1. Cadastro       100% (1234)      │
│ 2. Qualificação    92% (1135)      │
│ 3. Nurturing       78% (963)       │
│ 4. Proposta        68% (839)       │
│ 5. Venda           41% (506)       │
│                                     │
│ ⏱️ Tempo Médio de Conversão        │
│ • 5.2 dias (média)                 │
│ • 3.1 dias (melhor 25%)            │
│                                     │
│ 🚨 Gargalos Detectados             │
│ • 24% abandono na etapa 3          │
│ • Sugestão: Reduzir tempo de wait  │
└──────────────────────────────────────┘
```

---

## 📊 ESTRUTURA DE BANCO DE DADOS

### Novas Tabelas Necessárias

```sql
-- Tabela de Funis
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL, -- nodes e connections
    stats JSONB DEFAULT '{}', -- métricas
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Execuções de Funil (tracking)
CREATE TABLE funnel_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    contact_id UUID REFERENCES contacts(id),
    current_node_id VARCHAR(255),
    status VARCHAR(50), -- 'running', 'completed', 'failed', 'paused'
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    data JSONB DEFAULT '{}', -- variáveis do funil
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de Ações do Funil
CREATE TABLE funnel_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES funnel_executions(id),
    node_id VARCHAR(255),
    action_type VARCHAR(100),
    status VARCHAR(50),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Templates de Funil
CREATE TABLE funnel_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100), -- 'ecommerce', 'saas', 'infoproduct'
    config JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- A/B Tests
CREATE TABLE funnel_split_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    name VARCHAR(255),
    variants JSONB, -- A, B, C configs
    status VARCHAR(50),
    winner_variant VARCHAR(10),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    results JSONB
);
```

---

## 🎨 INTERFACE DO FUNIL BUILDER

### Novos Elementos no Canvas

#### **Triggers** (expandido)
```javascript
{
  whatsapp: [
    'new_conversation',
    'keyword_detected',
    'message_received',
    'no_response',
    'ai_handoff_requested'
  ],
  sales: [
    'cart_abandoned',
    'purchase_approved',
    'purchase_completed',
    'purchase_canceled',
    'refund_requested',
    'chargeback'
  ],
  email: [
    'email_opened',
    'link_clicked',
    'replied',
    'bounced',
    'unsubscribed'
  ],
  crm: [
    'lead_created',
    'temperature_changed',
    'tag_added',
    'tag_removed',
    'custom_field_updated',
    'score_threshold'
  ],
  time: [
    'scheduled_time',
    'recurring_daily',
    'recurring_weekly',
    'specific_date'
  ]
}
```

#### **Actions** (expandido)
```javascript
{
  messaging: [
    'send_whatsapp',
    'send_email',
    'send_sms',
    'send_telegram',
    'send_voice_message'
  ],
  ai: [
    'assign_ai_agent',
    'ai_analysis',
    'ai_classify',
    'ai_generate_content',
    'ai_sentiment_analysis'
  ],
  crm: [
    'update_lead',
    'add_tag',
    'remove_tag',
    'change_temperature',
    'update_custom_field',
    'add_to_segment'
  ],
  sales: [
    'create_deal',
    'generate_coupon',
    'send_invoice',
    'schedule_payment_reminder'
  ],
  team: [
    'assign_to_user',
    'create_task',
    'schedule_callback',
    'notify_team',
    'create_appointment'
  ],
  external: [
    'webhook',
    'api_request',
    'zapier_trigger'
  ]
}
```

#### **Logic** (expandido)
```javascript
{
  flow: [
    'wait_duration',
    'wait_until',
    'condition',
    'split_test',
    'random_path',
    'loop',
    'end_funnel'
  ],
  utility: [
    'javascript_code', // code block
    'http_request',
    'data_transformation',
    'merge_paths'
  ]
}
```

### Panel de Configuração Melhorado

Cada node terá um painel lateral com:
- ✅ Configurações básicas
- 🆕 **Testes**: Testar isoladamente
- 🆕 **Analytics**: Ver performance deste node
- 🆕 **AI Suggestions**: IA sugere melhorias
- 🆕 **Error Handling**: O que fazer se falhar

---

## 🚀 ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Foundation (2-3 semanas)
- [ ] Criar tabelas de funnels no backend
- [ ] API endpoints para CRUD de funis
- [ ] Sistema de execução de funis (engine)
- [ ] Novos triggers básicos
- [ ] Novas actions básicas

### Fase 2: Enhanced Features (2-3 semanas)
- [ ] Condições avançadas
- [ ] Sistema de tags melhorado
- [ ] Variáveis dinâmicas
- [ ] Templates de mensagens
- [ ] Wait conditions

### Fase 3: AI Integration (2 semanas)
- [ ] AI Analysis action
- [ ] Sentiment analysis
- [ ] Intent classification
- [ ] Lead scoring automático

### Fase 4: Analytics (1-2 semanas)
- [ ] Dashboard de funis
- [ ] Tracking de execuções
- [ ] Métricas por node
- [ ] A/B testing

### Fase 5: Omnichannel (2 semanas)
- [ ] Telegram integration
- [ ] Instagram DM integration
- [ ] Unified inbox
- [ ] Channel routing

### Fase 6: Polish (1 semana)
- [ ] Templates prontos
- [ ] Documentação
- [ ] Vídeos tutoriais
- [ ] UI/UX improvements

---

## 💰 ROI ESPERADO

### Para o Usuário Final

**Cenário 1: Infoprodutor**
- 1000 leads/mês no WhatsApp
- SEM automação: 30% conversão = 300 vendas
- COM automação: 45% conversão = 450 vendas
- Ganho: +150 vendas/mês
- Se ticket médio = R$ 500 → +R$ 75.000/mês

**Cenário 2: E-commerce**
- 500 carrinhos abandonados/mês
- Taxa de recuperação sem automação: 5% = 25 recuperações
- Taxa com automação: 20% = 100 recuperações
- Ganho: +75 vendas/mês
- Se ticket médio = R$ 200 → +R$ 15.000/mês

**Cenário 3: Atendimento**
- 2000 atendimentos/mês
- Custo por atendente: R$ 3000/mês
- IA resolve 60% → Economiza 1.2 atendentes = R$ 3.600/mês
- Melhora satisfação: +15 NPS points

---

## 🎯 PRÓXIMAS AÇÕES

1. **Definir prioridade**: Qual proposta implementar primeiro?
2. **Refinar escopo**: Ajustar funcionalidades baseado em feedback
3. **Criar mockups**: UI/UX dos novos nodes
4. **Documentar APIs**: Specs técnicas das integrações
5. **Começar desenvolvimento**: Fase 1 do roadmap

---

## 📝 NOTAS FINAIS

Este documento apresenta 3 propostas completas de automação de funil:

1. **Qualificação e Nurturing**: Foco em qualificar leads e nutrir até conversão
2. **Recuperação de Carrinho**: Foco em maximizar vendas e prevenir cancelamentos  
3. **Atendimento Omnichannel**: Foco em atendimento 24/7 com IA

Todas as propostas são **complementares** e podem coexistir no sistema. O usuário final poderá escolher templates prontos ou criar do zero.

O sistema atual do Nexus CRM já tem uma base sólida. Com estas implementações, ele se tornará uma **plataforma completa de automação de marketing e vendas** para empreendedores digitais.

**Próximo passo**: Validar estas ideias e definir qual implementar primeiro! 🚀
