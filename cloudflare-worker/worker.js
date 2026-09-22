/**
 * Proxy serverless para Campus Toolkit.
 *
 * Por qué existe: GitHub Pages solo sirve archivos estáticos, así que cualquier
 * API key puesta en el frontend queda visible con F12. Este Worker vive fuera
 * de GitHub Pages, guarda las llaves como "secrets" y es el único que las usa.
 *
 * Rutas:
 *   POST /pdf-to-word   -> reenvía el PDF a CloudConvert y devuelve el .docx
 *   POST /translate     -> reenvía el texto a DeepL y devuelve la traducción
 *   POST /youtube-transcript -> obtiene subtítulos públicos de YouTube
 *
 * Despliegue (resumen, ver README principal para el detalle):
 *   1. npm install -g wrangler
 *   2. wrangler secret put CLOUDCONVERT_API_KEY
 *   3. wrangler secret put DEEPL_API_KEY
 *   4. wrangler deploy
 *
 * Después de desplegar, copia la URL que te da Wrangler
 * (https://campus-toolkit-proxy.<tu-cuenta>.workers.dev) y pégala en los
 * módulos "PDF a Word" y "Transcripción" de la PWA.
 */

const ALLOWED_ORIGIN = '*'; // En producción, cámbialo por tu dominio de GitHub Pages

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/pdf-to-word' && request.method === 'POST') {
        return withCors(await handlePdfToWord(request, env));
      }
      if (url.pathname === '/translate' && request.method === 'POST') {
        return withCors(await handleTranslate(request, env));
      }
      if (url.pathname === '/youtube-transcript' && request.method === 'POST') {
        return withCors(await handleYoutubeTranscript(request));
      }
      return withCors(new Response('Ruta no encontrada', { status: 404 }));
    } catch (err) {
      return withCors(new Response('Error del proxy: ' + err.message, { status: 500 }));
    }
  }
};

// --- PDF a Word vía CloudConvert -------------------------------------------------
async function handlePdfToWord(request, env) {
  const incomingForm = await request.formData();
  const file = incomingForm.get('file');
  if (!file) return new Response('Falta el archivo PDF', { status: 400 });

  // 1. Crear un job de conversión en CloudConvert (import -> convert -> export/url)
  const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tasks: {
        'import-file': { operation: 'import/upload' },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          input_format: 'pdf',
          output_format: 'docx'
        },
        'export-file': { operation: 'export/url', input: 'convert-file' }
      }
    })
  });
  const job = await jobRes.json();

  const uploadTask = job.data.tasks.find(t => t.name === 'import-file');
  const uploadForm = new FormData();
  Object.entries(uploadTask.result.form.parameters).forEach(([k, v]) => uploadForm.append(k, v));
  uploadForm.append('file', file, file.name);
  await fetch(uploadTask.result.form.url, { method: 'POST', body: uploadForm });

  // 2. Esperar a que termine el job (polling simple)
  let exportUrl = null;
  for (let i = 0; i < 20 && !exportUrl; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
      headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}` }
    });
    const statusJson = await statusRes.json();
    const exportTask = statusJson.data.tasks.find(t => t.name === 'export-file');
    if (exportTask?.status === 'finished') exportUrl = exportTask.result.files[0].url;
  }
  if (!exportUrl) return new Response('La conversión tardó demasiado, intenta de nuevo', { status: 504 });

  const fileRes = await fetch(exportUrl);
  return new Response(fileRes.body, {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  });
}

// --- Traducción vía DeepL ---------------------------------------------------------
async function handleTranslate(request, env) {
  const { text, source, target } = await request.json();
  if (!text || !target) return new Response('Faltan "text" o "target"', { status: 400 });

  const params = new URLSearchParams({
    text,
    target_lang: target.toUpperCase(),
    source_lang: (source || '').toUpperCase()
  });

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const data = await res.json();
  const translation = data.translations?.[0]?.text || '';

  return new Response(JSON.stringify({ translation }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// --- Subtítulos públicos de YouTube --------------------------------------------
async function handleYoutubeTranscript(request) {
  const { url, lang = 'es' } = await request.json();
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return jsonResponse({ error: 'El enlace de YouTube no es válido.' }, 400);

  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!pageResponse.ok) return jsonResponse({ error: 'YouTube no permitió consultar ese video.' }, 502);
  const page = await pageResponse.text();
  const playerResponse = readPlayerResponse(page);
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = tracks.find(item => item.languageCode === lang) || tracks.find(item => item.languageCode?.startsWith(`${lang}-`)) || tracks[0];
  if (!track?.baseUrl) return jsonResponse({ error: 'El video no tiene subtítulos públicos disponibles.' }, 404);

  const captionsResponse = await fetch(`${track.baseUrl}&fmt=srv3`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!captionsResponse.ok) return jsonResponse({ error: 'No se pudieron descargar los subtítulos.' }, 502);
  const captions = await captionsResponse.text();
  const transcript = parseCaptionXml(captions);
  if (!transcript) return jsonResponse({ error: 'Los subtítulos están vacíos.' }, 404);
  return jsonResponse({ title: playerResponse.videoDetails?.title || '', language: track.languageCode, transcript });
}

function getYoutubeVideoId(value) {
  try {
    const parsed = new URL(value);
    if (!['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) return '';
    return parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function readPlayerResponse(page) {
  const marker = 'var ytInitialPlayerResponse = ';
  const start = page.indexOf(marker);
  if (start < 0) return null;
  const jsonStart = start + marker.length;
  const end = page.indexOf(';', jsonStart);
  try { return JSON.parse(page.slice(jsonStart, end)); } catch { return null; }
}

function parseCaptionXml(xml) {
  return [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => decodeXml(match[1]).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
