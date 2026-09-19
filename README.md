# Campus Toolkit — PWA para estudiantes universitarios

Suite de herramientas de conversión de archivos, transcripción en vivo y
productividad académica, pensada para correr **100% desde GitHub Pages**
(hosting estático) siguiendo el expediente técnico original: JAMstack,
procesamiento client-side con JS/WASM, y un proxy serverless aparte para las
pocas funciones que sí necesitan una API externa.

## Módulos incluidos

| Módulo | Procesamiento | Requiere proxy propio |
|---|---|---|
| Imágenes a PDF | 100% en el navegador (`pdf-lib` + `canvas`) | No |
| Unir PDFs | 100% en el navegador (`pdf-lib`) | No |
| Convertir imágenes (PNG/JPG/WebP) | 100% en el navegador (`canvas`) | No |
| PDF a Word | Servicio externo (CloudConvert) | **Sí** |
| Transcripción en vivo | 100% en el navegador (Web Speech API) | No |
| Traducción en vivo | Servicio externo (DeepL) | **Sí** |
| Generador APA / Harvard | 100% en el navegador | No |
| Tablero Kanban | `localStorage` (por dispositivo) | No |
| Bóveda de ideas | `localStorage` (por dispositivo) | No |

## Requisitos

- Node.js 18 o superior
- Una cuenta de GitHub (para Pages) y, opcionalmente, una cuenta gratuita de
  Cloudflare (para el proxy de PDF a Word / traducción)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Compilar para producción

```bash
npm run build
npm run preview   # opcional, para probar el build localmente
```

El resultado queda en `dist/`.

## Desplegar en GitHub Pages

El workflow `.github/workflows/deploy.yml` ya está listo: compila el
proyecto y lo publica en GitHub Pages cada vez que haces `push` a `main`.

1. Sube este proyecto a un repositorio de GitHub.
2. En **Settings → Pages**, en "Build and deployment" elige **GitHub Actions**
   como origen.
3. Haz `git push` a `main`. La Action instala dependencias, compila y publica.
4. Tu sitio queda en `https://tu-usuario.github.io/nombre-del-repo/`.

### Sobre la ruta base (`base`)

Un repo de proyecto (no el repo raíz `usuario.github.io`) se publica bajo una
subcarpeta (`/nombre-del-repo/`), así que Vite necesita saber esa ruta para
que los assets carguen bien. El workflow ya pasa
`BASE_PATH: /${{ github.event.repository.name }}/` automáticamente — no
necesitas tocar nada salvo que renombres el repo o publiques en la raíz
(`usuario.github.io`), en cuyo caso cambia `BASE_PATH` a `/` en el workflow.

## Configurar el proxy serverless (PDF a Word y traducción)

GitHub Pages no puede ocultar API keys — cualquier llave puesta en el
frontend queda expuesta con F12. Por eso "PDF a Word" y la traducción en vivo
llaman a un **Cloudflare Worker** propio, que sí puede guardar secrets.

1. Crea una cuenta gratuita en [CloudConvert](https://cloudconvert.com) y en
   [DeepL API Free](https://www.deepl.com/pro-api).
2. Instala Wrangler y entra a tu cuenta de Cloudflare:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Dentro de `cloudflare-worker/`, configura tus llaves como secrets (nunca
   se suben a git):
   ```bash
   cd cloudflare-worker
   wrangler secret put CLOUDCONVERT_API_KEY
   wrangler secret put DEEPL_API_KEY
   ```
4. Publica el Worker:
   ```bash
   wrangler deploy
   ```
5. Copia la URL que te entrega Wrangler (algo como
   `https://campus-toolkit-proxy.tu-cuenta.workers.dev`) y pégala:
   - en el módulo **PDF a Word**, agregando `/pdf-to-word` al final;
   - en el módulo **Transcripción**, agregando `/translate` al final.

Esas URLs se guardan solo en `localStorage` del navegador de cada usuario —
nunca se suben al repositorio.

## Notas de compatibilidad

- La transcripción en vivo usa la **Web Speech API**, disponible en Chrome y
  Edge (escritorio y Android). No está disponible en Safari ni Firefox.
- El resto de módulos funciona en cualquier navegador moderno.
- La app es instalable (PWA) y los módulos marcados como 100% locales
  siguen funcionando sin conexión gracias al Service Worker
  (`vite-plugin-pwa`).

## Estructura del proyecto

```
├── src/
│   ├── main.js              # Router y navegación
│   ├── style.css            # Tokens de diseño (Tailwind)
│   └── modules/
│       ├── home.js
│       ├── files/            # Imágenes↔PDF, unir PDF, convertir imagen, PDF→Word
│       ├── clase/             # Transcripción y traducción en vivo
│       └── productividad/     # APA/Harvard, Kanban, Bóveda de ideas
├── cloudflare-worker/         # Proxy serverless (fuera de GitHub Pages)
├── .github/workflows/deploy.yml
└── vite.config.js             # Config de Vite + PWA (manifest, service worker)
```
