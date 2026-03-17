import { SeoSectionShell } from '@/components/seo';
import { Card, CardContent } from '@/components/ui';
import { DocumentSearchIcon } from '@/icons';

export function HomeForgotPasswordSection() {
  return (
    <SeoSectionShell
      id="forgot-pdf-password"
      eyebrow="Forgot PDF password"
      title="Forgot your PDF password and need a simple way to recover access?"
      description="Many services ask you to arrive with the password already in hand. This tool is different. It helps you check PDF protection, understand whether the file is locked, and try a few likely password patterns locally when you need help opening a document you own."
    >
      <Card className="mx-auto max-w-3xl border-border/80 bg-linear-to-br from-card to-card/70">
        <CardContent className="flex flex-col items-center gap-5 px-6 pt-8 py-8 text-center sm:px-10 sm:pt-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <DocumentSearchIcon className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">
              A privacy-first way to open locked PDF files you are allowed to
              use
            </h3>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              If you want to unlock PDF without password details at hand, the
              honest answer is that the correct password still matters. What
              this page can do is help when you forgot PDF password information
              by checking the file and testing a limited set of patterns in the
              browser, without sending the document anywhere.
            </p>
          </div>
        </CardContent>
      </Card>
    </SeoSectionShell>
  );
}
