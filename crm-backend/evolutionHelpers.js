/**
 * EVOLUTION API HELPERS
 * Funções auxiliares para integração com Evolution API v3
 */

const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evo.nexusflow.info/manager';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Envia uma mensagem de texto via Evolution API
 * @param {string} instanceName  - Nome da instância WhatsApp
 * @param {string} number - Número de telefone (sem @s.whatsapp.net)
 * @param {string} text - Texto da mensagem
 */
async function sendEvolutionTextMessage(instanceName, number, text, instanceToken = null) {
    try {
        // URL correta conforme documentação Evolution GO
        const url = `${EVOLUTION_API_URL}/send/text`;

        console.log(`[Evolution] 📱 Enviando mensagem para ${number} via ${instanceName}`);
        console.log(`[Evolution] URL: ${url}`);
        console.log(`[Evolution] Text: ${text.substring(0, 50)}...`);

        const response = await axios.post(url, {
            number: number,
            text: text
        }, {
            headers: {
                'apikey': instanceToken || EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[Evolution] ✅ Mensagem enviada com sucesso!`);
        console.log(`[Evolution] Response:`, response.data);

        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        console.error(`[Evolution] ❌ Erro ao enviar mensagem:`, error.message);

        if (error.response) {
            console.error(`[Evolution] Status: ${error.response.status}`);
            console.error(`[Evolution] Data:`, error.response.data);
        }

        throw error;
    }
}

/**
 * Envia uma mensagem de mídia via Evolution API
 * @param {string} instanceName - Nome da instância
 * @param {string} number - Número de telefone
 * @param {string} mediaUrl - URL da mídia
 * @param {string} caption - Legenda (opcional)
 * @param {string} mediaType - Tipo: image, video, audio, document
 */
async function sendEvolutionMediaMessage(instanceName, number, mediaUrl, caption = '', mediaType = 'image') {
    try {
        const url = `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`;

        console.log(`[Evolution] 🖼️ Enviando mídia (${mediaType}) para ${number}`);

        const response = await axios.post(url, {
            number: number,
            mediaMessage: {
                mediaUrl: mediaUrl,
                caption: caption,
                mediatype: mediaType
            }
        }, {
            headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[Evolution] ✅ Mídia enviada com sucesso!`);

        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        console.error(`[Evolution] ❌ Erro ao enviar mídia:`, error.message);
        throw error;
    }
}

module.exports = {
    sendEvolutionTextMessage,
    sendEvolutionMediaMessage
};
