import { useState } from 'react';
import { RadioTower, ScrollText, Send, Siren } from 'lucide-react';
import { ABILITY_DEFINITIONS, SKILL_DEFINITIONS } from '../../features/dnd2024/domain/constants';
import type { StructuredRollResult } from '../../features/dnd2024/domain/types';
import { formatSignedNumber } from '../../features/dnd2024/domain/sheet';
import { describeRoomRollPrompt, type RoomRollPromptDraft, type StoredRoomRollState } from '../domain/roomRolls';

interface RoomRollPanelProps {
    role: 'GM' | 'PLAYER' | null;
    lastRoll: StructuredRollResult | null;
    roomRollState: StoredRoomRollState;
    defaultRollVisibility: 'room' | 'assigned-only' | 'gm-only';
    defaultPromptAudience: 'room' | 'assigned-only';
    isPublishing: boolean;
    isManagingPrompt: boolean;
    canPublishLastRoll: boolean;
    canRespondToPrompt: boolean;
    onPublishLastRoll: () => Promise<void>;
    onOpenPrompt: (prompt: RoomRollPromptDraft) => Promise<void>;
    onClearPrompt: () => Promise<void>;
    onRespondToPrompt: () => Promise<void>;
}

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function RoomRollPanel({
    role,
    lastRoll,
    roomRollState,
    defaultRollVisibility,
    defaultPromptAudience,
    isPublishing,
    isManagingPrompt,
    canPublishLastRoll,
    canRespondToPrompt,
    onPublishLastRoll,
    onOpenPrompt,
    onClearPrompt,
    onRespondToPrompt,
}: RoomRollPanelProps) {
    const [promptMode, setPromptMode] = useState<RoomRollPromptDraft['kind']>('initiative');
    const activePrompt = roomRollState.activePrompt;

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-sky-300">
                        <RadioTower size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.22em]">Room rolls</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Publish structured rolls to the table</div>
                    <div className="mt-1 text-sm text-stone-400">
                        A compact room feed for prompted and manually published results. This slice stays Owlbear-native and metadata-first.
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                        Manual publication default: {defaultRollVisibility}. Prompt audience default: {defaultPromptAudience}.
                    </div>
                </div>
            </div>

            {role === 'GM' && (
                <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Quick prompts</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {[
                            { kind: 'initiative' as const, label: 'Initiative' },
                            { kind: 'ability' as const, label: 'Ability' },
                            { kind: 'saving-throw' as const, label: 'Save' },
                            { kind: 'skill' as const, label: 'Skill' },
                        ].map((option) => (
                            <button
                                key={option.kind}
                                type="button"
                                onClick={() => setPromptMode(option.kind)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                    promptMode === option.kind
                                        ? 'border-sky-400/35 bg-sky-500/10 text-sky-200'
                                        : 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {promptMode === 'initiative' && (
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => void onOpenPrompt({ kind: 'initiative' })}
                                disabled={isManagingPrompt}
                                className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isManagingPrompt ? 'Updating...' : 'Prompt initiative'}
                            </button>
                        </div>
                    )}

                    {(promptMode === 'ability' || promptMode === 'saving-throw') && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {ABILITY_DEFINITIONS.map((ability) => (
                                <button
                                    key={`${promptMode}:${ability.id}`}
                                    type="button"
                                    onClick={() =>
                                        void onOpenPrompt(
                                            promptMode === 'ability'
                                                ? { kind: 'ability', ability: ability.id }
                                                : { kind: 'saving-throw', ability: ability.id },
                                        )
                                    }
                                    disabled={isManagingPrompt}
                                    className="rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-left text-sm text-stone-200 transition hover:border-sky-400/40 hover:bg-stone-950/80 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {promptMode === 'ability' ? `${ability.name} Check` : `${ability.name} Save`}
                                </button>
                            ))}
                        </div>
                    )}

                    {promptMode === 'skill' && (
                        <div className="mt-3 grid max-h-52 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                            {SKILL_DEFINITIONS.map((skill) => (
                                <button
                                    key={`skill:${skill.id}`}
                                    type="button"
                                    onClick={() => void onOpenPrompt({ kind: 'skill', skillId: skill.id })}
                                    disabled={isManagingPrompt}
                                    className="rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2 text-left text-sm text-stone-200 transition hover:border-sky-400/40 hover:bg-stone-950/80 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {skill.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activePrompt && (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-amber-300">
                                <Siren size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.22em]">Active prompt</span>
                            </div>
                            <div className="mt-2 text-base font-semibold text-parchment">{activePrompt.label}</div>
                            <div className="mt-1 text-sm text-stone-300">
                                Prompted by {activePrompt.createdByName} at {formatTime(activePrompt.createdAt)}.
                            </div>
                            <div className="mt-1 text-xs text-stone-500">Audience: {activePrompt.audience}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {canRespondToPrompt && (
                                <button
                                    type="button"
                                    onClick={() => void onRespondToPrompt()}
                                    disabled={isPublishing}
                                    className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isPublishing ? 'Rolling...' : `Roll ${describeRoomRollPrompt(activePrompt).replace(/^Prompt /, '')}`}
                                </button>
                            )}
                            {role === 'GM' && (
                                <button
                                    type="button"
                                    onClick={() => void onClearPrompt()}
                                    disabled={isManagingPrompt}
                                    className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Clear prompt
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {lastRoll && (
                <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-300">
                                <Send size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.22em]">Ready to publish</span>
                            </div>
                            <div className="mt-2 text-base font-semibold text-parchment">{lastRoll.label}</div>
                            <div className="mt-1 text-sm text-stone-300">
                                Total {lastRoll.total} from {lastRoll.formula}.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => void onPublishLastRoll()}
                            disabled={isPublishing || !canPublishLastRoll}
                            className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish to room'}
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <div className="flex items-center gap-2 text-stone-300">
                    <ScrollText size={16} />
                    <span className="text-[11px] font-black uppercase tracking-[0.22em]">Recent feed</span>
                </div>
                <div className="mt-3 space-y-3">
                    {roomRollState.feed.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-stone-700 p-4 text-sm text-stone-500">
                            No room-visible rolls yet.
                        </div>
                    )}
                    {roomRollState.feed.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-parchment">{entry.result.label}</div>
                                    <div className="mt-1 text-xs text-stone-500">
                                        {entry.actor.characterName ?? entry.actor.playerName} / {entry.actor.playerName} / {formatTime(entry.publishedAt)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-amber-300">{entry.result.total}</div>
                                    <div className="text-xs text-stone-500">{entry.result.scope}</div>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-400">
                                <span>{entry.result.formula}</span>
                                <span>Kept d20 {entry.result.kept}</span>
                                <span>{formatSignedNumber(entry.result.totalModifier)} mods</span>
                                <span>{entry.source === 'prompt' ? 'Prompted' : 'Manual'}</span>
                                <span>{entry.visibility}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
