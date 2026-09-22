export function mountHome(container) {
  container.innerHTML = `
    <p class="module-title">Tu ciclo, sin fricción</p>
    <p class="module-sub">Convierte archivos, transcribe tus clases y organiza tus entregas — todo corre en tu navegador, sin subir tus documentos a ningún servidor ajeno.</p>

    <div class="grid sm:grid-cols-2 gap-4">
      <a href="#imagenes-a-pdf" class="card hover:border-accent transition-colors">
        <p class="font-display text-lg font-semibold">Herramientas de archivos</p>
        <p class="text-sm text-graphite mt-1">Fotos de apuntes a PDF, unir separatas, convertir imágenes y pasar PDF a Word.</p>
      </a>
      <a href="#transcripcion" class="card hover:border-accent transition-colors">
        <p class="font-display text-lg font-semibold">Accesibilidad y clases</p>
        <p class="text-sm text-graphite mt-1">Transcribe la clase en vivo y tradúcela línea por línea.</p>
      </a>
      <a href="#youtube-transcripcion" class="card hover:border-accent transition-colors">
        <p class="font-display text-lg font-semibold">Transcribir YouTube</p>
        <p class="text-sm text-graphite mt-1">Convierte los subtítulos disponibles de un video en material de estudio.</p>
      </a>
      <a href="#apa" class="card hover:border-accent transition-colors">
        <p class="font-display text-lg font-semibold">Citas APA / Harvard</p>
        <p class="text-sm text-graphite mt-1">Arma tus referencias bibliográficas y cópialas al portapapeles.</p>
      </a>
      <a href="#kanban" class="card hover:border-accent transition-colors">
        <p class="font-display text-lg font-semibold">Kanban y bóveda de ideas</p>
        <p class="text-sm text-graphite mt-1">Organiza entregas por curso y guarda ideas sueltas, todo guardado en este dispositivo.</p>
      </a>
    </div>

    <div class="card mt-6">
      <p class="text-sm font-medium">Cómo funciona esta app</p>
      <p class="text-sm text-graphite mt-1.5 leading-relaxed">
        La mayoría de módulos procesa tus archivos <strong>directamente en tu navegador</strong> (nada se sube a internet).
        "PDF a Word" y la transcripción de YouTube requieren un Worker propio; la traducción en vivo usa Google Translate
        directamente y solo necesita conexión a internet.
      </p>
    </div>
  `;
}
