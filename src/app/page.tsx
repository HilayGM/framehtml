import Link from "next/link";

export default function Landing() {
  return (
    <div style={s.root}>
      {/* Gradient orbs */}
      <div style={s.orb1} />
      <div style={s.orb2} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#c96442" strokeWidth="1.5"/>
            <circle cx="9" cy="12" r="2" fill="#c96442"/>
            <path d="M13 10l4 2-4 2" stroke="#c96442" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          FrameHTML
        </div>
        <Link href="/studio" style={s.navBtn}>
          Abrir Studio →
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main style={s.main}>

        {/* Badge */}
        <div style={s.badge}>
          <svg width={10} height={10} viewBox="0 0 10 10" fill="#e8824a">
            <polygon points="5,0 6.5,3.5 10,3.8 7.5,6.2 8.2,10 5,8 1.8,10 2.5,6.2 0,3.8 3.5,3.5"/>
          </svg>
          Powered by Remotion
        </div>

        {/* Heading */}
        <h1 style={s.h1}>
          De Remotion a{" "}
          <span style={s.accent}>MP4</span>
          {" "}en segundos
        </h1>

        {/* Subtitle */}
        <p style={s.subtitle}>
          Escribe animaciones React con Remotion, ve el resultado en tiempo real y
          exporta tu video — todo desde el navegador.
        </p>

        {/* CTA */}
        <Link href="/studio" style={s.cta}>
          Abrir Remotion Studio
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {/* Feature pills */}
        <div style={s.pills}>
          {[
            { icon: "✏️", label: "Editor Monaco" },
            { icon: "▶", label: "Preview en vivo" },
            { icon: "🎬", label: "Export MP4" },
            { icon: "🤖", label: "Prompts para IA" },
          ].map((f) => (
            <div key={f.label} style={s.pill}>
              <span>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* App mockup */}
        <div style={s.mockupWrap}>
          {/* Browser chrome */}
          <div style={s.mockupBar}>
            <div style={s.dot} />
            <div style={s.dot} />
            <div style={s.dot} />
            <div style={s.urlBar}>framehtml.vercel.app/studio</div>
          </div>

          {/* Content */}
          <div style={s.mockupBody}>
            {/* Editor pane */}
            <div style={s.editorPane}>
              <div style={{ color: "#6272a4", marginBottom: 4 }}>{"// Animación Remotion"}</div>
              <div>
                <span style={{ color: "#cba6f7" }}>{"import "}</span>
                <span style={{ color: "#89dceb" }}>{"{ useCurrentFrame, interpolate }"}</span>
              </div>
              <div>
                <span style={{ color: "#cba6f7" }}>{"  from "}</span>
                <span style={{ color: "#a6e3a1" }}>{"'remotion'"}</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ color: "#cba6f7" }}>{"export default "}</span>
                <span style={{ color: "#89b4fa" }}>{"function "}</span>
                <span style={{ color: "#f1fa8c" }}>{"MiAnimacion"}</span>
                <span style={{ color: "#f8f8f2" }}>{"() {"}</span>
              </div>
              <div style={{ paddingLeft: 16, color: "#f8f8f2" }}>
                {"const frame = "}
                <span style={{ color: "#89dceb" }}>{"useCurrentFrame"}</span>
                {"()"}
              </div>
              <div style={{ paddingLeft: 16, marginTop: 4, color: "#f8f8f2" }}>
                <span style={{ color: "#cba6f7" }}>{"const "}</span>
                {"opacity = "}
                <span style={{ color: "#89dceb" }}>{"interpolate"}</span>
              </div>
              <div style={{ paddingLeft: 32, color: "#f8f8f2" }}>{"(frame, [0, 30], [0, 1])"}</div>
              <div style={{ paddingLeft: 16, marginTop: 4 }}>
                <span style={{ color: "#cba6f7" }}>{"return "}</span>
                <span style={{ color: "#f38ba8" }}>{"<div"}</span>
                <span style={{ color: "#f8f8f2" }}>{" style={{ opacity }}>"}</span>
              </div>
              <div style={{ paddingLeft: 32, color: "#a6e3a1" }}>{"💰 MONEY RAIN 💰"}</div>
              <div style={{ paddingLeft: 16, color: "#f38ba8" }}>{"</div>"}</div>
              <div style={{ color: "#f8f8f2" }}>{"}"}</div>
            </div>

            {/* Preview pane */}
            <div style={s.previewPane}>
              {["💰", "💵", "💸", "🪙", "💴", "💶"].map((e, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: (8 + i * 15) + "%",
                  top: (6 + (i % 4) * 20) + "%",
                  fontSize: 26 + (i % 3) * 8,
                  opacity: 0.75,
                  transform: "rotate(" + (i * 23 - 30) + "deg)",
                }}>
                  {e}
                </div>
              ))}
              <div style={s.previewLabel}>💸 MONEY RAIN 💸</div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <span>FrameHTML · Remotion Studio</span>
        <span>Hecho con Next.js + Remotion</span>
      </footer>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    background: "#09090b",
    color: "#e4e4e7",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
    position: "relative",
  },
  orb1: {
    position: "fixed",
    top: "-15%", left: "35%",
    width: 700, height: 700,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(201,100,66,0.13) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  orb2: {
    position: "fixed",
    bottom: "-20%", right: "10%",
    width: 500, height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(80,60,200,0.09) 0%, transparent 65%)",
    pointerEvents: "none",
  },

  // Nav
  nav: {
    position: "relative", zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 40px",
    borderBottom: "1px solid #18181b",
  },
  navLogo: {
    display: "flex", alignItems: "center", gap: 10,
    fontWeight: 800, fontSize: 16, color: "#fafafa",
    letterSpacing: "-0.4px",
  },
  navBtn: {
    background: "transparent",
    border: "1px solid #3f3f46",
    borderRadius: 8,
    padding: "7px 16px",
    color: "#a1a1aa",
    fontSize: 13, fontWeight: 600,
    textDecoration: "none",
  },

  // Hero
  main: {
    position: "relative", zIndex: 1,
    flex: 1,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "60px 20px 80px",
    textAlign: "center",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: "rgba(201,100,66,0.12)",
    border: "1px solid rgba(201,100,66,0.3)",
    borderRadius: 100, padding: "5px 14px",
    marginBottom: 32,
    fontSize: 12, color: "#e8824a", fontWeight: 600,
    letterSpacing: "0.02em",
  },
  h1: {
    fontSize: "clamp(36px, 6.5vw, 76px)",
    fontWeight: 900,
    lineHeight: 1.06,
    letterSpacing: "-3px",
    margin: "0 0 22px",
    color: "#fafafa",
    maxWidth: 820,
  },
  accent: {
    background: "linear-gradient(135deg, #c96442 20%, #e8824a 80%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "clamp(15px, 1.8vw, 18px)",
    color: "#71717a",
    maxWidth: 520,
    lineHeight: 1.7,
    margin: "0 0 44px",
  },
  cta: {
    display: "inline-flex", alignItems: "center",
    background: "linear-gradient(135deg, #c96442, #e8824a)",
    color: "#fff",
    borderRadius: 12,
    padding: "15px 34px",
    fontSize: 16, fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 4px 40px rgba(201,100,66,0.4)",
    letterSpacing: "-0.3px",
    marginBottom: 40,
  },
  pills: {
    display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center",
    marginBottom: 60,
  },
  pill: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#111113", border: "1px solid #27272a",
    borderRadius: 100, padding: "8px 16px",
    fontSize: 13, color: "#a1a1aa",
  },

  // Mockup
  mockupWrap: {
    width: "100%", maxWidth: 860,
    background: "#111113",
    border: "1px solid #27272a",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
  },
  mockupBar: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#0d0d10",
    padding: "10px 16px",
    borderBottom: "1px solid #27272a",
  },
  dot: {
    width: 10, height: 10, borderRadius: "50%", background: "#3f3f46",
  },
  urlBar: {
    marginLeft: 10, flex: 1,
    background: "#1c1c1f", borderRadius: 6,
    padding: "3px 12px",
    fontSize: 11, color: "#52525b",
    textAlign: "left",
  },
  mockupBody: {
    display: "flex", height: 270,
  },
  editorPane: {
    flex: 1,
    background: "#1e1e1e",
    padding: "16px 20px",
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    fontSize: 11.5,
    color: "#f8f8f2",
    lineHeight: 1.65,
    borderRight: "1px solid #27272a",
    overflow: "hidden",
    textAlign: "left",
  },
  previewPane: {
    width: 360,
    background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #1a1a2e 100%)",
    display: "flex",
    alignItems: "center", justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  previewLabel: {
    color: "#FFD700", fontWeight: 900, fontSize: 20,
    textShadow: "0 0 24px rgba(255,215,0,0.7)",
    zIndex: 1, letterSpacing: "-0.5px",
  },

  // Footer
  footer: {
    position: "relative", zIndex: 1,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 40px",
    borderTop: "1px solid #18181b",
    fontSize: 12, color: "#52525b",
  },
};
