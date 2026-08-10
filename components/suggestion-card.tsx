import { ArrowUp, MessageSquareText } from "lucide-react";
import { supportSuggestion } from "@/app/actions";
import { StatusPill } from "@/components/ui";
import type { PublicSuggestion } from "@/lib/types";

function responseLabel(suggestion: PublicSuggestion) {
  if (suggestion.status === "CONSIDERING") return "Todd is considering this";
  if (suggestion.status === "PENDING" && suggestion.decision)
    return "Todd postponed — still open";
  if (suggestion.decision?.decision === "REJECT") return "Todd rejected this";
  if (suggestion.decision?.decision === "ACCEPT") return "Todd accepted this";
  if (suggestion.decision?.decision === "MODIFY") return "Todd modified this";
  if (suggestion.decision?.decision === "POSTPONE")
    return "Todd postponed — still open";
  return "Todd responded";
}

export function SuggestionCard({
  suggestion,
  index,
  compact = false,
}: {
  suggestion: PublicSuggestion;
  index?: number;
  compact?: boolean;
}) {
  const support = supportSuggestion.bind(null, suggestion.id);
  const showDecision =
    Boolean(suggestion.decision) || suggestion.status === "CONSIDERING";

  return (
    <article
      className={`card interactive-card group relative flex flex-col overflow-hidden ${
        compact ? "min-h-0 p-4" : "min-h-[290px] p-5 md:p-6"
      } ${
        suggestion.status === "CONSIDERING"
          ? "ring-2 ring-[var(--ink)]"
          : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--lime)] transition-transform duration-300 group-hover:scale-x-100" />
      <div
        className={`flex items-start justify-between gap-3 ${compact ? "mb-3" : "mb-8"}`}
      >
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
      <blockquote
        className={`font-bold leading-[1.2] ${
          compact ? "mb-3 text-base md:text-lg" : "mb-6 text-xl md:text-2xl"
        }`}
      >
        “{suggestion.text}”
      </blockquote>
      {showDecision && (
        <div
          className={`rounded-xl bg-[var(--ink)] text-[var(--paper)] ${
            compact ? "mb-3 p-3" : "mb-6 p-4"
          }`}
        >
          <p className="eyebrow flex items-center gap-2 text-[var(--lime)]">
            <MessageSquareText size={13} />
            {responseLabel(suggestion)}
          </p>
          {suggestion.decision ? (
            <p className="mt-2 text-sm leading-5">
              {suggestion.decision.reasoningPublic}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-5 text-[#9eafa0]">
              chewing on it in the pond. hang tight.
            </p>
          )}
        </div>
      )}
      <div
        className={`mt-auto flex items-center justify-between border-t rule ${
          compact ? "pt-3" : "pt-4"
        }`}
      >
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
