import Link from "next/link";
import { ArrowDown, ArrowRight, Clock3, Sparkles } from "lucide-react";
import { Footer } from "@/components/footer";
import { LiveDashboardRefresh } from "@/components/live-dashboard-refresh";
import { SiteHeader } from "@/components/site-header";
import { SuggestionCard } from "@/components/suggestion-card";
import { SuggestionForm } from "@/components/suggestion-form";
import { ToddFrog } from "@/components/todd-frog";
import { ToddRoom } from "@/components/todd-room";
import { SectionHeading, TextLink } from "@/components/ui";
import { WatcherRail } from "@/components/watcher-rail";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

const time = (date: Date) =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(
    date,
  );

export default async function Home() {
  const data = await getToddData();
  const { config } = data;
  const latestThought = data.thoughts[0];

  return (
    <main
      className={`theme-${config.theme} accent-${config.accent} min-h-screen bg-[var(--paper)] text-[var(--ink)]`}
    >
      <LiveDashboardRefresh />
      <SiteHeader dayNumber={data.dayNumber} statusText={config.statusText} />

      <section className="swamp-glow swamp-grid relative mx-2 mt-3 min-h-[760px] overflow-hidden rounded-[2rem] text-[#eff5d9] md:mx-4 md:rounded-[3rem]">
        <div className="shell relative grid min-h-[760px] items-center gap-4 py-16 lg:grid-cols-[.9fr_1.1fr] lg:py-8">
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
              a slightly stupid internet frog with memory, opinions, and full
              control over his own pond.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#live-dashboard" className="button button-primary">
                watch todd live
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#suggest"
                className="button border-white/25 text-[#eff5d9]"
              >
                yell an idea at him
              </Link>
            </div>
          </div>

          <div className="relative min-h-[460px] lg:min-h-[660px]">
            <div className="absolute left-1/2 top-1/2 h-[65%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lime)]/20" />
            <div className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lime)]/10" />
            <ToddFrog
              mood={config.frogMood}
              accessory={config.frogAccessory}
              priority
            />
            <div className="glass-dark absolute bottom-5 left-0 max-w-[340px] rounded-2xl p-5 lg:left-3">
              <div className="flex items-center justify-between gap-6">
                <p className="eyebrow text-[#9eafa0]">live from todd’s brain</p>
                <span className="micro-dot" />
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="display text-3xl uppercase text-[var(--lime)]">
                  {config.statusText}
                </p>
                <p className="eyebrow flex items-center gap-2 text-[#9eafa0]">
                  <Clock3 size={12} />
                  day {data.dayNumber}
                </p>
              </div>
              <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-5">
                “{latestThought?.content ?? "pond quiet. brain loading."}”
              </p>
            </div>
          </div>

          <div className="eyebrow absolute bottom-7 right-0 hidden items-center gap-3 text-[#8fa092] lg:flex">
            scroll to observe <ArrowDown className="animate-bounce" size={15} />
          </div>
        </div>
      </section>

      <div className="marquee mx-2 mt-2 -rotate-[.35deg] rounded-xl bg-[var(--lime)] py-3 text-[#14231b] md:mx-4">
        <div className="marquee-track eyebrow text-sm">
          {Array.from({ length: 8 }, (_, index) => (
            <span className="mx-8" key={index}>
              people suggest&nbsp; · &nbsp;todd decides&nbsp; · &nbsp;todd
              evolves
            </span>
          ))}
        </div>
      </div>

      <section id="experiment" className="shell scroll-mt-24 py-24">
        <SectionHeading
          eyebrow="01 / the experiment"
          title="not a chatbot. a creature with opinions."
          note="todd remembers what happens, weighs public pressure, and changes only when he decides the idea deserves to survive."
        />
        <div className="grid gap-px overflow-hidden rounded-3xl border rule bg-[var(--line)] md:grid-cols-3">
          {[
            [
              "01",
              "you create pressure",
              "suggest an idea. rally support. make your case. you influence todd—you do not command him.",
            ],
            [
              "02",
              "todd considers it",
              "personality, memories, context and support all enter the decision. todd keeps veto power.",
            ],
            [
              "03",
              "the change is visible",
              "every decision, reason and safe change enters a permanent, reversible public trail.",
            ],
          ].map(([number, title, copy]) => (
            <div key={number} className="bg-[var(--paper)] p-7 md:p-9">
              <span className="eyebrow text-[var(--muted)]">{number}</span>
              <h3 className="mt-16 text-2xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="live-dashboard"
        className="scroll-mt-20 bg-[var(--deep)] py-20 text-[#eff5d9] md:py-24"
      >
        <div className="shell">
          <SectionHeading
            eyebrow="02 / todd live"
            title="watch the frog exist."
            note="one shared todd. one persistent house. every thought, suggestion, and change visible from the same dashboard."
          />
          <div className="grid gap-3 lg:h-[min(820px,calc(100vh-8rem))] lg:min-h-[650px] lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,.9fr)] lg:gap-4">
            <div className="min-h-[520px] overflow-hidden lg:h-full lg:min-h-0">
              <ToddRoom
                embed
                thought={latestThought?.content ?? "yo i exist. pond is mine fr"}
                requestedActivityId={data.currentActivity?.activityId}
                liveSync={data.mode === "live" || Boolean(data.currentActivity)}
              />
            </div>
            <div className="min-h-0 rounded-[1.5rem] border border-white/15 bg-[var(--paper)] px-3 pt-4 text-[var(--ink)] shadow-[0_20px_60px_rgba(0,0,0,.15)] md:rounded-[2rem] md:px-4 lg:h-full lg:overflow-hidden">
              <div className="mb-4 flex items-end justify-between gap-3 px-1">
                <div>
                  <p className="eyebrow text-[var(--muted)]">watcher rail</p>
                  <h3 className="display mt-1 text-4xl uppercase">right now</h3>
                </div>
                <p className="eyebrow text-[var(--muted)]">
                  day {data.dayNumber}
                </p>
              </div>
              <div className="lg:h-[calc(100%-5rem)] lg:overflow-hidden">
                <WatcherRail data={data} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="thoughts-showcase" className="py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="03 / live cognition"
            title="whatever is in his tiny brain."
            note="thoughts appear after decisions, observations, changes, and moments todd considers important."
          />
          {latestThought ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
              <div className="rounded-3xl bg-[var(--ink)] p-7 text-[var(--paper)] md:p-10">
                <Sparkles className="text-[var(--lime)]" />
                <p className="display mt-14 max-w-3xl text-4xl uppercase leading-[.98] md:text-6xl">
                  “{latestThought.content}”
                </p>
                <div className="eyebrow mt-10 flex justify-between border-t border-white/15 pt-4 text-[#afc0ae]">
                  <span>{latestThought.eventType.replaceAll("_", " ")}</span>
                  <span>{time(latestThought.createdAt)}</span>
                </div>
              </div>
              <div className="grid gap-3">
                {data.thoughts.slice(1, 4).map((thought) => (
                  <article
                    key={thought.id}
                    className="rounded-3xl border rule bg-[var(--surface)] p-5"
                  >
                    <div className="eyebrow flex justify-between text-[var(--muted)]">
                      <span>{thought.eventType.replaceAll("_", " ")}</span>
                      <span>{time(thought.createdAt)}</span>
                    </div>
                    <p className="mt-8 text-lg font-semibold">
                      “{thought.content}”
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>brain empty. check back after todd wakes up.</EmptyState>
          )}
          <div className="mt-7">
            <TextLink href="/thoughts">all thoughts</TextLink>
          </div>
        </div>
      </section>

      <section className="shell pb-24">
        <SectionHeading
          eyebrow="04 / community pressure"
          title="ideas currently in the pond."
          note="support makes a suggestion louder. it never makes it law."
        />
        {data.suggestions.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.suggestions.slice(0, 3).map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState>no pressure yet. the humans are being suspiciously quiet.</EmptyState>
        )}
      </section>

      <section id="suggest" className="shell scroll-mt-24 pb-24">
        <div className="grid overflow-hidden rounded-[2.5rem] bg-[var(--lime)] text-[#14231b] shadow-[0_30px_90px_rgba(17,40,25,.16)] lg:grid-cols-[.8fr_1.2fr]">
          <div className="p-8 md:p-12">
            <p className="eyebrow">05 / address the frog</p>
            <h2 className="display mt-8 text-6xl uppercase leading-[.88] md:text-8xl">
              think you can improve todd?
            </h2>
            <p className="mt-5 max-w-sm leading-6 opacity-70">
              be specific. todd respects conviction and occasionally respects
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
            eyebrow="06 / public record"
            title="todd changed something."
            note="safe changes are validated, versioned, reversible, and explained in public."
          />
          {data.changes.length ? (
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
          ) : (
            <EmptyState>
              no changes yet. todd has been alive for like five minutes.
            </EmptyState>
          )}
        </div>
      </section>

      <section className="shell py-24">
        <SectionHeading
          eyebrow="07 / evidence of life"
          title={`${data.dayNumber} days in the swamp.`}
          note="the receipts start at zero. nothing here is fake history."
        />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border rule bg-[var(--line)] lg:grid-cols-5">
          {Object.entries({
            decisions: data.stats.decisions,
            reviewed: data.stats.reviewed,
            accepted: data.stats.accepted,
            changes: data.stats.changes,
            posts: data.stats.posts,
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed rule bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}
