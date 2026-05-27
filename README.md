# API Playground Dashboard

Dashboard en Angular 21 que muestra las 20 APIs del backend **api-playground**, comprueba su estado en vivo y deja ejecutar cada endpoint para ver su JSON.

Está pensado para alumnos que están aprendiendo a integrar un frontend con una API real, así que prioriza claridad, accesibilidad y "qué pasa cuando algo falla".

## Capturas mentales

- 20 cards alineadas en una rejilla `col-12 → col-sm-6 → col-lg-4 → col-xxl-3`.
- Botón **Test Connection** en la navbar → spinner por card → badge verde/rojo/gris con el tiempo de respuesta.
- Filtros por categoría, dificultad y búsqueda de texto, todos reactivos.
- Botón **Ejecutar** en cada card → offcanvas a la derecha con HTTP status, ms y el JSON pretty-printeado.
- Accesible: skip-link, landmarks, headings ordenados, `aria-live` con resumen tras la comprobación.

## Requisitos

- Node 20 o superior
- npm 10 o superior
- El backend [api-playground-backend](../api-playground-backend) corriendo en `http://localhost:8080`

## Arranque rápido

```bash
# 1) Backend
cd api-playground-backend
# Copia el .env.example a .env (las APIs sin key funcionan sin tocar nada).
mvn spring-boot:run                  # → http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html

# 2) Dashboard
cd ../api-playground-dashboard
npm install
npm start                            # → http://localhost:4200
```

Abre [http://localhost:4200](http://localhost:4200) y pulsa **Test Connection**: los 20 badges se actualizan en menos de cinco segundos.

## Estructura del código

```
src/app/
├── app.config.ts             # provideHttpClient + provideZonelessChangeDetection
├── app.routes.ts             # ruta única → Dashboard
├── core/
│   ├── models.ts             # ApiInfo, ApiHealth, HealthReport, RunResult, ApiError
│   └── api.service.ts        # inject(HttpClient): getCatalog, getHealth, runApi
├── shared/
│   ├── status-badge/         # UP/DOWN/SKIPPED + variantes difficulty/key
│   └── filter-bar/           # búsqueda + selects con model() (two-way)
└── pages/
    └── dashboard/
        ├── dashboard.ts/.html
        ├── api-card/         # input signals + output run
        └── run-offcanvas/    # JSON pretty-printeado + status + ms
```

### Estado reactivo (signals)

Todo el estado del dashboard vive en signals:

```ts
catalog       = signal<ApiInfo[]>([])
health        = signal<Map<string, ApiHealth>>(new Map())
checking      = signal(false)
query         = signal('')
category      = signal<'all' | string>('all')
difficulty    = signal<'all' | Difficulty>('all')
filtered      = computed(() => /* busca + filtra sobre catalog() */)
summary       = computed(() => /* cuenta UP / DOWN / SKIPPED */)
```

La aplicación es **zoneless**: no usa Zone.js, así que basta con escribir en un signal y el template re-renderiza solo, sin `ChangeDetectorRef` ni `setTimeout`.

## Scripts útiles

| Comando         | Para qué                                                 |
|-----------------|----------------------------------------------------------|
| `npm start`     | Servidor de desarrollo en `http://localhost:4200`        |
| `npm run build` | Build de producción en `dist/`                           |
| `npm test`      | Tests unitarios con Vitest                               |

## Accesibilidad

- Skip-link al inicio para saltar al catálogo con el tabulador.
- Estructura semántica con `<nav>`, `<main>`, `<header>`, `<article>` y heading `h1 → h2`.
- Cada control de filtro tiene un `<label>` (visualmente oculto) y cada botón de icono lleva `aria-label`.
- Los badges nunca comunican estado solo con color: incluyen texto (UP / DOWN / SKIPPED) y `aria-label` descriptivo.
- Una región `aria-live="polite"` oculta anuncia el resumen tras pulsar **Test Connection**.
- Las animaciones respetan `prefers-reduced-motion`.

## Variables de entorno

`src/environments/environment.ts` apunta al backend en `http://localhost:8080/api/v1`. Para producción se usa `environment.prod.ts` con una URL relativa (`/api/v1`), pensada para servir el dashboard detrás del mismo dominio que el backend.
