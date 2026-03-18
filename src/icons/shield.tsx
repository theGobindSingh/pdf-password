import type { SVGProps } from 'react';

export const ShieldIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 3 5 6v5c0 4.5 2.9 8.7 7 10 4.1-1.3 7-5.5 7-10V6z" />
    <path d="m9.5 12 1.7 1.7 3.3-3.7" />
  </svg>
);
