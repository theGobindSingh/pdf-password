import { Footer } from '@/components/footer';
import { useStandaloneMode } from '@/hooks';
import { HomeDisclaimerSection } from '@/pages/home/disclaimer';
import { HomeFaqSection } from '@/pages/home/faq';
import { HomeForgotPasswordSection } from '@/pages/home/forgot-password';
import { HomeHeroSection } from '@/pages/home/hero';
import { HomeHowItWorksSection } from '@/pages/home/how-it-works';
import { HomeWhyUseThisToolSection } from '@/pages/home/why-use-this-tool';

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
  const isStandalone = useStandaloneMode();

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-background px-4 py-8">
      <FloatingBlobs />

      <HomeHeroSection />

      {!isStandalone && (
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <HomeForgotPasswordSection />
          <HomeHowItWorksSection />
          <HomeWhyUseThisToolSection />
          <HomeFaqSection />
          <HomeDisclaimerSection />
        </div>
      )}

      <Footer />
    </main>
  );
}
