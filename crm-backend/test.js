const express = require('express');
const app = express();
app.use(express.json());

// A única rota que existe neste servidor de teste
app.post('/api/register', (req, res) => {
  console.log('!!! SUCESSO: A REQUISIÇÃO CHEGOU NO BACKEND DE TESTE !!!');
  console.log('Dados recebidos:', req.body);
  res.json({ message: 'A rota POST de teste funcionou!' });
});

app.listen(3001, () => {
  console.log('Servidor de TESTE rodando na porta 3001');
});
