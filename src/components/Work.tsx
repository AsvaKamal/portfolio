import { useRef } from "react";
import { projects, type Project } from "../data/content";
import { useInView } from "../hooks";
import { pad, projectId } from "../lib";
import CurvedMonitor from "./CurvedMonitor";
import { SectionLabel, SectionTitle, ToolChips } from "./ui";

/** Tilts the monitor towards the mouse and moves a soft glare with it (mouse only, never on touch). */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const set = (rx: number, ry: number, gx?: number, gy?: number) => {
    const st = ref.current?.style;
    if (!st) return;
    st.setProperty("--rx", `${rx}deg`);
    st.setProperty("--ry", `${ry}deg`);
    if (gx !== undefined && gy !== undefined) {
      st.setProperty("--gx", `${gx}%`);
      st.setProperty("--gy", `${gy}%`);
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    set((0.5 - y) * 6, (x - 0.5) * 8, x * 100, y * 100);
  };
  return { ref, onPointerMove, onPointerLeave: () => set(0, 0) };
}

function ProjectRow({ p, i }: { p: Project; i: number }) {
  const [ref, visible, seen] = useInView<HTMLElement>();
  const tilt = useTilt();
  return (
    <article
      ref={ref}
      id={projectId(p.title)}
      className={`project${i % 2 ? " project--flip" : ""}${seen ? " is-in" : ""}`}
      style={{ ["--glow" as string]: p.glow }}
      data-reveal
    >
      <div className="project__screen" {...tilt}>
        <CurvedMonitor title={p.title} glow={p.glow} screen={p.screen} image={p.image} playing={visible} on={seen} />
      </div>
      <div className="project__info">
        <div className="project__meta">
          <span className="project__index">{pad(i + 1)}</span>
          <span className="project__cat mono">
            <span className="dot" style={{ background: p.glow }} />
            {p.category}
          </span>
        </div>
        <h3 className="project__title">{p.title}</h3>
        <p className="project__summary">{p.summary}</p>
        <span className="mono dim project__built">Built with</span>
        <ToolChips tools={p.tools} />
      </div>
    </article>
  );
}

export default function Work() {
  return (
    <section className="section" id="work">
      <div className="wrap">
        <SectionLabel id="work" title="Selected work" note={`${projects.length} projects`} />
        <SectionTitle lines={["Automations", "*that ship*"]} />
        <div className="projects">
          {projects.map((p, i) => (
            <ProjectRow key={p.title} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
