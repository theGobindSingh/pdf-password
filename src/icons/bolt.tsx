import type { SVGProps } from 'react';

export function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      {...props}
    >
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}
