import axios from 'axios';

// A URL base agora aponta para a raiz do seu site.
// O proxy reverso que você configurou na VPS vai direcionar 
// qualquer chamada para /api para o seu backend.
const API_BASE_URL = '/'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Este interceptor continua o mesmo, adicionando o token de autenticação.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;