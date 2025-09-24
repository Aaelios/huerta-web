// components/webinars/Faq.tsx

type FaqItem = {
  q: string;
  a: string;
};

type FaqProps = {
  title?: string;
  items: FaqItem[];
  className?: string;
};

export default function Faq({
  title = "Preguntas frecuentes",
  items,
  className,
}: FaqProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <dl>
        {items.map((f, i) => (
          <div key={i}>
            <dt>
              <strong>{f.q}</strong>
            </dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
