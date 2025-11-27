import api from './api';

export const EvolutionService = {
  // Instance Management
  async createInstance(instanceName) {
    // Backend expects { displayName: ... }
    const response = await api.post('/whatsapp/instances', { displayName: instanceName });
    return response.data;
  },

  async deleteInstance(id) {
    // Backend expects ID, not name, for deletion
    await api.delete(`/whatsapp/instances/${id}`);
  },

  async fetchInstances() {
    const response = await api.get('/whatsapp/instances');
    return response.data;
  },

  async connectInstance(instanceName, payload = {}) {
    // Backend route for session actions
    const response = await api.post('/whatsapp/session', {
      action: 'generate_qr',
      instanceName,
      ...payload // Passa number ou outros parâmetros
    });
    return response.data;
  },

  async logoutInstance(instanceName) {
    await api.post('/whatsapp/session', {
      action: 'logout',
      instanceName
    });
  },

  async getConnectionState(instanceName) {
    const response = await api.post('/whatsapp/session', {
      action: 'status',
      instanceName
    });
    return response.data;
  },

  // Chat & Messages
  async fetchChats(instanceName) {
    const response = await api.get('/whatsapp/chats', { params: { instanceName } });
    return response.data;
  },

  async fetchMessages(instanceName, chatJid) {
    const response = await api.get('/whatsapp/messages', {
      params: { instanceName, chat_jid: chatJid }
    });
    return response.data;
  },

  async sendMessage(instanceName, to, text) {
    const response = await api.post('/whatsapp/send-message', {
      instanceName,
      to,
      text
    });
    return response.data;
  },

  async markChatRead(instanceName, chatId) {
    await api.patch(`/whatsapp/chats/${chatId}/read`);
  }
};
