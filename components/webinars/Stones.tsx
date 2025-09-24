// components/webinars/Stones.tsx

type Stone = {
  k: string;
  sub: string;
  text: string;
};

type StonesProps = {
  title?: string;
  items: Stone[];
  className?: string;
};

export default function Stones({
  title = "Stepping Stones (LOBRÁ)",
  items,
  className,
}: StonesProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <ul>
        {items.map((s) => (
          <li key={s.k}>
            <strong>
              {s.k} ({s.sub}):
            </strong>{" "}
            {s.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
