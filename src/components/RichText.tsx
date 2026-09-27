/**
 * Tiny inline markup for headlines:
 *   ~text~  struck through (the "before")
 *   *text*  highlighted: italic serif, animated accent gradient (the "after")
 *   [text]  dimmed
 */
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(~[^~]+~|\*[^*]+\*|\[[^\]]+\])/)
        .filter(Boolean)
        .map((part, i) => {
          const inner = part.slice(1, -1);
          if (part.startsWith("~")) return <span key={i} className="rt-strike">{inner}</span>;
          if (part.startsWith("*")) return <span key={i} className="rt-hl serif-hl">{inner}</span>;
          if (part.startsWith("[")) return <span key={i} className="rt-dim">{inner}</span>;
          return <span key={i}>{part}</span>;
        })}
    </>
  );
}
