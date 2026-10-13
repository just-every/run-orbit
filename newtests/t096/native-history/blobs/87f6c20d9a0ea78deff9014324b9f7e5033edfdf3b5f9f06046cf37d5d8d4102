import type { PropsWithChildren } from "react";

interface PageFrameProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
}

export function PageFrame({ children, eyebrow, title }: PageFrameProps) {
  return (
    <main className="flex min-h-screen items-center bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-12">
        <p className="text-sm font-semibold tracking-[0.18em] text-sky-300 uppercase">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <div className="mt-6 text-lg leading-8 text-slate-300">{children}</div>
      </section>
    </main>
  );
}
