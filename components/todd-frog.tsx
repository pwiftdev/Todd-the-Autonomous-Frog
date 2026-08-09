import clsx from "clsx";
import { ToddVoxel, type ToddActivity } from "@/components/todd-voxel";

export function ToddFrog({
  mood = "suspicious",
  accessory = "crown",
  compact = false,
  activity = "thinking",
}: {
  mood?: string;
  accessory?: string;
  compact?: boolean;
  priority?: boolean;
  activity?: ToddActivity;
}) {
  return (
    <div
      className={clsx(
        "relative mx-auto aspect-square w-full max-w-[650px]",
        !compact && "animate-float",
      )}
    >
      <div className="absolute inset-[12%] rounded-full bg-[var(--lime)]/10 blur-3xl" />
      <ToddVoxel
        mood={mood}
        accessory={accessory}
        activity={activity}
        compact={compact}
      />
      <div className="glass-dark pointer-events-none absolute bottom-[7%] right-[3%] rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#eff5d9]">
        {activity} · {mood}
      </div>
    </div>
  );
}
