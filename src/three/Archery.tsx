import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { canvasProps } from "./canvas";
import { BADGE_ASPECT, makeBadgeTexture, makeGlowTexture } from "./textures";
import { Headphones, HijabDrape, HijabiHead, Torso, placeLimb, useCharacterMaterials, type CharacterMats } from "./Hijabi";
import { smooth, lerp } from "./shared";

/**
 * Tech-stack archery: the avatar draws her bow and looses one arrow per tool. Each arrow carries a
 * badge with the tool's logo and name and leaves a glowing trail; when it lands, the target flashes,
 * throws a shockwave and sparks, and `onHit` fires so the page can light up that tool in the list.
 */

// Archer-local pose, in avatar units (neck base at the origin, facing +z, her left hand towards +x).
const LINE_Y = 0.3; // arrow height, level with the jaw
const LINE_Z = 0.44;
const SHOULDER_L = new THREE.Vector3(0.78, -0.38, 0.05);
const ELBOW_L = new THREE.Vector3(1.3, 0.04, 0.32);
const BOW_HAND = new THREE.Vector3(1.85, LINE_Y, LINE_Z);
const SHOULDER_R = new THREE.Vector3(-0.78, -0.38, 0.05);
const GRAB = new THREE.Vector3(0.95, LINE_Y, LINE_Z); // where the drawing hand takes the string
const ANCHOR = new THREE.Vector3(0.06, LINE_Y, LINE_Z); // full draw: hand at the jaw
const FOLLOW = new THREE.Vector3(-0.22, LINE_Y + 0.04, LINE_Z - 0.08); // follow-through after release
const ELBOW_R_GRAB = new THREE.Vector3(-0.05, -0.28, 0.6);
const ELBOW_R_DRAW = new THREE.Vector3(-0.92, 0.36, 0.22);
const BOW_H = 1.05; // half-height of the bow
const BRACE = 0.3; // string sits this far behind the grip at rest
const ARROW_LEN = 1.9;

const SHOT = 1.3; // seconds per shot
const P_GRAB = 0.16, P_DRAWN = 0.52, P_LOOSE = 0.68; // phases within a shot
const REST = 1.8; // extra pause after the last tool, so the full list stays lit before the next round
const POOL = 8; // arrows that can be in the air or in the target at once
const BURSTS = 3;
const SPARKS = 18;
const BURST_LIFE = 0.65;

const GOLD = "#f1c989";
const X = new THREE.Vector3(1, 0, 0);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

type Layout = { spread: number; scale: number; z: number; y: number; badge: number };
/** Fits archer + target across the canvas and drops the body so the frame cuts it at the waist. */
function layoutFor(aspect: number): Layout {
  const narrow = aspect < 1.4;
  const spread = narrow ? 1.7 : aspect < 2 ? 2.7 : 3.3;
  const scale = narrow ? 0.85 : 1;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(15));
  const needW = spread * 2 + (narrow ? 4.2 : 5) * scale; // archer's body on the left, target on the right, with a margin
  const z = Math.max(3.7 / (2 * tanHalf), needW / (2 * tanHalf * aspect));
  const halfH = z * tanHalf;
  const y = 1.75 * scale - halfH; // torso bottom (-1.9) just below the frame
  return { spread, scale, z, y, badge: narrow ? 1.6 : 1.25 };
}

/** Arrow built along +x: tail (nock) at the origin, tip at ARROW_LEN. */
function ArrowModel({ mats }: { mats: ArrowMats }) {
  return (
    <>
      <mesh material={mats.shaft} position={[ARROW_LEN / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, ARROW_LEN - 0.12, 8]} />
      </mesh>
      <mesh material={mats.head} position={[ARROW_LEN - 0.07, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.045, 0.16, 12]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mats.fletch} position={[0.16, 0, 0]} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
          <boxGeometry args={[0.24, 0.1, 0.006]} />
        </mesh>
      ))}
      <mesh material={mats.head} position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.04, 8]} />
      </mesh>
    </>
  );
}

