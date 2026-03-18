import { AppProviders } from '@/app';
import { HomePage } from '@/pages';
import '@/styles/index.css';

const Page = () => (
  <AppProviders>
    <HomePage />
  </AppProviders>
);

export default Page;
