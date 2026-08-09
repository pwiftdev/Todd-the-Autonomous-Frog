import {
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  adminLogin,
  rollbackConfig,
  toggleAutonomy,
  triggerDecision,
  triggerSocial,
} from "@/app/actions";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authorized = await isAdmin();
  const params = await searchParams;
  if (!authorized)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--deep)] p-6 text-[#eff5d9]">
        <form
          action={adminLogin}
          className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/5 p-7"
        >
          <LockKeyhole className="text-[var(--lime)]" />
          <p className="eyebrow mt-8 text-[#afc0ae]">Restricted pond</p>
          <h1 className="display mt-3 text-5xl uppercase">Todd’s controls</h1>
          <input
            className="mt-8 w-full rounded-xl border border-white/20 bg-black/20 p-3 outline-none"
            type="password"
            name="secret"
            placeholder="Admin secret"
            required
          />
          {params.error && (
            <p className="mt-3 text-sm text-red-300">
              The pond rejected that secret.
            </p>
          )}
          <button className="button button-primary mt-4 w-full">Enter</button>
        </form>
      </main>
    );

  const [state, memories, suggestions, runs, failures, config] =
    await Promise.all([
      prisma.toddState.findUniqueOrThrow({ where: { id: "todd" } }),
      prisma.memory.findMany({ take: 12, orderBy: { createdAt: "desc" } }),
      prisma.suggestion.findMany({
        where: { status: { in: ["PENDING", "CONSIDERING"] } },
        take: 12,
        orderBy: { createdAt: "desc" },
      }),
      prisma.aiRun.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.findMany({
        where: { success: false },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.siteConfig.findFirstOrThrow({ where: { isActive: true } }),
    ]);
  const controls = [
    {
      label: state.autonomyPaused ? "Resume autonomy" : "Pause autonomy",
      action: toggleAutonomy,
      icon: state.autonomyPaused ? Play : Pause,
    },
    { label: "Run decision cycle", action: triggerDecision, icon: Sparkles },
    { label: "Run social cycle", action: triggerSocial, icon: Send },
    { label: "Rollback config", action: rollbackConfig, icon: RotateCcw },
  ];
  return (
    <main className="min-h-screen bg-[#e8e9df] p-5 text-[#172019] md:p-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-black/15 pb-6">
        <div>
          <p className="eyebrow text-[#687069]">Private operations</p>
          <h1 className="display mt-1 text-5xl uppercase">Pond control</h1>
        </div>
        <Link href="/" className="button">
          Public site
        </Link>
      </header>
      <div className="mx-auto mt-6 grid max-w-7xl gap-5 lg:grid-cols-4">
        {controls.map(({ label, action, icon: Icon }) => (
          <form action={action} key={label}>
            <button className="card flex w-full items-center justify-between bg-white p-5 text-left transition-transform hover:-translate-y-1">
              <span className="eyebrow">{label}</span>
              <Icon size={18} />
            </button>
          </form>
        ))}
      </div>
      <div className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-2">
        <AdminPanel title="Current state">
          <pre>
            {JSON.stringify(
              {
                autonomyPaused: state.autonomyPaused,
                currentStatus: state.currentStatus,
                activeConfigVersion: config.version,
                provider: process.env.AI_PROVIDER ?? "mock",
                socialProvider: process.env.SOCIAL_PROVIDER ?? "mock",
              },
              null,
              2,
            )}
          </pre>
        </AdminPanel>
        <AdminPanel title={`Pending suggestions (${suggestions.length})`}>
          {suggestions.length ? (
            suggestions.map((item) => (
              <Row
                key={item.id}
                title={item.text}
                meta={`${item.category} · ${item.supportCount} support`}
              />
            ))
          ) : (
            <Empty>No pending suggestions.</Empty>
          )}
        </AdminPanel>
        <AdminPanel title="Persistent memory">
          {memories.map((item) => (
            <Row
              key={item.id}
              title={item.content}
              meta={`${item.type} · importance ${item.importance}`}
            />
          ))}
        </AdminPanel>
        <AdminPanel title="Recent AI requests / responses">
          {runs.length ? (
            runs.map((item) => (
              <details key={item.id} className="border-t border-black/10 py-3">
                <summary className="eyebrow cursor-pointer">
                  {item.operation} · {item.error ? "failed" : "complete"}
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto text-[11px]">
                  {JSON.stringify(
                    {
                      request: item.request,
                      response: item.response,
                      error: item.error,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))
          ) : (
            <Empty>No runs yet.</Empty>
          )}
        </AdminPanel>
        <AdminPanel title="Failed actions">
          {failures.length ? (
            failures.map((item) => (
              <Row
                key={item.id}
                title={item.event}
                meta={item.createdAt.toLocaleString()}
              />
            ))
          ) : (
            <Empty>No failed actions. Suspiciously competent.</Empty>
          )}
        </AdminPanel>
        <AdminPanel title="Scheduler">
          <p className="text-sm leading-6 text-[#687069]">
            The protected cron endpoint checks the pending queue every five
            minutes. All production AI and social credentials remain
            server-side.
          </p>
          <div className="mt-5 rounded-xl bg-[#172019] p-4 font-mono text-xs text-[#dce9d4]">
            POST /api/cron/decision
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

function AdminPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card bg-white p-6">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Row({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="border-t border-black/10 py-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="eyebrow mt-1 text-[#7a817b]">{meta}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-black/10 py-4 text-sm text-[#7a817b]">
      {children}
    </p>
  );
}
