import { Flag, SkipBack, SkipForward, Swords, Trash2 } from 'lucide-react';
import {
    getActiveEncounterParticipant,
    type StoredEncounterState,
} from '../domain/encounterTracker';

interface EncounterPanelProps {
    role: 'GM' | 'PLAYER' | null;
    state: StoredEncounterState;
    isUpdating: boolean;
    onBuild: () => Promise<void>;
    onAdvance: () => Promise<void>;
    onRetreat: () => Promise<void>;
    onSetActive: (participantId: string) => Promise<void>;
    onClear: () => Promise<void>;
}

export function EncounterPanel({
    role,
    state,
    isUpdating,
    onBuild,
    onAdvance,
    onRetreat,
    onSetActive,
    onClear,
}: EncounterPanelProps) {
    if (role !== 'GM') {
        return null;
    }

    const active = getActiveEncounterParticipant(state);

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-red-300">
                        <Swords size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.22em]">Encounter</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Initiative order and active turn</div>
                    <div className="mt-1 text-sm text-stone-400">
                        Build a compact turn order from room initiative results and run it from the Owlbear popover.
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void onBuild()}
                        disabled={isUpdating}
                        className="rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Build from feed
                    </button>
                    <button
                        type="button"
                        onClick={() => void onClear()}
                        disabled={isUpdating || state.participants.length === 0}
                        className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Trash2 size={12} />
                            Clear
                        </span>
                    </button>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Active turn</div>
                        <div className="mt-2 text-xl font-semibold text-parchment">{active?.label ?? 'No encounter running'}</div>
                        <div className="mt-1 text-sm text-stone-400">
                            {state.participants.length > 0 ? `Round ${state.round} / Initiative ${active?.initiative ?? '-'}` : 'Build from the room initiative feed first.'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void onRetreat()}
                            disabled={isUpdating || state.participants.length === 0}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <SkipBack size={12} />
                                Previous
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => void onAdvance()}
                            disabled={isUpdating || state.participants.length === 0}
                            className="rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <SkipForward size={12} />
                                Next turn
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {state.participants.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-700 p-4 text-sm text-stone-500">
                        No encounter order yet.
                    </div>
                )}
                {state.participants.map((participant, index) => {
                    const isActive = participant.id === active?.id;
                    return (
                        <button
                            key={participant.id}
                            type="button"
                            onClick={() => void onSetActive(participant.id)}
                            disabled={isUpdating}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                isActive
                                    ? 'border-red-400/35 bg-red-500/10'
                                    : 'border-stone-800 bg-stone-900/60 hover:border-stone-600'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                    isActive
                                        ? 'border-red-400/35 bg-red-500/15 text-red-200'
                                        : 'border-stone-700 bg-stone-950 text-stone-400'
                                }`}>
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-parchment">{participant.label}</div>
                                    <div className="text-xs text-stone-500">Initiative {participant.initiative}</div>
                                </div>
                            </div>
                            {isActive && (
                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-200">
                                    <Flag size={12} />
                                    Active
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
