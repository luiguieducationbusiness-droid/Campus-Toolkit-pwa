import { setStatus } from '../shared.js';

const SOURCE_TYPES = [
  ['libro', 'Libro'], ['capitulo', 'Capítulo de libro'], ['articulo', 'Artículo de revista'],
  ['periodico', 'Artículo de periódico'], ['tesis', 'Tesis'], ['web', 'Página web'],
  ['blog', 'Blog'], ['youtube', 'YouTube'], ['webinar', 'Webinar'], ['podcast', 'Podcast']
];

const field = (id, label, placeholder) => ({ id, label, placeholder });
const EXTRA_FIELDS = {
  libro: [field('publisher', 'Editorial', 'Editorial UCV'), field('edition', 'Edición', '2'), field('doiUrl', 'DOI o URL', 'https://doi.org/...')],
  capitulo: [field('editor', 'Editor(es)', 'Apellido, I.; Apellido, I.'), field('bookTitle', 'Título del libro', 'Título del libro'), field('pages', 'Páginas', '20-35'), field('publisher', 'Editorial', 'Editorial')],
  articulo: [field('journal', 'Revista', 'Nombre de la revista'), field('volume', 'Volumen', '12'), field('issue', 'Número', '3'), field('pages', 'Páginas', '45-60'), field('doiUrl', 'DOI o URL', 'https://doi.org/...')],
  periodico: [field('publication', 'Periódico', 'Nombre del periódico'), field('dayMonth', 'Día y mes', '15 de marzo'), field('pages', 'Página(s)', '10 o 10-12'), field('doiUrl', 'URL', 'https://...')],
  tesis: [field('thesisType', 'Tipo de tesis', 'Tesis de maestría'), field('institution', 'Institución', 'Universidad...'), field('database', 'Base de datos o URL/DOI', 'Repositorio institucional')],
  web: [field('site', 'Nombre del sitio web', 'Nombre del sitio'), field('dayMonth', 'Día y mes (opcional)', '15 de marzo'), field('retrievalDate', 'Fecha de recuperación', '22 de septiembre de 2026'), field('doiUrl', 'URL', 'https://...')],
  blog: [field('blog', 'Nombre del blog', 'Nombre del blog'), field('dayMonth', 'Día y mes', '15 de marzo'), field('doiUrl', 'URL', 'https://...')],
  youtube: [field('channel', 'Canal o corporación', 'Canal'), field('dayMonth', 'Día y mes', '15 de marzo'), field('platform', 'Plataforma', 'YouTube'), field('doiUrl', 'URL', 'https://youtu.be/...')],
  webinar: [field('institution', 'Institución organizadora', 'Institución'), field('doiUrl', 'URL', 'https://...')],
  podcast: [field('presenter', 'Presentador(a)', 'Apellido, I.'), field('program', 'Nombre del programa', 'Nombre del podcast'), field('network', 'Cadena o corporación', 'Cadena'), field('dayMonth', 'Día y mes', '15 de marzo'), field('doiUrl', 'URL', 'https://...')]
};

const clean = value => String(value || '').trim();
const splitAuthors = value => clean(value).split(';').map(clean).filter(Boolean);
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const italic = value => `<em>${escapeHtml(value)}</em>`;

export function formatAuthors(value) {
  const authors = splitAuthors(value);
  if (!authors.length) return '';
  if (authors.length <= 20) return authors.length === 1 ? authors[0] : `${authors.slice(0, -1).join(', ')} y ${authors[authors.length - 1]}`;
  return `${authors.slice(0, 19).join(', ')}, ... ${authors[authors.length - 1]}`;
}

function citationAuthor(value) {
  const authors = splitAuthors(value);
  if (!authors.length) return '';
  if (authors[0].startsWith('[') && authors[0].endsWith(']')) return authors[0].slice(1, -1);
  if (authors.length > 2) return `${authors[0].split(',')[0]} et al.`;
  return authors.map(author => author.split(',')[0].trim()).join(' y ');
}

function referenceAuthor(value) {
  const author = formatAuthors(value);
  return author.startsWith('[') && author.endsWith(']') ? author.slice(1, -1) : author;
}

