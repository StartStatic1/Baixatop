/**
 * DOUYIN DOWNLOADER - baixatop.vercel.app
 * Versão final simplificada
 */

const API_URL = 'https://baixatop.vercel.app/api/download';

function $(s) { return document.querySelector(s); }

function extractUrl(t) {
    const m = t.match(/https?:\/\/[^\s]+douyin[^\s]*/);
    return m ? m[0] : null;
}

function fmt(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return n+'';
}

function toast(msg, err) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:'+(err?'#ff0050':'#00f2ea')+';color:#000;padding:12px 24px;border-radius:10px;z-index:9999;font-weight:600;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}

async function analyze() {
    const input = $('#urlInput').value.trim();
    if (!input) { toast('Cole um link!', true); return; }

    let url = extractUrl(input);
    if (!url) { toast('Link do Douyin não encontrado', true); return; }

    $('#downloadBtn').disabled = true;
    $('#downloadBtn').textContent = 'Analisando...';

    try {
        const res = await fetch(API_URL + '?url=' + encodeURIComponent(url) + '&action=data');
        const data = await res.json();

        if (data.status !== 'success') {
            throw new Error(data.message || 'Falha na API');
        }

        showResult(data.data);

    } catch (e) {
        console.error(e);
        toast('Erro: ' + e.message, true);
    } finally {
        $('#downloadBtn').disabled = false;
        $('#downloadBtn').textContent = 'Analisar & Baixar';
    }
}

function showResult(d) {
    const v = d.video || {};
    const a = d.author || {};
    const s = d.statistics || {};

    // Monta HTML do resultado
    const html = `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin:20px 0;backdrop-filter:blur(10px);">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
            <img src="${a.avatar_thumb?.url_list?.[0] || ''}" style="width:44px;height:44px;border-radius:50%;border:2px solid #ff0050;" onerror="this.style.display='none'">
            <div>
                <div style="font-weight:600;">${a.nickname || 'Desconhecido'}</div>
                <div style="color:#6b6b7b;font-size:0.85rem;">${a.unique_id ? '@'+a.unique_id : ''}</div>
            </div>
        </div>
        <div style="font-size:1rem;margin-bottom:16px;color:#a0a0b0;">${d.desc || 'Sem título'}</div>
        <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap;color:#6b6b7b;font-size:0.85rem;">
            <span>❤️ ${fmt(s.digg_count||0)}</span>
            <span>↗️ ${fmt(s.share_count||0)}</span>
            <span>💬 ${fmt(s.comment_count||0)}</span>
            <span>👁️ ${fmt(s.play_count||0)}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${v.play_addr?.url_list?.[0] || ''}" target="_blank" style="background:linear-gradient(135deg,#ff0050,#d60042);color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:8px;">
                ⬇️ Baixar Vídeo
            </a>
            <button onclick="copyLink('${v.play_addr?.url_list?.[0] || ''}')" style="background:rgba(255,255,255,0.08);color:#fff;padding:12px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);font-weight:600;">
                📋 Copiar Link
            </button>
        </div>
    </div>`;

    const resultDiv = document.createElement('div');
    resultDiv.innerHTML = html;

    // Remove resultado anterior se existir
    const old = $('#resultArea');
    if (old) old.remove();

    resultDiv.id = 'resultArea';
    $('.downloader-box').after(resultDiv);
    resultDiv.scrollIntoView({behavior:'smooth'});
}

function copyLink(url) {
    if (!url) { toast('Sem link para copiar', true); return; }
    navigator.clipboard.writeText(url).then(() => toast('Link copiado!'));
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
    $('#downloadBtn').addEventListener('click', analyze);
    $('#urlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); }
    });
});
