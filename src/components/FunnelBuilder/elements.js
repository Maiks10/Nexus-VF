import { Mail, MessageSquare, Bot, Clock, Tag, GitBranch } from 'lucide-react';

const triggerOptions = {
  trigger_whatsapp: [
    { value: 'new_conversation', label: 'Nova Conversa' },
    { value: 'received_message_keyword', label: 'Mensagem com Palavra-chave' },
  ],
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
};

export const availableElements = {
  triggers: [
    { type: 'trigger_whatsapp', label: 'WhatsApp' },
    { type: 'trigger_hotmart', label: 'Hotmart' },
    { type: 'trigger_kiwify', label: 'Kiwify' },
    { type: 'trigger_green', label: 'Green' },
    { type: 'trigger_ticto', label: 'Ticto' },
    { type: 'trigger_kirvano', label: 'Kirvano' },
    { type: 'trigger_cakto', label: 'Cakto' },
  ],
  actions: [
    { type: 'send_email', label: 'Enviar Email', icon: Mail },
    { type: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare },
    { type: 'assign_agent', label: 'Atribuir Agente IA', icon: Bot },
    { type: 'add_tag', label: 'Adicionar Tag', icon: Tag },
  ],
  logic: [
    { type: 'wait', label: 'Aguardar', icon: Clock },
    { type: 'condition', label: 'Condição', icon: GitBranch },
  ]
};

export const elementConfig = {
  trigger_whatsapp: { icon: MessageSquare, color: 'from-green-500 to-teal-500', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', options: triggerOptions.trigger_whatsapp },
  trigger_hotmart: { color: 'from-orange-500 to-red-500', logo: 'https://www.hotmart.com/static/media/hotmart.233f7917.svg', options: triggerOptions.trigger_hotmart },
  trigger_kiwify: { color: 'from-purple-500 to-indigo-500', logo: 'https://assets.kiwify.com.br/images/logo-light.png', options: triggerOptions.trigger_kiwify },
  trigger_green: { color: 'from-emerald-500 to-green-600', logo: 'https://assets.gocase.com.br/gocase-green/logo/gocase-green-logo.svg', options: triggerOptions.trigger_green },
  trigger_ticto: { color: 'from-indigo-500 to-violet-600', logo: 'https://ticto.com.br/img/logo-ticto-white.svg', options: triggerOptions.trigger_ticto },
  trigger_kirvano: { color: 'from-rose-500 to-pink-600', logo: 'https://kirvano.com/wp-content/uploads/2023/08/logo-kirvano.svg', options: triggerOptions.trigger_kirvano },
  trigger_cakto: { color: 'from-cyan-500 to-sky-600', logo: 'https://cakto.com.br/wp-content/uploads/2023/05/logo-cakto-branca.svg', options: triggerOptions.trigger_cakto },
  send_email: { icon: Mail, color: 'from-blue-500 to-cyan-500' },
  send_whatsapp: { icon: MessageSquare, color: 'from-teal-500 to-green-500' },
  assign_agent: { icon: Bot, color: 'from-indigo-500 to-purple-500' },
  add_tag: { icon: Tag, color: 'from-sky-500 to-blue-500' },
  wait: { icon: Clock, color: 'from-amber-500 to-yellow-500' },
  condition: { icon: GitBranch, color: 'from-pink-500 to-rose-500' },
};