// src/lib/whatsapp.js
const API_URL = 'http://31.97.64.67:8080'
const API_KEY = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

export async function fetchMessages(instanceName, remoteJid) {
  const res = await fetch(
    `${API_URL}/chat/findMessages/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: API_KEY
      },
      body: JSON.stringify({
        where: { key: { remoteJid } }
      })
    }
  )
  const json = await res.json()
  // dependendo da versão da API, as mensagens podem vir em json.response, json.data OU diretamente em array
  if (Array.isArray(json)) return json
  return json.response || json.data || []
}
