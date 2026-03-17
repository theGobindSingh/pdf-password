import type { ReactNode } from 'react';

import {
  BoltIcon,
  DocumentSearchIcon,
  LockIcon,
  ShieldIcon,
  SparkIcon,
  StepIcon,
} from '@/icons';

export interface FeatureCardData {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const steps: FeatureCardData[] = [
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

export const reasons: FeatureCardData[] = [
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

export const faqs: FaqItem[] = [
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

export const heroCardContent = {
  icon: <DocumentSearchIcon className="h-6 w-6" />,
  title: 'A privacy-first way to open locked PDF files you are allowed to use',
  description:
    'If you want to unlock PDF without password details at hand, the honest answer is that the correct password still matters. What this page can do is help when you forgot PDF password information by checking the file and testing a limited set of patterns in the browser, without sending the document anywhere.',
};
