import { downloadBlob, setStatus } from '../shared.js';

const TRANSLATE_PROXY_KEY = 'campus-toolkit:translate-proxy-url';
const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés' },
  { code: 'pt', label: 'Portugués' },
  { code: 'fr', label: 'Francés' },
  { code: 'de', label: 'Alemán' }
];

export function mountTranscription(container) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  container.innerHTML = `
    <p class="module-title">Transcripción y traducción en vivo</p>
    <p class="module-sub">Transcribe la voz del profesor en tiempo real usando el reconocimiento de voz del navegador (100% local). La traducción es opcional y usa un servicio externo.</p>

    ${!SpeechRecognition ? `
      <div class="card border-bad/40 bg-bad/5">
        <p class="text-sm text-bad font-medium">Tu navegador no soporta reconocimiento de voz.</p>
        <p class="text-xs text-graphite mt-1">Esta función usa la Web Speech API — funciona en Chrome y Edge de escritorio y Android. En Safari/Firefox no está disponible.</p>
      </div>
    ` : `
      <div class="card mb-5">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="lang-in">Idioma de la clase</label>
            <select id="lang-in" class="field">${LANGS.map(l => `<option value="${l.code}">${l.label}</option>`).join('')}</select>
          </div>
          <div>
            <label class="field-label" for="lang-out">Traducir a (opcional)</label>
            <select id="lang-out" class="field">
              <option value="">No traducir</option>
              ${LANGS.map(l => `<option value="${l.code}">${l.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="mt-3">
          <label class="field-label" for="translate-proxy">URL de proxy de traducción (si vas a traducir)</label>
          <input id="translate-proxy" type="url" class="field" placeholder="https://tu-worker.tu-cuenta.workers.dev/translate" />
        </div>
      </div>

      <div class="flex items-center gap-3 mb-4">
        <button id="toggle" class="btn-primary">Iniciar transcripción</button>
        <button id="clear" class="btn-secondary">Limpiar</button>
        <button id="download" class="btn-secondary">Descargar .txt</button>
      </div>

      <div class="card min-h-[160px]">
        <p id="transcript" class="text-sm leading-relaxed whitespace-pre-wrap"></p>
      </div>
      <p id="status"></p>
    `}
  `;

  if (!SpeechRecognition) return;

  const toggleBtn = container.querySelector('#toggle');
  const clearBtn = container.querySelector('#clear');
  const downloadBtn = container.querySelector('#download');
  const transcriptEl = container.querySelector('#transcript');
  const langIn = container.querySelector('#lang-in');
  const langOut = container.querySelector('#lang-out');
  const proxyInput = container.querySelector('#translate-proxy');
  const status = container.querySelector('#status');

  proxyInput.value = localStorage.getItem(TRANSLATE_PROXY_KEY) || '';
  proxyInput.addEventListener('change', () => localStorage.setItem(TRANSLATE_PROXY_KEY, proxyInput.value.trim()));

  let recognition = null;
  let listening = false;
  let fullText = '';

  function langBcp47(code) {
    const map = { es: 'es-PE', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' };
    return map[code] || code;
  }

  function buildRecognition() {
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = langBcp47(langIn.value);

    r.onresult = async (event) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript + ' ';
      }
      if (finalChunk.trim()) {
        fullText += finalChunk;
        appendLine(finalChunk.trim());
        if (langOut.value) translateLine(finalChunk.trim());
      }
    };
    r.onerror = (e) => setStatus(status, 'Error de reconocimiento: ' + e.error, 'bad');
    r.onend = () => {
      if (listening) r.start(); // reinicia automáticamente si el usuario no detuvo manualmente
    };
    return r;
  }

  function appendLine(text, isTranslation = false) {
    const line = document.createElement('div');
    line.className = isTranslation ? 'text-graphite italic mb-2' : 'mb-0.5';
    line.textContent = (isTranslation ? '↳ ' : '') + text;
    transcriptEl.appendChild(line);
    transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
  }

  async function translateLine(text) {
    const proxyUrl = proxyInput.value.trim();
    if (!proxyUrl) { setStatus(status, 'Configura la URL del proxy de traducción para traducir.', 'bad'); return; }
    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: langIn.value, target: langOut.value })
      });
      if (!res.ok) throw new Error(`El servicio respondió ${res.status}`);
      const data = await res.json();
      appendLine(data.translation || '(sin traducción)', true);
    } catch (err) {
      console.error(err);
      setStatus(status, 'No se pudo traducir esa frase: ' + err.message, 'bad');
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (!listening) {
      recognition = buildRecognition();
      recognition.start();
      listening = true;
      toggleBtn.textContent = 'Detener transcripción';
      setStatus(status, 'Escuchando…', 'good');
    } else {
      listening = false;
      recognition?.stop();
      toggleBtn.textContent = 'Iniciar transcripción';
      setStatus(status, 'Transcripción detenida.');
    }
  });

  clearBtn.addEventListener('click', () => {
    fullText = '';
    transcriptEl.innerHTML = '';
  });

  downloadBtn.addEventListener('click', () => {
    if (!fullText.trim()) { setStatus(status, 'No hay texto para descargar todavía.', 'bad'); return; }
    downloadBlob(new Blob([fullText], { type: 'text/plain' }), 'transcripcion.txt');
  });
}
