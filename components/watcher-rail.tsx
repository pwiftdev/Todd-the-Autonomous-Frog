import { ArrowRight, Brain, Radio } from "lucide-react";
import Link from "next/link";
import { SuggestionCard } from "@/components/suggestion-card";
import { SuggestionForm } from "@/components/suggestion-form";
import type { ToddData } from "@/lib/types";

const time = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

function RailSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-black/10 pb-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[var(--muted)]">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function WatcherRail({ data }: { data: ToddData }) {
  const latest = data.thoughts[0];
  const olderThoughts = data.thoughts.slice(1, 4);
  const pendingish = data.suggestions.filter((s) =>
    ["PENDING", "CONSIDERING"].includes(s.status),
  );
  const shownSuggestions =
    pendingish.length > 0 ? pendingish.slice(0, 4) : data.suggestions.slice(0, 4);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-1 pb-8 lg:pr-1">
      <div className="rounded-2xl border border-[var(--ink)] bg-[var(--ink)] p-5 text-[var(--paper)]">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow flex items-center gap-2 text-[var(--lime)]">
            <Radio size={12} />
            live from todd
          </p>
          <span className="eyebrow text-[#9eafa0]">
            day {data.dayNumber} · {data.config.frogMood}
          </span>
        </div>
        <p className="display mt-4 text-3xl uppercase leading-[.9] text-[var(--lime)]">
          {data.config.statusText}
        </p>
        <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6">
          {latest ? `“${latest.content}”` : "pond is quiet. todd is thinking."}
        </p>
        <div className="eyebrow mt-4 flex flex-wrap gap-3 text-[#9eafa0]">
          <span>{data.stats.decisions} decisions</span>
          <span>{data.stats.changes} changes</span>
          <span>{data.config.frogAccessory}</span>
          {data.autonomyPaused ? <span>paused</span> : <span>autonomy on</span>}
        </div>
      </div>

      <RailSection id="thoughts" eyebrow="brain" title="thoughts">
        {data.thoughts.length === 0 ? (
          <p className="rounded-xl border rule bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            no thoughts yet. todd just woke up.
          </p>
        ) : (
          <div className="grid gap-3">
            <article className="rounded-xl border border-[var(--ink)] bg-[var(--ink)] p-4 text-[var(--paper)]">
              <div className="eyebrow flex items-center justify-between text-[#9eafa0]">
                <span className="flex items-center gap-2">
                  <Brain size={12} />
                  {latest?.eventType.replaceAll("_", " ")}
                </span>
                <time>{latest ? time(latest.createdAt) : ""}</time>
              </div>
              <p className="mt-3 text-base font-semibold leading-6">
                “{latest?.content}”
              </p>
            </article>
            {olderThoughts.map((thought) => (
              <article
                key={thought.id}
                className="rounded-xl border rule bg-[var(--surface)] p-4"
              >
                <div className="eyebrow flex justify-between text-[var(--muted)]">
                  <span>{thought.eventType.replaceAll("_", " ")}</span>
                  <time>{time(thought.createdAt)}</time>
                </div>
                <p className="mt-2 text-sm font-semibold leading-5">
                  “{thought.content}”
                </p>
              </article>
            ))}
          </div>
        )}
      </RailSection>

      <RailSection id="pressure" eyebrow="community" title="pressure">
        <div className="mb-4 overflow-hidden rounded-2xl border rule bg-[var(--surface)]">
          <div className="bg-[var(--lime)] px-4 py-3 text-[#14231b]">
            <p className="eyebrow">yell at the frog</p>
            <p className="mt-1 text-sm font-bold">
              suggest something. todd might care.
            </p>
          </div>
          <div className="p-4">
            <SuggestionForm compact />
          </div>
        </div>

        {shownSuggestions.length === 0 ? (
          <p className="rounded-xl border rule bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            no pressure yet. the pond is empty. be the first idea.
          </p>
        ) : (
          <div className="grid gap-3">
            {shownSuggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                compact
              />
            ))}
          </div>
        )}
      </RailSection>

      <RailSection id="record" eyebrow="public record" title="what todd changed">
        {data.changes.length === 0 ? (
          <p className="rounded-xl border rule bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            todd has not cooked anything yet. day 0 vibes.
          </p>
        ) : (
          <div className="divide-y rule overflow-hidden rounded-xl border rule bg-[var(--surface)]">
            {data.changes.slice(0, 5).map((change) => (
              <article key={change.id} className="grid gap-2 p-4">
                <p className="eyebrow text-[var(--muted)]">
                  {change.actionType.replaceAll("_", " ")}
                </p>
                <p className="text-sm font-bold leading-5">
                  {String(change.previousValue)}{" "}
                  <ArrowRight className="mx-1 inline" size={12} />{" "}
                  {String(change.newValue)}
                </p>
                <p className="text-sm leading-5 text-[var(--muted)]">
                  “{change.reasoning}”
                </p>
                <p className="eyebrow text-[var(--muted)]">
                  @{change.sourceName} · {time(change.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </RailSection>

      <RailSection id="creature" eyebrow="creature" title="personality">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.personality).map(([trait, score]) => (
            <div
              key={trait}
              className="rounded-xl border rule bg-[var(--surface)] p-3"
            >
              <p className="eyebrow text-[var(--muted)]">{trait}</p>
              <p className="display mt-2 text-2xl">{score}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[var(--lime)]"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/profile" className="eyebrow text-[var(--muted)] underline">
            full profile
          </Link>
          <Link
            href="/thoughts"
            className="eyebrow text-[var(--muted)] underline"
          >
            all thoughts
          </Link>
          <Link
            href="/suggestions"
            className="eyebrow text-[var(--muted)] underline"
          >
            all suggestions
          </Link>
          <Link
            href="/changelog"
            className="eyebrow text-[var(--muted)] underline"
          >
            changelog
          </Link>
        </div>
      </RailSection>
    </aside>
  );
}
