import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import Workstation from "./Avatar";
import DataField from "./DataField";
import { canvasProps } from "./canvas";
import { pointer, stage, clamp01, lerp } from "./shared";
import { isLowPower } from "../lib";

type Props = { active: boolean; onReady: () => void };

/**
 * After the first frame, compiles every material in the scene, including the About desk that is
 * still hidden and off-camera, then tells the page it's ready. Doing this behind the loader stops
 * the site stuttering the first time you scroll to the desk.
 */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(({ gl, scene, camera }) => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => {
      gl.compileAsync(scene, camera)
        .then(() => {
          // Without KHR_parallel_shader_compile three.js defers linking to a program's first use,
          // so touch each one now, while the loader still covers the page.
          gl.info.programs?.forEach((prog) => prog.getUniforms());
        })
        .finally(onReady);
    });
  });
  return null;
}

/** Pointer in normalised [-1, 1] coords, tracked on window so the HTML over the canvas doesn't block it. */
function PointerTracker() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return null;
}

/**
 * Reads how far the About section has scrolled in (0 = hero, 1 = About fills the screen),
 * eases it, and frames the camera for each pose.
 */
function StageDirector() {
  const { camera, size } = useThree();
  const about = useRef<HTMLElement | null>(null);
  const aspect = size.width / size.height;
  const baseZ = aspect < 0.6 ? 13 : aspect < 0.8 ? 11 : aspect < 1.2 ? 8.5 : 7;

  useFrame((_, dt) => {
    about.current ??= document.getElementById("about");
    const top = about.current?.getBoundingClientRect().top ?? window.innerHeight;
    const target = clamp01(1 - top / window.innerHeight);
    stage.p += (target - stage.p) * (1 - Math.exp(-dt * 6));
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, lerp(0.35, 3.1, stage.p), lerp(baseZ, baseZ * 0.95, stage.p));
    cam.lookAt(0, lerp(0, -0.55, stage.p), 0);
  });
  return null;
}

export default function HeroScene({ active, onReady }: Props) {
  return (
    <Canvas {...canvasProps(active)} camera={{ fov: 30, position: [0, 0.35, 7], near: 0.1, far: 50 }}>
      <StageDirector />
      <PointerTracker />
      <ReadySignal onReady={onReady} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4ea" />
      {/* warm bronze rim light from behind: separates the silhouette from the dark background */}
      <directionalLight position={[3, 2, -4]} intensity={3.5} color="#d9a066" />
      <directionalLight position={[-4, 0, -3]} intensity={1.2} color="#f3dcc0" />

      <Workstation />
      <group position={[0, -0.35, 0]}>
        <DataField count={isLowPower() ? 1400 : 3200} />
      </group>
    </Canvas>
  );
}
