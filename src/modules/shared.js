// Utilidades compartidas por todos los módulos.

/** Descarga un Blob en el navegador del usuario con el nombre dado. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Muestra un mensaje temporal (éxito/error) dentro de un contenedor de estado. */
export function setStatus(el, message, kind = 'info') {
  const colors = {
    info: 'text-graphite',
    good: 'text-good',
    bad: 'text-bad'
  };
  el.className = `text-sm mt-3 ${colors[kind] || colors.info}`;
  el.textContent = message;
}

/** Crea una zona de arrastrar/soltar + selector de archivos reutilizable. */
export function createDropZone({ accept, multiple = false, onFiles, hint }) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="drop-zone" tabindex="0" role="button">
      <p class="font-medium text-ink">Arrastra tus archivos aquí</p>
      <p class="mt-1">o haz clic para elegir ${hint || 'archivos'}</p>
    </div>
    <input type="file" class="hidden" ${multiple ? 'multiple' : ''} accept="${accept || ''}" />
  `;
  const zone = wrap.querySelector('.drop-zone');
  const input = wrap.querySelector('input');

  const openPicker = () => input.click();
  zone.addEventListener('click', openPicker);
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openPicker(); });

  ['dragenter', 'dragover'].forEach(evt =>
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('border-accent'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('border-accent'); })
  );
  zone.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
    input.value = '';
  });

  return wrap;
}
