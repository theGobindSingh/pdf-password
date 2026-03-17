import Footer from '@/components/footer';
import { HomeSeoSections } from '@/pages/home/components';
import HomeHeroSection from '@/pages/home/hero';

function FloatingBlobs() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="blob absolute -left-48 -top-48 h-[600px] w-[600px] bg-blue-600/10 blur-3xl" />
      <div className="blob-delay absolute -bottom-48 -right-48 h-[500px] w-[500px] bg-blue-400/8 blur-3xl" />
    </div>
  );
}

export function HomePage() {
  return (
    <main className="relative items-center justify-center bg-background px-4 py-8 h-dvh w-dvw overflow-hidden overflow-y-auto">
      <FloatingBlobs />

      <HomeHeroSection />

      <HomeSeoSections />

      <Footer />
    </main>
  );
}
