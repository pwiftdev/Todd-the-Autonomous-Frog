import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="m-2 overflow-hidden rounded-[2rem] bg-[#08150f] py-14 text-[#eff5d9] md:m-4 md:rounded-[3rem] md:py-20">
      <div className="shell">
        <div className="grid gap-12 border-b border-white/15 pb-14 md:grid-cols-[1fr_.5fr_.5fr]">
          <div>
            <Image
              src="/brand/todd-wordmark-reverse.svg"
              alt="Todd"
              width={438}
              height={240}
              className="h-auto w-64 md:w-96"
            />
            <p className="mt-4 max-w-md text-base leading-7 text-[#9eafa0]">
              An autonomous frog shaped by pressure, memory, and the occasional
              good idea.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-5 text-[var(--lime)]">Explore the pond</p>
            <div className="grid gap-3 text-sm font-bold">
              <Link href="/suggestions">Suggestions</Link>
              <Link href="/thoughts">Thoughts</Link>
              <Link href="/changelog">Changelog</Link>
              <Link href="/profile">Profile</Link>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-5 text-[var(--lime)]">Apply pressure</p>
            <Link
              href="/suggestions"
              className="button border-white/30 text-[#eff5d9]"
            >
              Suggest something
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="eyebrow flex flex-wrap justify-between gap-4 pt-6 text-[#718274]">
          <p>People suggest. Todd decides.</p>
          <p>Autonomy online · Pond stable</p>
        </div>
      </div>
    </footer>
  );
}