function datePart(data, fullDate) {
  if (!data.year && !data.dayMonth) return '(s.f.)';
  return `(${data.year || 's.f.'}${fullDate && data.dayMonth ? `, ${data.dayMonth}` : ''})`;
}

export function formatReference(data) {
  const author = referenceAuthor(data.authors);
  const who = author || data.title;
  const date = datePart(data, ['periodico', 'web', 'blog', 'youtube', 'podcast'].includes(data.type));
  const title = author ? escapeHtml(data.title) : '';
  let html = `${escapeHtml(who)}${who.endsWith('.') ? '' : '.'} ${date}. `;
  switch (data.type) {
    case 'libro': html += `${title ? italic(data.title) : ''}${Number(data.edition) > 1 ? ` (${escapeHtml(data.edition)}.ª ed.)` : ''}${title ? '.' : ''} ${escapeHtml(data.publisher)}.${data.doiUrl ? ` ${escapeHtml(data.doiUrl)}` : ''}`; break;
    case 'capitulo': html += `${title}. En ${escapeHtml(data.editor)} (Ed.), ${italic(data.bookTitle)} (pp. ${escapeHtml(data.pages)}). ${escapeHtml(data.publisher)}.`; break;
    case 'articulo': html += `${title}. ${italic(data.journal)}${data.volume ? `, ${italic(data.volume)}` : ''}${data.issue ? `(${escapeHtml(data.issue)})` : ''}${data.pages ? `, ${escapeHtml(data.pages)}` : ''}.${data.doiUrl ? ` ${escapeHtml(data.doiUrl)}` : ''}`; break;
    case 'periodico': html += `${title}. ${italic(data.publication)}${data.pages ? `, ${data.pages.includes('-') ? 'pp.' : 'p.'} ${escapeHtml(data.pages)}` : ''}.${data.doiUrl ? ` ${escapeHtml(data.doiUrl)}` : ''}`; break;
    case 'tesis': html += `${italic(data.title)} [${escapeHtml(data.thesisType)}, ${escapeHtml(data.institution)}]. ${escapeHtml(data.database)}.`; break;
    case 'web': html += `${italic(data.title)}. ${escapeHtml(data.site)}.${!data.year ? ` Recuperado el ${escapeHtml(data.retrievalDate)} de` : ''} ${escapeHtml(data.doiUrl)}.`; break;
    case 'blog': html += `${title}. ${italic(data.blog)}. ${escapeHtml(data.doiUrl)}`; break;
    case 'youtube': html += `${italic(data.title)} [Video]. ${escapeHtml(data.channel || data.platform)}. ${escapeHtml(data.doiUrl)}`; break;
    case 'webinar': html += `${italic(data.title)} [Webinar]. ${escapeHtml(data.institution)}. ${escapeHtml(data.doiUrl)}`; break;
    case 'podcast': html += `(${escapeHtml(data.presenter)}, presentadora). ${italic(data.title)} [Episodio de podcast]. En ${italic(data.program)}. ${escapeHtml(data.network)}. ${escapeHtml(data.doiUrl)}`; break;
    default: html += `${title}.`;
  }
  return { html: html.replace(/\s+/g, ' ').trim(), text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() };
}

export function formatCitation({ authors, year, page, quoteType = 'parafraseo', narrative = false }) {
  const author = citationAuthor(authors) || 'Título';
  const date = year || 's.f.';
  const pagePart = page ? `, ${/^párr/.test(page) ? '' : page.includes('-') || page.includes(',') ? 'pp. ' : 'p. '}${page}` : '';
  const result = narrative ? `${author} (${date}${pagePart})` : `(${author}, ${date}${pagePart})`;
  if (quoteType === 'directa-breve') return `"[Texto citado]" ${result}`;
  if (quoteType === 'directa-extensa') return `[Bloque de cita, sin comillas, con sangría de 1.27 cm] ${result}`;
  return result;
}

