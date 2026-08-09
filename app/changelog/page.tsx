import { ArrowDown } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";
const value = (input: unknown) =>
  typeof input === "string"
    ? input.replaceAll("_", " ")
    : JSON.stringify(input);

export default async function ChangelogPage() {
  const { changes } = await getToddData();
  return (
    <PageFrame
      eyebrow="Immutable-ish evidence"
      title="Todd changed something"
      intro="Every autonomous website action leaves a visible trail: the pressure, Todd’s reasoning, the old state, and what replaced it."
    >
      <section className="shell py-16 lg:py-24">
        <div className="grid gap-5">
          {changes.map((change, index) => (
            <article
              key={change.id}
              className="card interactive-card overflow-hidden bg-[var(--surface)]"
            >
              <div className="grid border-b rule md:grid-cols-[190px_1fr]">
                <div className="border-b rule bg-[var(--ink)] p-6 text-[var(--paper)] md:border-b-0 md:border-r">
                  <p className="eyebrow">
                    Change {String(changes.length - index).padStart(3, "0")}
                  </p>
                  <time className="display mt-4 block text-3xl uppercase text-[var(--lime)]">
                    {change.createdAt.toLocaleString("en", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <div className="p-6 md:p-8">
                  <p className="eyebrow text-[var(--muted)]">
                    {change.actionType.replaceAll("_", " ")}
                  </p>
                  <h2 className="mt-4 text-2xl font-bold">
                    Todd updated the swamp.
                  </h2>
                  <p className="mt-3 text-lg">“{change.reasoning}”</p>
                </div>
              </div>
              <div className="grid gap-5 p-6 md:grid-cols-[1fr_40px_1fr_180px] md:items-center md:p-8">
                <div>
                  <p className="eyebrow text-[var(--muted)]">From</p>
                  <p className="mt-2 font-bold capitalize">
                    {value(change.previousValue)}
                  </p>
                </div>
                <ArrowDown className="md:-rotate-90" />
                <div>
                  <p className="eyebrow text-[var(--muted)]">To</p>
                  <p className="mt-2 font-bold capitalize">
                    {value(change.newValue)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow text-[var(--muted)]">Suggested by</p>
                  <p className="mt-2 font-bold">@{change.sourceName}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
