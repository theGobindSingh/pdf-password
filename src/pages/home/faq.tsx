import { SeoSectionShell } from '@/components/seo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui';

const faqs = [
  {
    question: 'Can I unlock a PDF without a password?',
    answer:
      'A protected PDF still needs the correct password. This tool does not remove protection. It helps you recover access by checking likely password patterns locally in your browser.',
  },
  {
    question: 'What if I forgot my PDF password?',
    answer:
      'If you forgot PDF password details, you can use this page to check whether the file is protected and test a limited set of common patterns. It is meant for files you own or are allowed to use.',
  },
  {
    question: 'Is my file uploaded anywhere?',
    answer:
      'No. The PDF stays on your device. The app runs client-side in the browser, which helps keep private documents private.',
  },
  {
    question: 'Is this tool safe?',
    answer:
      'Yes, for legitimate document access. The experience is built around privacy-first processing, honest results, and a clear reminder to use it only with files you own or have permission to access.',
  },
  {
    question: 'What happens if the password is not found?',
    answer:
      'You will see that no match was found in the patterns tested. The document is not changed, and you can stop there or try again later if you remember more about the password.',
  },
  {
    question: 'Can this help me open a locked PDF after checking protection?',
    answer:
      'Yes, if the password is simple enough to be matched by the patterns tested. If not, the app will still tell you clearly that it could not recover access.',
  },
];

export const HomeFaqSection = () => (
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
);
