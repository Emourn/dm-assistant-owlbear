import { ClipboardCheck } from 'lucide-react';
import type { Phase1ReadinessCheck } from '../domain/phase1Readiness';

interface Phase1ReadinessPanelProps {
    checks: Phase1ReadinessCheck[];
}

export function Phase1ReadinessPanel({
    checks,
}: Phase1ReadinessPanelProps) {
    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex items-center gap-2 text-emerald-300">
                <ClipboardCheck size={16} />
                <span className="text-[11px] font-black uppercase tracking-[0.22em]">Phase 1 acceptance</span>
            </div>
            <div className="mt-2 text-lg font-semibold text-parchment">Room-level readiness snapshot</div>
            <div className="mt-1 text-sm text-stone-400">
                This is the final Phase 1 pass: confirm the room can exercise the foundation instead of just compiling it.
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {checks.map((check) => (
                    <div
                        key={check.id}
                        className={`rounded-2xl border p-4 ${
                            check.ready
                                ? 'border-emerald-400/20 bg-emerald-500/10'
                                : 'border-stone-800 bg-stone-900/60'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-parchment">{check.label}</div>
                            <div className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                check.ready
                                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                                    : 'border-stone-700 bg-stone-950 text-stone-400'
                            }`}>
                                {check.ready ? 'Ready' : 'Pending'}
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-stone-300">{check.detail}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}
