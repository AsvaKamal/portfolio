import { forwardRef, useMemo } from "react";
import * as THREE from "three";

/**
 * The procedural character shared by the hero/desk scene and the tech-stack archery scene:
 * a head in a soft grey hijab with thin round silver glasses, the hijab's drape over the shoulders,
 * a navy knit top and white headphones resting around the neck.
 * Units are "avatar units": neck base at the origin, head radius 0.5, facing +z.
 */

const PALETTE = {
  skin: "#f0c8ab",
  hijab: "#a9adb4",
  underscarf: "#c9ccd1",
  top: "#1d2740",
  brow: "#3b2a22",
  lips: "#c46f72",
  blush: "#eea79a",
  frame: "#a9afb8",
  phones: "#f2f2f0",
  cushion: "#c8cacd",
};

/** Materials for the character. `lens` is animated by the desk scene (it reflects the monitor). */
export function useCharacterMaterials() {
  return useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: PALETTE.skin, roughness: 0.6 }),
      hijab: new THREE.MeshStandardMaterial({ color: PALETTE.hijab, roughness: 0.92, side: THREE.DoubleSide }),
      underscarf: new THREE.MeshStandardMaterial({ color: PALETTE.underscarf, roughness: 0.9, side: THREE.DoubleSide }),
      top: new THREE.MeshStandardMaterial({ color: PALETTE.top, roughness: 0.9, side: THREE.DoubleSide }),
      brow: new THREE.MeshStandardMaterial({ color: PALETTE.brow, roughness: 0.8 }),
      lips: new THREE.MeshStandardMaterial({ color: PALETTE.lips, roughness: 0.5 }),
      blush: new THREE.MeshStandardMaterial({ color: PALETTE.blush, roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }),
      dark: new THREE.MeshStandardMaterial({ color: "#150d09", roughness: 0.3 }),
      frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.25, metalness: 0.9 }),
      lens: new THREE.MeshStandardMaterial({ color: "#dfe6ee", emissive: "#d4a066", emissiveIntensity: 0.25, transparent: true, opacity: 0.2, roughness: 0.1 }),
      phones: new THREE.MeshStandardMaterial({ color: PALETTE.phones, roughness: 0.35 }),
      cushion: new THREE.MeshStandardMaterial({ color: PALETTE.cushion, roughness: 0.85 }),
    }),
    []
  );
}
export type CharacterMats = ReturnType<typeof useCharacterMaterials>;

// Head ellipsoid, and the hijab shell 12% outside it so the two never intersect.
const HEAD_SCALE: [number, number, number] = [0.84, 1.08, 0.95];
const HEAD_Y = 0.45;
const HEAD_K = 0.9; // whole head (with hijab and glasses) relative to the body: keeps adult proportions
const SHELL = 1.12;
// Face opening in the shell, in sphere angles: theta from the crown down, phi around the front (+z).
const OPEN_TOP = 1.03; // just above the brows
const OPEN_BOTTOM = 2.15; // under the lips; below this the scarf wraps under the chin
const OPEN_HALF = 0.81; // half-width, wide enough to show the glasses
const FRONT = Math.PI / 2; // three.js sphere: phi = π/2 points along +z

/**
 * One eyebrow as a tapered tube lying on the forehead: full at the inner end, peaking two thirds
 * of the way out, thinning to a fine tail. `side` is -1 (her right) or 1 (her left).
 */
