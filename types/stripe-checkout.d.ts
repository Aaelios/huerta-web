// types/stripe-checkout.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'stripe-checkout': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      'client-secret': string;
      'publishable-key': string;
    };
  }
}
