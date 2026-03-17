import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import '@/styles/index.css';
import { withBasePath } from '@/utils/base-path';
import { usePageContext } from 'vike-react/usePageContext';

type ErrorContent = {
  statusCode: number;
  title: string;
  message: string;
};

function getErrorContent(
  pageContext: ReturnType<typeof usePageContext>,
): ErrorContent {
  const { abortReason, abortStatusCode, is404 } = pageContext;

  if (typeof abortReason === 'string' && abortReason.trim().length > 0) {
    return {
      statusCode: abortStatusCode ?? 500,
      title:
        abortStatusCode === 404 || is404 ? 'Page not found' : 'Request failed',
      message: abortReason,
    };
  }

  if (abortStatusCode === 401) {
    return {
      statusCode: 401,
      title: 'Sign-in required',
      message: 'You need to sign in before you can access this page.',
    };
  }

  if (abortStatusCode === 403) {
    return {
      statusCode: 403,
      title: 'Access denied',
      message: 'You do not have permission to view this page.',
    };
  }

  if (is404 || abortStatusCode === 404) {
    return {
      statusCode: 404,
      title: 'Page not found',
      message:
        'The page you requested does not exist or may have moved. Return to the homepage to continue.',
    };
  }

  return {
    statusCode: abortStatusCode ?? 500,
    title: 'Something went wrong',
    message:
      'An unexpected error interrupted the page render. Try again or return to the homepage.',
  };
}

export default function Page() {
  const pageContext = usePageContext();
  const { statusCode, title, message } = getErrorContent(pageContext);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="blob pointer-events-none absolute -left-32 top-0 h-80 w-80 bg-blue-600/10 blur-3xl" />
      <div className="blob-delay pointer-events-none absolute -right-24 bottom-0 h-72 w-72 bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl items-center justify-center">
        <Card className="w-full border-white/10 bg-card/90 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="text-sm font-medium uppercase tracking-[0.28em] text-blue-300/80">
              Error {statusCode}
            </div>
            <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              PDF Unlocker runs entirely in your browser, so you can safely
              restart from the homepage.
            </p>

            <a
              href={withBasePath('/')}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Return home
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
