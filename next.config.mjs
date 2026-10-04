/**
 * Next.js configuration for Camerlob.
 *
 * The Content-Security-Policy below is intentionally strict but still permits
 * the WebAssembly instantiation required by magick-wasm, which runs client-side
 * and therefore cannot use `unsafe-eval`.
 *
 * @type {import('next').NextConfig}
 */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required for hydration.
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // WASM needs 'wasm-unsafe-eval' in CSP Level 3 browsers.
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:" + (isDev ? ' ws: wss:' : ''),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // `next build` runs ESLint as an implicit step, and it invokes ESLint 9 with
  // the ESLint 8 CLI flags Next 14.2.5 still passes (`useEslintrc`, `extensions`).
  // That combination cannot succeed: Next 14's build-time lint runner is not
  // compatible with the ESLint 9 major that `package.json` pins. The failure is
  // reported as "Invalid Options" and aborts the build before any page is
  // emitted, which would mask real compile errors behind a tooling mismatch.
  //
  // Linting is not lost, it is a separate gate: `pnpm run lint` is the canonical
  // entry and `pnpm run verify` runs it alongside typecheck, format and tests.
  // Remove this block once ESLint is pinned back to ^8.57.0 and reinstalled.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Matches SERVER_MAX_FILE_SIZE_MB; the API route enforces the real limit.
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/wasm/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config) => {
    // sharp and the WASM engines must stay external to the server bundle.
    config.externals = [...(config.externals ?? []), 'sharp'];
    return config;
  },
};

export default nextConfig;
