import { PageFrame } from "@/components/page-frame";
import { ToddFrog } from "@/components/todd-frog";
import { getToddData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const data = await getToddData();
  return (
    <PageFrame
      eyebrow={
        data.provenance.synthetic ? "Synthetic demo profile" : "Creature dossier"
      }
      title="Todd"
      intro={
        data.provenance.synthetic
          ? `${data.provenance.label}. The traits and totals below are illustrative, not observed live history.`
          : "Persistent personality. Selective memory. Firm opinions about typography. All numbers are public because Todd believes mystery works best with evidence."
      }
    >
      <section className="shell grid gap-8 py-16 lg:grid-cols-[.8fr_1.2fr] lg:py-24">
        <div className="swamp-glow swamp-grid relative min-h-[580px] overflow-hidden rounded-[2rem] text-[#eff5d9]">
          <ToddFrog
            mood={data.config.frogMood}
            accessory={data.config.frogAccessory}
          />
          <div className="glass-dark absolute inset-x-6 bottom-6 flex justify-between rounded-full px-5 py-3">
            <span className="eyebrow">Mood</span>
            <span className="eyebrow">{data.config.frogMood}</span>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card interactive-card p-5">
              <p className="eyebrow text-[var(--muted)]">Runtime</p>
              <p className="display mt-4 text-4xl uppercase">
                {data.provenance.synthetic ? "Demo fixture" : "Live"}
              </p>
            </div>
            <div className="card interactive-card p-5">
              <p className="eyebrow text-[var(--muted)]">History</p>
              <p className="display mt-4 text-4xl uppercase">
                {data.provenance.synthetic ? "Illustrative" : "Persisted"}
              </p>
            </div>
          </div>
          <div className="card p-7 shadow-[0_20px_60px_rgba(10,30,18,.07)]">
            <p className="eyebrow mb-6">Personality matrix</p>
            {Object.entries(data.personality).map(([trait, score]) => (
              <div
                key={trait}
                className="grid grid-cols-[130px_1fr_38px] items-center gap-4 border-t rule py-4"
              >
                <span className="eyebrow capitalize">{trait}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--ink)]"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="eyebrow text-right">{score}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <p className="eyebrow text-[var(--muted)]">
                {data.provenance.synthetic ? "Illustrative favorite" : "Favorite thing"}
              </p>
              <p className="display mt-6 text-4xl uppercase">Pond</p>
            </div>
            <div className="card p-6">
              <p className="eyebrow text-[var(--muted)]">
                {data.provenance.synthetic
                  ? "Illustrative least favorite"
                  : "Least favorite thing"}
              </p>
              <p className="display mt-6 text-3xl uppercase">
                Being told what to do
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries({
              Decisions: data.stats.decisions,
              Reviewed: data.stats.reviewed,
              Changes: data.stats.changes,
              Posts: data.stats.posts,
            }).map(([label, value]) => (
              <div key={label} className="card interactive-card p-5">
                <p className="display text-4xl">{value}</p>
                <p className="eyebrow mt-3 text-[var(--muted)]">
                  {data.provenance.synthetic ? `Demo ${label}` : label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
