import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import vike from 'vike/plugin';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

type CompatOutputOptions = {
  codeSplitting?: boolean | object;
  inlineDynamicImports?: boolean;
};

const normalizeBasePath = (basePath: string): string => {
  if (!basePath || basePath === '/') {
    return '/';
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

const getDeployBasePath = (): string => {
  const explicitBasePath = process.env.PUBLIC_BASE_PATH;
  if (explicitBasePath) {
    return normalizeBasePath(explicitBasePath);
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (process.env.GITHUB_ACTIONS === 'true' && repositoryName) {
    return normalizeBasePath(`/${repositoryName}/`);
  }

  return '/';
};

const basePath = getDeployBasePath();
const basePathWithoutTrailingSlash =
  basePath === '/' ? '' : basePath.slice(0, -1);
const withBasePath = (assetPath: string): string => {
  if (!assetPath || assetPath === '/') {
    return basePath;
  }

  const normalizedAssetPath = assetPath.startsWith('/')
    ? assetPath
    : `/${assetPath}`;

  return `${basePathWithoutTrailingSlash}${normalizedAssetPath}`;
};

const normalizeOutputOptions = <T extends CompatOutputOptions>(
  output: T,
): T => {
  const nextOutput = { ...output, codeSplitting: false };

  delete nextOutput.inlineDynamicImports;

  return nextOutput;
};

const patchDeprecatedInlineDynamicImports = (
  output: CompatOutputOptions | CompatOutputOptions[] | undefined,
): CompatOutputOptions | CompatOutputOptions[] | undefined => {
  if (Array.isArray(output)) {
    return output.map(normalizeOutputOptions);
  }

  return output ? normalizeOutputOptions(output) : output;
};

const certDir = path.resolve(__dirname, '.cert');
const httpsConfig =
  fs.existsSync(path.join(certDir, 'cert.key')) &&
  fs.existsSync(path.join(certDir, 'cert.crt'))
    ? {
        key: fs.readFileSync(path.join(certDir, 'cert.key')),
        cert: fs.readFileSync(path.join(certDir, 'cert.crt')),
      }
    : undefined;

// SharedArrayBuffer requires Cross-Origin isolation headers (Phase 14)
const coiHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    vike(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      // Use injectManifest so we can ship a fully custom service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: null,
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
        type: 'module',
        resolveTempFolder: () => 'dist/dev-sw',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
      },
      integration: {
        configureCustomSWViteBuild(inlineConfig) {
          const rollupOptions = inlineConfig.build?.rollupOptions;

          if (!rollupOptions?.output) {
            return;
          }

          rollupOptions.output = patchDeprecatedInlineDynamicImports(
            rollupOptions.output,
          );
        },
      },
      manifest: {
        id: basePath,
        name: 'PDF Unlocker',
        short_name: 'PDF Unlocker',
        description:
          'Forgot the password to your PDF? PDF Unlocker tests every possible combination to recover it — runs 100% in your browser, nothing leaves your device.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        prefer_related_applications: false,
        scope: basePath,
        start_url: basePath,
        icons: [
          {
            src: withBasePath('/icons/android/launchericon-192x192.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: withBasePath('/icons/android/launchericon-512x512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: withBasePath('/icons/android/launchericon-512x512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: withBasePath('/icons/android/launchericon-512x512.png'),
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        screenshots: [
          {
            src: withBasePath('/screenshots/desktop.png'),
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'PDF Unlocker — Desktop',
          },
          {
            src: withBasePath('/screenshots/mobile.png'),
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PDF Unlocker — Mobile',
          },
        ],
        // Web Share Target — lets Android users share a PDF directly into the app
        share_target: {
          action: withBasePath('/share-target'),
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'file',
                accept: ['application/pdf', '.pdf'],
              },
            ],
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { headers: coiHeaders, https: httpsConfig },
  preview: { headers: coiHeaders, https: httpsConfig },
});