function browGeometry(side: number) {
  const [rx, ry, rz] = HEAD_SCALE.map((v) => v * 0.5);
  const onFace = (x: number, y: number) => {
    const k = 1 - (x / rx) ** 2 - ((y - HEAD_Y) / ry) ** 2;
    return new THREE.Vector3(x * side, y, rz * Math.sqrt(Math.max(k, 0)) + 0.012);
  };
  // inner → peak → tail, in head space (y is measured from the neck like the rest of the head)
  const curve = new THREE.CatmullRomCurve3([onFace(0.07, 0.648), onFace(0.13, 0.672), onFace(0.2, 0.684), onFace(0.25, 0.664)]);
  const SEG = 24, RAD = 8;
  const geo = new THREE.TubeGeometry(curve, SEG, 0.014, RAD, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const taper = t < 0.15 ? 0.75 + t * 1.6 : 1 - Math.pow((t - 0.15) / 0.85, 1.6) * 0.75;
    curve.getPointAt(t, c);
    for (let j = 0; j <= RAD; j++) {
      const idx = i * (RAD + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c);
      v.z *= 0.45; // flat against the skin
      v.multiplyScalar(taper).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Head in a hijab. The ref'd group pivots at the top of the neck (turn it to look around);
 * `eyes` scales to blink.
 */
export const HijabiHead = forwardRef<THREE.Group, { mats: CharacterMats; eyes?: React.Ref<THREE.Group>; position?: [number, number, number] }>(
  function HijabiHead({ mats, eyes, position = [0, 0.22, 0] }, ref) {
    const shellScale = HEAD_SCALE.map((v) => v * SHELL) as [number, number, number];
    const underScale = HEAD_SCALE.map((v) => v * 1.05) as [number, number, number];
    const browGeos = useMemo(() => [browGeometry(-1), browGeometry(1)], []);
    return (
      <group ref={ref} position={position} scale={HEAD_K}>
        <mesh material={mats.skin} position={[0, HEAD_Y, 0]} scale={HEAD_SCALE}>
          <sphereGeometry args={[0.5, 48, 32]} />
        </mesh>

        {/* hijab: crown, a band with the face opening, and the part that wraps under the chin */}
        <group position={[0, HEAD_Y, 0]} scale={shellScale}>
          <mesh material={mats.hijab}>
            <sphereGeometry args={[0.5, 56, 16, 0, Math.PI * 2, 0, OPEN_TOP]} />
          </mesh>
          <mesh material={mats.hijab}>
            <sphereGeometry args={[0.5, 56, 20, FRONT + OPEN_HALF, Math.PI * 2 - OPEN_HALF * 2, OPEN_TOP, OPEN_BOTTOM - OPEN_TOP]} />
          </mesh>
          <mesh material={mats.hijab}>
            <sphereGeometry args={[0.5, 56, 10, 0, Math.PI * 2, OPEN_BOTTOM, Math.PI * 0.94 - OPEN_BOTTOM]} />
          </mesh>
        </group>
        {/* ivory underscarf peeking out along the forehead */}
        <group position={[0, HEAD_Y, 0]} scale={underScale}>
          <mesh material={mats.underscarf}>
            <sphereGeometry args={[0.5, 32, 4, FRONT - OPEN_HALF - 0.1, OPEN_HALF * 2 + 0.2, OPEN_TOP - 0.02, 0.08]} />
          </mesh>
        </group>
        {/* soft volume at the back of the head */}
        <mesh material={mats.hijab} position={[0, HEAD_Y + 0.12, -0.34]} scale={[1, 0.85, 0.85]}>
          <sphereGeometry args={[0.27, 24, 16]} />
        </mesh>

        <group ref={eyes} position={[0, 0.5, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[0.155 * s, 0, 0.425]}>
              <mesh material={mats.dark} scale={[1, 1.2, 0.6]}>
                <sphereGeometry args={[0.04, 16, 12]} />
              </mesh>
              {/* upper lash line with a small outer flick */}
              <mesh material={mats.dark} position={[0, 0.036, 0.006]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.04, 0.008, 6, 12, Math.PI]} />
              </mesh>
              <mesh material={mats.dark} position={[0.045 * s, 0.045, 0.004]} rotation={[0, 0, 0.5 * s]}>
                <boxGeometry args={[0.03, 0.008, 0.012]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* arched brows, mirrored, following the forehead just above the glasses */}
        {browGeos.map((g, i) => (
          <mesh key={i} geometry={g} material={mats.brow} />
        ))}
        {/* nose, lips */}
        <mesh material={mats.skin} position={[0, 0.405, 0.48]} scale={[0.7, 1, 0.85]}>
          <sphereGeometry args={[0.055, 16, 12]} />
        </mesh>
        <mesh material={mats.lips} position={[0, 0.285, 0.44]} rotation={[0.2, 0, Math.PI]}>
          <torusGeometry args={[0.055, 0.016, 8, 20, Math.PI]} />
        </mesh>
        <mesh material={mats.lips} position={[0, 0.3, 0.448]} scale={[1, 0.45, 0.6]}>
          <sphereGeometry args={[0.04, 12, 8]} />
        </mesh>

        {/* a soft blush on the cheeks, below the lenses */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.blush} position={[0.2 * s, 0.37, 0.405]} rotation={[0, 0.42 * s, 0]} scale={[1, 0.7, 1]}>
            <circleGeometry args={[0.055, 20]} />
          </mesh>
        ))}

        {/* round glasses, thin silver rims; the temples tuck under the hijab */}
        <group position={[0, 0.5, 0.5]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[0.165 * s, 0, 0]}>
              <mesh material={mats.frame}>
                <torusGeometry args={[0.118, 0.01, 10, 40]} />
              </mesh>
              <mesh material={mats.lens}>
                <circleGeometry args={[0.114, 32]} />
              </mesh>
              <mesh material={mats.frame} position={[0.125 * s, 0.02, -0.22]} rotation={[0, 0.14 * s, 0]}>
                <boxGeometry args={[0.01, 0.013, 0.44]} />
              </mesh>
            </group>
          ))}
          <mesh material={mats.frame} position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.05, 0.008, 8, 16, Math.PI]} />
          </mesh>
        </group>
      </group>
    );
  }
);

