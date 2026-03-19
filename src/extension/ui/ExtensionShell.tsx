import type { Player } from '@owlbear-rodeo/sdk';
import { Crosshair, Layers3, MapPinned, ScrollText, Shield, Users } from 'lucide-react';
import type { Phase1CharacterSheet, StructuredRollRequest, StructuredRollResult } from '../../features/dnd2024/domain/types';
import type { StoredRoomRollState } from '../domain/roomRolls';
import { CURRENT_SLICE, NEXT_SLICES } from '../domain/phases';
import {
    canManageSheetRuntime,
    canPublishManualRoll,
    canRespondToPrompt,
    canViewPrompt,
    canViewPublishedRoll,
    type StoredVisibilitySettings,
} from '../domain/visibilitySettings';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';
import type { OwlbearRuntimeSnapshot } from '../owlbear/runtime';
import { CharacterSheetPanel } from './CharacterSheetPanel';
import { RoomRollPanel } from './RoomRollPanel';
import { VisibilityPolicyPanel } from './VisibilityPolicyPanel';

interface ExtensionShellProps {
    runtime: OwlbearRuntimeSnapshot | null;
    characterState: CharacterRepositorySnapshot | null;
    roomRollState: StoredRoomRollState | null;
    visibilitySettings: StoredVisibilitySettings;
    lastRoll: StructuredRollResult | null;
    assigningPlayerId: string | null;
    isSavingCharacter: boolean;
    isUpdatingRuntime: boolean;
    isLinkingCharacter: boolean;
    isPublishingRoll: boolean;
    isManagingPrompt: boolean;
    isSavingVisibility: boolean;
    onRoll: (request: StructuredRollRequest) => void;
    onPublishLastRoll: () => Promise<void>;
    onSelectCharacter: (characterId: string) => void;
    onCreateCharacter: () => Promise<void>;
    onDuplicateCharacter: (characterId: string) => Promise<void>;
    onDeleteCharacter: (characterId: string) => Promise<void>;
    onSaveCharacter: (sheet: Phase1CharacterSheet) => Promise<void>;
    onAdjustResource: (resourceId: string, delta: number) => Promise<void>;
    onAdjustDeathSave: (kind: 'successes' | 'failures', delta: number) => Promise<void>;
    onApplyRest: (kind: 'short' | 'long') => Promise<void>;
    onSpendActionResource: (actionId: string) => Promise<void>;
    onSaveOverrides: (next: { proficiencyBonusOverride: number | null; initiativeAdjustment: number }) => Promise<void>;
    onLinkCharacter: (sheet: Phase1CharacterSheet) => Promise<void>;
    onUnlinkCharacter: () => Promise<void>;
    onAssignCharacter: (playerId: string, characterId: string | null) => Promise<void>;
    onPromptInitiative: () => Promise<void>;
    onClearPrompt: () => Promise<void>;
    onRespondToPrompt: () => Promise<void>;
    onSaveVisibilitySettings: (settings: StoredVisibilitySettings) => Promise<void>;
    loadState: 'loading' | 'ready' | 'error';
    error: string | null;
    surface: 'popover' | 'panel';
}

function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Users;
}) {
    return (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
                    <div className="mt-2 text-lg font-semibold text-parchment">{value}</div>
                </div>
                <Icon size={18} className="text-amber-300" />
            </div>
        </div>
    );
}

