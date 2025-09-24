// components/webinars/Audience.tsx

type AudienceProps = {
  title?: string;
  items: string[];
  className?: string;
};

export default function Audience({
  title = "Para quién es este taller",
  items,
  className,
}: AudienceProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <ul>
        {items.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </section>
  );
}
