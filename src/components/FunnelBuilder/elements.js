import {
  Mail, MessageSquare, Bot, Clock, Tag, GitBranch,
  Zap, Phone, Send, UserPlus, Thermometer, Brain,
  Bell, CheckSquare, Webhook, Percent, TrendingUp,
  Instagram, Send as Telegram, FileText, Calendar,
  Filter, RefreshCw, AlertCircle, Target, ShoppingCart, UserX
} from 'lucide-react';


// ============================================
// TRIGGERS - Pontos de entrada do funil
// ============================================

const triggerOptions = {
  // WhatsApp Triggers
  trigger_whatsapp: [
    { value: 'new_conversation', label: 'Nova Conversa' },
    { value: 'received_message_keyword', label: 'Mensagem com Palavra-chave' },
    { value: 'no_response', label: 'Sem Resposta há X tempo' },
  ],

  // E-commerce/Venda Triggers
  trigger_hotmart: [
    { value: 'purchase_approved', label: 'Compra Aprovada' },
    { value: 'purchase_completed', label: 'Compra Concluída' },
    { value: 'purchase_canceled', label: 'Compra Cancelada' },
    { value: 'cart_abandonment', label: 'Carrinho Abandonado' },
    { value: 'billet_printed', label: 'Boleto Impresso' },
    { value: 'chargeback', label: 'Chargeback' },
    { value: 'refund_requested', label: 'Reembolso Solicitado' },
  ],

  trigger_kiwify: [
    { value: 'order_paid', label: 'Pagamento Recebido' },
    { value: 'order_refunded', label: 'Pagamento Reembolsado' },
    { value: 'billet_generated', label: 'Boleto Gerado' },
    { value: 'cart_abandoned', label: 'Carrinho Abandonado' },
  ],

  trigger_green: [
    { value: 'sale_approved', label: 'Venda Aprovada' },
    { value: 'sale_refunded', label: 'Venda Reembolsada' },
    { value: 'cart_abandoned', label: 'Carrinho Abandonado' },
  ],

  trigger_ticto: [
    { value: 'purchase_approved', label: 'Compra Aprovada' },
    { value: 'purchase_canceled', label: 'Compra Cancelada' },
    { value: 'cart_abandoned', label: 'Carrinho Abandonado' },
  ],

  trigger_kirvano: [
    { value: 'sale_approved', label: 'Venda Aprovada' },
    { value: 'sale_refunded', label: 'Venda Reembolsada' },
    { value: 'cart_abandoned', label: 'Carrinho Abandonado' },
  ],

  trigger_cakto: [
    { value: 'payment_received', label: 'Pagamento Recebido' },
    { value: 'payment_refunded', label: 'Pagamento Reembolsado' },
  ],

  // Email Triggers
  trigger_email: [
    { value: 'email_opened', label: 'Email Aberto' },
    { value: 'link_clicked', label: 'Link Clicado' },
    { value: 'replied', label: 'Email Respondido' },
    { value: 'bounced', label: 'Email Rejeitado (Bounce)' },
  ],

  // CRM Triggers
  trigger_crm: [
    { value: 'lead_created', label: 'Lead Criado' },
    { value: 'temperature_changed', label: 'Temperatura Mudou' },
    { value: 'tag_added', label: 'Tag Adicionada' },
    { value: 'custom_field_updated', label: 'Campo Atualizado' },
    { value: 'score_threshold', label: 'Score Atingido' },
  ],

  // Time-based Triggers
  trigger_time: [
    { value: 'scheduled_time', label: 'Horário Específico' },
    { value: 'recurring_daily', label: 'Recorrente (Diário)' },
    { value: 'recurring_weekly', label: 'Recorrente (Semanal)' },
    { value: 'milestone', label: 'Aniversário/Marco Temporal' },
  ],
};

// ============================================
// ELEMENTOS DISPONÍVEIS
// ============================================

