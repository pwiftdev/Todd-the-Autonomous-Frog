import { Brain, Circle } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ThoughtsPage() {
  const { thoughts, provenance } = await getToddData();
  return (
    <PageFrame
      eyebrow={provenance.synthetic ? "Synthetic demo cognition" : "Live cognition"}
      title="Todd’s thoughts"
      intro="A public stream generated around decisions, observations, changes and moments Todd considers worth interrupting the internet for."
    >
      <section className="shell py-16 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 flex items-center justify-between rounded-full border rule bg-[var(--surface)] px-5 py-3 shadow-sm">
            <span className="eyebrow flex items-center gap-2">
              <Circle size={9} fill="var(--lime)" />
              {provenance.synthetic ? provenance.label : "Brain online"}
            </span>
            <Brain size={18} />
          </div>
          <div className="relative space-y-4 before:absolute before:bottom-0 before:left-[22px] before:top-0 before:w-px before:bg-[var(--line)]">
            {thoughts.map((thought, index) => (
              <article
                key={thought.id}
                className="relative grid grid-cols-[46px_1fr] gap-5"
              >
                <span className="relative z-10 mt-7 h-3 w-3 justify-self-center rounded-full border-2 border-[var(--paper)] bg-[var(--lime)] ring-1 ring-[var(--ink)]" />
                <div
                  className={`interactive-card rounded-[1.5rem] border p-6 md:p-8 ${index === 0 ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "rule bg-[var(--surface)]"}`}
                >
                  <div className="eyebrow flex justify-between text-[var(--muted)]">
                    <span>{thought.eventType.replaceAll("_", " ")}</span>
                    <time>
                      {thought.createdAt.toLocaleString("en", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="mt-10 text-2xl font-bold leading-tight md:text-4xl">
                    “{thought.content}”
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
