// components/webinars/Hero.tsx
"use client";

type HeroProps = {
  title: string;
  tagline: string;
  datetime: string;
  price: string;
  ctaText: string;
  checkoutUrl: string;
};

export default function Hero({
  title,
  tagline,
  datetime,
  price,
  ctaText,
  checkoutUrl,
}: HeroProps) {
  return (
    <section className="container">
      <h1>{title}</h1>
      <p>{tagline}</p>
      <p>
        <strong>Fecha y hora:</strong> {datetime}
      </p>
      <p>
        <strong>Precio:</strong> {price}
      </p>
      <a
        id="cta-register"
        className="c-btn"
        href={checkoutUrl}
      >
        {ctaText}
      </a>
    </section>
  );
}
