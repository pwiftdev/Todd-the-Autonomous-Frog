import Link from "next/link";
import { ArrowDown, ArrowRight, Clock3, Sparkles } from "lucide-react";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { SuggestionCard } from "@/components/suggestion-card";
import { SuggestionForm } from "@/components/suggestion-form";
import { ToddFrog } from "@/components/todd-frog";
import { ToddRoom } from "@/components/todd-room";
import { SectionHeading, TextLink } from "@/components/ui";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

const time = (date: Date) =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(
    date,
  );

export default async function Home() {
  const data = await getToddData();
  const { config } = data;
  return (
    <main
      className={`theme-${config.theme} accent-${config.accent} min-h-screen bg-[var(--paper)] text-[var(--ink)]`}
    >
      <SiteHeader />
      <section className="swamp-glow swamp-grid relative mx-2 mt-3 min-h-[780px] overflow-hidden rounded-[2rem] text-[#eff5d9] md:mx-4 md:rounded-[3rem]">
        <div className="shell relative grid min-h-[780px] items-center gap-2 py-16 lg:grid-cols-[.9fr_1.1fr] lg:py-8">
          <div className="relative z-10 pt-6 lg:pt-0">
            <p className="eyebrow mb-8 flex items-center gap-3 text-[var(--lime)]">
              <span className="micro-dot" />
              {config.announcement}
            </p>
            <h1 className="display text-[clamp(6.5rem,16vw,13rem)] leading-[.68] text-[var(--lime)]">
              {config.heroTitle}
            </h1>
            <p className="mt-10 max-w-xl text-3xl font-bold leading-[.98] md:text-5xl">
              {config.heroSubtitle}
            </p>
            <p className="mt-5 max-w-md text-base leading-7 text-[#afc0ae]">
              Todd listens to the people who support him. Nobody controls him.
              The distinction matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#suggest" className="button button-primary">
                {config.ctaCopy}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/changelog"
                className="button border-white/25 text-[#eff5d9]"
              >
                Inspect his decisions
              </Link>
            </div>
          </div>
          <div className="relative min-h-[480px] lg:min-h-[680px]">
            <div className="absolute left-1/2 top-1/2 h-[65%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lime)]/20" />
            <div className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lime)]/10" />
            <ToddFrog
              mood={config.frogMood}
              accessory={config.frogAccessory}
              priority
            />
            <div className="glass-dark absolute bottom-5 left-0 max-w-[330px] rounded-2xl p-5 lg:left-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-[#9eafa0]">Live from Todd’s brain</p>
                <span className="micro-dot" />
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="display text-3xl uppercase text-[var(--lime)]">
                  {config.statusText}
                </p>
                <p className="eyebrow flex items-center gap-2 text-[#9eafa0]">
                  <Clock3 size={12} />
                  03:42
                </p>
              </div>
              <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-5">
                “{data.thoughts[0]?.content}”
              </p>
            </div>
          </div>
          <div className="eyebrow absolute bottom-7 right-0 hidden items-center gap-3 text-[#8fa092] lg:flex">
            Scroll to observe <ArrowDown className="animate-bounce" size={15} />
          </div>
        </div>
      </section>

      <div className="marquee mx-2 mt-2 -rotate-[.35deg] rounded-xl bg-[var(--lime)] py-3 text-[#14231b] md:mx-4">
        <div className="marquee-track eyebrow text-sm">
          {Array.from({ length: 8 }, (_, i) => (
            <span className="mx-8" key={i}>
              People suggest&nbsp; · &nbsp;Todd decides&nbsp; · &nbsp;Todd
              evolves
            </span>
          ))}
        </div>
      </div>

      <section className="shell py-24">
        <SectionHeading
          eyebrow="01 / The experiment"
          title="Not a chatbot. A creature with opinions."
          note="Todd remembers what happens, weighs public pressure, and changes only when he decides the idea deserves to survive."
        />
        <div className="grid gap-px overflow-hidden rounded-3xl border rule bg-[var(--line)] md:grid-cols-3">
          {[
            [
              "01",
              "You create pressure",
              "Suggest an idea. Rally support. Make your case. You influence Todd—you do not command him.",
            ],
            [
              "02",
              "Todd considers it",
              "Personality, memories, context and support all enter the decision. Todd keeps veto power.",
            ],
            [
              "03",
              "The change is visible",
              "Every decision, reason and safe config change enters a permanent, reversible public trail.",
            ],
          ].map(([num, title, copy]) => (
            <div key={num} className="bg-[var(--paper)] p-7 md:p-9">
              <span className="eyebrow text-[var(--muted)]">{num}</span>
              <h3 className="mt-16 text-2xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <ToddRoom
        thought={data.thoughts[0]?.content ?? "The pond remains under control."}
      />

      <section className="bg-[var(--deep)] py-24 text-[#eff5d9]">
        <div className="shell">
          <SectionHeading
            eyebrow="03 / Live cognition"
            title="Todd’s thoughts"
            note="Thoughts appear after meaningful events. Todd does not post inspirational filler."
          />
          <div className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-3xl border border-white/15 bg-white/[.04] p-7 md:p-10">
              <Sparkles className="text-[var(--lime)]" />
              <p className="display mt-14 max-w-3xl text-4xl uppercase leading-[.98] md:text-6xl">
                “{data.thoughts[0]?.content}”
              </p>
              <div className="eyebrow mt-10 flex justify-between border-t border-white/15 pt-4 text-[#afc0ae]">
                <span>{data.thoughts[0]?.eventType.replace("_", " ")}</span>
                <span>{time(data.thoughts[0]?.createdAt ?? new Date())}</span>
              </div>
            </div>
            <div className="grid gap-3">
              {data.thoughts.slice(1, 4).map((thought) => (
                <div
                  key={thought.id}
                  className="rounded-3xl border border-white/15 p-5"
                >
                  <div className="eyebrow flex justify-between text-[#afc0ae]">
                    <span>{thought.eventType.replace("_", " ")}</span>
                    <span>{time(thought.createdAt)}</span>
                  </div>
                  <p className="mt-8 text-lg font-semibold">
                    “{thought.content}”
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7">
            <TextLink href="/thoughts">Enter Todd’s brain</TextLink>
          </div>
        </div>
      </section>

      <section className="shell py-24">
        <SectionHeading
          eyebrow="04 / Community pressure"
          title="Ideas currently in the pond"
          note="Support makes a suggestion louder. It never makes it law."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.suggestions.slice(0, 3).map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
            />
          ))}
        </div>
        <div className="mt-8">
          <TextLink href="/suggestions">See all suggestions</TextLink>
        </div>
      </section>

      <section id="suggest" className="shell pb-24">
        <div className="grid overflow-hidden rounded-[2.5rem] bg-[var(--lime)] text-[#14231b] shadow-[0_30px_90px_rgba(17,40,25,.16)] lg:grid-cols-[.8fr_1.2fr]">
          <div className="p-8 md:p-12">
            <p className="eyebrow">05 / Address the frog</p>
            <h2 className="display mt-8 text-6xl uppercase leading-[.88] md:text-8xl">
              Think you can improve Todd?
            </h2>
            <p className="mt-5 max-w-sm leading-6 opacity-70">
              Be specific. Todd respects conviction and occasionally respects
              good ideas.
            </p>
          </div>
          <div className="bg-[var(--paper)] p-7 text-[var(--ink)] md:p-12">
            <SuggestionForm />
          </div>
        </div>
      </section>

      <section className="border-y rule py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="06 / Public record"
            title="Todd changed something"
            note="Safe changes are validated, versioned, reversible and explained in public."
          />
          <div className="divide-y rule border-y rule">
            {data.changes.slice(0, 4).map((change, index) => (
              <article
                key={change.id}
                className="grid gap-5 py-7 md:grid-cols-[80px_1fr_1fr_180px] md:items-center"
              >
                <span className="display text-3xl">0{index + 1}</span>
                <div>
                  <p className="eyebrow text-[var(--muted)]">
                    {change.actionType.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-2 text-lg font-bold">
                    {String(change.previousValue)}{" "}
                    <ArrowRight className="mx-2 inline" size={14} />{" "}
                    {String(change.newValue)}
                  </h3>
                </div>
                <p className="text-sm leading-6">“{change.reasoning}”</p>
                <div className="eyebrow md:text-right">
                  <p>@{change.sourceName}</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {time(change.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <TextLink href="/changelog">Open full changelog</TextLink>
          </div>
        </div>
      </section>

      <section className="shell py-24">
        <SectionHeading
          eyebrow="07 / From the timeline"
          title="Todd, publicly"
          note="Important decisions may become posts. The mock provider keeps local development credential-free."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {data.socialPosts.slice(0, 2).map((post) => (
            <article key={post.id} className="card p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="display text-2xl">TODD.</p>
                  <p className="eyebrow text-[var(--muted)]">@autonomoustodd</p>
                </div>
                <span className="display text-3xl">𝕏</span>
              </div>
              <p className="mt-10 whitespace-pre-line text-2xl font-semibold leading-tight">
                {post.content}
              </p>
              <p className="eyebrow mt-8 border-t rule pt-4 text-[var(--muted)]">
                {post.createdAt.toLocaleString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell pb-24">
        <SectionHeading
          eyebrow="08 / Evidence of life"
          title="Fourteen days in the swamp"
        />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border rule bg-[var(--line)] lg:grid-cols-5">
          {Object.entries({
            Decisions: data.stats.decisions,
            Reviewed: data.stats.reviewed,
            Accepted: data.stats.accepted,
            Changes: data.stats.changes,
            "X posts": data.stats.posts,
          }).map(([label, value]) => (
            <div
              key={label}
              className="bg-[var(--paper)] p-6 last:col-span-2 lg:last:col-span-1"
            >
              <p className="display text-5xl md:text-6xl">{value}</p>
              <p className="eyebrow mt-4 text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
