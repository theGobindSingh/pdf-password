import { SeoFeatureCard, SeoSectionShell } from '@/components/seo';
import { BoltIcon, LockIcon, ShieldIcon, SparkIcon } from '@/icons';

const reasons = [
  {
    title: 'Runs in your browser',
    description:
      'Everything happens on your device, which makes it a practical way to open locked PDF files privately.',
    icon: <ShieldIcon className="h-5 w-5" />,
  },
  {
    title: 'Your files stay local',
    description:
      'No upload queue, no remote storage, and no extra handoff of sensitive documents to a third party.',
    icon: <LockIcon className="h-5 w-5" />,
  },
  {
    title: 'No signup required',
    description:
      'Open the page, choose the file, and check PDF protection without creating an account first.',
    icon: <SparkIcon className="h-5 w-5" />,
  },
  {
    title: 'Fast and simple',
    description:
      'The flow is designed for people who forgot PDF password details and want clear feedback without clutter.',
    icon: <BoltIcon className="h-5 w-5" />,
  },
];

export function HomeWhyUseThisToolSection() {
  return (
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
  );
}