/** The hijab wrapped snugly round the neck, ending on the shoulders; in body space (outside the torso). */
export function HijabDrape({ mats }: { mats: CharacterMats }) {
  const geo = useMemo(() => {
    const pts = [
      [0.28, 0.46], [0.31, 0.26], [0.38, 0.1], [0.55, 0.0], [0.72, -0.08], [0.83, -0.17], [0.89, -0.27], [0.88, -0.36],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 56);
  }, []);
  return <mesh geometry={geo} material={mats.hijab} scale={[1, 1, 0.62]} />;
}

/**
 * Over-ear headphones resting around the neck, in body space: the band circles the back of the neck
 * on the hijab, the cups lie on the collarbones facing outwards. Angles are measured from the front (+z).
 */
const PHONES = { r: 0.56, rz: 0.52, gap: 0.72, tilt: 0.45 };
export function Headphones({ mats }: { mats: CharacterMats }) {
  const { r, rz, gap, tilt } = PHONES;
  const at = (a: number) => new THREE.Vector3(r * Math.sin(a), 0, rz * Math.cos(a));
  const band = useMemo(() => {
    const pts = Array.from({ length: 25 }, (_, i) => at(gap + ((Math.PI * 2 - gap * 2) * i) / 24));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.034, 8, false);
  }, []);
  return (
    <group position={[0, 0.1, 0]} rotation={[tilt, 0, 0]}>
      <mesh geometry={band} material={mats.phones} />
      {[-1, 1].map((s) => (
        <group key={s} position={at(gap * s).multiplyScalar(1.12)} rotation={[0, gap * s, 0]}>
          <mesh material={mats.phones} position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.14, 0.09, 28]} />
          </mesh>
          <mesh material={mats.cushion} position={[0, 0, -0.02]}>
            <torusGeometry args={[0.115, 0.04, 10, 28]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Torso (a lathe, flattened front to back) in body space: sloped shoulders into a gently tapering, loose-fitting top. */
export function Torso({ mats }: { mats: CharacterMats }) {
  const geo = useMemo(() => {
    const pts = [
      [0, -1.9], [0.86, -1.9], [0.85, -1.6], [0.83, -1.25], [0.87, -0.9], [0.92, -0.6], [0.92, -0.42], [0.86, -0.27], [0.74, -0.13], [0.5, -0.02], [0.26, 0.08], [0, 0.1],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  return <mesh geometry={geo} material={mats.top} scale={[1, 1, 0.58]} />;
}

/** A capsule stretched between two points (arms). Positions update whenever `from`/`to` change. */
export function Limb({ from, to, r, material }: { from: THREE.Vector3; to: THREE.Vector3; r: number; material: THREE.Material }) {
  const len = from.distanceTo(to);
  const pos = useMemo(() => from.clone().lerp(to, 0.5), [from, to]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()), [from, to]);
  return (
    <mesh material={material} position={pos} quaternion={quat}>
      <capsuleGeometry args={[r, len, 6, 16]} />
    </mesh>
  );
}

/** Sets a capsule mesh (unit length along y) to span two points; for limbs animated every frame. */
const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();
export function placeLimb(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  tmpDir.subVectors(to, from);
  const len = tmpDir.length();
  m.position.copy(from).lerp(to, 0.5);
  m.quaternion.setFromUnitVectors(UP, tmpDir.divideScalar(len || 1));
  m.scale.set(1, len, 1);
}
