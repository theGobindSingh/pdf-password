const rawBasePath = import.meta.env.BASE_URL || '/';

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === '/') {
    return '/';
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export const basePath = normalizeBasePath(rawBasePath);

const basePathWithoutTrailingSlash =
  basePath === '/' ? '' : basePath.slice(0, -1);

export function withBasePath(path: string): string {
  if (!path || path === '/') {
    return basePath;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${basePathWithoutTrailingSlash}${normalizedPath}`;
}
