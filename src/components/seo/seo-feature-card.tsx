import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';

import type { SeoFeatureCardData } from './seo-types';

export const SeoFeatureCard = ({
  title,
  description,
  icon,
}: SeoFeatureCardData) => (
  <Card className="h-full border-border/80 bg-card/65 backdrop-blur-sm">
    <CardHeader className="gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="mt-2 leading-6">
          {description}
        </CardDescription>
      </div>
    </CardHeader>
  </Card>
);
