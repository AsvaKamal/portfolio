import { experience } from "../data/content";
import { SectionLabel, SectionTitle } from "./ui";

export default function Experience() {
  return (
    <section className="section section--dark" id="experience">
      <div className="wrap">
        <SectionLabel id="experience" title="Experience" note="Career path" />
        <SectionTitle lines={["Where I've", "[made impact]"]} />
        {experience.map((e) => (
          <div className="exp" key={e.role + e.company} data-reveal>
            <span className="exp__role">{e.role}</span>
            <span className="mono">{e.company}</span>
            <span className="dim">{e.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
