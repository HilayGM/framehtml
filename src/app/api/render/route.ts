import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";

export const maxDuration = 300;

const VERCEL_MSG =
  "El renderizado MP4 requiere Chromium + ffmpeg en el servidor.\n" +
  "Vercel (serverless) no los incluye, por lo que esta función no está disponible en la demo.\n\n" +
  "Para renderizar, tienes tres opciones:\n" +
  "  1. Ejecuta el proyecto localmente:  npm run dev\n" +
  "  2. Despliega en Railway, Fly.io o Render.com (soportan Node.js completo)\n" +
  "  3. Configura Remotion Lambda en AWS (renderizado en la nube)";

// Docker/Linux containers have no GPU — use software WebGL so Chrome doesn't
// crash trying to initialise hardware acceleration and kill the process.
const CHROMIUM_OPTS = {
  gl: "swiftshader" as const,
} as const;

export async function POST(req: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: VERCEL_MSG }, { status: 501 });
  }

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const id = crypto.randomBytes(8).toString("hex");
  const compDir = path.join(os.tmpdir(), `remotion-${id}`);
  let outputPath: string | null = null;

  try {
    const body = await req.json();
    const { code, durationInFrames = 150, fps = 30, width = 1280, height = 720 } = body as {
      code: string; durationInFrames: number; fps: number; width: number; height: number;
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Falta el campo 'code'" }, { status: 400 });
    }

    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, "UserAnimation.tsx"), code, "utf-8");

    const rootSource = `
import { Composition, registerRoot } from 'remotion';
import UserAnimation from './UserAnimation';

const Root = () => (
  <Composition
    id="UserAnimation"
    component={UserAnimation as React.ComponentType<Record<string, unknown>>}
    durationInFrames={${durationInFrames}}
    fps={${fps}}
    width={${width}}
    height={${height}}
    defaultProps={{}}
  />
);

registerRoot(Root);
`;
    await fs.writeFile(path.join(compDir, "Root.tsx"), rootSource, "utf-8");

    const serveUrl = await bundle({
      entryPoint: path.join(compDir, "Root.tsx"),
      webpackOverride: (config) => config,
    });

    const composition = await selectComposition({
      serveUrl,
      id: "UserAnimation",
      inputProps: {},
      chromiumOptions: CHROMIUM_OPTS,
    });

    outputPath = path.join(os.tmpdir(), `render-${id}.mp4`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {},
      chromiumOptions: CHROMIUM_OPTS,
      // Limit concurrency in constrained Railway containers
      concurrency: 2,
    });

    const buffer = await fs.readFile(outputPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="animacion.mp4"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[render]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  } finally {
    await fs.rm(compDir, { recursive: true, force: true }).catch(() => {});
    if (outputPath) await fs.unlink(outputPath).catch(() => {});
  }
}
