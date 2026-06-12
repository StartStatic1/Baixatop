/**
 * ═══════════════════════════════════════════════════════════════
 *   API SERVERLESS - Vercel / Netlify Functions
 *   Backend para o Douyin Downloader
 *   Roda em: /api/download.js
 * ═══════════════════════════════════════════════════════════════
 */

const axios = require('axios');

// Configurações
const API_BASE = 'https://api.douyin.wtf';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Headers CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    try {
        const { url, action = 'data' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: 'error',
                message: 'URL é obrigatória'
            });
        }

        if (action === 'data') {
            // Obtém metadados do vídeo
            const apiUrl = `${API_BASE}/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=false`;

            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 30000
            });

            return res.status(200)
                .set(corsHeaders)
                .json(response.data);

        } else if (action === 'download') {
            // Obtém URL de download direto
            const apiUrl = `${API_BASE}/api/download?url=${encodeURIComponent(url)}&prefix=true&with_watermark=false`;

            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 30000,
                maxRedirects: 5
            });

            return res.status(200)
                .set(corsHeaders)
                .json(response.data);
        }

        return res.status(400).json({
            status: 'error',
            message: 'Ação inválida. Use: data ou download'
        });

    } catch (error) {
        console.error('API Error:', error.message);

        return res.status(500)
            .set(corsHeaders)
            .json({
                status: 'error',
                message: error.message || 'Erro interno do servidor',
                details: error.response?.data || null
            });
    }
};
