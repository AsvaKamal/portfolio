import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib";

/**
 * The giant footer name, drawn as thousands of gold particles. The first time it scrolls into view
 * the particles rise like dust and settle into the letters from left to right; afterwards a metallic
 * sheen sweeps across it and the cursor pushes the particles aside, springing back when it leaves.
 * Canvas 2D, only animates while visible.
 */

// bronze → gold → champagne → white: particle colours by brightness
const SHADES = ["#6e4a2a", "#8f6538", "#b0804a", "#c99a62", "#dfb77f", "#ebcd9f", "#f4e0bf", "#fff6e6"];
const MAX_PARTICLES = 7000;

export default function FooterName({ text }: { text: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const cvs = canvas.current!;
    const ctx = cvs.getContext("2d")!;
    const reduce = prefersReducedMotion();
    let W = 0, H = 0, dpr = 1, fontPx = 0, size = 2;
    let n = 0;
    // particle state in flat arrays: home, position, velocity, entrance delay, base brightness
    let hx = new Float32Array(0), hy = hx, x = hx, y = hx, vx = hx, vy = hx, delay = hx, base = hx;
    const buckets: number[][] = SHADES.map(() => []);
    let disposed = false;
    let glow: HTMLCanvasElement | null = null;
    let raf = 0, visible = false, entered = reduce, last = performance.now(), t = 0, enterAt = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    const font = (px: number) => `800 ${px}px "Inter Tight Variable", "Inter Tight", system-ui, sans-serif`;
    const spacing = (c: CanvasRenderingContext2D, px: number) => {
      if ("letterSpacing" in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-px * 0.06}px`;
    };

    // Size the text to fill the width, then sample the letters into particles.
    const build = () => {
      W = el.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.font = font(100);
      spacing(ctx, 100);
      fontPx = Math.floor((W * 0.96 * 100) / ctx.measureText(text).width);
      ctx.font = font(fontPx);
      spacing(ctx, fontPx);
      const ascent = ctx.measureText(text).actualBoundingBoxAscent || fontPx * 0.72;
      const pad = Math.round(fontPx * 0.12); // room for particles pushed above the letters
      H = Math.ceil(ascent + pad + fontPx * 0.04);
      cvs.width = W * dpr;
      cvs.height = H * dpr;
      cvs.style.height = `${H}px`;

      const mask = document.createElement("canvas");
      mask.width = W;
      mask.height = H;
      const mc = mask.getContext("2d", { willReadFrequently: true })!;
      mc.font = font(fontPx);
      spacing(mc, fontPx);
      mc.textAlign = "center";
      mc.fillStyle = "#fff";
      mc.fillText(text, W / 2, pad + ascent);
      const data = mc.getImageData(0, 0, W, H).data;

      // grid spacing: fine on big screens, capped so there are never too many particles
      let gap = Math.max(3, Math.round(fontPx / 60));
      const count = (g: number) => {
        let c = 0;
        for (let py = 0; py < H; py += g) for (let px = 0; px < W; px += g) if (data[(py * W + px) * 4 + 3] > 128) c++;
        return c;
      };
      while (count(gap) > MAX_PARTICLES) gap++;
      size = gap * 0.72;

      const pts: number[] = [];
      for (let py = 0; py < H; py += gap) for (let px = 0; px < W; px += gap) if (data[(py * W + px) * 4 + 3] > 128) pts.push(px, py);
      n = pts.length / 2;
      hx = new Float32Array(n); hy = new Float32Array(n); x = new Float32Array(n); y = new Float32Array(n);
      vx = new Float32Array(n); vy = new Float32Array(n); delay = new Float32Array(n); base = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        hx[i] = pts[i * 2] + gap / 2;
        hy[i] = pts[i * 2 + 1] + gap / 2;
        // metallic: bright at the top of the letters, deeper bronze towards the bottom, with grain
        base[i] = Math.min(1, Math.max(0, 0.2 + 0.7 * (1 - (hy[i] - pad) / (H - pad)) + (Math.random() - 0.5) * 0.25));
        delay[i] = (hx[i] / W) * 0.9 + Math.random() * 0.35;
        if (entered) {
          x[i] = hx[i];
          y[i] = hy[i];
        } else {
          // start as dust below and around the name
          x[i] = hx[i] + (Math.random() - 0.5) * W * 0.5;
          y[i] = hy[i] + H * (0.5 + Math.random() * 1.1);
        }
      }

      // soft glow under the particles, pre-blurred once per size
      glow = document.createElement("canvas");
      glow.width = cvs.width;
      glow.height = cvs.height;
      const gc = glow.getContext("2d")!;
      gc.scale(dpr, dpr);
      gc.filter = `blur(${Math.round(fontPx * 0.06)}px)`;
      gc.globalAlpha = 0.35;
      gc.drawImage(mask, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      // the glow fades in as the letters assemble
      const settled = reduce ? 1 : entered ? Math.min(1, Math.max(0, (t - enterAt - 0.8) / 1.2)) : 0;
      if (glow && settled > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.28 * settled;
        ctx.drawImage(glow, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // diagonal sheen sweeping across every ~5s
      const band = (((t * 0.22) % 1.3) - 0.15) * (W + H);
      const bandW = fontPx * 0.45;
      for (const b of buckets) b.length = 0;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(x[i] + y[i] * 0.6 - band);
        const sheen = d < bandW ? 1 - d / bandW : 0;
        const speed = Math.min(1, (Math.abs(vx[i]) + Math.abs(vy[i])) / 900);
        const lvl = Math.min(1, base[i] + sheen * 0.75 + speed * 0.5);
        buckets[Math.min(SHADES.length - 1, Math.floor(lvl * SHADES.length))].push(i);
      }
      const half = size / 2;
      buckets.forEach((b, s) => {
        if (!b.length) return;
        ctx.fillStyle = SHADES[s];
        for (const i of b) ctx.fillRect(x[i] - half, y[i] - half, size, size);
      });
    };

    const step = (dt: number) => {
      const since = t - enterAt;
      const R = fontPx * 0.5, R2 = R * R;
      for (let i = 0; i < n; i++) {
        if (!entered || since < delay[i]) continue;
        let ax = (hx[i] - x[i]) * 55 - vx[i] * 9;
        let ay = (hy[i] - y[i]) * 55 - vy[i] * 9;
        if (pointer.active) {
          const dx = x[i] - pointer.x, dy = y[i] - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 5200;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        // a faint shimmer so the settled letters never look frozen
        ax += Math.sin(t * 2 + i) * 6;
        vx[i] += ax * dt;
        vy[i] += ay * dt;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      t += dt;
      step(dt);
      draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const start = () => {
      if (reduce || raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !entered) {
        entered = true;
        enterAt = t;
      }
      if (visible) start();
    }, { rootMargin: "0px 0px -15% 0px" });

    const onMove = (e: PointerEvent) => {
      const r = cvs.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    };
    const onLeave = () => (pointer.active = false);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    let resizeTimer = 0;
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastW) return; // height changes (our own canvas) don't need a rebuild
      lastW = el.clientWidth;
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 120);
    });

    // wait for the display font so the letters are sampled from the real typeface
    document.fonts
      .load(font(100))
      .catch(() => {})
      .then(() => {
        if (disposed) return;
        lastW = el.clientWidth;
        build();
        ro.observe(el);
        io.observe(el);
      });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      clearTimeout(resizeTimer);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      disposed = true;
    };
  }, [text]);

  return (
    <div className="footer__name" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} className="footer__name-canvas" />
    </div>
  );
}
