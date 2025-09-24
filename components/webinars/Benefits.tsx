// components/webinars/Benefits.tsx

type BenefitsProps = {
  title?: string;
  items: string[];
  className?: string;
};

export default function Benefits({
  title = "Beneficios inmediatos",
  items,
  className,
}: BenefitsProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <ul>
        {items.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  );
}
