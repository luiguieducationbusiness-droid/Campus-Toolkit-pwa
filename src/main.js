import './style.css';
import { registerSW } from 'virtual:pwa-register';

import { mountHome } from './modules/home.js';
import { mountImagesToPdf } from './modules/files/imagesToPdf.js';
import { mountMergePdf } from './modules/files/mergePdf.js';
import { mountImageConverter } from './modules/files/imageConverter.js';
import { mountPdfToWord } from './modules/files/pdfToWord.js';
import { mountTranscription } from './modules/clase/transcription.js';
import { mountApaGenerator } from './modules/productividad/apaGenerator.js';
import { mountKanban } from './modules/productividad/kanban.js';
import { mountIdeaVault } from './modules/productividad/ideaVault.js';

// --- Registro del Service Worker (offline + instalación) ---
registerSW({ immediate: true });

// --- Definición de rutas / navegación ---
// Cada entrada define cómo se pinta el tab lateral y qué módulo monta.
const routes = [
  { group: 'Inicio', items: [
    { id: 'inicio', label: 'Panel principal', mount: mountHome }
  ]},
  { group: 'Herramientas de archivos', items: [
    { id: 'imagenes-a-pdf', label: 'Imágenes a PDF', mount: mountImagesToPdf },
    { id: 'unir-pdf', label: 'Unir PDFs', mount: mountMergePdf },
    { id: 'convertir-imagen', label: 'Convertir imágenes', mount: mountImageConverter },
    { id: 'pdf-a-word', label: 'PDF a Word', mount: mountPdfToWord }
  ]},
  { group: 'Accesibilidad y clases', items: [
    { id: 'transcripcion', label: 'Transcripción y traducción en vivo', mount: mountTranscription }
  ]},
  { group: 'Desarrollo personal', items: [
    { id: 'apa', label: 'Generador APA / Harvard', mount: mountApaGenerator },
    { id: 'kanban', label: 'Tablero Kanban', mount: mountKanban },
    { id: 'ideas', label: 'Bóveda de ideas', mount: mountIdeaVault }
  ]}
];

const flatRoutes = routes.flatMap(g => g.items);
const nav = document.getElementById('nav');
const view = document.getElementById('view');

function renderNav(activeId) {
  nav.innerHTML = '';
  routes.forEach(group => {
    const label = document.createElement('p');
    label.className = 'nav-group-label';
    label.textContent = group.group;
    nav.appendChild(label);

    group.items.forEach(item => {
      const btn = document.createElement('a');
      btn.href = `#${item.id}`;
      btn.className = 'nav-tab' + (item.id === activeId ? ' active' : '');
      btn.textContent = item.label;
      nav.appendChild(btn);
    });
  });
}

function renderView(id) {
  const route = flatRoutes.find(r => r.id === id) || flatRoutes[0];
  view.innerHTML = '';
  renderNav(route.id);
  route.mount(view);
  view.scrollTop = 0;
}

function currentId() {
  const hash = location.hash.replace('#', '');
  return flatRoutes.some(r => r.id === hash) ? hash : 'inicio';
}

window.addEventListener('hashchange', () => renderView(currentId()));
renderView(currentId());

// --- Indicador simple de conexión ---
const badge = document.getElementById('online-badge');
function updateOnlineBadge() {
  badge.innerHTML = navigator.onLine
    ? '<span class="w-2 h-2 rounded-full bg-good"></span> En línea'
    : '<span class="w-2 h-2 rounded-full bg-graphite"></span> Sin conexión — herramientas locales activas';
}
window.addEventListener('online', updateOnlineBadge);
window.addEventListener('offline', updateOnlineBadge);
updateOnlineBadge();
