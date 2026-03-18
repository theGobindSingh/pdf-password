import type { ReactNode } from 'react';

import { Badge } from '@/components/ui';

interface SeoSectionShellProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export const SeoSectionShell = ({
  id,
  eyebrow,
  title,
  description,
  children,
}: SeoSectionShellProps) => (
  <section id={id} className="py-16 sm:py-20">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="max-w-3xl">
        <Badge
          variant="outline"
          className="mb-4 bg-card/40 text-muted-foreground"
        >
          {eyebrow}
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {children}
    </div>
  </section>
);
