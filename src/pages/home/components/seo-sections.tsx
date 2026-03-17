import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
} from '@/components/ui';

import { SeoFeatureCard } from './seo-feature-card';
import { SeoSectionShell } from './seo-section-shell';
import { faqs, heroCardContent, reasons, steps } from './seo-sections-content';

export function HomeSeoSections() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl">
      <SeoSectionShell
        id="forgot-pdf-password"
        eyebrow="Forgot PDF password"
        title="Forgot your PDF password and need a simple way to recover access?"
        description="Many services ask you to arrive with the password already in hand. This tool is different. It helps you check PDF protection, understand whether the file is locked, and try a few likely password patterns locally when you need help opening a document you own."
      >
        <Card className="mx-auto max-w-3xl border-border/80 bg-linear-to-br from-card to-card/70">
          <CardContent className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:px-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              {heroCardContent.icon}
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">
                {heroCardContent.title}
              </h3>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {heroCardContent.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </SeoSectionShell>

      <SeoSectionShell
        id="how-it-works"
        eyebrow="How it works"
        title="A clear four-step flow for checking access"
        description="The process is intentionally simple so users can understand what is happening at every stage and get instant feedback without guessing."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <SeoFeatureCard key={step.title} {...step} />
          ))}
        </div>
      </SeoSectionShell>

      <SeoSectionShell
        id="why-use-this-tool"
        eyebrow="Why use this tool"
        title="Built for privacy, clarity, and quick PDF checks"
        description="This page is designed to help you check PDF protection and recover access in a careful, browser-first way instead of pushing your files through a generic upload service."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {reasons.map((reason) => (
            <SeoFeatureCard key={reason.title} {...reason} />
          ))}
        </div>
      </SeoSectionShell>

      <SeoSectionShell
        id="faq"
        eyebrow="FAQ"
        title="Answers before you try to open a locked PDF"
        description="These are the common questions people ask when they want to open locked PDF documents safely and understand exactly how the tool behaves."
      >
        <Accordion className="grid gap-3">
          {faqs.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              defaultOpen={index === 0}
            >
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SeoSectionShell>

      <section className="pb-10 pt-2 sm:pb-14">
        <Card className="border-border/70 bg-card/50">
          <CardContent className="px-6 py-5 text-center text-sm leading-6 text-muted-foreground">
            This tool is intended only for accessing files you own or have
            permission to use.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
