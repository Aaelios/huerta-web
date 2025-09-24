// components/webinars/Includes.tsx

type IncludesProps = {
  title?: string;
  items: string[];
  className?: string;
};

export default function Includes({
  title = "Qué incluye tu inscripción",
  items,
  className,
}: IncludesProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <ul>
        {items.map((inc, i) => (
          <li key={i}>{inc}</li>
        ))}
      </ul>
    </section>
  );
}
