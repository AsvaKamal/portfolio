import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer, stage, smooth, lerp, screen, typing } from "./shared";
import { Headphones, HijabDrape, HijabiHead, Limb, Torso, useCharacterMaterials, type CharacterMats } from "./Hijabi";
import { makeGlowTexture } from "./textures";

const ACCENT = new THREE.Color("#d4a066");
const tmpColor = new THREE.Color();

/** Ease-out with a small overshoot, for things popping into place. */
const easeBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

// Where the rig sits at the desk: beside the About text on wide screens, above it on portrait ones.
const DESK_POSE_WIDE = { x: 1.35, y: 0, ry: -0.5 };
const DESK_POSE_PORTRAIT = { x: 0, y: 0.7, ry: -0.4 };

// Units below are "avatar units": neck base at the origin, head radius 0.5, avatar faces +z.
const DESK_Y = -1.6;
const SCREEN = { R: 2.3, H: 0.95, L: 1.5, cy: -0.22, front: 2.0 };

/** Head follows the pointer in the hero; looks down at the monitor at the desk. */
function useHeadFollow(head: React.RefObject<THREE.Object3D | null>) {
  useFrame((state, dt) => {
    if (!head.current) return;
    const t = state.clock.elapsedTime;
    const d = smooth(0.3, 0.9, stage.p);
    const k = 1 - Math.exp(-dt * 4);
    const ty = lerp(pointer.x * 0.55, pointer.x * 0.12 + Math.sin(t * 0.4) * 0.05, d);
    const tx = lerp(-pointer.y * 0.28, 0.26, d) + Math.sin(t * 0.8) * 0.02;
    head.current.rotation.y += (ty - head.current.rotation.y) * k;
    head.current.rotation.x += (tx - head.current.rotation.x) * k;
    head.current.rotation.z += (lerp(-pointer.x * 0.06, 0, d) - head.current.rotation.z) * k;
  });
}

function useMaterials() {
  return useMemo(
    () => ({
      lid: new THREE.MeshStandardMaterial({ color: "#d3d6db", roughness: 0.38, metalness: 0.35 }),
      logo: new THREE.MeshBasicMaterial({ color: "#f4f6f8" }),
      desk: new THREE.MeshStandardMaterial({ color: "#3a2a1f", roughness: 0.5, metalness: 0.05 }),
      mat: new THREE.MeshStandardMaterial({ color: "#1c140f", roughness: 0.95 }),
      bezel: new THREE.MeshStandardMaterial({ color: "#2e231b", roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide }),
      metal: new THREE.MeshStandardMaterial({ color: "#6b5440", roughness: 0.3, metalness: 0.8 }),
      kbBase: new THREE.MeshStandardMaterial({ color: "#241a14", roughness: 0.5, metalness: 0.4 }),
    }),
    []
  );
}
type Mats = ReturnType<typeof useMaterials>;

