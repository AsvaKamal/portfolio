import { forwardRef, useMemo } from "react";
import * as THREE from "three";

/**
 * The procedural character shared by the hero/desk scene and the tech-stack archery scene:
 * a head in a hijab with round gold-rimmed glasses, and the hijab's drape over the shoulders.
 * Units are "avatar units": neck base at the origin, head radius 0.5, facing +z.
 */

const PALETTE = {
  skin: "#e2b594",
  hijab: "#7d5a45",
  underscarf: "#f1e6d6",
  top: "#2f221b",
  brow: "#2b1a12",
  lips: "#b4675b",
  frame: "#c9a063",
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
      dark: new THREE.MeshStandardMaterial({ color: "#150d09", roughness: 0.3 }),
      frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.28, metalness: 0.85 }),
      lens: new THREE.MeshStandardMaterial({ color: "#e6c79c", emissive: "#d4a066", emissiveIntensity: 0.25, transparent: true, opacity: 0.2, roughness: 0.1 }),
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

        {/* round glasses, thin gold rims; the temples tuck under the hijab */}
        <group position={[0, 0.5, 0.5]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[0.165 * s, 0, 0]}>
              <mesh material={mats.frame}>
                <torusGeometry args={[0.118, 0.016, 10, 40]} />
              </mesh>
              <mesh material={mats.lens}>
                <circleGeometry args={[0.114, 32]} />
              </mesh>
              <mesh material={mats.frame} position={[0.125 * s, 0.02, -0.22]} rotation={[0, 0.14 * s, 0]}>
                <boxGeometry args={[0.014, 0.018, 0.44]} />
              </mesh>
            </group>
          ))}
          <mesh material={mats.frame} position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.05, 0.011, 8, 16, Math.PI]} />
          </mesh>
        </group>
      </group>
    );
  }
);

/** The hijab falling over the neck and shoulders, in body space (outside the torso). */
export function HijabDrape({ mats }: { mats: CharacterMats }) {
  const geo = useMemo(() => {
    const pts = [
      [0.28, 0.46], [0.32, 0.26], [0.4, 0.1], [0.6, -0.02], [0.84, -0.15], [0.97, -0.3], [1.0, -0.47], [0.98, -0.62], [0.95, -0.72],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 56);
  }, []);
  return <mesh geometry={geo} material={mats.hijab} scale={[1, 1, 0.62]} />;
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