function useArrowMaterials() {
  return useMemo(
    () => ({
      shaft: new THREE.MeshStandardMaterial({ color: "#efe4d2", roughness: 0.6 }),
      head: new THREE.MeshStandardMaterial({ color: "#c9a063", roughness: 0.25, metalness: 0.9 }),
      fletch: new THREE.MeshStandardMaterial({ color: "#b0804a", roughness: 0.8, side: THREE.DoubleSide }),
      bow: new THREE.MeshStandardMaterial({ color: "#5a3622", roughness: 0.45, metalness: 0.1 }),
      string: new THREE.MeshBasicMaterial({ color: "#f3e7d3" }),
      // the gold centre of the target glows when an arrow lands
      bull: new THREE.MeshStandardMaterial({ color: "#c9a063", roughness: 0.35, metalness: 0.6, emissive: "#ffc76e", emissiveIntensity: 0.15 }),
    }),
    []
  );
}
type ArrowMats = ReturnType<typeof useArrowMaterials>;

function Target({ innerRef, bull }: { innerRef: React.RefObject<THREE.Group | null>; bull: THREE.Material }) {
  const rings: [number, string][] = [
    [0.95, "#f3eadb"], [0.78, "#b0804a"], [0.6, "#2a1e17"], [0.42, "#e6c79c"],
  ];
  return (
    <group ref={innerRef}>
      {/* straw boss behind the face */}
      <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.99, 0.99, 0.16, 48]} />
        <meshStandardMaterial color="#8a6a4e" roughness={0.95} />
      </mesh>
      {rings.map(([r, c], i) => (
        <mesh key={r} position={[0, 0, 0.002 + i * 0.002]}>
          <circleGeometry args={[r, 48]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.01]} material={bull}>
        <circleGeometry args={[0.22, 48]} />
      </mesh>
      {/* legs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.55 * s, -1.25, -0.35]} rotation={[0.3, 0, 0.18 * s]}>
          <boxGeometry args={[0.07, 1.9, 0.07]} />
          <meshStandardMaterial color="#4a3326" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

type Flight = {
  state: "idle" | "fly" | "stuck";
  slug: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** landing point in target space, where the impact burst plays */
  local: THREE.Vector3;
  /** stuck position before the target's recoil offset is added */
  rest: THREE.Vector3;
  dir: THREE.Vector3;
  t: number;
  dur: number;
  age: number;
};

type Burst = { age: number; vel: Float32Array };

/** Where an arrow's tip is at flight progress `t` (0..1): a straight line lifted by a parabolic arc. */
function arrowPath(f: Flight, t: number, arc: number, out: THREE.Vector3) {
  out.copy(f.from).lerp(f.to, t);
  out.y += arc * 4 * t * (1 - t);
  return out;
}

function Scene({ slugs, onHit }: { slugs: readonly string[]; onHit: (i: number) => void }) {
  const { camera, size } = useThree();
  const aspect = size.width / size.height;
  const L = useMemo(() => layoutFor(aspect), [aspect]);
  useEffect(() => {
    camera.position.set(0, 0, L.z);
    camera.lookAt(0, 0, 0);
  }, [camera, L]);

  const mats = useCharacterMaterials();
  const am = useArrowMaterials();
  const badges = useMemo(() => slugs.map((s) => makeBadgeTexture(s)), [slugs]);
  useEffect(() => () => badges.forEach((t) => t.dispose()), [badges]);
  const glowTex = useMemo(() => makeGlowTexture("241, 201, 137", 0.35), []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  const archer = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const targetRig = useRef<THREE.Group>(null);
  const target = useRef<THREE.Group>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const armL = useRef<(THREE.Object3D | null)[]>([]);
  const armR = useRef<(THREE.Object3D | null)[]>([]);
  const handR = useRef<THREE.Mesh>(null);
  const elbowR = useRef<THREE.Mesh>(null);
  const strings = useRef<(THREE.Object3D | null)[]>([]);
  const nocked = useRef<THREE.Group>(null);
  const nockedBadge = useRef<THREE.SpriteMaterial>(null);

  const flights = useMemo<Flight[]>(
    () =>
      Array.from({ length: POOL }, () => ({
        state: "idle", slug: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), local: new THREE.Vector3(),
        rest: new THREE.Vector3(), dir: new THREE.Vector3(), t: 0, dur: 0.5, age: 0,
      })),
    []
  );
  const flightObjs = useRef<(THREE.Group | null)[]>([]);
  const flightBadges = useRef<(THREE.Sprite | null)[]>([]);
  const trails = useRef<(THREE.Mesh | null)[]>([]);
  const trailMats = useMemo(
    () => flights.map(() => new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
    [flights]
  );

  // impact bursts: an expanding ring plus sparks, played in target space so they ride the recoil
  const bursts = useMemo<Burst[]>(() => Array.from({ length: BURSTS }, () => ({ age: BURST_LIFE, vel: new Float32Array(SPARKS * 3) })), []);
  const burstObjs = useRef<(THREE.Group | null)[]>([]);
  const ringMats = useMemo(
    () => bursts.map(() => new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
    [bursts]
  );
  const sparkGeos = useMemo(
    () => bursts.map(() => new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3))),
    [bursts]
  );
  const sparkMats = useMemo(
    () => bursts.map(() => new THREE.PointsMaterial({ color: "#ffe2a8", size: 0.07, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
    [bursts]
  );

  const shot = useRef({ t: -0.6, next: 0, fired: false, slot: 0, burst: 0, recoil: 0, recoilV: 0, flash: 0 });
  const v = useMemo(
    () => ({
      hand: new THREE.Vector3(), elbow: new THREE.Vector3(), str: new THREE.Vector3(), tip: new THREE.Vector3(),
      vel: new THREE.Vector3(), tail: new THREE.Vector3(), lag: new THREE.Vector3(), offset: new THREE.Vector3(), o: new THREE.Vector3(),
    }),
    []
  );
  const tips = useMemo(() => [new THREE.Vector3(BOW_HAND.x - BRACE, LINE_Y + BOW_H, LINE_Z), new THREE.Vector3(BOW_HAND.x - BRACE, LINE_Y - BOW_H, LINE_Z)], []);

  // static bow arm
  useEffect(() => {
    if (armL.current[0]) placeLimb(armL.current[0], SHOULDER_L, ELBOW_L);
    if (armL.current[1]) placeLimb(armL.current[1], ELBOW_L, BOW_HAND);
  }, []);

  const bowGeo = useMemo(() => {
    const g = BOW_HAND;
    const curve = new THREE.CatmullRomCurve3(
      [
        [-BRACE, BOW_H], [-0.12, 0.8], [0.02, 0.42], [0, 0], [0.02, -0.42], [-0.12, -0.8], [-BRACE, -BOW_H],
      ].map(([x, y]) => new THREE.Vector3(g.x + x, g.y + y, g.z))
    );
    return new THREE.TubeGeometry(curve, 64, 0.028, 8, false);
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = shot.current;
    s.t += dt;
    const p = s.t / SHOT;
    const time = state.clock.elapsedTime;
    const arc = 0.35 * L.scale;
    const pathAt = (f: Flight, t: number, out: THREE.Vector3) => arrowPath(f, t, arc, out);

    // --- drawing hand and string ---
    let stringPt: THREE.Vector3;
    if (p < P_GRAB) {
      const k = easeInOut(Math.max(0, p) / P_GRAB);
      v.hand.copy(FOLLOW).lerp(GRAB, k);
      v.elbow.copy(ELBOW_R_DRAW).lerp(ELBOW_R_GRAB, k);
      stringPt = v.str.set(BOW_HAND.x - BRACE, LINE_Y, LINE_Z);
    } else if (p < P_LOOSE) {
      const d = easeInOut(Math.min(1, (p - P_GRAB) / (P_DRAWN - P_GRAB)));
      v.hand.copy(GRAB).lerp(ANCHOR, d);
      if (p > P_DRAWN) v.hand.y += Math.sin(time * 40) * 0.003; // holding at full draw
      v.elbow.copy(ELBOW_R_GRAB).lerp(ELBOW_R_DRAW, d);
      stringPt = v.str.copy(v.hand);
    } else {
      const k = smooth(P_LOOSE, P_LOOSE + 0.12, p);
      v.hand.copy(ANCHOR).lerp(FOLLOW, k);
      v.elbow.copy(ELBOW_R_DRAW);
      // string snaps forward and quivers
      const q = (p - P_LOOSE) * SHOT;
      const buzz = Math.exp(-q * 14) * Math.cos(q * 70) * 0.18;
      stringPt = v.str.set(BOW_HAND.x - BRACE + buzz, LINE_Y, LINE_Z);
    }
    if (armR.current[0]) placeLimb(armR.current[0], SHOULDER_R, v.elbow);
    if (armR.current[1]) placeLimb(armR.current[1], v.elbow, v.hand);
    elbowR.current?.position.copy(v.elbow);
    handR.current?.position.copy(v.hand);
    if (strings.current[0]) placeLimb(strings.current[0], tips[0], stringPt);
    if (strings.current[1]) placeLimb(strings.current[1], stringPt, tips[1]);

    // --- nocked arrow ---
    const loaded = p >= P_GRAB * 0.7 && p < P_LOOSE;
    if (nocked.current) {
      nocked.current.visible = loaded;
      nocked.current.position.copy(stringPt);
    }
    if (nockedBadge.current && nockedBadge.current.map !== badges[s.next]) {
      nockedBadge.current.map = badges[s.next];
      nockedBadge.current.needsUpdate = true;
    }

    // --- loose ---
    if (p >= P_LOOSE && !s.fired && archer.current && target.current) {
      s.fired = true;
      const slot = s.slot;
      const f = flights[slot];
      const obj = flightObjs.current[slot];
      s.slot = (slot + 1) % POOL;
      f.state = "fly";
      f.slug = s.next;
      f.t = 0;
      f.age = 0;
      // tip leaves from the bow; lands somewhere on the face of the target, mostly near the gold
      archer.current.localToWorld(f.from.set(ANCHOR.x + ARROW_LEN, LINE_Y, LINE_Z));
      const r = Math.pow(Math.random(), 1.6) * 0.62;
      const a = Math.random() * Math.PI * 2;
      f.local.set(Math.cos(a) * r, Math.sin(a) * r, 0.02);
      target.current.localToWorld(f.to.copy(f.local));
      f.dur = 0.34 + f.from.distanceTo(f.to) * 0.03;
      const sp = flightBadges.current[slot]?.material as THREE.SpriteMaterial | undefined;
      if (sp) {
        sp.map = badges[f.slug];
        sp.opacity = 1;
        sp.needsUpdate = true;
      }
      if (obj) obj.visible = true;
    }
    if (s.t >= SHOT) {
      s.fired = false;
      s.next = (s.next + 1) % slugs.length;
      s.t = s.next === 0 ? -REST : 0; // negative time holds the relaxed pose
    }

    // --- target recoil (a damped spring pushing it back) and where that moves stuck arrows ---
    s.recoilV += (-s.recoil * 90 - s.recoilV * 9) * dt;
    s.recoil += s.recoilV * dt;
    if (target.current) {
      target.current.position.z = -s.recoil * 0.08;
      target.current.rotation.y = s.recoil * 0.06;
    }
    if (targetRig.current) {
      targetRig.current.localToWorld(v.offset.set(0, 0, -s.recoil * 0.08));
      targetRig.current.localToWorld(v.o.set(0, 0, 0));
      v.offset.sub(v.o);
    }

    // --- flying and stuck arrows, with their trails ---
    flights.forEach((f, i) => {
      const obj = flightObjs.current[i];
      const badge = flightBadges.current[i];
      const trail = trails.current[i];
      const tm = trailMats[i];
      if (!obj || f.state === "idle") return;
      if (f.state === "fly") {
        f.t = Math.min(1, f.t + dt / f.dur);
        const t = f.t;
        pathAt(f, t, v.tip);
        v.vel.subVectors(f.to, f.from);
        v.vel.y += arc * 4 * (1 - 2 * t);
        f.dir.copy(v.vel).normalize();
        if (t >= 1) {
          f.state = "stuck";
          v.tip.addScaledVector(f.dir, 0.14 * L.scale); // bury the head
          s.recoilV += 3.2;
          s.flash = 1;
          const b = bursts[s.burst];
          const bo = burstObjs.current[s.burst];
          s.burst = (s.burst + 1) % BURSTS;
          b.age = 0;
          for (let k = 0; k < SPARKS; k++) {
            const ang = (k / SPARKS) * Math.PI * 2 + Math.random() * 0.3;
            const sp = 1.2 + Math.random() * 1.6;
            b.vel[k * 3] = Math.cos(ang) * sp;
            b.vel[k * 3 + 1] = Math.sin(ang) * sp;
            b.vel[k * 3 + 2] = 0.6 + Math.random() * 1.2;
          }
          bo?.position.copy(f.local).setZ(0.04);
          onHit(f.slug);
        }
        obj.quaternion.setFromUnitVectors(X, f.dir);
        obj.position.copy(v.tip).addScaledVector(f.dir, -ARROW_LEN * L.scale);
        if (f.state === "stuck") f.rest.copy(obj.position).sub(v.offset);
        // trail: from where the tip was a moment ago to the tail, while that's behind the arrow
        if (trail) {
          v.tail.copy(obj.position);
          pathAt(f, Math.max(0, t - 0.35), v.lag);
          const behind = v.o.subVectors(v.tail, v.lag).dot(f.dir) > 0.05;
          trail.visible = behind;
          if (behind) {
            placeLimb(trail, v.lag, v.tail);
            trail.scale.x = trail.scale.z = L.scale;
            tm.opacity = 0.85;
          }
        }
        if (badge) {
          badge.visible = true;
          badge.position.y = 0.34;
          obj.scale.setScalar(L.scale);
        }
      } else {
        f.age += dt;
        obj.position.copy(f.rest).add(v.offset);
        if (trail) {
          tm.opacity = Math.max(0, 0.85 - f.age * 4);
          trail.visible = tm.opacity > 0.01;
        }
        // badge floats up and fades once the tool has been "collected"
        if (badge) {
          const m = badge.material as THREE.SpriteMaterial;
          m.opacity = 1 - smooth(0.6, 1.2, f.age);
          badge.visible = m.opacity > 0.01;
          badge.position.y = 0.34 + smooth(0, 1.2, f.age) * 0.5;
        }
        // the oldest arrows pull out of the target before their slot is reused
        const out = smooth(SHOT * (POOL - 1.3), SHOT * (POOL - 0.8), f.age);
        obj.scale.setScalar(Math.max(0.001, 1 - out) * L.scale);
        if (out >= 1) {
          f.state = "idle";
          obj.visible = false;
        }
      }
    });

    // --- impact bursts ---
    bursts.forEach((b, i) => {
      const g = burstObjs.current[i];
      if (!g) return;
      b.age += dt;
      const k = Math.min(1, b.age / BURST_LIFE);
      g.visible = k < 1;
      if (k >= 1) return;
      const ring = g.children[0];
      ring.scale.setScalar(0.08 + (1 - Math.pow(1 - k, 3)) * 0.75);
      ringMats[i].opacity = (1 - k) * 0.9;
      const pos = sparkGeos[i].attributes.position as THREE.BufferAttribute;
      const e = b.age;
      for (let j = 0; j < SPARKS; j++) {
        const damp = (1 - Math.exp(-e * 5)) / 5; // velocity decays: travelled distance levels off
        pos.setXYZ(j, b.vel[j * 3] * damp, b.vel[j * 3 + 1] * damp - e * e * 0.9, b.vel[j * 3 + 2] * damp);
      }
      pos.needsUpdate = true;
      sparkMats[i].opacity = 1 - k * k;
    });

    // --- target glow: gold centre and the halo behind it flash on each hit ---
    s.flash = Math.max(0, s.flash - dt * 2.4);
    am.bull.emissiveIntensity = 0.15 + s.flash * 2.2;
    if (halo.current) halo.current.opacity = 0.32 + Math.sin(time * 1.6) * 0.05 + s.flash * 0.5;

    // --- face: blink, aim tilt ---
    if (eyes.current) eyes.current.scale.y = time % 3.9 > 3.76 ? 0.1 : 1;
    if (head.current) {
      head.current.rotation.x = lerp(0.02, -0.06, smooth(P_GRAB, P_DRAWN, p) * (p < P_LOOSE ? 1 : 0));
      head.current.rotation.y = 1.05; // looking down the arrow at the target
      head.current.rotation.z = -0.08;
    }
  });

  const badgeW = L.badge;
  return (
    <>
      <group ref={archer} position={[-L.spread, L.y, 0]} rotation={[0, 0.22, 0]} scale={L.scale}>
        <Torso mats={mats} />
        <HijabDrape mats={mats} />
        <Headphones mats={mats} />
        <HijabiHead ref={head} eyes={eyes} mats={mats} />
        <Arm mats={mats} segs={armL} elbow={ELBOW_L} />
        <Arm mats={mats} segs={armR} elbowRef={elbowR} />
        <mesh ref={handR} material={mats.skin} scale={[1.1, 0.9, 1]}>
          <sphereGeometry args={[0.1, 16, 12]} />
        </mesh>

        {/* bow, grip hand and string */}
        <mesh geometry={bowGeo} material={am.bow} />
        {tips.map((t, i) => (
          <mesh key={i} position={t} material={am.head}>
            <sphereGeometry args={[0.036, 10, 8]} />
          </mesh>
        ))}
        <mesh material={mats.skin} position={BOW_HAND} scale={[1, 1.2, 1.1]}>
          <sphereGeometry args={[0.1, 16, 12]} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} ref={(m) => { strings.current[i] = m; }} material={am.string}>
            <cylinderGeometry args={[0.006, 0.006, 1, 4]} />
          </mesh>
        ))}

        {/* badges draw over the bow and string (renderOrder + no depth test) */}
        <group ref={nocked} visible={false}>
          <ArrowModel mats={am} />
          <sprite renderOrder={10} position={[ARROW_LEN * 0.5, 0.34, 0]} scale={[badgeW, badgeW / BADGE_ASPECT, 1]}>
            <spriteMaterial ref={nockedBadge} map={badges[0]} transparent depthWrite={false} depthTest={false} />
          </sprite>
        </group>
      </group>

      <group ref={targetRig} position={[L.spread + 0.4 * L.scale, L.y + LINE_Y * L.scale + 0.1, -0.3]} rotation={[0, -0.95, 0]} scale={L.scale}>
        <sprite position={[0, 0, -0.5]} scale={[3.6, 3.6, 1]}>
          <spriteMaterial ref={halo} map={glowTex} transparent depthWrite={false} opacity={0.32} toneMapped={false} />
        </sprite>
        <Target innerRef={target} bull={am.bull} />
      </group>
      {/* bursts live inside the target's recoil group, added imperatively below */}
      <BurstMount target={target} burstObjs={burstObjs} ringMats={ringMats} sparkGeos={sparkGeos} sparkMats={sparkMats} />

      {flights.map((_, i) => (
        <group key={i} ref={(g) => { flightObjs.current[i] = g; }} visible={false}>
          <ArrowModel mats={am} />
          <sprite ref={(sp) => { flightBadges.current[i] = sp; }} renderOrder={10} position={[ARROW_LEN * 0.5, 0.34, 0]} scale={[badgeW, badgeW / BADGE_ASPECT, 1]}>
            <spriteMaterial map={badges[0]} transparent depthWrite={false} depthTest={false} />
          </sprite>
        </group>
      ))}
      {trailMats.map((m, i) => (
        <mesh key={i} ref={(t) => { trails.current[i] = t; }} material={m} visible={false}>
          {/* thicker at the arrow (top, +y after placeLimb), fading to a point behind it */}
          <cylinderGeometry args={[0.022, 0.002, 1, 6, 1, true]} />
        </mesh>
      ))}
    </>
  );
}

/**
 * The impact bursts are parented to the target's recoil group so they move with it. That group is
 * rendered by <Target>, so they're attached here once it exists.
 */
function BurstMount({
  target, burstObjs, ringMats, sparkGeos, sparkMats,
}: {
  target: React.RefObject<THREE.Group | null>;
  burstObjs: React.RefObject<(THREE.Group | null)[]>;
  ringMats: THREE.Material[];
  sparkGeos: THREE.BufferGeometry[];
  sparkMats: THREE.Material[];
}) {
  const groups = useMemo(
    () =>
      ringMats.map((rm, i) => {
        const g = new THREE.Group();
        g.visible = false;
        g.add(new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), rm));
        g.add(new THREE.Points(sparkGeos[i], sparkMats[i]));
        return g;
      }),
    [ringMats, sparkGeos, sparkMats]
  );
  useEffect(() => {
    const t = target.current;
    if (!t) return;
    groups.forEach((g, i) => {
      t.add(g);
      burstObjs.current[i] = g;
    });
    return () => groups.forEach((g) => t.remove(g));
  }, [target, groups, burstObjs]);
  return null;
}

