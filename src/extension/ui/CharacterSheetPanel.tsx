import { useEffect, useState } from 'react';
import type { Player } from '@owlbear-rodeo/sdk';
import { BookOpenText, HeartPulse, Shield, Sparkles, Swords, WandSparkles } from 'lucide-react';
import {
    buildActionOutcomeSummaries,
    buildActionRoll,
    buildActionSaveDcSummary,
    canRollAction,
    canUseActionSaveDc,
    getActionUseState,
} from '../../features/dnd2024/domain/actionAutomation';
import { rollActionOutcome } from '../../features/dnd2024/domain/rolls';
import {
    createCharacterSheetViewModel,
    formatSignedNumber,
    getAbilityModifier,
} from '../../features/dnd2024/domain/sheet';
import type {
    ActionOutcomeRollResult,
    Phase1CharacterSheet,
    RollableSheetRow,
    StructuredRollRequest,
    StructuredRollResult,
} from '../../features/dnd2024/domain/types';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';
import { getSelectedLinkedCharacters } from '../domain/selectionBatch';
import type { RoomRollPromptDraft } from '../domain/roomRolls';
import { ActionSpellEditorPanel } from './ActionSpellEditorPanel';
import { CharacterCollectionPanel } from './CharacterCollectionPanel';
import { CharacterEditorPanel } from './CharacterEditorPanel';
import { OverridePanel } from './OverridePanel';
import { PlayerAssignmentPanel } from './PlayerAssignmentPanel';
import { ResourceRuntimePanel } from './ResourceRuntimePanel';
import { TokenLinkPanel } from './TokenLinkPanel';

interface CharacterSheetPanelProps {
    characterState: CharacterRepositorySnapshot | null;
    role: 'GM' | 'PLAYER' | null;
    players: Player[];
    canEdit: boolean;
    canManageRuntime: boolean;
    defaultLinkVisibility: 'room' | 'assigned-only' | 'gm-only';
    isSaving: boolean;
    isUpdatingRuntime: boolean;
    isLinking: boolean;
    assigningPlayerId: string | null;
    lastRoll: StructuredRollResult | null;
    onRoll: (request: StructuredRollRequest) => void;
    onSelectCharacter: (characterId: string) => void;
    onCreateCharacter: () => Promise<void>;
    onDuplicateCharacter: (characterId: string) => Promise<void>;
    onDeleteCharacter: (characterId: string) => Promise<void>;
    onImportCharacters: (payload: string, mode: 'append' | 'replace') => Promise<number>;
    onSave: (sheet: Phase1CharacterSheet) => Promise<void>;
    onAdjustResource: (resourceId: string, delta: number) => Promise<void>;
    onAdjustDeathSave: (kind: 'successes' | 'failures', delta: number) => Promise<void>;
    onApplyRest: (kind: 'short' | 'long') => Promise<void>;
    onRemoveCondition: (label: string) => Promise<void>;
    onSpendActionResource: (actionId: string) => Promise<void>;
    onApplyOutcomeToSelection: (actionId: string, outcomeIndex: number) => Promise<ActionOutcomeRollResult | null>;
    onSaveOverrides: (next: { proficiencyBonusOverride: number | null; initiativeAdjustment: number }) => Promise<void>;
    onOpenPrompt: (prompt: RoomRollPromptDraft) => Promise<void>;
    onLink: (sheet: Phase1CharacterSheet) => Promise<void>;
    onUnlink: () => Promise<void>;
    onAssign: (playerId: string, characterId: string | null) => Promise<void>;
}

function SummaryCard({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: string;
    detail?: string;
    icon: typeof Shield;
}) {
    return (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
                    <div className="mt-2 text-xl font-semibold text-parchment">{value}</div>
                    {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
                </div>
                <Icon size={18} className="text-amber-300" />
            </div>
        </div>
    );
}

function RollButton({
    row,
    onRoll,
}: {
    row: RollableSheetRow;
    onRoll: (request: StructuredRollRequest) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onRoll(row.request)}
            className="flex w-full items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/60 px-3 py-3 text-left transition hover:border-amber-400/40 hover:bg-stone-900/80"
        >
            <div>
                <div className="text-sm font-medium text-parchment">{row.label}</div>
                {row.subtitle && <div className="text-xs text-stone-500">{row.subtitle}</div>}
            </div>
            <div className="text-sm font-semibold text-amber-300">{formatSignedNumber(row.total)}</div>
        </button>
    );
}

