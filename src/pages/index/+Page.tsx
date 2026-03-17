import { AppProviders } from '@/app';
import { HomePage } from '@/pages';
import '@/styles/index.css';

export default function Page() {
  return (
    <AppProviders>
      <HomePage />
    </AppProviders>
  );
}
