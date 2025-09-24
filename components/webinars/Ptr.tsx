// components/webinars/Ptr.tsx

type PtrProps = {
  title?: string;
  text: string;
  className?: string;
};

export default function Ptr({ title = "Lo que lograrás en este taller", text, className }: PtrProps) {
  return (
    <section className={["container", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
