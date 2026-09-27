import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer, stage } from "./shared";

/**
 * Particle "data cloud" around the avatar: a noisy shell + a tilted orbital ring (GPU-animated points),
 * and a sparse neural-network of nodes and links. Everything is generated in code, zero downloads.
 */

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  attribute float aSize;
  attribute float aSeed;
  attribute float aAccent;
  varying float vAlpha;
  varying float vAccent;

  void main() {
    vec3 p = position;
    // gentle organic drift
    p += 0.06 * vec3(sin(uTime * 0.7 + aSeed * 6.28), cos(uTime * 0.6 + aSeed * 12.0), sin(uTime * 0.5 + aSeed * 3.0));
    // scrolling away dissolves the cloud outward
    p *= 1.0 + uScroll * 1.6;

    vec4 world = modelMatrix * vec4(p, 1.0);
    // push particles away from the cursor
    vec2 d = world.xy - uMouse;
    float falloff = exp(-dot(d, d) * 2.2);
    world.xy += normalize(d + 1e-4) * falloff * 0.45;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z) * (1.0 + falloff * 1.5);

    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 40.0);
    vAlpha = twinkle * (1.0 - uScroll) * smoothstep(12.0, 5.0, -mv.z);
    vAccent = max(aAccent, falloff);
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vAccent;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(mix(uColor, uAccent, vAccent), a * vAlpha);
  }
`;

function rand(seed: number) {
  // deterministic so the layout is identical on every visit
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export default function DataField({ count = 3000 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Points>(null);

  const { shellGeo, ringGeo, nodeGeo, linkGeo, material } = useMemo(() => {
    const r = rand(42);
    const make = (n: number, place: (i: number, out: number[]) => void, accentChance: number) => {
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const seed = new Float32Array(n);
      const accent = new Float32Array(n);
      const tmp: number[] = [];
      for (let i = 0; i < n; i++) {
        place(i, tmp);
        pos.set(tmp, i * 3);
        size[i] = 1.2 + r() * 2.6;
        seed[i] = r();
        accent[i] = r() < accentChance ? 1 : 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      g.setAttribute("aAccent", new THREE.BufferAttribute(accent, 1));
      return g;
    };

    // shell: fibonacci sphere with radial noise, squashed into an ellipsoid around the head
    const nShell = Math.floor(count * 0.65);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const shellGeo = make(
      nShell,
      (i, out) => {
        const y = 1 - (i / (nShell - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const th = golden * i;
        const k = 1.9 + r() * 0.9 + (r() < 0.08 ? r() * 1.2 : 0);
        out[0] = Math.cos(th) * rad * k * 1.2;
        out[1] = y * k * 0.95 + 0.7;
        out[2] = Math.sin(th) * rad * k * 0.8;
      },
      0.12
    );

    // ring: thin tilted disc of points orbiting the avatar
    const nRing = count - nShell;
    const ringGeo = make(
      nRing,
      (_, out) => {
        const a = r() * Math.PI * 2;
        const rr = 2.5 + Math.pow(r(), 2) * 1.2;
        out[0] = Math.cos(a) * rr;
        out[1] = (r() - 0.5) * 0.08;
        out[2] = Math.sin(a) * rr;
      },
      0.35
    );

    // network: nodes on the shell, each linked to its 2 nearest neighbours
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 70; i++) {
      const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      if (v.z > 0.55) v.z *= 0.3; // keep links from crossing in front of the face
      v.normalize().multiply(new THREE.Vector3(2.5, 2.1, 1.7));
      v.y += 0.7;
      nodes.push(v);
    }
    const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
    const link: number[] = [];
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: a.distanceToSquared(b) }))
        .filter((o) => o.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(({ j }) => link.push(a.x, a.y, a.z, nodes[j].x, nodes[j].y, nodes[j].z));
    });
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(link, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uPixelRatio: { value: 1 }, // set from the renderer each frame
        uMouse: { value: new THREE.Vector2(99, 99) },
        uColor: { value: new THREE.Color("#f1e4cf") },
        uAccent: { value: new THREE.Color("#d4a066") },
      },
    });
    return { shellGeo, ringGeo, nodeGeo, linkGeo, material };
  }, [count]);

  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.1, depthWrite: false }), []);
  const nodeMat = useMemo(() => new THREE.PointsMaterial({ color: "#e6c79c", size: 0.06, transparent: true, depthWrite: false }), []);

  useFrame((state, dt) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.viewport.dpr; // matches the canvas, which drops to 1 on low-power devices
    const scroll = Math.min(1, stage.p * 1.4);
    u.uScroll.value = scroll;
    u.uMouse.value.set((pointer.x * state.viewport.width) / 2, (pointer.y * state.viewport.height) / 2 + 0.35);
    lineMat.opacity = 0.1 * (1 - scroll);
    nodeMat.opacity = 1 - scroll;
    if (group.current) {
      group.current.rotation.y += dt * 0.05;
      group.current.rotation.x += (pointer.y * 0.08 - group.current.rotation.x) * 0.03;
    }
    if (ring.current) ring.current.rotation.y -= dt * 0.12;
  });

  return (
    <group ref={group}>
      <points geometry={shellGeo} material={material} />
      <group rotation={[0.32, 0, -0.18]} position={[0, 0.3, 0]}>
        <points ref={ring} geometry={ringGeo} material={material} />
      </group>
      <lineSegments geometry={linkGeo} material={lineMat} />
      <points geometry={nodeGeo} material={nodeMat} />
    </group>
  );
}
