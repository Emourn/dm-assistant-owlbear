import { useMemo, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import type { RuntimeAuditCategory, StoredRuntimeAuditState } from '../domain/runtimeAudit';

interface RuntimeAuditPanelProps {
    role: 'GM' | 'PLAYER' | null;
    state: StoredRuntimeAuditState;
    isClearing: boolean;
    onClear: () => Promise<void>;
}

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

const FILTERS: Array<{ value: RuntimeAuditCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'encounter', label: 'Encounter' },
    { value: 'resource', label: 'Resources' },
    { value: 'rest', label: 'Rests' },
    { value: 'death-save', label: 'Death saves' },
    { value: 'override', label: 'Overrides' },
    { value: 'roll', label: 'Rolls' },
    { value: 'prompt', label: 'Prompts' },
    { value: 'hit-points', label: 'HP' },
    { value: 'condition', label: 'Conditions' },
];

export function RuntimeAuditPanel({
    role,
    state,
    isClearing,
    onClear,
}: RuntimeAuditPanelProps) {
    const [filter, setFilter] = useState<RuntimeAuditCategory | 'all'>('all');

    const visibleEntries = useMemo(
        () => state.entries.filter((entry) => filter === 'all' || entry.category === filter),
        [filter, state.entries],
    );

    if (role !== 'GM') {
        return null;
    }

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-violet-300">
                        <History size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.22em]">Runtime audit</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Recent metadata-driven actions</div>
                    <div className="mt-1 text-sm text-stone-400">
                        Inspect what the extension changed during live play: counters, prompts, encounter turns, HP updates, conditions, and roll publication.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void onClear()}
                    disabled={isClearing}
                    className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <RotateCcw size={12} />
                        {isClearing ? 'Clearing...' : 'Clear history'}
                    </span>
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {FILTERS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setFilter(option.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            filter === option.value
                                ? 'border-violet-400/35 bg-violet-500/10 text-violet-200'
                                : 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                {visibleEntries.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-950/50 p-4 text-sm text-stone-500">
                        No matching audit entries yet.
                    </div>
                )}
                {visibleEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-parchment">{entry.action}</div>
                                <div className="mt-1 text-xs text-stone-500">
                                    {entry.actor.characterName ?? 'No character'} / {entry.actor.playerName} / {formatTime(entry.recordedAt)}
                                </div>
                            </div>
                            <div className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-400">
                                {entry.category}
                            </div>
                        </div>
                        {entry.details.length > 0 && (
                            <div className="mt-3 space-y-1 text-sm text-stone-300">
                                {entry.details.map((detail) => (
                                    <div key={detail}>{detail}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
