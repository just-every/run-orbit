// The modules src/core/features/public/docs/build/plugin.ts generates from the repository's Markdown.
declare module 'virtual:orbit-docs' {
  export const repository: import('./types').DocsRepository;
  export const sections: import('./types').DocsSection[];
  export const pages: Record<string, () => Promise<{ default: import('./types').DocsPageData }>>;
  /** In `vite dev`, every broken link or page problem in one message; always null in a build, which fails instead. */
  export const problem: string | null;
}
declare module 'virtual:orbit-docs/page/*' {
  const page: import('./types').DocsPageData;
  export default page;
}
