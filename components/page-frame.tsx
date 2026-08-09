import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

export function PageFrame({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <SiteHeader />
      <header className="swamp-glow swamp-grid relative mx-2 mt-3 min-h-[420px] overflow-hidden rounded-[2rem] text-[#eff5d9] md:mx-4 md:min-h-[500px] md:rounded-[3rem]">
        <div className="shell relative z-10 grid min-h-[420px] gap-8 py-14 md:min-h-[500px] md:grid-cols-[1fr_380px] md:items-end md:py-20">
          <div>
            <p className="eyebrow mb-6 flex items-center gap-3 text-[var(--lime)]">
              <span className="micro-dot" />
              {eyebrow}
            </p>
            <h1 className="display max-w-5xl text-[clamp(4.2rem,10vw,9rem)] uppercase leading-[.78]">
              {title}
            </h1>
          </div>
          <p className="max-w-sm border-l border-white/25 pl-5 text-lg leading-7 text-[#c4d0c2]">
            {intro}
          </p>
        </div>
        <div
          className="absolute -right-10 -top-10 hidden h-72 w-72 rotate-12 opacity-20 md:grid md:grid-cols-4 md:gap-2"
          aria-hidden="true"
        >
          {Array.from({ length: 16 }, (_, index) => (
            <span
              key={index}
              className={`rounded-sm border border-[var(--lime)] ${index % 3 === 0 ? "bg-[var(--lime)]" : "bg-transparent"}`}
            />
          ))}
        </div>
        <div className="absolute -bottom-28 -left-16 h-52 w-52 rounded-full border border-[var(--lime)]/20" />
      </header>
      {children}
      <Footer />
    </main>
  );
}
