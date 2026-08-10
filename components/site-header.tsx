import Image from "next/image";
import Link from "next/link";

const X_PROFILE_URL = "https://x.com/ToddTheFrog";

const anchors = [
  ["How it works", "#experiment"],
  ["Live", "#live-dashboard"],
  ["Thoughts", "#thoughts-showcase"],
  ["Suggest", "#suggest"],
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.258 5.686 5.906-5.686Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteHeader({
  dayNumber,
  statusText,
}: {
  dayNumber?: number;
  statusText?: string;
}) {
  return (
    <header className="shell sticky top-3 z-30 mt-3 flex h-14 items-center justify-between rounded-full border border-[var(--line)] bg-[var(--paper)]/85 px-4 shadow-[0_12px_50px_rgba(10,30,18,.08)] backdrop-blur-xl md:h-16 md:px-5">
      <Link href="/" className="flex h-10 items-center md:h-12" aria-label="Todd home">
        <Image
          src="/brand/todd-wordmark.svg"
          alt="Todd"
          width={110}
          height={60}
          className="h-10 w-auto md:h-12"
          priority
        />
      </Link>
      <nav className="hidden items-center gap-1 rounded-full border rule bg-black/[.025] p-1 md:flex">
        {anchors.map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="eyebrow rounded-full px-4 py-2 transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="eyebrow flex items-center gap-3">
        <a
          href={X_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Todd on X"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border rule transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
        >
          <XIcon className="h-3.5 w-3.5" />
        </a>
        <span className="micro-dot" />
        <span className="hidden sm:inline">Live</span>
        {typeof dayNumber === "number" && (
          <span className="hidden text-[var(--muted)] sm:inline">
            · day {dayNumber}
          </span>
        )}
        {statusText && (
          <span className="hidden max-w-[10rem] truncate text-[var(--muted)] lg:inline">
            · {statusText}
          </span>
        )}
      </div>
      <details className="md:hidden">
        <summary className="eyebrow cursor-pointer list-none rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]">
          Menu
        </summary>
        <nav className="card absolute right-0 top-14 z-20 grid w-52 gap-1 p-3 shadow-card">
          {anchors.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="eyebrow rounded-xl px-4 py-3 hover:bg-black/5"
            >
              {label}
            </a>
          ))}
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-black/5"
          >
            <XIcon className="h-3.5 w-3.5" />
            Follow on X
          </a>
        </nav>
      </details>
    </header>
  );
}
