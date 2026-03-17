import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      // Use injectManifest so we can ship a fully custom service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
        resolveTempFolder: () => 'dist/dev-sw',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
      },
      manifest: {
        id: '/',
        name: 'PDF Unlocker',
        short_name: 'PDF Unlocker',
        description:
          'Forgot the password to your PDF? PDF Unlocker tests every possible combination to recover it — runs 100% in your browser, nothing leaves your device.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        prefer_related_applications: false,
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/android/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/android/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/android/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/android/launchericon-512x512.png',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'PDF Unlocker — Desktop',
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PDF Unlocker — Mobile',
          },
        ],
        // Web Share Target — lets Android users share a PDF directly into the app
        share_target: {
          action: '/share-target',
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