function ProceduralAvatar({ mats }: { mats: CharacterMats }) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const hands = useRef<(THREE.Mesh | null)[]>([]);
  useHeadFollow(head);

  // shoulder → elbow → hand, resting on the keyboard / laptop
  const arms = useMemo(
    () =>
      [-1, 1].map((s) => ({
        s,
        shoulder: new THREE.Vector3(0.8 * s, -0.42, 0.05),
        elbow: new THREE.Vector3(0.98 * s, -1.2, 0.5),
        hand: new THREE.Vector3(0.36 * s, -1.42, 1.1),
      })),
    []
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (body.current) body.current.position.y = Math.sin(t * 1.4) * 0.012;
    if (eyes.current) eyes.current.scale.y = t % 4.2 > 4.05 ? 0.1 : 1; // blink
    // glasses reflect whatever the monitor is showing
    const lit = smooth(0.4, 1, stage.p);
    tmpColor.setRGB(screen.color.r, screen.color.g, screen.color.b);
    mats.lens.emissive.copy(ACCENT).lerp(tmpColor, lit);
    mats.lens.emissiveIntensity = 0.25 + lit * 1.1;
    mats.lens.opacity = 0.18 + lit * 0.25;
    // hands hop to the key being pressed and dip onto it
    const amt = smooth(0.5, 1, stage.p);
    const k = 1 - Math.exp(-dt * 22);
    hands.current.forEach((h, i) => {
      if (!h) return;
      const base = arms[i].hand;
      const tp = typing[i];
      const tx = base.x * 0.95 + THREE.MathUtils.clamp(tp.x - base.x * 0.95, -0.14, 0.14) * amt;
      const tz = base.z + 0.1 + THREE.MathUtils.clamp(tp.z - 1.18, -0.1, 0.1) * amt;
      const ty = -1.42 + (0.05 * (1 - tp.dip) - 0.01) * amt;
      h.position.x += (tx - h.position.x) * k;
      h.position.z += (tz - h.position.z) * k;
      h.position.y += (ty - h.position.y) * k;
    });
  });

  return (
    <group ref={body}>
      <Torso mats={mats} />
      {arms.map((a, i) => (
        <group key={a.s}>
          <Limb from={a.shoulder} to={a.elbow} r={0.14} material={mats.top} />
          <Limb from={a.elbow} to={a.hand} r={0.115} material={mats.top} />
          <mesh
            ref={(m) => {
              hands.current[i] = m;
            }}
            material={mats.skin}
            position={[a.hand.x * 0.95, a.hand.y, a.hand.z + 0.1]}
            scale={[1, 0.6, 1.3]}
          >
            <sphereGeometry args={[0.1, 16, 12]} />
          </mesh>
        </group>
      ))}
      <HijabDrape mats={mats} />
      <Headphones mats={mats} />
      <HijabiHead ref={head} eyes={eyes} mats={mats} />
    </group>
  );
}

