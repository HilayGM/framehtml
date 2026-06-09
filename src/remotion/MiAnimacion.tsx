import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

interface Props {
  textoDinamico?: string;
}

export const MiAnimacion: React.FC<Props> = ({ textoDinamico = "Hola Mundo" }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, 20], [60, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <p
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          color: "#ffffff",
          fontSize: 72,
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.2,
          textShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {textoDinamico}
      </p>
    </AbsoluteFill>
  );
};
