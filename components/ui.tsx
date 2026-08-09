import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-10 grid gap-6 md:grid-cols-[1fr_300px] md:items-end">
      <div>
        <p className="eyebrow mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-current opacity-40" />
          {eyebrow}
        </p>
        <h2 className="display max-w-4xl text-5xl uppercase leading-[.84] md:text-7xl lg:text-8xl">
          {title}
        </h2>
      </div>
      {note && <p className="text-sm leading-6 text-[var(--muted)]">{note}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return (
    <span
      className={clsx(
        "eyebrow inline-flex rounded-full border px-2.5 py-1",
        ["ACCEPTED", "IMPLEMENTED"].includes(status) &&
          "border-[#5d7e28] bg-[#dff7ab] text-[#30430f]",
        status === "REJECTED" && "border-[#a97b73] bg-[#f4d8d1] text-[#5e2820]",
        ["PENDING", "CONSIDERING"].includes(status) &&
          "border-[var(--line)] bg-white/40",
      )}
    >
      {label}
    </span>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="eyebrow inline-flex items-center gap-2 rounded-full border border-current px-4 py-3 transition-transform hover:-translate-y-1"
    >
      {children}
      <ArrowUpRight size={13} />
    </Link>
  );
}
