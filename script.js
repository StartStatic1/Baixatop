/**
 * ═══════════════════════════════════════════════════════════════
 *   DOUYIN DOWNLOADER - JavaScript Principal
 *   Interface web que consome a API diretamente
 * ═══════════════════════════════════════════════════════════════
 */

const CONFIG = {
    API_BASE: 'https://api.douyin.wtf',
    PROXY_APIS: [
        'https://api.douyin.wtf',
        'https://douyin.wtf',
    ],
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ─── UTILITÁRIOS ───────────────────────────────────────────────

function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function extractUrl(text) {
    const patterns = [
        /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/,
        /https?:\/\/www\.douyin\.com\/video\/\d+/,
        /https?:\/\/www\.douyin\.com\/discover\?modal_id=\d+/,
        /https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0];
    }
    return null;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
    const existing = $('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── API ───────────────────────────────────────────────────────

async function fetchVideoData(url, minimal = false) {
    const apiUrl = `${CONFIG.API_BASE}/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=${minimal}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': CONFIG.USER_AGENT
            },
            // Mode cors pode bloquear, tentamos anyway
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        // Se CORS bloquear, tenta via JSONP ou proxy
        console.warn('Fetch direto falhou, tentando alternativas...', error);
        throw error;
    }
}

async function fetchViaProxy(url) {
    // Lista de proxies CORS gratuitos para tentar
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            continue;
        }
    }

    throw new Error('Todos os proxies falharam. A API pode estar indisponível.');
}

async function getVideoData(url) {
    // Tenta fetch direto primeiro
    try {
        return await fetchVideoData(url);
    } catch (directError) {
        // Tenta via proxy CORS
        const apiUrl = `${CONFIG.API_BASE}/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=true`;
        return await fetchViaProxy(apiUrl);
    }
}

// ─── UI ────────────────────────────────────────────────────────

function setLoading(loading) {
    const btn = $('#downloadBtn');
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');

    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline-flex';
    loader.style.display = loading ? 'inline-flex' : 'none';
}

function hideAllResults() {
    $('#resultArea').style.display = 'none';
    $('#infoArea').style.display = 'none';
    $('#errorArea').style.display = 'none';
}

function showResult(data) {
    hideAllResults();

    const videoData = data.data || {};
    const stats = videoData.statistics || {};
    const author = videoData.author || {};
    const video = videoData.video || {};

    // Preenche dados
    $('#videoTitle').textContent = videoData.desc || 'Sem título';
    $('#authorName').textContent = author.nickname || 'Desconhecido';
    $('#authorHandle').textContent = author.unique_id ? `@${author.unique_id}` : '';

    // Avatar
    const avatarUrl = author.avatar_thumb?.url_list?.[0] || 
                      author.avatar_medium?.url_list?.[0] ||
                      'https://via.placeholder.com/44';
    $('#authorAvatar').src = avatarUrl;

    // Capa do vídeo
    const coverUrl = video.cover?.url_list?.[0] || 
                     video.dynamic_cover?.url_list?.[0] ||
                     video.origin_cover?.url_list?.[0] ||
                     '';
    $('#videoCover').src = coverUrl;
    $('#videoCover').onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect fill="%23111" width="400" height="700"/><text fill="%23444" x="50%" y="50%" text-anchor="middle">Sem preview</text></svg>';
    };

    // Duração
    const duration = video.duration / 1000; // pode estar em ms
    $('#videoDuration').textContent = formatDuration(duration);

    // Estatísticas
    $('#statLikes').textContent = formatNumber(stats.digg_count || 0);
    $('#statShares').textContent = formatNumber(stats.share_count || 0);
    $('#statComments').textContent = formatNumber(stats.comment_count || 0);
    $('#statViews').textContent = formatNumber(stats.play_count || 0);

    // Links de download
    const playAddr = video.play_addr || {};
    const downloadAddr = video.download_addr || {};

    const videoUrl = playAddr.url_list?.[0] || downloadAddr.url_list?.[0] || '';
    const nwmVideoUrl = video.nwm_video_url || videoUrl;

    // Áudio
    const music = videoData.music || {};
    const audioUrl = music.play_url?.url_list?.[0] || '';

    // Configura botões
    const downloadLink = $('#downloadLink');
    const downloadAudioLink = $('#downloadAudioLink');

    if (nwmVideoUrl) {
        downloadLink.href = nwmVideoUrl;
        downloadLink.style.display = 'inline-flex';
        downloadLink.onclick = (e) => {
            e.preventDefault();
            downloadFile(nwmVideoUrl, `douyin_${videoData.aweme_id || 'video'}.mp4`);
        };
    } else {
        downloadLink.style.display = 'none';
    }

    if (audioUrl) {
        downloadAudioLink.href = audioUrl;
        downloadAudioLink.style.display = 'inline-flex';
        downloadAudioLink.onclick = (e) => {
            e.preventDefault();
            downloadFile(audioUrl, `douyin_${videoData.aweme_id || 'audio'}.mp3`);
        };
    } else {
        downloadAudioLink.style.display = 'none';
    }

    // Botão copiar link
    $('#copyLinkBtn').onclick = () => {
        const linkToCopy = nwmVideoUrl || videoUrl;
        if (linkToCopy) {
            navigator.clipboard.writeText(linkToCopy).then(() => {
                showToast('Link copiado para a área de transferência!');
            });
        }
    };

    $('#resultArea').style.display = 'block';
    $('#resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showInfo(data) {
    hideAllResults();

    const jsonStr = JSON.stringify(data, null, 2);
    $('#jsonOutput').textContent = jsonStr;

    $('#copyJsonBtn').onclick = () => {
        navigator.clipboard.writeText(jsonStr).then(() => {
            showToast('JSON copiado!');
        });
    };

    $('#infoArea').style.display = 'block';
    $('#infoArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(title, message) {
    hideAllResults();

    $('#errorTitle').textContent = title;
    $('#errorMessage').textContent = message;

    $('#retryBtn').onclick = () => {
        hideAllResults();
        $('#downloadBtn').click();
    };

    $('#errorArea').style.display = 'block';
}

// ─── DOWNLOAD ──────────────────────────────────────────────────

async function downloadFile(url, filename) {
    showToast('Iniciando download...', 'success');

    try {
        // Tenta download direto via link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast('Download iniciado!');
    } catch (error) {
        // Fallback: abre em nova aba
        window.open(url, '_blank');
        showToast('Abrindo vídeo em nova aba...');
    }
}

// ─── EVENT LISTENERS ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // Botão Colar
    $('#pasteBtn').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            $('#urlInput').value = text;
            showToast('Texto colado!');
        } catch (err) {
            showToast('Não foi possível acessar a área de transferência', 'error');
        }
    });

    // Botão Download
    $('#downloadBtn').addEventListener('click', async () => {
        const input = $('#urlInput').value.trim();

        if (!input) {
            showToast('Cole um link do Douyin primeiro!', 'error');
            $('#urlInput').focus();
            return;
        }

        // Extrai URL
        let url = extractUrl(input);
        if (!url) {
            if (input.includes('douyin.com') || input.includes('iesdouyin.com')) {
                url = input;
            } else {
                showToast('Não foi possível encontrar um link do Douyin válido', 'error');
                return;
            }
        }

        const infoOnly = $('#infoOnlyCheck').checked;

        setLoading(true);
        hideAllResults();

        try {
            const data = await getVideoData(url);

            if (!data || data.status !== 'success') {
                throw new Error(data?.message || 'Falha ao analisar o vídeo');
            }

            if (infoOnly) {
                showInfo(data);
            } else {
                showResult(data);
            }

        } catch (error) {
            console.error('Erro:', error);
            showError(
                'Não foi possível baixar o vídeo',
                error.message || 'A API pode estar temporariamente indisponível ou o link pode ser inválido. Tente novamente mais tarde.'
            );
        } finally {
            setLoading(false);
        }
    });

    // Enter para enviar
    $('#urlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $('#downloadBtn').click();
        }
    });

    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// ─── SERVICE WORKER (PWA) ────────────────────────────────────

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
        // Silenciosamente ignora erro de SW
    });
}
