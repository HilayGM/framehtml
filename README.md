<p align="center">
  <img src="public/title.svg" alt="REMOTION studio" width="100%"/>
</p>

<p align="center">
  Escribe animaciones React, visualiza en tiempo real, exporta MP4.
</p>

---

## Uso rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — la landing te lleva al estudio en `/studio`.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| Animaciones | Remotion 4 |
| Editor | Monaco Editor |
| Transpilación en browser | `@babel/standalone` |
| Estilos | Tailwind CSS 4 |

## Estructura

```
src/
├── app/
│   ├── page.tsx          # Landing
│   ├── studio/page.tsx   # Editor + Player en tiempo real
│   └── api/render/       # Endpoint de renderizado MP4
└── remotion/
    └── templates.ts      # Animación de ejemplo
```

## Renderizado MP4

El endpoint `/api/render` usa `@remotion/renderer` (requiere Chromium).  
En Vercel (serverless) devuelve `501` con instrucciones. Para render real:

- **Local** → `npm run dev` y usa el botón *Descargar MP4*
- **Railway / Fly.io / Render** → despliega con el `Dockerfile` incluido
- **AWS** → Remotion Lambda

## Deploy con Docker

```bash
docker build -t remotion-studio .
docker run -p 3000:3000 remotion-studio
```

El `Dockerfile` instala las dependencias de sistema de Chrome headless y pre-descarga el binario de Remotion durante el build.

---

<p align="center">
  Hecho por <a href="https://github.com/HilayGM">HilayGM</a>
</p>