/**
 * Upper arm and forearm (unit-length cylinders that placeLimb stretches between joints) plus an
 * elbow cap. `elbow` pins the cap for a static arm; `elbowRef` lets the frame loop move it.
 */
function Arm({
  mats, segs, elbow, elbowRef,
}: {
  mats: CharacterMats;
  segs: React.RefObject<(THREE.Object3D | null)[]>;
  elbow?: THREE.Vector3;
  elbowRef?: React.Ref<THREE.Mesh>;
}) {
  return (
    <>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { segs.current[i] = m; }} material={mats.top}>
          <cylinderGeometry args={[i ? 0.11 : 0.135, i ? 0.1 : 0.12, 1, 12]} />
        </mesh>
      ))}
      <mesh ref={elbowRef} material={mats.top} position={elbow}>
        <sphereGeometry args={[0.12, 12, 10]} />
      </mesh>
    </>
  );
}

// memo: each hit re-renders the tool list in TechStack, which shouldn't re-render the 3D tree
export default memo(function Archery({ slugs, active, onHit }: { slugs: readonly string[]; active: boolean; onHit: (i: number) => void }) {
  return (
    <Canvas {...canvasProps(active)} camera={{ position: [0, 0, 9], fov: 30, near: 0.1, far: 60 }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-3, 5, 6]} intensity={2.2} color="#fff4ea" />
      <directionalLight position={[4, 2, -5]} intensity={3} color="#d9a066" />
      <directionalLight position={[-5, -1, -3]} intensity={1} color="#f3dcc0" />
      <Scene slugs={slugs} onHit={onHit} />
    </Canvas>
  );
});
