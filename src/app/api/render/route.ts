import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Vercel serverless has no bundled Chromium or ffmpeg — rendering is impossible.
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "El renderizado MP4 requiere Chromium + ffmpeg en el servidor.\n" +
          "Vercel (serverless) no los incluye, por lo que esta función no está disponible en la demo.\n\n" +
          "Para renderizar, tienes tres opciones:\n" +
          "  1. Ejecuta el proyecto localmente:  npm run dev\n" +
          "  2. Despliega en Railway, Fly.io o Render.com (soportan Node.js completo)\n" +
          "  3. Configura Remotion Lambda en AWS (renderizado en la nube)",
      },
      { status: 501 }
    );
  }

  const id = crypto.randomBytes(8).toString("hex");
  // Use the OS temp dir (/tmp on Linux) — process.cwd() may be read-only.
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

    // 1. Write user's component
    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, "UserAnimation.tsx"), code, "utf-8");

    // 2. Generate Root.tsx — registerRoot() is required by @remotion/bundler
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

    // 3. Bundle
    const serveUrl = await bundle({
      entryPoint: path.join(compDir, "Root.tsx"),
      webpackOverride: (config) => config,
    });

    // 4. Select composition
    const composition = await selectComposition({
      serveUrl,
      id: "UserAnimation",
      inputProps: {},
    });

    // 5. Render to MP4
    outputPath = path.join(os.tmpdir(), `render-${id}.mp4`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {},
    });

    // 6. Return binary
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
