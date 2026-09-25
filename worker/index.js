// Cloudflare Worker: recebe o clique do botão "Aprovar" do email e marca
// o carrossel como aprovado direto no repo, via API do GitHub.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/aprovar') return html('Não encontrado.', 404);

    const item = url.searchParams.get('item');
    const sig = url.searchParams.get('sig');
    if (!item || !sig) return html('Link inválido (faltam parâmetros).', 400);

    const expected = await hmacHex(env.APPROVAL_SECRET, item);
    if (!timingSafeEqual(sig, expected)) return html('Link inválido ou adulterado.', 403);

    const path = `output/${item}/meta.json`;
    const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
    const ghHeaders = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'synapsa-aprovar-worker',
      Accept: 'application/vnd.github+json',
    };

    const curRes = await fetch(apiUrl, {headers: ghHeaders});
    if (!curRes.ok) return html('Não encontrei esse carrossel no repositório (já foi processado ou removido?).', 404);
    const cur = await curRes.json();
    const meta = JSON.parse(b64DecodeUtf8(cur.content));

    if (meta.status === 'aprovado') return html(`"${meta.tema}" já estava aprovado. Nada a fazer.`, 200);
    if (meta.status !== 'pendente') return html(`Esse item está com status "${meta.status}" — não dá pra aprovar (provavelmente falhou a checagem de qualidade).`, 409);

    meta.status = 'aprovado';
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: `aprovado via email: ${item}`,
        content: b64EncodeUtf8(JSON.stringify(meta, null, 2)),
        sha: cur.sha,
      }),
    });
    if (!putRes.ok) return html('Erro ao salvar a aprovação no GitHub: ' + await putRes.text(), 500);

    return html(`✅ "${meta.tema}" aprovado! Vai publicar automaticamente em ${meta.dia} às ${meta.hora}.`, 200);
  },
};

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function b64DecodeUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function html(msg, status) {
  return new Response(`<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
    <p style="font-size:18px">${msg}</p>
  </body></html>`, {status, headers: {'content-type': 'text/html; charset=utf-8'}});
}
