/**
 * API Serverless - Vercel
 * Proxy para API do Douyin sem CORS
 */

const axios = require('axios');

const API_BASE = 'https://api.douyin.wtf';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, action = 'data' } = req.query;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL é obrigatória. Use: ?url=LINK_DO_DOUYIN'
      });
    }

    let apiUrl;
    if (action === 'data') {
      apiUrl = `${API_BASE}/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=false`;
    } else if (action === 'download') {
      apiUrl = `${API_BASE}/api/download?url=${encodeURIComponent(url)}&prefix=true&with_watermark=false`;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Ação inválida. Use: data ou download'
      });
    }

    console.log('Fetching:', apiUrl);

    const response = await axios.get(apiUrl, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    return res.status(200).json(response.data);

  } catch (error) {
    console.error('API Error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response?.data || null
    });
  }
};
