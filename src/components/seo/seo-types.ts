import type { ReactNode } from 'react';

export interface SeoFeatureCardData {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}
