"use client";

import React, {
  useState, useCallback, useEffect,
  ComponentType, Component,
} from "react";
import dynamic from "next/dynamic";
import { MONEY_RAIN_TEMPLATE } from "@/remotion/templates";

// ─── Dynamic imports (browser-only) ──────────────────────────────────────────

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div style={s.editorLoading}>Cargando editor…</div>
  ),
});

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false }
);

// ─── Prompt template ─────────────────────────────────────────────────────────

const PROMPT = `Genera una animación para Remotion. Sigue TODAS estas reglas:

• Solo importa desde 'remotion': useCurrentFrame, interpolate, AbsoluteFill, random…
• Un único export default: export default function MiAnimacion() { ... }
• Usa AbsoluteFill como elemento raíz para llenar el frame completo
• Sin TypeScript (sin tipos, interfaces, ni anotaciones de tipo)
• Sin template literals: usa  'rotate(' + x + 'deg)'  NO  \`rotate(\${x}deg)\`
• Todos los estilos son inline: style={{ color: 'red', fontSize: 40 }}
• Elementos visibles desde el frame 0 (no empieces todo invisible)
• Canvas 1280×720 · 30 fps · 150 frames (5 segundos)

Animación que quiero: `;

// ─── AI providers ─────────────────────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    name: "Claude",
    url: "https://claude.ai",
    bg: "linear-gradient(135deg,#c96442,#e8824a)",
    icon: <ClaudeIcon />,
  },
  {
    name: "ChatGPT",
    url: "https://chat.openai.com",
    bg: "linear-gradient(135deg,#10a37f,#1ac998)",
    icon: <ChatGPTIcon />,
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    bg: "linear-gradient(135deg,#4285f4,#a259ff)",
    icon: <GeminiIcon />,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompositionSettings {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}

type RenderState = "idle" | "loading" | "error";

// ─── Safe component wrapper ───────────────────────────────────────────────────
// React 18 dev mode fires a synthetic window ErrorEvent for every error caught
// by an error boundary, which triggers the Next.js overlay regardless.
// We set this flag inside getDerivedStateFromError (synchronous, before the
// window event fires) so our capture-phase listener can preventDefault() it.
let _suppressNextWindowError = false;

interface SafeState { runtimeError: string | null }

function makeSafeComponent(
  Inner: ComponentType<Record<string, unknown>>,
  onError: (msg: string) => void,
): ComponentType<Record<string, unknown>> {

  class SafeWrapper extends Component<Record<string, unknown>, SafeState> {
    state: SafeState = { runtimeError: null };

    static getDerivedStateFromError(err: unknown): SafeState {
      _suppressNextWindowError = true; // arm the window-level suppressor
      return { runtimeError: err instanceof Error ? err.message : String(err) };
    }

    componentDidCatch(err: Error) {
      onError(err.message ?? String(err));
    }

    render() {
      if (this.state.runtimeError) return null;
      return React.createElement(Inner, this.props);
    }
  }

  (SafeWrapper as unknown as { displayName: string }).displayName =
    `Safe(${(Inner as { displayName?: string; name?: string }).displayName ?? (Inner as { name?: string }).name ?? "Animation"})`;
  return SafeWrapper as unknown as ComponentType<Record<string, unknown>>;
}

// ─── useCompiledComponent hook ────────────────────────────────────────────────

function useCompiledComponent(code: string) {
  const [component, setComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !code.trim()) return;
      setIsCompiling(true);
      setCompileError(null);

      try {
        const Babel = await import("@babel/standalone");
        const result = Babel.transform(code, {
          filename: "animation.tsx",
          presets: [["react", { runtime: "classic" }], ["typescript"]],
          plugins: [["transform-modules-commonjs", { strict: false }]],
        });
        if (!result.code) throw new Error("Babel no devolvió código");

        const remotionExports = await import("remotion");
        const reactExports = await import("react");
        const ReactNS = (reactExports as unknown as { default: typeof React }).default ?? reactExports;

        const origInterpolate = remotionExports.interpolate as (
          input: number,
          inputRange: number[],
          outputRange: number[],
          options?: unknown,
        ) => number;

        // Never throw — report the error as a deferred state update so React's
        // render cycle never sees an exception and the dev overlay never fires.
        let hasReportedInterpolateError = false;
        const safeInterpolate = (
          input: number,
          inputRange: number[],
          outputRange: number[],
          options?: unknown,
        ): number => {
          for (let i = 1; i < inputRange.length; i++) {
            if (inputRange[i] <= inputRange[i - 1]) {
              if (!hasReportedInterpolateError) {
                hasReportedInterpolateError = true;
                const msg =
                  `interpolate: el inputRange debe ser ascendente (de menor a mayor).\n` +
                  `Recibido: [${inputRange.join(", ")}]\n` +
                  `Correcto: [${[...inputRange].sort((a, b) => a - b).join(", ")}]`;
                setTimeout(() => {
                  if (!cancelled) { setCompileError(msg); setComponent(null); }
                }, 0);
              }
              return (outputRange as number[])[0] ?? 0; // safe fallback
            }
          }
          return origInterpolate(input, inputRange, outputRange, options);
        };

        const fakeRequire = (name: string): unknown => {
          if (name === "remotion") return { ...remotionExports, interpolate: safeInterpolate };
          if (name === "react") return ReactNS;
          throw new Error(`"${name}" no disponible. Solo "remotion" y "react".`);
        };

        const mod: { exports: Record<string, unknown> } = { exports: {} };
        // eslint-disable-next-line no-new-func
        new Function("require", "module", "exports", "React", result.code)(
          fakeRequire, mod, mod.exports, ReactNS
        );

        const exported = mod.exports.default;
        if (typeof exported !== "function") {
          throw new Error('Necesitas:\n  export default function NombreAnimacion() { ... }');
        }

        // Wrap in a SafeComponent that catches render errors and surfaces them
        // as compile-time errors so the Next.js dev overlay never fires.
        const UserComp = exported as ComponentType<Record<string, unknown>>;
        const safe = makeSafeComponent(UserComp, (msg) => {
          if (!cancelled) {
            setCompileError(msg);
            setComponent(null);
          }
        });

        if (!cancelled) setComponent(() => safe);
      } catch (err) {
        if (!cancelled) { setCompileError(err instanceof Error ? err.message : String(err)); setComponent(null); }
      } finally {
        if (!cancelled) setIsCompiling(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [code]);

  return { component, compileError, isCompiling };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [code, setCode] = useState(MONEY_RAIN_TEMPLATE);
  const [settings, setSettings] = useState<CompositionSettings>({
    durationInFrames: 150, fps: 30, width: 1280, height: 720,
  });
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { component, compileError, isCompiling } = useCompiledComponent(code);

  // Suppress the synthetic window ErrorEvent that React 18 fires in dev mode
  // for errors caught by error boundaries — prevents the Next.js overlay.
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (_suppressNextWindowError) {
        _suppressNextWindowError = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handler, true); // capture phase = runs first
    return () => window.removeEventListener("error", handler, true);
  }, []);

  const handleDownload = useCallback(async () => {
    setRenderState("loading");
    setRenderError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...settings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Error en el servidor");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "animacion.mp4";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setRenderState("idle");
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Error desconocido");
      setRenderState("error");
    }
  }, [code, settings]);

  const setSetting = <K extends keyof CompositionSettings>(key: K, raw: string) => {
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v > 0) setSettings((p) => ({ ...p, [key]: v }));
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const previewW = 520;
  const previewH = Math.round(previewW * settings.height / settings.width);
  const canDownload = renderState !== "loading" && !compileError && !!component;

  return (
    <div style={s.root}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>
            <LogoIcon /> Remotion Studio
          </span>
        </div>

        <div style={s.settingsRow}>
          {([
            { label: "Frames", key: "durationInFrames", min: 1, max: 3000, w: 68 },
            { label: "FPS", key: "fps", min: 1, max: 120, w: 46 },
            { label: "W", key: "width", min: 100, max: 3840, w: 64 },
            { label: "H", key: "height", min: 100, max: 2160, w: 64 },
          ] as const).map(({ label, key, min, max, w }) => (
            <label key={key} style={s.settingLabel}>
              <span style={s.settingText}>{label}</span>
              <input
                type="number"
                value={settings[key]}
                min={min} max={max}
                onChange={(e) => setSetting(key, e.target.value)}
                style={{ ...s.settingInput, width: w }}
              />
            </label>
          ))}
        </div>

        <button
          onClick={handleDownload}
          disabled={!canDownload}
          style={{ ...s.downloadBtn, opacity: canDownload ? 1 : 0.45, cursor: canDownload ? "pointer" : "not-allowed" }}
        >
          {renderState === "loading"
            ? <><Spinner /> Renderizando…</>
            : <><DownloadIcon /> Descargar MP4</>}
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={s.body}>

        {/* Left — editor */}
        <div style={s.editorPanel}>
          <div style={s.panelBar}>
            <TabIcon /><span style={{ marginLeft: 6 }}>animation.tsx</span>
            <div style={{ flex: 1 }} />
            {isCompiling && <Badge color="#f9e2af">⟳ compilando</Badge>}
            {!isCompiling && !compileError && component && <Badge color="#a6e3a1">✓ listo</Badge>}
            {!isCompiling && compileError && <Badge color="#f38ba8">✗ error</Badge>}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <MonacoEditor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 14, bottom: 14 },
                tabSize: 2,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
              beforeMount={(monaco) => {
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true, noSyntaxValidation: false,
                });
              }}
            />
          </div>
        </div>

        {/* Right — preview + prompt */}
        <div style={s.rightPanel}>

          {/* Preview area */}
          <div style={s.previewArea}>
            <div style={s.panelBar}>
              <PreviewIcon />
              <span style={{ marginLeft: 6 }}>
                Preview · {settings.width}×{settings.height} · {(settings.durationInFrames / settings.fps).toFixed(1)}s
              </span>
            </div>
            <div style={s.previewContent}>
              {compileError ? (
                <div style={{ ...s.errorBox, maxWidth: previewW }}>
                  <p style={s.errorTitle}>Error de compilación</p>
                  <pre style={s.errorPre}>{compileError}</pre>
                </div>
              ) : component ? (
                <PlayerBoundary resetKey={component} previewWidth={previewW} previewHeight={previewH}>
                  <div style={s.playerShell}>
                    <Player
                      component={component}
                      inputProps={{}}
                      durationInFrames={settings.durationInFrames}
                      fps={settings.fps}
                      compositionWidth={settings.width}
                      compositionHeight={settings.height}
                      style={{ width: previewW, height: previewH }}
                      controls loop autoPlay
                    />
                  </div>
                </PlayerBoundary>
              ) : (
                <div style={{ ...s.placeholder, width: previewW, height: Math.round(previewW * 9 / 16) }}>
                  <SpinnerLg />
                  <span style={{ marginTop: 12 }}>Compilando…</span>
                </div>
              )}
              {renderState === "error" && renderError && (
                <div style={{ ...s.errorBox, maxWidth: previewW, marginTop: 12 }}>
                  <p style={s.errorTitle}>Error al renderizar</p>
                  <pre style={s.errorPre}>{renderError}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Prompt for AI */}
          <div style={s.promptCard}>
            <div style={s.promptHeader}>
              <div style={s.promptTitle}>
                <AIIcon /> Prompt para IA
              </div>
              <button onClick={copyPrompt} style={{ ...s.copyBtn, ...(copied ? s.copyBtnSuccess : {}) }}>
                {copied ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar prompt</>}
              </button>
            </div>

            <pre style={s.promptText}>{PROMPT}</pre>

            <div style={s.aiRow}>
              <span style={s.aiLabel}>Pedir animación en:</span>
              <div style={s.aiBtns}>
                {AI_PROVIDERS.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...s.aiBtn, background: p.bg }}
                    title={`Abrir ${p.name}`}
                  >
                    <span style={s.aiBtnIcon}>{p.icon}</span>
                    <span style={s.aiBtnLabel}>{p.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <span>Remotion Studio · Next.js</span>
        <span style={{ color: "#52525b" }}>
          {settings.durationInFrames} frames · {settings.fps} fps · {settings.width}×{settings.height}
        </span>
      </footer>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface BProps { children: React.ReactNode; resetKey: unknown; previewWidth: number; previewHeight: number }
interface BState { error: string | null }

class PlayerBoundary extends Component<BProps, BState> {
  state: BState = { error: null };
  static getDerivedStateFromError(err: unknown): BState {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  componentDidUpdate(prev: BProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) return (
      <div style={{ ...s.errorBox, width: this.props.previewWidth, minHeight: this.props.previewHeight, boxSizing: "border-box" }}>
        <p style={s.errorTitle}>Error en tiempo de ejecución</p>
        <pre style={s.errorPre}>{this.state.error}</pre>
      </div>
    );
    return this.props.children;
  }
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#c96442" strokeWidth="1.5"/>
      <circle cx="9" cy="12" r="2" fill="#c96442"/>
      <path d="M13 10l4 2-4 2" stroke="#c96442" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TabIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#52525b" strokeWidth="1.5"/><path d="M7 9h10M7 13h6" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function PreviewIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#52525b" strokeWidth="1.5"/><path d="M10 8l6 4-6 4V8z" fill="#52525b"/></svg>;
}
function DownloadIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 7 }}><path d="M12 3v12M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function AIIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7L12 2z" fill="#c96442" opacity={0.9}/></svg>;
}
function CopyIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
function CheckIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Spinner() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .8s linear infinite", marginRight: 7 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity={0.2}/>
      <path fill="currentColor" opacity={0.8} d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}
