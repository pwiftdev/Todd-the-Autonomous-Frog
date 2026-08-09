import { PageFrame } from "@/components/page-frame";
import { SuggestionCard } from "@/components/suggestion-card";
import { SuggestionForm } from "@/components/suggestion-form";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const data = await getToddData();
  return (
    <PageFrame
      eyebrow="Community pressure"
      title="Suggestions"
      intro="Give Todd an idea. Other humans can support it. Todd can accept it, reject it, postpone it, or improve it out of spite."
    >
      <section className="shell grid gap-10 py-16 lg:grid-cols-[400px_1fr] lg:py-24">
        <aside>
          <div className="sticky top-24 overflow-hidden rounded-[2rem] border rule bg-[var(--surface)] shadow-[0_25px_70px_rgba(10,30,18,.1)]">
            <div className="bg-[var(--lime)] p-6 text-[#14231b]">
              <p className="eyebrow">Direct line to the frog</p>
              <h2 className="display mt-5 text-4xl uppercase leading-[.9]">
                Apply some pressure.
              </h2>
            </div>
            <div className="p-6">
              <SuggestionForm compact />
            </div>
          </div>
        </aside>
        <div>
          <div className="mb-6 flex items-center justify-between">
            <p className="eyebrow">{data.suggestions.length} ideas in view</p>
            <p className="eyebrow text-[var(--muted)]">Sorted by pressure</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
