// Small shared helpers.

/** Stable anchor id for a project, e.g. "Lead Scraper & Cold Email ..." → "project-lead-scraper-cold-email-...". */
export const projectId = (title: string) =>
  "project-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Zero-padded counter text, e.g. pad(3) → "03", pad(7, 3) → "007". */
export const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Runs `fn` once and remembers the answer. */
const once = <T,>(fn: () => T) => {
  let value: T | undefined;
  let done = false;
  return () => (done ? (value as T) : ((done = true), (value = fn())));
};

/** WebGL support. The probe context is released straight away: browsers cap live contexts (~16). */
export const hasWebGL = once(() => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
});

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Rough device tier so phones and weaker laptops get fewer particles and a lower pixel ratio. */
export const isLowPower = once(() => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || window.innerWidth < 760;
});