export function ExtensionShell({
    runtime,
    characterState,
    roomRollState,
    visibilitySettings,
    lastRoll,
    assigningPlayerId,
    isSavingCharacter,
    isUpdatingRuntime,
    isLinkingCharacter,
    isPublishingRoll,
    isManagingPrompt,
    isSavingVisibility,
    onRoll,
    onPublishLastRoll,
    onSelectCharacter,
    onCreateCharacter,
    onDuplicateCharacter,
    onDeleteCharacter,
    onSaveCharacter,
    onAdjustResource,
    onAdjustDeathSave,
    onApplyRest,
    onSpendActionResource,
    onSaveOverrides,
    onLinkCharacter,
    onUnlinkCharacter,
    onAssignCharacter,
    onPromptInitiative,
    onClearPrompt,
    onRespondToPrompt,
    onSaveVisibilitySettings,
    loadState,
    error,
    surface,
}: ExtensionShellProps) {
    if (loadState === 'loading') {
        return (
            <div className="min-h-screen bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(17,24,39,0.98))] p-4 text-stone-100">
                <div className="rounded-[1.5rem] border border-stone-800 bg-stone-950/80 p-6">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300">Connecting</div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-parchment">Loading new extension shell</h1>
                    <p className="mt-3 text-sm leading-relaxed text-stone-400">
                        Reading your Owlbear role, room, and current selection so the rebuild starts map-first and selection-first.
                    </p>
                </div>
            </div>
        );
    }

    if (loadState === 'error' || !runtime) {
        return (
            <div className="min-h-screen bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(17,24,39,0.98))] p-4 text-stone-100">
                <div className="rounded-[1.5rem] border border-red-500/20 bg-stone-950/80 p-6">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">Connection issue</div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-parchment">The new D&D Assistant shell could not load</h1>
                    <p className="mt-3 text-sm leading-relaxed text-stone-400">{error || 'Unknown Owlbear startup error.'}</p>
                </div>
            </div>
        );
    }

    const playerCount = runtime.players.filter((player) => player.role === 'PLAYER').length;
    const selectionValue = runtime.selection.count === 0
        ? 'No token selected'
        : runtime.selection.count === 1
            ? runtime.selection.names[0]
            : `${runtime.selection.count} tokens selected`;
    const activeCharacterId = characterState?.activeCharacter?.sheet.id ?? null;
    const selectedLinkVisibility = characterState?.resolution.source === 'selected-token'
        ? characterState.selection.links.find((link) => link.characterId === activeCharacterId)?.visibility ?? null
        : null;
    const canManageRuntime = canManageSheetRuntime(
        runtime.role,
        characterState?.assignedCharacterId ?? null,
        activeCharacterId,
    );
    const canPublishLastRoll = canPublishManualRoll({
        role: runtime.role,
        assignedCharacterId: characterState?.assignedCharacterId ?? null,
        activeCharacterId,
        resolutionSource: characterState?.resolution.source ?? 'none',
        selectedLinkVisibility,
        settings: visibilitySettings,
    });
    const visiblePrompt = roomRollState?.activePrompt && canViewPrompt({
        role: runtime.role,
        assignedCharacterId: characterState?.assignedCharacterId ?? null,
        activeCharacterId,
        audience: roomRollState.activePrompt.audience,
    })
        ? roomRollState.activePrompt
        : null;
    const visibleFeed = (roomRollState?.feed ?? []).filter((entry) =>
        canViewPublishedRoll(runtime.role, runtime.playerId ?? null, characterState?.assignedCharacterId ?? null, entry),
    );
    const canRespondVisiblePrompt = visiblePrompt
        ? canRespondToPrompt({
            role: runtime.role,
            assignedCharacterId: characterState?.assignedCharacterId ?? null,
            activeCharacterId,
            audience: visiblePrompt.audience,
        })
        : false;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.10),_transparent_24%),linear-gradient(180deg,rgba(12,10,9,0.99),rgba(17,24,39,0.96))] p-4 text-stone-100">
            <div className={`mx-auto flex flex-col gap-4 ${surface === 'panel' ? 'max-w-5xl' : 'max-w-3xl'}`}>
                <section className="rounded-[1.6rem] border border-stone-800 bg-stone-950/78 p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                            Rebuild
                        </span>
                        <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-stone-300">
                            {runtime.role}
                        </span>
                        <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-stone-300">
                            {surface}
                        </span>
                    </div>

                    <h1 className="mt-4 text-4xl font-bold tracking-tight text-parchment">D&amp;D Assistant</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">
                        This is the fresh Owlbear-native extension foundation. The old DM Assistant Owlbear shell is no longer the active code path.
                    </p>
                </section>

                <section className="grid gap-3 md:grid-cols-4">
                    <StatCard label="Room" value={runtime.roomName} icon={MapPinned} />
                    <StatCard label="Player" value={runtime.playerName} icon={Shield} />
                    <StatCard label="Players" value={String(playerCount)} icon={Users} />
                    <StatCard label="Selection" value={selectionValue} icon={Crosshair} />
                </section>

                <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                    <div className="flex items-center gap-2 text-amber-300">
                        <ScrollText size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.26em]">Current slice</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-parchment">{CURRENT_SLICE.milestone}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{CURRENT_SLICE.scope}</p>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Acceptance criteria</div>
                            <div className="mt-3 space-y-2">
                                {CURRENT_SLICE.acceptanceCriteria.map((criterion) => (
                                    <div key={criterion} className="text-sm text-stone-200">{criterion}</div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-400">Not in this slice</div>
                            <div className="mt-3 space-y-2">
                                {CURRENT_SLICE.nonGoals.map((goal) => (
                                    <div key={goal} className="text-sm text-stone-400">{goal}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <CharacterSheetPanel
                    characterState={characterState}
                    role={runtime.role}
                    players={runtime.players as Player[]}
                    canEdit={runtime.role === 'GM'}
                    canManageRuntime={canManageRuntime}
                    isSaving={isSavingCharacter}
                    isUpdatingRuntime={isUpdatingRuntime}
                    isLinking={isLinkingCharacter}
                    assigningPlayerId={assigningPlayerId}
                    defaultLinkVisibility={visibilitySettings.defaultTokenLinkVisibility}
                    lastRoll={lastRoll}
                    onRoll={onRoll}
                    onSelectCharacter={onSelectCharacter}
                    onCreateCharacter={onCreateCharacter}
                    onDuplicateCharacter={onDuplicateCharacter}
                    onDeleteCharacter={onDeleteCharacter}
                    onSave={onSaveCharacter}
                    onAdjustResource={onAdjustResource}
                    onAdjustDeathSave={onAdjustDeathSave}
                    onApplyRest={onApplyRest}
                    onSpendActionResource={onSpendActionResource}
                    onSaveOverrides={onSaveOverrides}
                    onLink={onLinkCharacter}
                    onUnlink={onUnlinkCharacter}
                    onAssign={onAssignCharacter}
                />

                <RoomRollPanel
                    role={runtime.role}
                    lastRoll={lastRoll}
                    roomRollState={{
                        version: roomRollState?.version ?? 1,
                        feed: visibleFeed,
                        activePrompt: visiblePrompt,
                    }}
                    defaultRollVisibility={visibilitySettings.defaultRollVisibility}
                    isPublishing={isPublishingRoll}
                    isManagingPrompt={isManagingPrompt}
                    canPublishLastRoll={canPublishLastRoll}
                    canRespondToPrompt={canRespondVisiblePrompt}
                    onPublishLastRoll={onPublishLastRoll}
                    onPromptInitiative={onPromptInitiative}
                    onClearPrompt={onClearPrompt}
                    onRespondToPrompt={onRespondToPrompt}
                />

                <VisibilityPolicyPanel
                    role={runtime.role}
                    settings={visibilitySettings}
                    isSaving={isSavingVisibility}
                    onSave={onSaveVisibilitySettings}
                />

                <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                        <div className="flex items-center gap-2 text-sky-300">
                            <Layers3 size={16} />
                            <span className="text-[11px] font-black uppercase tracking-[0.26em]">Architecture</span>
                        </div>
                        <div className="mt-4 space-y-3 text-sm leading-relaxed">
                            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                                <div className="font-semibold text-parchment">Domain layer</div>
                                <div className="mt-1 text-stone-400">Pure 2024 sheet model, derived stats, rolls, resources, and audit trails.</div>
                            </div>
                            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                                <div className="font-semibold text-parchment">Owlbear adapter layer</div>
                                <div className="mt-1 text-stone-400">Metadata namespace, token linkage, player assignment, prompts, and room sync.</div>
                            </div>
                            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                                <div className="font-semibold text-parchment">UI layer</div>
                                <div className="mt-1 text-stone-400">Compact popover, focused panels, and player-safe sheet views built for Owlbear surfaces.</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                        <div className="text-[11px] font-black uppercase tracking-[0.26em] text-gold">Next slices</div>
                        <div className="mt-4 space-y-3">
                            {NEXT_SLICES.map((slice) => (
                                <div key={slice} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
                                    {slice}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {runtime.selection.names.length > 0 && (
                    <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                        <div className="text-[11px] font-black uppercase tracking-[0.26em] text-stone-400">Current selection</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {runtime.selection.names.map((name) => (
                                <span key={name} className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-200">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
