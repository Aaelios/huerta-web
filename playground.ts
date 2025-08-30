import { config } from 'dotenv'; config({ path: '.env.local' });
import { f_buildReturnUrl } from './lib/checkout/f_buildReturnUrls.ts';
console.log(f_buildReturnUrl()); // espera https://huerta-consulting.com/gracias?session_id={CHECKOUT_SESSION_ID}