function sourceLabel(source: CharacterRepositorySnapshot['source']): string {
    if (source === 'demo-seed') {
        return 'Demo seed';
    }
    if (source === 'room-metadata') {
        return 'Room metadata';
    }
    return 'No sheet';
}

export function CharacterSheetPanel({
    characterState,
    role,
    players,
    canEdit,
    canManageRuntime,
    defaultLinkVisibility,
    isSaving,
    isUpdatingRuntime,
    isLinking,
    assigningPlayerId,
    lastRoll,
    onRoll,
    onSelectCharacter,
    onCreateCharacter,
    onDuplicateCharacter,
    onDeleteCharacter,
    onImportCharacters,
    onSave,
    onAdjustResource,
    onAdjustDeathSave,
    onApplyRest,
    onRemoveCondition,
    onSpendActionResource,
    onApplyOutcomeToSelection,
    onSaveOverrides,
    onOpenPrompt,
    onLink,
    onUnlink,
    onAssign,
}: CharacterSheetPanelProps) {
    const active = characterState?.activeCharacter;
    const [lastOutcomeRoll, setLastOutcomeRoll] = useState<ActionOutcomeRollResult | null>(null);

    useEffect(() => {
        setLastOutcomeRoll(null);
    }, [active?.sheet.id]);

    if (!active) {
        return (
            <div className="flex flex-col gap-4">
                <CharacterCollectionPanel
                    collection={characterState?.collection ?? null}
                    activeCharacterId={characterState?.collection.activeCharacterId ?? null}
                    canEdit={canEdit}
                    isSaving={isSaving}
                    onSelectCharacter={onSelectCharacter}
                    onCreateCharacter={onCreateCharacter}
                    onDuplicateCharacter={onDuplicateCharacter}
                    onDeleteCharacter={onDeleteCharacter}
                    onImportCharacters={onImportCharacters}
                />
                <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                    <div className="flex items-center gap-2 text-sky-300">
                        <BookOpenText size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.26em]">Character foundation</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-parchment">No shared character yet</h2>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">
                        This room has no active sheet right now. GMs can create a new record above; players only resolve sheets that exist in room metadata.
                    </p>
                </section>
            </div>
        );
    }

    const sheet = active.sheet;
    const model = createCharacterSheetViewModel(sheet);
    const selectedTargets = getSelectedLinkedCharacters(characterState?.selection.links ?? []);
    const showOutcomePreview = Boolean(
        lastOutcomeRoll && (!lastRoll || lastOutcomeRoll.metadata.timestamp >= lastRoll.metadata.timestamp),
    );

    return (
        <div className="flex flex-col gap-4">
            <CharacterCollectionPanel
                collection={characterState?.collection ?? null}
                activeCharacterId={characterState?.collection.activeCharacterId ?? null}
                canEdit={canEdit}
                isSaving={isSaving}
                onSelectCharacter={onSelectCharacter}
                onCreateCharacter={onCreateCharacter}
                onDuplicateCharacter={onDuplicateCharacter}
                onDeleteCharacter={onDeleteCharacter}
                onImportCharacters={onImportCharacters}
            />

            <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-sky-300">
                            <BookOpenText size={16} />
                            <span className="text-[11px] font-black uppercase tracking-[0.26em]">Character foundation</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-parchment">{sheet.name}</h2>
                        <p className="mt-1 text-sm text-stone-400">
                            {sheet.classSummary} - Level {sheet.level} - {sheet.ancestry}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                            {sourceLabel(characterState.source)}
                        </span>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <SummaryCard
                        label="Armor Class"
                        value={String(sheet.armorClass.value)}
                        detail={sheet.armorClass.source}
                        icon={Shield}
                    />
                    <SummaryCard
                        label="Hit Points"
                        value={`${sheet.hitPoints.current}/${sheet.hitPoints.max}`}
                        detail={sheet.hitPoints.temp > 0 ? `${sheet.hitPoints.temp} temp HP` : 'No temp HP'}
                        icon={HeartPulse}
                    />
                    <SummaryCard
                        label="Proficiency"
                        value={formatSignedNumber(model.proficiencyBonus)}
                        detail="2024 proficiency bonus"
                        icon={Sparkles}
                    />
                    <SummaryCard
                        label="Initiative"
                        value={formatSignedNumber(model.initiative.total)}
                        detail="Click below to roll"
                        icon={WandSparkles}
                    />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Abilities</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {model.abilities.map((ability) => (
                                    <button
                                        key={ability.id}
                                        type="button"
                                        onClick={() => onRoll(ability.request)}
                                        className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-left transition hover:border-amber-400/40 hover:bg-stone-900/80"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{ability.label}</div>
                                                <div className="mt-2 text-lg font-semibold text-parchment">{ability.score}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-amber-300">{formatSignedNumber(ability.modifier)}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Saving Throws</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {model.saves.map((row) => (
                                    <RollButton key={row.id} row={row} onRoll={onRoll} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Skills</div>
                            <div className="mt-3 grid max-h-[22rem] gap-3 overflow-auto pr-1 md:grid-cols-2">
                                {model.skills.map((row) => (
                                    <RollButton key={row.id} row={row} onRoll={onRoll} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Roll Preview</div>
                                    <div className="mt-2 text-lg font-semibold text-parchment">
                                        {lastRoll ? lastRoll.label : 'Click a stat to roll'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRoll(model.initiative.request)}
                                    className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60"
                                >
                                    Roll initiative
                                </button>
                            </div>

                            {!showOutcomePreview && lastRoll ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{lastRoll.formula}</div>
                                            <div className="mt-2 text-3xl font-bold text-parchment">{lastRoll.total}</div>
                                        </div>
                                        <div className="text-right text-sm text-stone-400">
                                            <div>Kept d20: {lastRoll.kept}</div>
                                            <div>{lastRoll.scope}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {lastRoll.breakdown.map((part) => (
                                            <div key={part.label} className="flex items-center justify-between text-sm text-stone-300">
                                                <span>{part.label}</span>
                                                <span className="text-amber-300">{formatSignedNumber(part.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
                                        {lastRoll.audit.map((note) => (
                                            <div key={note}>{note}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : lastOutcomeRoll ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{lastOutcomeRoll.formula}</div>
                                            <div className="mt-2 text-3xl font-bold text-parchment">{lastOutcomeRoll.total}</div>
                                        </div>
                                        <div className="text-right text-sm text-stone-400">
                                            <div>{lastOutcomeRoll.kind}</div>
                                            {lastOutcomeRoll.damageType && <div>{lastOutcomeRoll.damageType}</div>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {lastOutcomeRoll.parts.map((part) => (
                                            <div key={`${part.label}:${part.value}`} className="flex items-center justify-between text-sm text-stone-300">
                                                <span>{part.kind === 'dice' && part.rolls ? `${part.label} [${part.rolls.join(', ')}]` : part.label}</span>
                                                <span className="text-amber-300">{formatSignedNumber(part.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
                                        {lastOutcomeRoll.summary && <div>{lastOutcomeRoll.summary}</div>}
                                        {lastOutcomeRoll.audit.map((note) => (
                                            <div key={note}>{note}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-stone-400">
                                    This slice focuses on auditable d20 rolls plus modeled action outcomes from the same compact runtime sheet.
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="flex items-center gap-2 text-amber-300">
                                <Swords size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.22em]">Actions</span>
                            </div>
                            {role === 'GM' && (
                                <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-300">
                                    {selectedTargets.length > 0
                                        ? `Linked targets: ${selectedTargets.map((target) => target.characterName).join(', ')}.`
                                        : 'Select linked Owlbear tokens to apply modeled damage, healing, or conditions from action outcomes.'}
                                </div>
                            )}
                            <div className="mt-3 space-y-3">
                                {sheet.actions.map((action) => {
                                    const saveSummary = canUseActionSaveDc(sheet, action)
                                        ? buildActionSaveDcSummary(sheet, action)
                                        : null;
                                    const useState = getActionUseState(sheet, action);
                                    const outcomeSummaries = buildActionOutcomeSummaries(sheet, action);

                                    return (
                                        <div key={action.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-medium text-parchment">{action.name}</div>
                                                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{action.kind}</div>
                                            </div>
                                            {(action.source || action.description) && (
                                                <div className="mt-2 text-sm text-stone-400">
                                                    {[action.source, action.description].filter(Boolean).join(' - ')}
                                                </div>
                                            )}
                                            {(canRollAction(sheet, action) || saveSummary || useState.resource || outcomeSummaries.length > 0) && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {canRollAction(sheet, action) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const request = buildActionRoll(sheet, action);
                                                                if (request) {
                                                                    onRoll(request);
                                                                    setLastOutcomeRoll(null);
                                                                }
                                                            }}
                                                            className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60"
                                                        >
                                                            Roll attack
                                                        </button>
                                                    )}
                                                    {saveSummary && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => void onOpenPrompt({
                                                                    kind: 'saving-throw',
                                                                    ability: saveSummary.saveAbility,
                                                                    label: `${action.name} - ${saveSummary.dc} ${saveSummary.saveAbility.toUpperCase()} save`,
                                                                    details: [
                                                                        `Save DC ${saveSummary.dc}.`,
                                                                        ...(saveSummary.effectSummary ? [saveSummary.effectSummary] : []),
                                                                        ...(saveSummary.successSummary ? [`On success: ${saveSummary.successSummary}`] : []),
                                                                        ...(saveSummary.failureSummary ? [`On failure: ${saveSummary.failureSummary}`] : []),
                                                                    ],
                                                                })}
                                                                className="rounded-full border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:border-violet-300/60"
                                                            >
                                                                Prompt DC {saveSummary.dc} save
                                                            </button>
                                                            <div className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300">
                                                                {saveSummary.saveAbility.toUpperCase()} save / DC {saveSummary.dc}
                                                            </div>
                                                        </>
                                                    )}
                                                    {useState.resource && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void onSpendActionResource(action.id)}
                                                            disabled={!canManageRuntime || isUpdatingRuntime || !useState.canSpend}
                                                            className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Spend {useState.amount} {useState.resource.name} ({useState.resource.current}/{useState.resource.max})
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {saveSummary && (
                                                <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/60 p-3 text-sm text-stone-300">
                                                    {saveSummary.effectSummary && <div>{saveSummary.effectSummary}</div>}
                                                    {saveSummary.successSummary && <div className="mt-1 text-stone-400">On success: {saveSummary.successSummary}</div>}
                                                    {saveSummary.failureSummary && <div className="mt-1 text-stone-400">On failure: {saveSummary.failureSummary}</div>}
                                                </div>
                                            )}
                                            {outcomeSummaries.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {outcomeSummaries.map((outcome) => (
                                                        <div key={outcome.id} className="rounded-2xl border border-stone-800 bg-stone-950/60 p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="text-sm font-medium text-parchment">{outcome.label}</div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <div className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                                                                        {outcome.kind}
                                                                    </div>
                                                                    {outcome.damageType && (
                                                                        <div className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                                                                            {outcome.damageType}
                                                                        </div>
                                                                    )}
                                                                    {outcome.request && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const request = outcome.request;
                                                                                if (!request) {
                                                                                    return;
                                                                                }
                                                                                const result = rollActionOutcome(request);
                                                                                if (result) {
                                                                                    setLastOutcomeRoll(result);
                                                                                }
                                                                            }}
                                                                            className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60"
                                                                        >
                                                                            Roll {outcome.kind}
                                                                        </button>
                                                                    )}
                                                                    {role === 'GM' && selectedTargets.length > 0 && (outcome.application.hitPoints || outcome.application.conditionLabel) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                void onApplyOutcomeToSelection(action.id, outcome.index).then((result) => {
                                                                                    if (result) {
                                                                                        setLastOutcomeRoll(result);
                                                                                    }
                                                                                });
                                                                            }}
                                                                            disabled={isUpdatingRuntime}
                                                                            className="rounded-full border border-rose-400/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            {outcome.application.hitPoints
                                                                                ? 'Roll and apply to targets'
                                                                                : outcome.application.conditionMode === 'remove'
                                                                                    ? 'Clear on targets'
                                                                                    : 'Apply to targets'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 space-y-1 text-sm text-stone-300">
                                                                {outcome.formula && <div>{outcome.formula}</div>}
                                                                {outcome.summary && <div className="text-stone-400">{outcome.summary}</div>}
                                                                {outcome.application.hitPoints && (
                                                                    <div className="text-stone-500">Applies {outcome.application.hitPoints} to linked selected targets.</div>
                                                                )}
                                                                {outcome.application.conditionLabel && (
                                                                    <div className="text-stone-500">
                                                                        {outcome.application.conditionMode === 'remove' ? 'Clears' : 'Applies'} {outcome.application.conditionLabel} on linked selected targets.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Resources</div>
                            <div className="mt-3 space-y-2">
                                {sheet.resources.map((resource) => (
                                    <div key={resource.id} className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm">
                                        <div>
                                            <div className="text-parchment">{resource.name}</div>
                                            <div className="text-xs text-stone-500">
                                                {resource.detail ? `${resource.detail} - ` : ''}
                                                Resets on {resource.resetOn} rest
                                            </div>
                                        </div>
                                        <div className="font-semibold text-amber-300">{resource.current}/{resource.max}</div>
                                    </div>
                                ))}
                                {sheet.spellcasting && (
                                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
                                        <div className="font-medium text-parchment">Spellcasting</div>
                                        <div className="mt-1">Attack bonus {formatSignedNumber(sheet.spellcasting.attackBonus)}</div>
                                        <div>Save DC {sheet.spellcasting.saveDc}</div>
                                    </div>
                                )}
                                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
                                    <div className="font-medium text-parchment">Conditions</div>
                                    {sheet.conditions.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {sheet.conditions.map((condition) => (
                                                <div key={condition.id} className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5">
                                                    <span>{condition.label}</span>
                                                    {role === 'GM' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void onRemoveCondition(condition.label)}
                                                            disabled={isUpdatingRuntime}
                                                            className="text-[11px] text-rose-200 transition hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-stone-500">No active conditions.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Audit Notes</div>
                            <div className="mt-3 space-y-2 text-sm text-stone-400">
                                <div>AC: {sheet.armorClass.audit[0] ?? sheet.armorClass.source}</div>
                                <div>Dexterity modifier: {formatSignedNumber(getAbilityModifier(sheet.abilities.dex))}</div>
                                {sheet.notes.map((note) => (
                                    <div key={note}>{note}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <TokenLinkPanel
                sheet={sheet}
                role={role}
                characterState={characterState}
                defaultLinkVisibility={defaultLinkVisibility}
                isLinking={isLinking}
                onLink={onLink}
                onUnlink={onUnlink}
            />

            <PlayerAssignmentPanel
                role={role}
                players={players}
                sheet={sheet}
                characterState={characterState}
                assigningPlayerId={assigningPlayerId}
                onAssign={onAssign}
            />

            <ResourceRuntimePanel
                sheet={sheet}
                canManage={canManageRuntime}
                isUpdating={isUpdatingRuntime}
                onAdjustResource={onAdjustResource}
                onAdjustDeathSave={onAdjustDeathSave}
                onApplyRest={onApplyRest}
            />

            <OverridePanel
                sheet={sheet}
                canEdit={canEdit}
                isSaving={isUpdatingRuntime}
                onSave={onSaveOverrides}
            />

            <CharacterEditorPanel
                sheet={sheet}
                canEdit={canEdit}
                isSaving={isSaving}
                onSave={onSave}
            />

            <ActionSpellEditorPanel
                sheet={sheet}
                canEdit={canEdit}
                isSaving={isSaving}
                onSave={onSave}
            />
        </div>
    );
}