export const availableElements = {
  triggers: [
    // Mensageria
    { type: 'trigger_whatsapp', label: 'WhatsApp', category: 'messaging' },
    { type: 'trigger_telegram', label: 'Telegram', category: 'messaging' },
    { type: 'trigger_instagram', label: 'Instagram DM', category: 'messaging' },

    // E-commerce/Vendas
    { type: 'trigger_hotmart', label: 'Hotmart', category: 'sales' },
    { type: 'trigger_kiwify', label: 'Kiwify', category: 'sales' },
    { type: 'trigger_green', label: 'Green', category: 'sales' },
    { type: 'trigger_ticto', label: 'Ticto', category: 'sales' },
    { type: 'trigger_kirvano', label: 'Kirvano', category: 'sales' },
    { type: 'trigger_cakto', label: 'Cakto', category: 'sales' },

    // CRM/Sistema
    { type: 'trigger_crm', label: 'Evento do CRM', category: 'system' },
  ],


  actions: [
    // Mensageria
    { type: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare, category: 'messaging' },
    { type: 'send_email', label: 'Enviar Email', icon: Mail, category: 'messaging' },
    { type: 'send_telegram', label: 'Enviar Telegram', icon: Telegram, category: 'messaging' },

    // IA
    { type: 'assign_agent', label: 'Atribuir Agente IA', icon: Bot, category: 'ai' },

    // CRM/Lead Management
    { type: 'add_tag', label: 'Adicionar Tag', icon: Tag, category: 'crm' },
    { type: 'remove_tag', label: 'Remover Tag', icon: Tag, category: 'crm' },
    { type: 'update_temperature', label: 'Atualizar Temperatura', icon: Thermometer, category: 'crm' },
    { type: 'update_lead', label: 'Atualizar Lead', icon: UserPlus, category: 'crm' },
  ],

  logic: [
    { type: 'wait', label: 'Aguardar', icon: Clock, category: 'flow' },
    { type: 'condition', label: 'Condição', icon: GitBranch, category: 'flow' },
    { type: 'filter_by_tags', label: 'Filtro', icon: Filter, category: 'flow' },
    { type: 'remove_from_funnel', label: 'Excluir do Funil', icon: UserX, category: 'flow' },
  ]
};

// ============================================
// CONFIGURAÇÃO VISUAL DOS ELEMENTOS
// ============================================

export const elementConfig = {
  // TRIGGERS - Usando apenas ícones Lucide (sem logos externos)
  trigger_whatsapp: {
    icon: MessageSquare,
    color: 'from-green-500 to-teal-500',
    options: triggerOptions.trigger_whatsapp
  },
  trigger_telegram: {
    icon: Telegram,
    color: 'from-blue-400 to-blue-600',
    options: []
  },
  trigger_instagram: {
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
    options: []
  },

  trigger_hotmart: {
    icon: ShoppingCart,
    color: 'from-orange-500 to-red-500',
    options: triggerOptions.trigger_hotmart
  },
  trigger_kiwify: {
    icon: ShoppingCart,
    color: 'from-purple-500 to-indigo-500',
    options: triggerOptions.trigger_kiwify
  },
  trigger_green: {
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-600',
    options: triggerOptions.trigger_green
  },
  trigger_ticto: {
    icon: ShoppingCart,
    color: 'from-indigo-500 to-violet-600',
    options: triggerOptions.trigger_ticto
  },
  trigger_kirvano: {
    icon: TrendingUp,
    color: 'from-rose-500 to-pink-600',
    options: triggerOptions.trigger_kirvano
  },
  trigger_cakto: {
    icon: TrendingUp,
    color: 'from-cyan-500 to-sky-600',
    options: triggerOptions.trigger_cakto
  },
  trigger_crm: {
    icon: Target,
    color: 'from-violet-500 to-purple-600',
    options: triggerOptions.trigger_crm
  },


  // ACTIONS - Messaging
  send_email: { icon: Mail, color: 'from-blue-500 to-cyan-500' },
  send_whatsapp: { icon: MessageSquare, color: 'from-teal-500 to-green-500' },

  send_telegram: { icon: Telegram, color: 'from-blue-400 to-sky-500' },

  // ACTIONS - AI
  assign_agent: { icon: Bot, color: 'from-indigo-500 to-purple-500' },


  // ACTIONS - CRM
  add_tag: { icon: Tag, color: 'from-sky-500 to-blue-500' },
  remove_tag: { icon: Tag, color: 'from-red-400 to-rose-500' },
  update_temperature: { icon: Thermometer, color: 'from-orange-400 to-red-500' },
  update_lead: { icon: UserPlus, color: 'from-cyan-500 to-blue-500' },


  // LOGIC
  wait: { icon: Clock, color: 'from-amber-500 to-yellow-500' },
  condition: { icon: GitBranch, color: 'from-pink-500 to-rose-500' },
  filter_by_tags: { icon: Filter, color: 'from-purple-500 to-indigo-500' },
  remove_from_funnel: { icon: UserX, color: 'from-red-500 to-pink-600' },
};

// ============================================
// CATEGORIAS PARA ORGANIZAÇÃO NA UI
// ============================================

export const elementCategories = {
  triggers: [
    { id: 'messaging', label: 'Mensageria', icon: MessageSquare },
    { id: 'sales', label: 'Vendas', icon: TrendingUp },
    { id: 'system', label: 'Sistema', icon: Zap },
  ],
  actions: [
    { id: 'messaging', label: 'Mensageria', icon: MessageSquare },
    { id: 'ai', label: 'Inteligência Artificial', icon: Brain },
    { id: 'crm', label: 'Gestão de Leads', icon: UserPlus },
  ],
  logic: [
    { id: 'flow', label: 'Controle de Fluxo', icon: GitBranch },
  ]
};