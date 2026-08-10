"use client";

import { useActionState, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { submitSuggestion, type ActionState } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };
const categories = [
  "Website",
  "Personality",
  "Social",
  "Appearance",
  "Feature",
  "Other",
];

export function SuggestionForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(
    submitSuggestion,
    initialState,
  );
  const [length, setLength] = useState(0);
  return (
    <form action={action} className="grid gap-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="eyebrow" htmlFor="suggestion">
            The idea
          </label>
          <span className="eyebrow text-[var(--muted)]">{length} / 500</span>
        </div>
        <textarea
          id="suggestion"
          name="text"
          rows={compact ? 4 : 6}
          className="input resize-none text-lg leading-7"
          placeholder="Todd should add rain to the pond..."
          required
          minLength={5}
          maxLength={500}
          onChange={(event) => setLength(event.target.value.length)}
        />
      </div>
      <fieldset>
        <legend className="eyebrow mb-3">Where does it belong?</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <label key={category} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="category"
                value={category.toUpperCase()}
                defaultChecked={index === 0}
              />
              <span className="eyebrow inline-flex rounded-full border rule px-3 py-2 transition-colors peer-checked:border-[var(--ink)] peer-checked:bg-[var(--ink)] peer-checked:text-[var(--paper)]">
                {category}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="eyebrow mb-3 block" htmlFor="display-name">
          Who is applying pressure?
        </label>
        <input
          id="display-name"
          className="input"
          name="displayName"
          placeholder="Display name — optional"
          maxLength={40}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t rule pt-5">
        <p className="max-w-[250px] text-xs leading-5 text-[var(--muted)]">
          Support makes ideas louder. It never makes them law.
        </p>
        <button className="button button-primary" disabled={pending}>
          {pending ? "Entering the pond..." : "Submit pressure"}
          <ArrowUpRight size={16} />
        </button>
      </div>
      {state.message && (
        <p role="status" className="eyebrow rounded-xl bg-[var(--lime)]/20 p-3">
          {state.message}
        </p>
      )}
    </form>
  );
}
