import { Composition, registerRoot } from "remotion";
import { AuktivaDemo } from "./AuktivaDemo";

function Root() {
  return (
    <Composition
      id="AuktivaDemo"
      component={AuktivaDemo}
      durationInFrames={24 * 30}
      fps={30}
      width={1600}
      height={900}
    />
  );
}

registerRoot(Root);