export function mountApaGenerator(container) {
  const history = [];
  container.innerHTML = `
    <p class="module-title">Generador de referencias APA / Harvard</p>
    <p class="module-sub">Construye referencias con los cuatro pilares APA: autor, fecha, título y fuente.</p>
    <div class="card"><div class="grid sm:grid-cols-2 gap-4"><div><label class="field-label" for="type">Tipo de fuente</label><select id="type" class="field">${SOURCE_TYPES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div><div><label class="field-label" for="authors">Autor(es) o corporación</label><input id="authors" class="field" placeholder="Pérez, J.; Gómez, M." /></div></div>
      <p class="field-help mt-2">Separa autores con punto y coma. Para autor corporativo usa [Organización Mundial de la Salud]. Déjalo vacío para usar el título.</p>
      <div class="grid sm:grid-cols-3 gap-4 mt-4"><div><label class="field-label" for="year">Año</label><input id="year" class="field" placeholder="2026" /></div><div class="sm:col-span-2"><label class="field-label" for="title">Título</label><input id="title" class="field" placeholder="Título de la obra" /></div></div>
      <div id="extra-fields" class="grid sm:grid-cols-2 gap-4 mt-4"></div><button id="generate" class="btn-primary mt-5">Generar referencia</button>
    </div>
    <div class="card mt-5"><p class="field-label mb-0">Referencia generada</p><p id="output" class="reference-output text-sm mt-2 min-h-[1.5em]"></p><button id="copy" class="btn-secondary mt-3" disabled>Copiar al portapapeles</button><p id="status"></p></div>
    <div class="card mt-5"><p class="field-label mb-0">Generador de citas en el texto</p><div class="grid sm:grid-cols-2 gap-4 mt-4"><div><label class="field-label" for="citation-page">Página o párrafo</label><input id="citation-page" class="field" placeholder="15, 24-25 o párr. 4" /></div><div><label class="field-label" for="citation-type">Tipo de cita</label><select id="citation-type" class="field"><option value="parafraseo">Resumen / parafraseo</option><option value="directa-breve">Directa breve (hasta 39 palabras)</option><option value="directa-extensa">Directa extensa (40+ palabras)</option></select></div></div><label class="inline-flex items-center gap-2 mt-4 text-sm"><input id="narrative" type="checkbox" /> Cita narrativa</label><button id="generate-citation" class="btn-secondary mt-4">Generar cita</button><p id="citation-output" class="reference-output mt-3"></p></div>
    <div class="mt-5"><p class="field-label">Lista de referencias</p><ul id="history" class="reference-list space-y-2 text-sm"></ul></div>`;

  const $ = id => container.querySelector(`#${id}`);
  const val = id => clean($(id)?.value);
  const typeSel = $('type');
  const extraFields = $('extra-fields');
  const renderExtraFields = () => { extraFields.innerHTML = (EXTRA_FIELDS[typeSel.value] || []).map(item => `<div><label class="field-label" for="f-${item.id}">${item.label}</label><input id="f-${item.id}" class="field" placeholder="${item.placeholder}" /></div>`).join(''); };
  typeSel.addEventListener('change', renderExtraFields);
  renderExtraFields();
  const collect = () => { const data = { type: typeSel.value, authors: val('authors'), year: val('year'), title: val('title') }; (EXTRA_FIELDS[data.type] || []).forEach(item => { data[item.id] = val(`f-${item.id}`); }); return data; };

  $('generate').addEventListener('click', () => {
    if (!val('title')) { setStatus($('status'), 'Completa al menos el título.', 'bad'); return; }
    const reference = formatReference(collect());
    $('output').innerHTML = reference.html; $('copy').disabled = false; $('copy').dataset.value = reference.text; setStatus($('status'), ''); history.push(reference); history.sort((first, second) => first.text.localeCompare(second.text, 'es')); $('history').innerHTML = history.map(item => `<li class="reference-entry">${item.html}</li>`).join('');
  });
  $('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('copy').dataset.value); setStatus($('status'), 'Copiado al portapapeles.', 'good'); } catch { setStatus($('status'), 'No se pudo copiar automáticamente; selecciona el texto manualmente.', 'bad'); } });
  $('generate-citation').addEventListener('click', () => { $('citation-output').textContent = formatCitation({ authors: val('authors'), year: val('year'), page: val('citation-page'), quoteType: val('citation-type'), narrative: $('narrative').checked }); });
}
