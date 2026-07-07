# FR-SST-027 - Permiso para Trabajo en Alturas

## Descripción

PWA (Progressive Web App) para diligenciar, guardar localmente y exportar en PDF el formato **FR-SST-027** de SITOC. Funciona offline gracias a un Service Worker.

## Stack

- **HTML5 + CSS3 vanilla** — sin frameworks ni librerías externas
- **JavaScript vanilla** (IIFE) — sin dependencias
- **Canvas API** — firmas digitales
- **localStorage** — persistencia local de registros
- **Service Worker** (`sw.js`) — caché offline
- **Manifest** (`manifest.json`) — instalable en dispositivos móviles
- **Telegram Bot API** — envío de PDF al grupo de reportes

## Estructura

```
Alturas/
├── index.html        # HTML limpio
├── styles.css        # Todos los estilos
├── app.js            # Todo el JS en IIFE
├── manifest.json     # Configuración PWA
├── sw.js             # Service Worker (caché offline)
└── AGENTS.md         # Este archivo
```

## Convenciones

- **JS modular** — `app.js` envuelto en IIFE `(function () { 'use strict'; ... })();`
- **CSS externo** — `styles.css` con variables CSS, estilos de formulario, pending-bar, toast, etc.
- **Prefijo de IDs** — `signatureCanvas_*` para canvas de firmas, `techCard_*` para tarjetas de técnicos
- **LocalStorage key** — `permisosAlturas` (JSON array)
- **Navegación** — 2 pantallas (`form` y `historial/detalle`) controladas por `showScreen(name)`
- **Firmas** — se guardan como `data:image/png` (base64)
- **Sin tests** — no hay suite de pruebas configurada

## Funcionalidades clave

1. Formulario con datos generales, EPP, técnicos (dinámicos), coordinador, comprobaciones físicas (19 preguntas), verificación de altura ≤6.2m, y cierre del permiso
2. Firma digital en canvas (touch y mouse)
3. Guardado en localStorage con historial (descargable .txt)
4. Vista detalle con opción de exportar PDF (`window.print()`)
5. Envío a Telegram vía html2canvas + jsPDF con cola de reintentos
6. Offline-first con Service Worker

## Convenciones de código

- No usar librerías externas (excepto html2canvas + jsPDF para PDF)
- Las funciones expuestas globalmente usan prefijo `window._` (ej. `window._limpiarFirma`, `window._verDetalle`)
- Los canvas se redimensionan al ancho del contenedor padre
- Las preguntas de comprobación se almacenan como `pregunta_1`..`pregunta_19`
- Las funciones públicas (llamadas desde HTML onclick) se exponen al final de `app.js`
