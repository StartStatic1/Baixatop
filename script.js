/**
 * DOUYIN DOWNLOADER - baixatop.vercel.app
 * Usa backend próprio no Vercel
 */

const CONFIG = {
    API_BASE: 'https://baixatop.vercel.app/api',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

function $(selector) { return document.querySelector(selector); }

function extractUrl(text) {
    const patterns = [
        /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/,
        /https?:\/\/www\.douyin\.com\/video\/\d+/,
        /https?:\/\/www\.douyin\.com\/discover\?modal_id=\d+/,
        /https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+/,
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (m) return m[0];
    }
    return null;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(s) {
    if (!s || s <= 0) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function showToast(msg, type = 'success') {
    const existing = $('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

async function getVideoData(url) {
    const apiUrl = `${CONFIG.API_BASE}/download?url=${encodeURIComponent(url)}&action=data`;
    const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': CONFIG.USER_AGENT }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

function setLoading(loading) {
    const btn = $('#downloadBtn');
    btn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline-flex';
    btn.querySelector('.btn-loader').style.display = loading ? 'inline-flex' : 'none';
    btn.disabled = loading;
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

    $('#videoTitle').textContent = videoData.desc || 'Sem título';
    $('#authorName').textContent = author.nickname || 'Desconhecido';
    $('#authorHandle').textContent = author.unique_id ? `@${author.unique_id}` : '';

    const avatarUrl = author.avatar_thumb?.url_list?.[0] || author.avatar_medium?.url_list?.[0] || '';
    $('#authorAvatar').src = avatarUrl;
    $('#authorAvatar').onerror = function() { this.style.display = 'none'; };

    const coverUrl = video.cover?.url_list?.[0] || video.dynamic_cover?.url_list?.[0] || '';
    $('#videoCover').src = coverUrl;

    $('#videoDuration').textContent = formatDuration(video.duration / 1000);
    $('#statLikes').textContent = formatNumber(stats.digg_count || 0);
    $('#statShares').textContent = formatNumber(stats.share_count || 0);
    $('#statComments').textContent = formatNumber(stats.comment_count || 0);
    $('#statViews').textContent = formatNumber(stats.play_count || 0);

    const playAddr = video.play_addr || {};
    const videoUrl = playAddr.url_list?.[0] || '';
    const nwmVideoUrl = video.nwm_video_url || videoUrl;
    const music = videoData.music || {};
    const audioUrl = music.play_url?.url_list?.[0] || '';

    const dl = $('#downloadLink');
    const dlAudio = $('#downloadAudioLink');

    if (nwmVideoUrl) {
        dl.style.display = 'inline-flex';
        dl.onclick = (e) => { e.preventDefault(); downloadFile(nwmVideoUrl, `douyin_${videoData.aweme_id || 'video'}.mp4`); };
    } else dl.style.display = 'none';

    if (audioUrl) {
        dlAudio.style.display = 'inline-flex';
        dlAudio.onclick = (e) => { e.preventDefault(); downloadFile(audioUrl, `douyin_${videoData.aweme_id || 'audio'}.mp3`); };
    } else dlAudio.style.display = 'none';

    $('#copyLinkBtn').onclick = () => {
        if (nwmVideoUrl) navigator.clipboard.writeText(nwmVideoUrl).then(() => showToast('Link copiado!'));
    };

    $('#resultArea').style.display = 'block';
    $('#resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showInfo(data) {
    hideAllResults();
    const jsonStr = JSON.stringify(data, null, 2);
    $('#jsonOutput').textContent = jsonStr;
    $('#copyJsonBtn').onclick = () => navigator.clipboard.writeText(jsonStr).then(() => showToast('JSON copiado!'));
    $('#infoArea').style.display = 'block';
    $('#infoArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(title, message) {
    hideAllResults();
    $('#errorTitle').textContent = title;
    $('#errorMessage').textContent = message;
    $('#retryBtn').onclick = () => { hideAllResults(); $('#downloadBtn').click(); };
    $('#errorArea').style.display = 'block';
}

function downloadFile(url, filename) {
    showToast('Iniciando download...');
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Download iniciado!');
}

document.addEventListener('DOMContentLoaded', () => {
    $('#pasteBtn').addEventListener('click', async () => {
        try {
            $('#urlInput').value = await navigator.clipboard.readText();
            showToast('Texto colado!');
        } catch { showToast('Não foi possível colar', 'error'); }
    });

    $('#downloadBtn').addEventListener('click', async () => {
        const input = $('#urlInput').value.trim();
        if (!input) { showToast('Cole um link do Douyin!', 'error'); $('#urlInput').focus(); return; }

        let url = extractUrl(input);
        if (!url) {
            if (input.includes('douyin.com') || input.includes('iesdouyin.com')) url = input;
            else { showToast('Link do Douyin não encontrado', 'error'); return; }
        }

        const infoOnly = $('#infoOnlyCheck').checked;
        setLoading(true); hideAllResults();

        try {
            const data = await getVideoData(url);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Falha ao analisar');
            infoOnly ? showInfo(data) : showResult(data);
        } catch (error) {
            showError('Erro ao baixar', error.message || 'Verifique o console (F12) para detalhes');
        } finally { setLoading(false); }
    });

    $('#urlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#downloadBtn').click(); }
    });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function(e) { e.preventDefault(); document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); });
    });
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
