import Image from "next/image";
import Link from "next/link";

const links = [
  ["Thoughts", "/thoughts"],
  ["Suggestions", "/suggestions"],
  ["Changes", "/changelog"],
  ["Profile", "/profile"],
];

export function SiteHeader() {
  return (
    <header className="shell sticky top-3 z-30 mt-3 flex h-16 items-center justify-between rounded-full border border-[var(--line)] bg-[var(--paper)]/85 px-5 shadow-[0_12px_50px_rgba(10,30,18,.08)] backdrop-blur-xl">
      <Link href="/" className="flex h-12 items-center" aria-label="Todd home">
        <Image
          src="/brand/todd-wordmark.svg"
          alt="Todd"
          width={110}
          height={60}
          className="h-12 w-auto"
          priority
        />
      </Link>
      <nav className="hidden items-center gap-1 rounded-full border rule bg-black/[.025] p-1 md:flex">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="eyebrow rounded-full px-4 py-2 transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="eyebrow hidden items-center gap-3 sm:flex">
        <span className="micro-dot" />
        Live
      </div>
      <details className="md:hidden">
        <summary className="eyebrow cursor-pointer list-none rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]">
          Menu
        </summary>
        <nav className="card absolute right-0 top-16 z-20 grid w-52 gap-1 p-3 shadow-card">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="eyebrow rounded-xl px-4 py-3 hover:bg-black/5"
            >
              {label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}
