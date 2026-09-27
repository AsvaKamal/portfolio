import * as THREE from "three";
import { getIcon, iconTitle } from "../data/icons";

const luminance = (hex: string) => {
  const n = parseInt(hex, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const isWhite = (c?: string) => !!c && /^#f{3}(f{3})?$/i.test(c);

/**
 * Draws a logo as a single-colour mark (`fg`) of size `S` with its top-left at the current origin,
 * from the same path data as the SVG chips. White details inside custom icons are "knocked out" to `bg`.
 */
function drawMark(ctx: CanvasRenderingContext2D, slug: string, S: number, fg: string, bg: string) {
  const icon = getIcon(slug);
  ctx.save();
  ctx.scale(S / 24, S / 24);
  if ("brand" in icon) {
    ctx.fillStyle = fg;
    ctx.fill(new Path2D(icon.brand.path));
  } else {
    ctx.lineCap = ctx.lineJoin = "round";
    for (const p of icon.custom.parts) {
      const color = isWhite(p.fill ?? p.stroke) ? bg : fg;
      const path = new Path2D(p.d);
      ctx.globalAlpha = p.opacity ?? 1;
      if (p.fill) {
        ctx.fillStyle = color;
        ctx.fill(path);
      }
      if (p.stroke) {
        ctx.strokeStyle = color;
        ctx.lineWidth = p.width ?? 1;
        ctx.stroke(path);
      }
    }
  }
  ctx.restore();
}

/**
 * Soft round glow (a radial gradient from `rgb` at the centre to transparent), for halos and light
 * spill sprites. `mid` is the opacity part-way out, which sets how tight the glow is.
 */
export function makeGlowTexture(rgb = "255, 255, 255", mid = 0.25): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb}, 0.9)`);
  grad.addColorStop(0.38, `rgba(${rgb}, ${mid})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Aspect ratio (width / height) of the badge textures below. */
export const BADGE_ASPECT = 4;

/**
 * An ivory pill carried by each arrow in the archery scene: the tool's logo on a disc in its brand
 * colour, then its name.
 */
export function makeBadgeTexture(slug: string): THREE.CanvasTexture {
  const icon = getIcon(slug);
  const hex = "brand" in icon ? icon.brand.hex : icon.custom.hex;
  const H = 128, W = H * BADGE_ASPECT, R = H / 2 - 6;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  const title = iconTitle(slug);
  ctx.font = `600 50px "Inter Tight Variable", "Inter Tight", system-ui, sans-serif`;
  const textW = Math.min(ctx.measureText(title).width, W - H - 40);
  const pillW = H + textW + 34;
  const x0 = (W - pillW) / 2;

  ctx.fillStyle = "#f8f3ea";
  ctx.strokeStyle = "#c9a063";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x0 + 2, 4, pillW - 4, H - 8, (H - 8) / 2);
  ctx.fill();
  ctx.stroke();

  const bg = `#${hex}`;
  const fg = luminance(hex) > 0.62 ? "#1a120d" : "#ffffff";
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x0 + H / 2, H / 2, R - 8, 0, Math.PI * 2);
  ctx.fill();
  const S = 58;
  ctx.save();
  ctx.translate(x0 + H / 2 - S / 2, H / 2 - S / 2);
  drawMark(ctx, slug, S, fg, bg);
  ctx.restore();

  ctx.fillStyle = "#1a120d";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x0 + H + 4, H / 2 + 2, textW);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
