# FR-SST-027 - Permiso para Trabajo en Alturas

## Descripción

PWA (Progressive Web App) para diligenciar, guardar localmente y exportar en PDF el formato **FR-SST-027** de SITOC. Funciona offline gracias a un Service Worker.

## Stack

- **HTML5 + CSS3 vanilla** — sin frameworks ni librerías externas
- **JavaScript vanilla** — sin dependencias
- **Canvas API** — firmas digitales
- **localStorage** — persistencia local de registros
- **Service Worker** (`sw.js`) — caché offline
- **Manifest** (`manifest.json`) — instalable en dispositivos móviles
- **n8n** — integración opcional (webhook) para enviar datos a un backend

## Estructura

```
Alturas/
├── index.html        # App completa (HTML, CSS, JS inline)
├── manifest.json     # Configuración PWA
├── sw.js             # Service Worker (caché offline)
└── AGENTS.md         # Este archivo
```

## Convenciones

- **JS inline** — todo el código vive dentro de `<script>` en `index.html`
- **Prefijo de IDs** — `signatureCanvas_*` para canvas de firmas, `techCard_*` para tarjetas de técnicos
- **LocalStorage key** — `permisosAlturas` (JSON array)
- **Navegación** — 2 pantallas (`form` y `historial/detalle`) controladas por `showScreen(name)`
- **Firmas** — se guardan como `data:image/png` (base64)
- **Webhook n8n** — configurar `URL_N8N` en `index.html:735` para integración
- **Sin tests** — no hay suite de pruebas configurada

## Funcionalidades clave

1. Formulario con datos generales, EPP, técnicos (dinámicos), coordinador, comprobaciones físicas (19 preguntas), verificación de altura ≤6.2m, y cierre del permiso
2. Firma digital en canvas (touch y mouse)
3. Guardado en localStorage con historial
4. Vista detalle con opción de exportar PDF (`window.print()`)
5. Offline-first con Service Worker

## Convenciones de código

- No usar librerías externas
- Seguir el patrón de funciones globales existentes (`agregarTecnico()`, `iniciarCanvas()`, `limpiarFirma()`, etc.)
- Los canvas se redimensionan al ancho del contenedor padre
- Las preguntas de comprobación se almacenan como `pregunta_1`..`pregunta_19`
