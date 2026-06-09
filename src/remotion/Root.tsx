import React from "react";
import { Composition, registerRoot } from "remotion";
import { MiAnimacion } from "./MiAnimacion";

const Root: React.FC = () => {
  return (
    <Composition
      id="MiAnimacion"
      component={MiAnimacion}
      durationInFrames={60}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{ textoDinamico: "Hola Mundo" }}
    />
  );
};

registerRoot(Root);
