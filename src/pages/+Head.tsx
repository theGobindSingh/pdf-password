import { withBasePath } from '@/utils/base-path';

const webApplicationJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PDF Unlocker',
  description:
    'PDF Unlocker helps you check PDF protection and recover access to files you own directly in your browser, without uploading documents to a server.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Check whether a PDF is password protected',
    'Help recover access to files when the password is forgotten',
    'Runs entirely in the browser',
    'No file uploads or signup required',
    'Files stay on your device',
  ],
  browserRequirements:
    'Requires a modern browser with Web Worker and File API support',
});

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can I unlock a PDF without a password?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A protected PDF still needs the correct password. This tool does not remove protection. It helps you recover access by checking likely password patterns locally in your browser.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if I forgot my PDF password?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If you forgot PDF password details, you can use this page to check whether the file is protected and test a limited set of common patterns. It is meant for files you own or are allowed to use.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my file uploaded anywhere?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The PDF stays on your device. The app runs client-side in the browser, which helps keep private documents private.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is this tool safe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, for legitimate document access. The experience is built around privacy-first processing, honest results, and a clear reminder to use it only with files you own or have permission to access.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if the password is not found?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You will see that no match was found in the patterns tested. The document is not changed, and you can stop there or try again later if you remember more about the password.',
      },
    },
  ],
});

export const Head = () => (
  <>
    <meta
      name="keywords"
      content="forgot pdf password, check pdf protection, open locked pdf, unlock pdf without password, pdf password recovery, private pdf tool, browser pdf utility"
    />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="PDF Unlocker" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content={withBasePath('/og-image.png')} />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="PDF Unlocker | Forgot PDF Password?" />
    <meta
      name="twitter:description"
      content="Check PDF protection and recover access privately in your browser. No uploads, no signup, and no server-side file processing."
    />
    <meta name="twitter:image" content={withBasePath('/og-image.png')} />
    <meta name="theme-color" content="#0f172a" />
    <meta name="color-scheme" content="dark light" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta
      name="apple-mobile-web-app-status-bar-style"
      content="black-translucent"
    />
    <meta name="apple-mobile-web-app-title" content="PDF Unlocker" />
    <link rel="manifest" href={withBasePath('/manifest.webmanifest')} />
    <link
      rel="icon"
      type="image/png"
      href={withBasePath('/icons/android/launchericon-512x512.png')}
    />
    <link rel="apple-touch-icon" href={withBasePath('/icons/ios/180.png')} />
    <link
      rel="apple-touch-icon"
      sizes="152x152"
      href={withBasePath('/icons/ios/152.png')}
    />
    <link
      rel="apple-touch-icon"
      sizes="167x167"
      href={withBasePath('/icons/ios/167.png')}
    />
    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href={withBasePath('/icons/ios/180.png')}
    />
    <script type="application/ld+json">{webApplicationJsonLd}</script>
    <script type="application/ld+json">{faqJsonLd}</script>
  </>
);