function SpinnerLg() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .9s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="#3f3f46" strokeWidth="3"/>
      <path fill="#c96442" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"/>
    </svg>
  );
}

// ─── AI Brand icons ───────────────────────────────────────────────────────────

function ClaudeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C10.5 6.5 9 9 6 11c3 2 4.5 4.5 6 10 1.5-5.5 3-8 6-10-3-2-4.5-4.5-6-9z" fill="white" opacity={0.9}/>
    </svg>
  );
}
function ChatGPTIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="white" opacity={0.9}>
      <path d="M22.28 9.82a5.98 5.98 0 00-.52-4.91 6.05 6.05 0 00-6.51-2.9A6.07 6.07 0 004.98 4.18a5.98 5.98 0 00-4 2.9 6.05 6.05 0 00.74 7.1 5.98 5.98 0 00.51 4.91 6.05 6.05 0 006.51 2.9A5.98 5.98 0 0013.26 24a6.06 6.06 0 005.77-4.21 5.99 5.99 0 004-2.9 6.06 6.06 0 00-.75-7.07zM13.26 22.43a4.48 4.48 0 01-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 00.4-.68V11.2l2.02 1.17a.07.07 0 01.04.05v5.58a4.5 4.5 0 01-4.5 4.43zM3.6 18.3a4.47 4.47 0 01-.54-3.01l.14.08 4.78 2.76a.77.77 0 00.78 0l5.84-3.37v2.33a.08.08 0 01-.03.06l-4.83 2.79A4.5 4.5 0 013.6 18.3zM2.34 7.9a4.49 4.49 0 012.37-1.97v5.68a.77.77 0 00.39.68l5.81 3.35-2.02 1.17a.08.08 0 01-.07 0l-4.83-2.79A4.5 4.5 0 012.34 7.9zm16.6 3.86l-5.84-3.37 2.02-1.17a.08.08 0 01.07 0l4.83 2.79a4.49 4.49 0 01-.68 8.1v-5.67a.79.79 0 00-.4-.68zm2.01-3.02l-.14-.08-4.77-2.78a.78.78 0 00-.79 0L9.41 9.23V6.9a.07.07 0 01.03-.06l4.83-2.79a4.5 4.5 0 016.68 4.66zm-12.64 4.14l-2.02-1.16a.08.08 0 01-.04-.06V6.07a4.5 4.5 0 017.38-3.45l-.14.08-4.78 2.76a.79.79 0 00-.4.68v6.74zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5V10.5z"/>
    </svg>
  );
}
function GeminiIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="white" opacity={0.9}>
      <path d="M12 2c-.5 3.7-1.8 6.4-3.8 8.2C6.2 12 3.5 13.3 0 13.8c3.5.5 6.2 1.8 8.2 3.6C10.2 19.2 11.5 21.9 12 26c.5-4.1 1.8-6.8 3.8-8.6 2-1.8 4.7-3.1 8.2-3.6-3.5-.5-6.2-1.8-8.2-3.6C13.8 8.4 12.5 5.7 12 2z"/>
    </svg>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, color, background: color + "20", borderRadius: 4, padding: "2px 7px", fontWeight: 600, letterSpacing: "0.03em" }}>
      {children}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex", flexDirection: "column", height: "100vh",
    background: "#09090b", color: "#e4e4e7",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
  },

  // Header
  header: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "0 20px", height: 52,
    background: "#111113",
    borderBottom: "1px solid #27272a",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", minWidth: 180 },
  logo: {
    display: "flex", alignItems: "center",
    fontWeight: 700, fontSize: 15, color: "#fafafa",
    letterSpacing: "-0.3px",
  },
  settingsRow: {
    display: "flex", alignItems: "center", gap: 10, flex: 1,
    justifyContent: "center",
  },
  settingLabel: {
    display: "flex", alignItems: "center", gap: 5, fontSize: 11,
    color: "#a1a1aa",
  },
  settingText: { fontWeight: 500 },
  settingInput: {
    background: "#1c1c1f",
    border: "1px solid #3f3f46",
    borderRadius: 6, color: "#e4e4e7",
    padding: "3px 7px", fontSize: 12,
    outline: "none",
  },
  downloadBtn: {
    display: "flex", alignItems: "center",
    background: "linear-gradient(135deg,#c96442,#e8824a)",
    color: "#fff", border: "none", borderRadius: 8,
    padding: "7px 16px", fontWeight: 700, fontSize: 13,
    transition: "opacity .15s", whiteSpace: "nowrap",
    boxShadow: "0 2px 12px rgba(201,100,66,0.35)",
  },

  // Body
  body: { display: "flex", flex: 1, overflow: "hidden" },

  // Editor panel
  editorPanel: {
    width: "54%", display: "flex", flexDirection: "column",
    borderRight: "1px solid #27272a", overflow: "hidden",
  },
  editorLoading: {
    flex: 1, background: "#1e1e1e",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#52525b", fontSize: 13,
  },

  // Right panel
  rightPanel: {
    flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
    background: "#0d0d10",
  },
  previewArea: {
    flex: 1, display: "flex", flexDirection: "column",
    borderBottom: "1px solid #27272a", overflow: "hidden", minHeight: 0,
  },
  previewContent: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: 20, overflowY: "auto", gap: 10,
  },
  playerShell: {
    borderRadius: 10, overflow: "hidden",
    boxShadow: "0 0 0 1px #27272a, 0 16px 48px rgba(0,0,0,.7)",
  },
  placeholder: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#111113", borderRadius: 10,
    border: "1px dashed #3f3f46", color: "#52525b", fontSize: 12,
  },

  // Panel bar
  panelBar: {
    display: "flex", alignItems: "center",
    padding: "0 14px", height: 36,
    background: "#111113", borderBottom: "1px solid #27272a",
    fontSize: 12, color: "#71717a", gap: 0, flexShrink: 0,
  },

  // Prompt card
  promptCard: {
    flexShrink: 0,
    background: "#111113",
    borderTop: "1px solid #27272a",
    padding: "14px 18px 16px",
  },
  promptHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  promptTitle: {
    display: "flex", alignItems: "center",
    fontSize: 13, fontWeight: 700, color: "#e4e4e7",
  },
  promptText: {
    fontSize: 11, lineHeight: 1.65,
    color: "#a1a1aa",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    background: "#0d0d10",
    border: "1px solid #27272a",
    borderRadius: 8, padding: "10px 14px",
    whiteSpace: "pre-wrap", margin: "0 0 12px",
    maxHeight: 148, overflowY: "auto",
  },
  copyBtn: {
    display: "flex", alignItems: "center",
    background: "#1c1c1f", border: "1px solid #3f3f46",
    borderRadius: 7, padding: "5px 12px",
    fontSize: 12, fontWeight: 600, color: "#a1a1aa",
    cursor: "pointer", transition: "all .15s",
  },
  copyBtnSuccess: {
    background: "#14532d22", border: "1px solid #16a34a",
    color: "#4ade80",
  },

  // AI row
  aiRow: {
    display: "flex", alignItems: "center", gap: 12,
  },
  aiLabel: { fontSize: 11, color: "#52525b", whiteSpace: "nowrap" },
  aiBtns: { display: "flex", gap: 8 },
  aiBtn: {
    display: "flex", alignItems: "center", gap: 7,
    borderRadius: 8, padding: "7px 14px",
    textDecoration: "none", color: "#fff",
    fontSize: 12, fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,.35)",
    transition: "filter .15s, transform .1s",
  },
  aiBtnIcon: { display: "flex", alignItems: "center" },
  aiBtnLabel: { letterSpacing: "-0.2px" },

  // Errors
  errorBox: {
    padding: "14px 18px", background: "#0d0d10",
    border: "1px solid #7f1d1d", borderRadius: 10,
    boxSizing: "border-box",
  },
  errorTitle: { color: "#f87171", fontWeight: 700, margin: "0 0 8px", fontSize: 13 },
  errorPre: {
    color: "#fca5a5", fontSize: 11.5, whiteSpace: "pre-wrap",
    margin: 0, fontFamily: "monospace", lineHeight: 1.55,
  },

  // Footer
  footer: {
    display: "flex", justifyContent: "space-between",
    padding: "4px 20px", background: "#111113",
    borderTop: "1px solid #27272a",
    fontSize: 11, color: "#3f3f46", flexShrink: 0,
  },
};
