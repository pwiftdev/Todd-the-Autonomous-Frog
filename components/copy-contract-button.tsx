"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { TODD_CONTRACT_ADDRESS } from "@/lib/todd-coin";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function CopyContractButton({
  className = "",
}: {
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(TODD_CONTRACT_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyAddress}
      className={`inline-flex items-center gap-3 rounded-full border border-white/20 bg-black/25 px-4 py-2.5 text-left transition-colors hover:border-[var(--lime)]/50 hover:bg-black/40 ${className}`}
      aria-label="Copy $TODD contract address"
    >
      <span className="grid gap-0.5">
        <span className="eyebrow text-[var(--lime)]">$TODD · ca</span>
        <span className="font-mono text-xs tracking-tight text-[#d7e4d4] sm:text-sm">
          <span className="sm:hidden">{shorten(TODD_CONTRACT_ADDRESS)}</span>
          <span className="hidden sm:inline">{TODD_CONTRACT_ADDRESS}</span>
        </span>
      </span>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-[var(--lime)]">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </button>
  );
}
