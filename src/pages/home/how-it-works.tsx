import { SeoFeatureCard, SeoSectionShell } from '@/components/seo';
import { StepIcon } from '@/icons';

const steps = [
  {
    title: 'Upload your PDF',
    description:
      'Choose the file directly in your browser and keep control of the document from the first click.',
    icon: <StepIcon label="1" />,
  },
  {
    title: 'We check protection',
    description:
      'The app checks PDF protection first so you know whether the file opens normally or needs extra help.',
    icon: <StepIcon label="2" />,
  },
  {
    title: 'We test common patterns',
    description:
      'If the PDF is locked, the tool tries a few common password patterns locally to help recover access.',
    icon: <StepIcon label="3" />,
  },
  {
    title: 'You get instant results',
    description:
      'You see the outcome right away, whether the PDF opens immediately or a likely password is recovered.',
    icon: <StepIcon label="4" />,
  },
];

export function HomeHowItWorksSection() {
  return (
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
  );
}
