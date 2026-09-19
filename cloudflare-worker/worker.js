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
