import { Card, CardContent } from '@/components/ui';

export function HomeDisclaimerSection() {
  return (
    <section className="pb-10 pt-2 sm:pb-14">
      <Card className="border-border/70 bg-card/50">
        <CardContent className="px-6 pt-5 py-5 text-center text-sm leading-6 text-muted-foreground">
          This tool is intended only for accessing files you own or have
          permission to use.
        </CardContent>
      </Card>
    </section>
  );
}