/** A square JavaScript sticker: yellow, with "JS" in the bottom-right corner. */
function makeJsSticker() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f0db4f";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#1b1b1b";
  g.font = "800 58px system-ui, sans-serif";
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  g.fillText("JS", 118, 116);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Hero prop: back of a laptop lid facing the viewer. Shrinks away as the desk scene takes over. */
function Laptop({ mats }: { mats: Mats }) {
  const ref = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const sticker = useMemo(makeJsSticker, []);
  useEffect(() => () => sticker.dispose(), [sticker]);
  useFrame(() => {
    if (!ref.current) return;
    const s = 1 - smooth(0.05, 0.4, stage.p);
    ref.current.scale.setScalar(Math.max(s, 0.0001));
    ref.current.visible = s > 0.001;
    if (light.current) light.current.intensity = 2.4 * s;
  });
  // The light sits outside the group that gets hidden: changing the number of visible lights
  // forces three.js to recompile every material, which stutters mid-scroll.
  return (
    <>
    <pointLight ref={light} position={[0, -0.65, 1.05]} color="#ffe2bd" intensity={2.4} distance={3} decay={1.6} />
    <group ref={ref} position={[0, -1.55, 0.95]}>
      <mesh material={mats.lid}>
        <boxGeometry args={[1.3, 0.05, 0.9]} />
      </mesh>
      <group position={[0, 0.02, 0.43]} rotation={[-0.22, 0, 0]}>
        <mesh material={mats.lid} position={[0, 0.42, 0]}>
          <boxGeometry args={[1.3, 0.84, 0.04]} />
        </mesh>
        <mesh material={mats.logo} position={[0, 0.44, 0.022]}>
          <circleGeometry args={[0.06, 24]} />
        </mesh>
        <mesh position={[0.4, 0.18, 0.022]} rotation={[0, 0, -0.12]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshStandardMaterial map={sticker} roughness={0.6} />
        </mesh>
      </group>
    </group>
    </>
  );
}

type ScreenKind = "code" | "dashboard" | "sheet";
const SCREENS: { kind: ScreenKind; light: string }[] = [
  { kind: "code", light: "#7aa2ff" },
  { kind: "dashboard", light: "#ffb54a" },
  { kind: "sheet", light: "#3fdc8a" },
];

/** Monitor content drawn on a canvas: a code editor, a BI dashboard and a spreadsheet. */
function makeScreenTexture(kind: ScreenKind) {
  const W = 1600, H = 600, SCALE = 0.64; // drawn in 1600x600 units onto a 1024x384 canvas
  const c = document.createElement("canvas");
  c.width = W * SCALE;
  c.height = H * SCALE;
  const g = c.getContext("2d")!;
  g.scale(SCALE, SCALE);
  const bar = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };

  if (kind === "code") {
    bar(0, 0, W, H, "#0d1426");
    bar(0, 0, W, 34, "#16203a");
    bar(0, 34, 260, H, "#101a31");
    for (let i = 0; i < 18; i++) bar(24, 64 + i * 28, 80 + ((i * 53) % 120), 10, i === 4 ? "#7aa2ff" : "#27365c");
    const cols = ["#c792ea", "#82aaff", "#c3e88d", "#ffcb6b", "#5c6d99", "#89ddff"];
    for (let i = 0; i < 26; i++) {
      bar(290, 60 + i * 20, 26, 8, "#2a3a63");
      let x = 340 + 30 * ((i * 7) % 4);
      for (let j = 0; j < 4; j++) {
        const w = 30 + ((i * 37 + j * 53) % 150);
        bar(x, 60 + i * 20, w, 8, cols[(i + j * 2) % cols.length]);
        x += w + 14;
      }
    }
    bar(290, 60 + 14 * 20 - 4, W - 330, 16, "rgba(122,162,255,0.12)");
    bar(1240, 60, 320, 500, "#101a31");
    g.strokeStyle = "#7aa2ff";
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 12; i++) g.lineTo(1260 + i * 26, 360 - Math.sin(i * 0.9) * 60 - i * 12);
    g.stroke();
  } else if (kind === "dashboard") {
    bar(0, 0, W, H, "#1a1206");
    bar(0, 0, W, 34, "#2a1d0a");
    ["2.4k", "98.6%", "1.4s", "+31%"].forEach((v, i) => {
      const x = 30 + i * 390;
      bar(x, 56, 370, 120, "#2a1d0a");
      g.fillStyle = i === 3 ? "#ffb54a" : "#fbe9cf";
      g.font = "700 58px system-ui, sans-serif";
      g.fillText(v, x + 24, 136);
      bar(x + 24, 150, 140, 6, "#6b5433");
    });
    bar(30, 196, 980, 380, "#2a1d0a");
    for (let i = 0; i < 14; i++) {
      const h = 60 + ((i * 67) % 250);
      bar(60 + i * 68, 550 - h, 44, h, i % 4 === 0 ? "#ffb54a" : "#6b4a1c");
    }
    bar(1040, 196, 530, 380, "#2a1d0a");
    g.lineWidth = 46;
    const arcs: [string, number, number][] = [["#ffb54a", 0, 2.4], ["#ff7a1c", 2.4, 4.3], ["#6b4a1c", 4.3, Math.PI * 2]];
    arcs.forEach(([col, a0, a1]) => {
      g.strokeStyle = col;
      g.beginPath();
      g.arc(1305, 386, 120, a0, a1);
      g.stroke();
    });
  } else {
    bar(0, 0, W, H, "#f4f7f4");
    bar(0, 0, W, 34, "#1e7145");
    bar(0, 34, W, 36, "#e3ebe5");
    const cw = 140, rh = 30;
    for (let r = 0; r < 17; r++)
      for (let cI = 0; cI < 11; cI++) {
        const x = 60 + cI * cw, y = 80 + r * rh;
        g.strokeStyle = "#d5ddd7";
        g.lineWidth = 1;
        g.strokeRect(x, y, cw, rh);
        if (r === 0) bar(x + 1, y + 1, cw - 2, rh - 2, "#cfe8d8");
        const w = 30 + ((r * 31 + cI * 17) % 80);
        bar(x + 10, y + 11, w, 8, r === 0 ? "#1e7145" : cI === 3 && r % 4 === 1 ? "#21a366" : "#9aa7a0");
      }
    g.strokeStyle = "#21a366";
    g.lineWidth = 3;
    g.strokeRect(60 + 3 * cw, 80 + 5 * rh, cw, rh * 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // the screen is the inside of a cylinder, so flip horizontally
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.anisotropy = 4;
  return tex;
}

/** About-section workstation: desk, curved ultrawide, RGB mechanical keyboard and the lights they cast. */
function Desk({ mats }: { mats: Mats }) {
  const root = useRef<THREE.Group>(null);
  const monitor = useRef<THREE.Group>(null);
  const keyboard = useRef<THREE.Group>(null);
  const underglow = useRef<THREE.MeshBasicMaterial>(null);
  const kbLight = useRef<THREE.PointLight>(null);
  const screenLight = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.SpriteMaterial>(null);
  const keys = useRef<THREE.InstancedMesh>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);

  const { screenTexs, lightColors, glowTex } = useMemo(
    () => ({
      screenTexs: SCREENS.map((sc) => makeScreenTexture(sc.kind)),
      lightColors: SCREENS.map((sc) => new THREE.Color(sc.light)),
      glowTex: makeGlowTexture(),
    }),
    []
  );
  useEffect(() => () => (screenTexs.forEach((t) => t.dispose()), glowTex.dispose()), [screenTexs, glowTex]);
  const gl = useThree((st) => st.gl);
  useEffect(() => screenTexs.forEach((tex) => gl.initTexture(tex)), [gl, screenTexs]);
  const cast = useMemo(() => new THREE.Color(SCREENS[0].light), []);
  const shown = useRef(0);
  const flash = useRef(0);

  const { R, H, L, cy, front } = SCREEN;
  const cz = front - R;

  // 5 × 15 keycaps; a few accent/light keys for a custom-keyboard look
  const COLS = 15, ROWS = 5, PITCH = 0.098;
  const keyData = useMemo(() => {
    const dark = new THREE.Color("#33261d"), light = new THREE.Color("#efe4d2"), acc = new THREE.Color("#c9955a");
    const list: { x: number; z: number; rx: number; color: THREE.Color }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const isAcc = (r === 0 && c === 0) || (r === 3 && c === 14);
        const isLight = c === 0 || c === 14 || r === 4;
        list.push({ x: (c - (COLS - 1) / 2) * PITCH, z: (r - (ROWS - 1) / 2) * PITCH, rx: -0.08 * (r - 2), color: isAcc ? acc : isLight ? light : dark });
      }
    return { list, pressed: new Float32Array(list.length), timers: [0.1, 0.25] };
  }, []);
  // Give keys their colours up front: an InstancedMesh without instance colours uses a different
  // shader, which would otherwise be compiled mid-scroll the first time a key lights up.
  useLayoutEffect(() => {
    const m = keys.current!;
    const o = new THREE.Object3D();
    keyData.list.forEach((k, i) => {
      o.position.set(k.x, 0, k.z);
      o.rotation.x = k.rx;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, k.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [keyData]);
  const keyObj = useMemo(() => new THREE.Object3D(), []);
  const keyCol = useMemo(() => new THREE.Color(), []);

  // Presses a random key under one hand and tells the avatar where that hand should go.
  const pressKey = (hand: number) => {
    const col = hand === 0 ? 1 + ((Math.random() * 6) | 0) : 8 + ((Math.random() * 6) | 0);
    const row = 1 + ((Math.random() * 3) | 0);
    const idx = row * COLS + col;
    keyData.pressed[idx] = 1;
    typing[hand].x = keyData.list[idx].x;
    typing[hand].z = 1.18 + keyData.list[idx].z;
    typing[hand].dip = 1;
  };

  const hue = useMemo(() => new THREE.Color(), []);
  const keyHot = useMemo(() => new THREE.Color(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = smooth(0.3, 0.95, stage.p);
    if (root.current) root.current.visible = d > 0.001;
    if (d <= 0.001) {
      if (kbLight.current) kbLight.current.intensity = 0;
      if (screenLight.current) screenLight.current.intensity = 0;
      return;
    }

    // switch what's on screen every few seconds; the light it casts eases to the new colour
    const idx = Math.floor(t / 3.2) % SCREENS.length;
    if (idx !== shown.current && screenMat.current) {
      shown.current = idx;
      screenMat.current.map = screenTexs[idx];
      flash.current = 1;
    }
    flash.current *= Math.exp(-dt * 5);
    cast.lerp(lightColors[shown.current], 1 - Math.exp(-dt * 5));
    screen.color.r = cast.r;
    screen.color.g = cast.g;
    screen.color.b = cast.b;
    // warm amber glow that breathes between bronze and champagne, instead of a gamer rainbow
    const warm = 0.08 + Math.sin(t * 0.5) * 0.025;
    hue.setHSL(warm, 0.75, 0.55);
    keyHot.setHSL(warm, 0.9, 0.78);

    // typing: each hand presses a key every 70 to 220 ms; keys sink and light up, then spring back
    const typingOn = stage.p > 0.6;
    const kd = keyData;
    kd.timers.forEach((_, h) => {
      kd.timers[h] -= dt;
      if (kd.timers[h] <= 0 && typingOn) {
        pressKey(h);
        kd.timers[h] = 0.07 + Math.random() * 0.15;
      }
      typing[h].dip *= Math.exp(-dt * 12);
    });
    const m = keys.current;
    if (m) {
      const decay = Math.exp(-dt * 10);
      kd.list.forEach((k, i) => {
        const pr = (kd.pressed[i] *= decay);
        keyObj.position.set(k.x, -0.035 * pr, k.z);
        keyObj.rotation.x = k.rx;
        keyObj.updateMatrix();
        m.setMatrixAt(i, keyObj.matrix);
        m.setColorAt(i, keyCol.copy(k.color).lerp(keyHot, Math.min(1, pr * 1.3)));
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // pop in: monitor rises, keyboard slides in
    if (monitor.current) {
      monitor.current.position.y = lerp(-1.6, 0, easeBack(d));
      monitor.current.scale.setScalar(Math.max(d, 0.001));
    }
    if (keyboard.current) keyboard.current.scale.setScalar(Math.max(easeBack(smooth(0.45, 1, stage.p)), 0.001));
    if (underglow.current) underglow.current.color.copy(hue);
    if (kbLight.current) {
      kbLight.current.color.copy(hue);
      kbLight.current.intensity = 2.2 * d;
    }
    if (screenLight.current) {
      screenLight.current.color.copy(cast);
      screenLight.current.intensity = (10 + flash.current * 6 + Math.sin(t * 3) * 0.8) * d;
    }
    if (glow.current) {
      glow.current.color.copy(cast);
      glow.current.opacity = 0.5 * d;
    }
  });

  return (
    <>
    {/* lights live outside the hidden root so the scene's light count never changes */}
    <pointLight ref={kbLight} position={[0, DESK_Y + 0.3, 1.28]} intensity={0} distance={2.2} decay={1.5} />
    <pointLight ref={screenLight} position={[0, cy + 0.9, front - 0.6]} intensity={0} distance={3.2} decay={1.2} />
    <group ref={root}>
      {/* desk + mat */}
      <mesh material={mats.desk} position={[0, DESK_Y - 0.05, 1.1]}>
        <boxGeometry args={[4.8, 0.1, 2.9]} />
      </mesh>
      <mesh material={mats.mat} position={[0.15, DESK_Y + 0.006, 1.2]}>
        <boxGeometry args={[2.6, 0.012, 0.95]} />
      </mesh>

      {/* mechanical keyboard with RGB underglow */}
      <group ref={keyboard} position={[0, DESK_Y + 0.05, 1.18]} rotation={[0.06, 0, 0]}>
        <mesh material={mats.kbBase}>
          <boxGeometry args={[COLS * PITCH + 0.07, 0.07, ROWS * PITCH + 0.07]} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[COLS * PITCH + 0.1, 0.012, ROWS * PITCH + 0.1]} />
          <meshBasicMaterial ref={underglow} toneMapped={false} />
        </mesh>
        <instancedMesh ref={keys} args={[undefined, undefined, COLS * ROWS]} position={[0, 0.06, 0]}>
          <boxGeometry args={[0.084, 0.055, 0.084]} />
          <meshStandardMaterial roughness={0.55} />
        </instancedMesh>
      </group>

      {/* mouse */}
      <mesh material={mats.kbBase} position={[1.25, DESK_Y + 0.04, 1.25]} scale={[0.7, 0.4, 1]}>
        <sphereGeometry args={[0.1, 16, 12]} />
      </mesh>

      {/* curved ultrawide */}
      <group ref={monitor}>
        <group position={[0, cy, cz]}>
          <mesh>
            <cylinderGeometry args={[R, R, H, 64, 1, true, -L / 2, L]} />
            <meshBasicMaterial ref={screenMat} map={screenTexs[0]} side={THREE.BackSide} toneMapped={false} />
          </mesh>
          <mesh material={mats.bezel}>
            <cylinderGeometry args={[R + 0.035, R + 0.035, H + 0.08, 64, 1, true, -L / 2 - 0.012, L + 0.024]} />
          </mesh>
          {/* bias-light strip on the back */}
          <mesh position={[0, H / 2 - 0.05, 0]}>
            <cylinderGeometry args={[R + 0.07, R + 0.07, 0.03, 64, 1, true, -L / 2 + 0.1, L - 0.2]} />
            <meshBasicMaterial color="#d4a066" side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        {/* stand */}
        <mesh material={mats.metal} position={[0, (cy - H / 2 + DESK_Y) / 2, front + 0.12]}>
          <boxGeometry args={[0.16, cy - H / 2 - DESK_Y + 0.1, 0.07]} />
        </mesh>
        <mesh material={mats.metal} position={[0, DESK_Y + 0.02, front + 0.08]}>
          <boxGeometry args={[0.9, 0.04, 0.45]} />
        </mesh>
        {/* soft ambient glow behind the screen */}
        <sprite position={[0, cy + 0.3, front + 0.6]} scale={[5.5, 3.2, 1]}>
          <spriteMaterial ref={glow} map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
    </>
  );
}

/**
 * The whole character rig. Scroll progress (stage.p) moves it from the centred hero pose
 * to a three-quarter view at the desk in the About section.
 */
export default function Workstation() {
  const mats = useMaterials();
  const character = useCharacterMaterials();
  const rig = useRef<THREE.Group>(null);
  // follows the canvas size, so rotating a phone re-frames the desk scene
  const portrait = useThree((s) => s.size.width / s.size.height < 0.8);

  useFrame(() => {
    if (!rig.current) return;
    const d = smooth(0, 1, stage.p);
    const deskPose = portrait ? DESK_POSE_PORTRAIT : DESK_POSE_WIDE;
    rig.current.position.set(lerp(0, deskPose.x, d), lerp(-0.35, deskPose.y, d), 0);
    rig.current.rotation.y = lerp(pointer.x * 0.1, deskPose.ry, d);
  });

  return (
    <group ref={rig} scale={0.74}>
      <ProceduralAvatar mats={character} />
      <Laptop mats={mats} />
      <Desk mats={mats} />
    </group>
  );
}
