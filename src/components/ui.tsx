import { initials, sections, type SectionId } from "../data/content";
import { ToolIcon, toolColor } from "../data/icons";
import { pad } from "../lib";
import RichText from "./RichText";

/** "AA®" logo mark; the wrapper element decides size and link. */
export const BrandMark = () => (
  <>
    {initials}
    <sup>®</sup>
  </>
);

/** "(03) Tech stack ········ Tools I ship with". The number comes from the section's position in `sections`. */
export function SectionLabel({ id, title, note, style }: { id: SectionId; title: string; note: string; style?: React.CSSProperties }) {
  const n = pad(sections.indexOf(id) + 1);
  return (
    <div className="label-row mono" style={style}>
      <span>
        ({n}) {title}
      </span>
      <span className="dim">{note}</span>
    </div>
  );
}

/** Big section heading, one masked line per entry so each line slides up on reveal. Lines accept RichText marks. */
export function SectionTitle({ lines, className = "h-xl section-title" }: { lines: string[]; className?: string }) {
  return (
    <h2 className={`display ${className}`} data-lines>
      {lines.map((line) => (
        <span key={line} className="line-mask">
          <span>
            <RichText text={line} />
          </span>
        </span>
      ))}
    </h2>
  );
}

/** Tool chips with brand icons; they pop in one after another once a parent gets `.is-in`. */
export function ToolChips({ tools }: { tools: string[] }) {
  return (
    <ul className="tools">
      {tools.map((t, i) => (
        <li key={t} className="tool" style={{ ["--i" as string]: i, ["--c" as string]: `#${toolColor(t)}` }}>
          <span className="tool__icon">
            <ToolIcon name={t} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
