import { ArrowUp, MessageSquareText } from "lucide-react";
import { supportSuggestion } from "@/app/actions";
import { StatusPill } from "@/components/ui";
import type { PublicSuggestion } from "@/lib/types";

export function SuggestionCard({
  suggestion,
  index,
}: {
  suggestion: PublicSuggestion;
  index?: number;
}) {
  const support = supportSuggestion.bind(null, suggestion.id);
  return (
    <article className="card interactive-card group relative flex min-h-[290px] flex-col overflow-hidden p-5 md:p-6">
      <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--lime)] transition-transform duration-300 group-hover:scale-x-100" />
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="display text-2xl text-[var(--line)]">
            {String((index ?? 0) + 1).padStart(2, "0")}
          </span>
          <span className="eyebrow text-[var(--muted)]">
            {suggestion.category.replace("SOCIAL", "X / SOCIAL")}
          </span>
        </div>
        <StatusPill status={suggestion.status} />
      </div>
      <blockquote className="mb-6 text-xl font-bold leading-[1.2] md:text-2xl">
        “{suggestion.text}”
      </blockquote>
      {suggestion.decision && (
        <div className="mb-6 rounded-xl bg-[var(--ink)] p-4 text-[var(--paper)]">
          <p className="eyebrow flex items-center gap-2 text-[var(--lime)]">
            <MessageSquareText size={13} />
            Todd responded
          </p>
          <p className="mt-2 text-sm leading-5">
            {suggestion.decision.reasoningPublic}
          </p>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between border-t rule pt-4">
        <span className="eyebrow">
          @{suggestion.displayName.replace(/^@/, "")}
        </span>
        <form action={support}>
          <button
            className="eyebrow flex items-center gap-2 rounded-full border rule px-3 py-2 transition-colors hover:bg-[var(--lime)] hover:text-[#14231b]"
            aria-label="Support suggestion"
          >
            <ArrowUp size={14} strokeWidth={3} />
            {suggestion.supportCount.toLocaleString()}
          </button>
        </form>
      </div>
    </article>
  );
}
