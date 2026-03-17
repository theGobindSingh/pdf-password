import vikeReact from 'vike-react/config';
import type { Config } from 'vike/types';

export default {
  extends: vikeReact,
  prerender: true,
  title:
    'PDF Unlocker | Forgot PDF Password? Check Protection and Recover Access',
  description:
    'Forgot PDF password details? PDF Unlocker helps you check PDF protection, open locked PDF files you own, and recover access privately in your browser. No uploads, no signup, and your file stays on your device.',
  htmlAttributes: { lang: 'en', class: 'dark' },
  bodyAttributes: { class: 'dark' },
} satisfies Config;
