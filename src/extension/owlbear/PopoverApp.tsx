import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { getActionUseState, spendActionResource } from '../../features/dnd2024/domain/actionAutomation';
import {
    applyRestRecovery,
    setInitiativeAdjustment,
    setProficiencyBonusOverride,
    updateDeathSaves,
    updateSheetResourceCounter,
} from '../../features/dnd2024/domain/mutations';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import type {
    Phase1CharacterSheet,
    StructuredRollRequest,
    StructuredRollResult,
} from '../../features/dnd2024/domain/types';
import type { StoredRoomRollState } from '../domain/roomRolls';
import { buildPromptRollRequest, type RoomRollPromptDraft } from '../domain/roomRolls';
import type { StoredEncounterState } from '../domain/encounterTracker';
import type { StoredRuntimeAuditState } from '../domain/runtimeAudit';
import {
    canManageSheetRuntime,
    canPublishManualRoll,
    canRespondToPrompt,
    createDefaultVisibilitySettings,
    type StoredVisibilitySettings,
} from '../domain/visibilitySettings';
import { ExtensionShell } from '../ui/ExtensionShell';
import {
    clearRuntimeAuditHistory,
    readRuntimeAuditState,
    recordRuntimeAudit,
} from './auditRepository';
import {
    advanceEncounterState,
    buildEncounterFromRoomRollFeed,
    clearEncounterState,
    readEncounterState,
    retreatEncounterState,
    setEncounterActiveParticipant,
} from './encounterRepository';
import {
    assignCharacterToPlayer,
    createBlankCharacter,
    deleteCharacter,
    duplicateCharacter,
    importCharacterJson,
    linkActiveCharacterToSelection,
    readCharacterRepositorySnapshot,
    setActiveCharacterRecord,
    unlinkSelectionCharacters,
    updateCharacterSheet,
    updateCharacterSheetWith,
    type CharacterRepositorySnapshot,
} from './characterRepository';
import {
    clearRoomPrompt,
    openRoomPrompt,
    publishRoomRoll,
    readRoomRollState,
} from './rollRepository';
import { readRuntimeSnapshot, type OwlbearRuntimeSnapshot } from './runtime';
import { readVisibilitySettings, updateVisibilitySettings } from './visibilityRepository';

function getSelectedLinkVisibility(
    characterState: CharacterRepositorySnapshot | null,
): StoredVisibilitySettings['defaultTokenLinkVisibility'] | null {
    const activeId = characterState?.activeCharacter?.sheet.id;
    if (!activeId || characterState?.resolution.source !== 'selected-token') {
        return null;
    }

    return characterState.selection.links.find((link) => link.characterId === activeId)?.visibility ?? null;
}

export function PopoverApp({ surface = 'popover' }: { surface?: 'popover' | 'panel' }) {
    const [runtime, setRuntime] = useState<OwlbearRuntimeSnapshot | null>(null);
    const [characterState, setCharacterState] = useState<CharacterRepositorySnapshot | null>(null);
    const [roomRollState, setRoomRollState] = useState<StoredRoomRollState | null>(null);
    const [encounterState, setEncounterState] = useState<StoredEncounterState | null>(null);
    const [runtimeAuditState, setRuntimeAuditState] = useState<StoredRuntimeAuditState | null>(null);
    const [visibilitySettings, setVisibilitySettings] = useState<StoredVisibilitySettings>(createDefaultVisibilitySettings);
    const [lastRoll, setLastRoll] = useState<StructuredRollResult | null>(null);
    const [assigningPlayerId, setAssigningPlayerId] = useState<string | null>(null);
    const [isSavingCharacter, setIsSavingCharacter] = useState(false);
    const [isUpdatingRuntime, setIsUpdatingRuntime] = useState(false);
    const [isLinkingCharacter, setIsLinkingCharacter] = useState(false);
    const [isPublishingRoll, setIsPublishingRoll] = useState(false);
    const [isManagingPrompt, setIsManagingPrompt] = useState(false);
    const [isUpdatingEncounter, setIsUpdatingEncounter] = useState(false);
    const [isSavingVisibility, setIsSavingVisibility] = useState(false);
    const [isClearingAudit, setIsClearingAudit] = useState(false);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const snapshot = await readRuntimeSnapshot();
            const [nextCharacterState, nextRoomRollState, nextEncounterState, nextVisibilitySettings, nextRuntimeAuditState] = await Promise.all([
                readCharacterRepositorySnapshot(snapshot.role),
                readRoomRollState(),
                readEncounterState(),
                readVisibilitySettings(),
                readRuntimeAuditState(),
            ]);
            setRuntime(snapshot);
            setCharacterState(nextCharacterState);
            setRoomRollState(nextRoomRollState);
            setEncounterState(nextEncounterState);
            setVisibilitySettings(nextVisibilitySettings);
            setRuntimeAuditState(nextRuntimeAuditState);
            setLoadState('ready');
            setError(null);
        } catch (cause) {
            setLoadState('error');
            setError(cause instanceof Error ? cause.message : 'Unknown Owlbear startup error.');
        }
    }, []);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let cleanups: Array<() => void> = [];
        OBR.onReady(async () => {
            await refresh();
            const nextCleanups: Array<() => void> = [];

            try {
                nextCleanups.push(
                    OBR.player.onChange(() => {
                        void refresh();
                    }),
                );
            } catch {
                // Ignore listener registration failures during early rebuild slices.
            }

            try {
                nextCleanups.push(
                    OBR.party.onChange(() => {
                        void refresh();
                    }),
                );
            } catch {
                // Ignore listener registration failures during early rebuild slices.
            }

            try {
                nextCleanups.push(
                    OBR.room.onMetadataChange(() => {
                        void refresh();
                    }),
                );
            } catch {
                // Ignore listener registration failures during early rebuild slices.
            }

            cleanups = nextCleanups;
        });

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [refresh]);

    const handleRoll = useCallback((request: StructuredRollRequest) => {
        setLastRoll(rollStructuredD20(request));
    }, []);

    const handlePublishLastRoll = useCallback(async () => {
        if (!lastRoll) {
            return;
        }

        const activeCharacterId = characterState?.activeCharacter?.sheet.id ?? null;
        const selectedLinkVisibility = getSelectedLinkVisibility(characterState);
        const canPublish = canPublishManualRoll({
            role: runtime?.role ?? null,
            assignedCharacterId: characterState?.assignedCharacterId ?? null,
            activeCharacterId,
            resolutionSource: characterState?.resolution.source ?? 'none',
            selectedLinkVisibility,
            settings: visibilitySettings,
        });
        if (!canPublish) {
            return;
        }

        setIsPublishingRoll(true);
        try {
            const next = await publishRoomRoll(
                lastRoll,
                characterState?.activeCharacter?.sheet ?? null,
                visibilitySettings.defaultRollVisibility,
                'manual',
            );
            setRoomRollState(next);
            setRuntimeAuditState(await recordRuntimeAudit(
                'roll',
                `Published ${lastRoll.label}`,
                [
                    `Total ${lastRoll.total} from ${lastRoll.formula}.`,
                    `Visibility: ${visibilitySettings.defaultRollVisibility}.`,
                ],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsPublishingRoll(false);
        }
    }, [characterState, lastRoll, runtime, visibilitySettings]);

    const handleSelectCharacter = useCallback(async (characterId: string) => {
        const next = await setActiveCharacterRecord(characterId);
        if (next) {
            setCharacterState(next);
        }
    }, []);

    const handleSaveCharacter = useCallback(async (sheet: Phase1CharacterSheet) => {
        setIsSavingCharacter(true);
        try {
            const next = await updateCharacterSheet(sheet.id, sheet);
            if (next) {
                setCharacterState(next);
            }
        } finally {
            setIsSavingCharacter(false);
        }
    }, []);

    const handleCreateCharacter = useCallback(async () => {
        setIsSavingCharacter(true);
        try {
            const next = await createBlankCharacter();
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
            }
        } finally {
            setIsSavingCharacter(false);
        }
    }, []);

    const handleDuplicateCharacter = useCallback(async (characterId: string) => {
        setIsSavingCharacter(true);
        try {
            const next = await duplicateCharacter(characterId);
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
            }
        } finally {
            setIsSavingCharacter(false);
        }
    }, []);

    const handleDeleteCharacter = useCallback(async (characterId: string) => {
        setIsSavingCharacter(true);
        try {
            const next = await deleteCharacter(characterId);
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
            }
        } finally {
            setIsSavingCharacter(false);
        }
    }, []);

    const handleImportCharacters = useCallback(async (payload: string, mode: 'append' | 'replace') => {
        setIsSavingCharacter(true);
        try {
            const next = await importCharacterJson(payload, mode);
            if (!next) {
                throw new Error('Import failed to produce a room snapshot.');
            }

            setCharacterState(next.snapshot);
            setLastRoll(null);
            return next.importedCount;
        } finally {
            setIsSavingCharacter(false);
        }
    }, []);

    const handleLinkCharacter = useCallback(async (sheet: Phase1CharacterSheet) => {
        setIsLinkingCharacter(true);
        try {
            const next = await linkActiveCharacterToSelection(sheet, visibilitySettings.defaultTokenLinkVisibility);
            if (next) {
                setCharacterState(next);
            }
        } finally {
            setIsLinkingCharacter(false);
        }
    }, [visibilitySettings]);

    const handleUnlinkCharacter = useCallback(async () => {
        setIsLinkingCharacter(true);
        try {
            const next = await unlinkSelectionCharacters();
            if (next) {
                setCharacterState(next);
            }
        } finally {
            setIsLinkingCharacter(false);
        }
    }, []);

    const handleAssignCharacter = useCallback(async (playerId: string, characterId: string | null) => {
        setAssigningPlayerId(playerId);
        try {
            const next = await assignCharacterToPlayer(playerId, characterId);
            if (next) {
                setCharacterState(next);
            }
        } finally {
            setAssigningPlayerId(null);
        }
    }, []);

    const handleAdjustResource = useCallback(async (resourceId: string, delta: number) => {
        const activeSheetId = characterState?.activeCharacter?.sheet.id;
        if (!activeSheetId) {
            return;
        }

        setIsUpdatingRuntime(true);
        try {
            const previous = [
                ...(characterState?.activeCharacter?.sheet.resources ?? []),
                ...(characterState?.activeCharacter?.sheet.spellcasting?.slots ?? []),
            ]
                .find((resource) => resource.id === resourceId);
            const next = await updateCharacterSheetWith(
                activeSheetId,
                (sheet) => updateSheetResourceCounter(sheet, resourceId, delta),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
                const updated = [
                    ...(next.activeCharacter?.sheet.resources ?? []),
                    ...(next.activeCharacter?.sheet.spellcasting?.slots ?? []),
                ]
                    .find((resource) => resource.id === resourceId);
                if (previous && updated) {
                    setRuntimeAuditState(await recordRuntimeAudit(
                        'resource',
                        `Adjusted ${updated.name}`,
                        [
                            `${previous.current}/${previous.max} -> ${updated.current}/${updated.max}`,
                            `Delta ${delta >= 0 ? `+${delta}` : delta}.`,
                        ],
                        next.activeCharacter?.sheet ?? null,
                    ));
                }
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState]);

    const handleAdjustDeathSave = useCallback(async (kind: 'successes' | 'failures', delta: number) => {
        const activeSheetId = characterState?.activeCharacter?.sheet.id;
        if (!activeSheetId) {
            return;
        }

        setIsUpdatingRuntime(true);
        try {
            const previous = characterState?.activeCharacter?.sheet.deathSaves[kind] ?? 0;
            const next = await updateCharacterSheetWith(
                activeSheetId,
                (sheet) => updateDeathSaves(sheet, kind, delta),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
                setRuntimeAuditState(await recordRuntimeAudit(
                    'death-save',
                    `Updated death save ${kind}`,
                    [
                        `${previous}/3 -> ${next.activeCharacter?.sheet.deathSaves[kind] ?? previous}/3`,
                        `Delta ${delta >= 0 ? `+${delta}` : delta}.`,
                    ],
                    next.activeCharacter?.sheet ?? null,
                ));
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState]);

    const handleSpendActionResource = useCallback(async (actionId: string) => {
        const activeSheet = characterState?.activeCharacter?.sheet;
        const canManage = canManageSheetRuntime(
            runtime?.role ?? null,
            characterState?.assignedCharacterId ?? null,
            activeSheet?.id ?? null,
        );
        if (!activeSheet || !canManage) {
            return;
        }

        const action = activeSheet.actions.find((entry) => entry.id === actionId);
        if (!action) {
            return;
        }
        const useState = getActionUseState(activeSheet, action);

        setIsUpdatingRuntime(true);
        try {
            const next = await updateCharacterSheetWith(
                activeSheet.id,
                (sheet) => spendActionResource(sheet, action),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
                if (useState.resource) {
                    const nextResource = [
                        ...(next.activeCharacter?.sheet.resources ?? []),
                        ...(next.activeCharacter?.sheet.spellcasting?.slots ?? []),
                    ]
                        .find((resource) => resource.id === useState.resource?.id);
                    setRuntimeAuditState(await recordRuntimeAudit(
                        'resource',
                        `Spent ${useState.resource.name} from ${action.name}`,
                        [
                            `${useState.resource.current}/${useState.resource.max} -> ${nextResource?.current ?? useState.resource.current}/${useState.resource.max}`,
                            `Cost ${useState.amount}.`,
                        ],
                        next.activeCharacter?.sheet ?? null,
                    ));
                }
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState, runtime]);

    const handleApplyRest = useCallback(async (kind: 'short' | 'long') => {
        const activeSheet = characterState?.activeCharacter?.sheet;
        const canManage = canManageSheetRuntime(
            runtime?.role ?? null,
            characterState?.assignedCharacterId ?? null,
            activeSheet?.id ?? null,
        );
        if (!activeSheet || !canManage) {
            return;
        }

        setIsUpdatingRuntime(true);
        try {
            const previousResources = [...activeSheet.resources, ...(activeSheet.spellcasting?.slots ?? [])];
            const next = await updateCharacterSheetWith(
                activeSheet.id,
                (sheet) => applyRestRecovery(sheet, kind),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
                const updatedResources = [...(next.activeCharacter?.sheet.resources ?? []), ...((next.activeCharacter?.sheet.spellcasting?.slots) ?? [])];
                const recovered = updatedResources
                    .map((resource) => {
                        const previous = previousResources.find((entry) => entry.id === resource.id);
                        return previous && previous.current !== resource.current
                            ? `${resource.name}: ${previous.current}/${previous.max} -> ${resource.current}/${resource.max}`
                            : null;
                    })
                    .filter((entry): entry is string => Boolean(entry));
                setRuntimeAuditState(await recordRuntimeAudit(
                    'rest',
                    `Applied ${kind} rest recovery`,
                    recovered.length > 0 ? recovered : ['No modeled counters changed.'],
                    next.activeCharacter?.sheet ?? null,
                ));
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState, runtime]);

    const handleSaveOverrides = useCallback(async (nextOverrides: {
        proficiencyBonusOverride: number | null;
        initiativeAdjustment: number;
    }) => {
        const activeSheetId = characterState?.activeCharacter?.sheet.id;
        if (!activeSheetId) {
            return;
        }

        setIsUpdatingRuntime(true);
        try {
            const next = await updateCharacterSheetWith(activeSheetId, (sheet) =>
                setInitiativeAdjustment(
                    setProficiencyBonusOverride(sheet, nextOverrides.proficiencyBonusOverride),
                    nextOverrides.initiativeAdjustment,
                ),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
                setRuntimeAuditState(await recordRuntimeAudit(
                    'override',
                    'Saved manual overrides',
                    [
                        `Proficiency override: ${nextOverrides.proficiencyBonusOverride ?? 'auto'}.`,
                        `Initiative adjustment: ${nextOverrides.initiativeAdjustment}.`,
                    ],
                    next.activeCharacter?.sheet ?? null,
                ));
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState]);

    const handleOpenPrompt = useCallback(async (prompt: RoomRollPromptDraft) => {
        setIsManagingPrompt(true);
        try {
            const next = await openRoomPrompt(prompt, visibilitySettings.initiativePromptAudience);
            setRoomRollState(next);
            setRuntimeAuditState(await recordRuntimeAudit(
                'prompt',
                `Opened ${next.activePrompt?.label ?? 'prompt'}`,
                [`Audience: ${visibilitySettings.initiativePromptAudience}.`],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsManagingPrompt(false);
        }
    }, [characterState, visibilitySettings]);

    const handleClearPrompt = useCallback(async () => {
        setIsManagingPrompt(true);
        try {
            const previousPrompt = roomRollState?.activePrompt;
            const next = await clearRoomPrompt();
            setRoomRollState(next);
            if (previousPrompt) {
                setRuntimeAuditState(await recordRuntimeAudit(
                    'prompt',
                    `Cleared ${previousPrompt.label}`,
                    [`Audience was ${previousPrompt.audience}.`],
                    characterState?.activeCharacter?.sheet ?? null,
                ));
            }
        } finally {
            setIsManagingPrompt(false);
        }
    }, [characterState, roomRollState]);

    const handleRespondToPrompt = useCallback(async () => {
        const sheet = characterState?.activeCharacter?.sheet;
        const prompt = roomRollState?.activePrompt;
        const canRespond = prompt
            ? canRespondToPrompt({
                role: runtime?.role ?? null,
                assignedCharacterId: characterState?.assignedCharacterId ?? null,
                activeCharacterId: sheet?.id ?? null,
                audience: prompt.audience,
            })
            : false;
        if (!sheet || !prompt || !canRespond) {
            return;
        }

        const result = rollStructuredD20(buildPromptRollRequest(sheet, prompt));
        setLastRoll(result);
        setIsPublishingRoll(true);
        try {
            const visibility = prompt.audience === 'room' ? 'room' : 'assigned-only';
            const next = await publishRoomRoll(result, sheet, visibility, 'prompt');
            setRoomRollState(next);
            setRuntimeAuditState(await recordRuntimeAudit(
                'roll',
                `Answered ${prompt.label}`,
                [
                    `Published ${result.total} from ${result.formula}.`,
                    `Visibility: ${visibility}.`,
                ],
                sheet,
            ));
        } finally {
            setIsPublishingRoll(false);
        }
    }, [characterState, roomRollState, runtime]);

    const handleSaveVisibilitySettings = useCallback(async (nextSettings: StoredVisibilitySettings) => {
        setIsSavingVisibility(true);
        try {
            const saved = await updateVisibilitySettings(nextSettings);
            setVisibilitySettings(saved);
        } finally {
            setIsSavingVisibility(false);
        }
    }, []);

    const handleClearAudit = useCallback(async () => {
        setIsClearingAudit(true);
        try {
            setRuntimeAuditState(await clearRuntimeAuditHistory());
        } finally {
            setIsClearingAudit(false);
        }
    }, []);

    const handleBuildEncounter = useCallback(async () => {
        setIsUpdatingEncounter(true);
        try {
            const next = await buildEncounterFromRoomRollFeed();
            setEncounterState(next);
            setRuntimeAuditState(await recordRuntimeAudit(
                'encounter',
                'Built encounter from initiative feed',
                next.participants.length > 0
                    ? next.participants.map((participant) => `${participant.label}: ${participant.initiative}`)
                    : ['No initiative rolls were available in the room feed.'],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsUpdatingEncounter(false);
        }
    }, [characterState]);

    const handleAdvanceEncounter = useCallback(async () => {
        setIsUpdatingEncounter(true);
        try {
            const next = await advanceEncounterState();
            setEncounterState(next);
            const active = next.participants[next.turnIndex];
            setRuntimeAuditState(await recordRuntimeAudit(
                'encounter',
                'Advanced encounter turn',
                active
                    ? [`Round ${next.round}.`, `Active: ${active.label} (${active.initiative}).`]
                    : ['No active participant.'],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsUpdatingEncounter(false);
        }
    }, [characterState]);

    const handleRetreatEncounter = useCallback(async () => {
        setIsUpdatingEncounter(true);
        try {
            const next = await retreatEncounterState();
            setEncounterState(next);
            const active = next.participants[next.turnIndex];
            setRuntimeAuditState(await recordRuntimeAudit(
                'encounter',
                'Moved encounter turn backward',
                active
                    ? [`Round ${next.round}.`, `Active: ${active.label} (${active.initiative}).`]
                    : ['No active participant.'],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsUpdatingEncounter(false);
        }
    }, [characterState]);

    const handleSetEncounterActive = useCallback(async (participantId: string) => {
        setIsUpdatingEncounter(true);
        try {
            const next = await setEncounterActiveParticipant(participantId);
            setEncounterState(next);
            const active = next.participants[next.turnIndex];
            setRuntimeAuditState(await recordRuntimeAudit(
                'encounter',
                'Set active encounter participant',
                active
                    ? [`Round ${next.round}.`, `Active: ${active.label} (${active.initiative}).`]
                    : ['No active participant.'],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsUpdatingEncounter(false);
        }
    }, [characterState]);

    const handleClearEncounter = useCallback(async () => {
        setIsUpdatingEncounter(true);
        try {
            const next = await clearEncounterState();
            setEncounterState(next);
            setRuntimeAuditState(await recordRuntimeAudit(
                'encounter',
                'Cleared encounter order',
                ['Encounter state reset.'],
                characterState?.activeCharacter?.sheet ?? null,
            ));
        } finally {
            setIsUpdatingEncounter(false);
        }
    }, [characterState]);

    return (
        <ExtensionShell
            runtime={runtime}
            characterState={characterState}
            roomRollState={roomRollState}
            encounterState={encounterState}
            runtimeAuditState={runtimeAuditState}
            visibilitySettings={visibilitySettings}
            lastRoll={lastRoll}
            assigningPlayerId={assigningPlayerId}
            isSavingCharacter={isSavingCharacter}
            isUpdatingRuntime={isUpdatingRuntime}
            isLinkingCharacter={isLinkingCharacter}
            isPublishingRoll={isPublishingRoll}
            isManagingPrompt={isManagingPrompt}
            isUpdatingEncounter={isUpdatingEncounter}
            isSavingVisibility={isSavingVisibility}
            isClearingAudit={isClearingAudit}
            onRoll={handleRoll}
            onPublishLastRoll={handlePublishLastRoll}
            onSelectCharacter={handleSelectCharacter}
            onCreateCharacter={handleCreateCharacter}
            onDuplicateCharacter={handleDuplicateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onImportCharacters={handleImportCharacters}
            onSaveCharacter={handleSaveCharacter}
            onAdjustResource={handleAdjustResource}
            onAdjustDeathSave={handleAdjustDeathSave}
            onApplyRest={handleApplyRest}
            onSpendActionResource={handleSpendActionResource}
            onSaveOverrides={handleSaveOverrides}
            onLinkCharacter={handleLinkCharacter}
            onUnlinkCharacter={handleUnlinkCharacter}
            onAssignCharacter={handleAssignCharacter}
            onOpenPrompt={handleOpenPrompt}
            onClearPrompt={handleClearPrompt}
            onRespondToPrompt={handleRespondToPrompt}
            onBuildEncounter={handleBuildEncounter}
            onAdvanceEncounter={handleAdvanceEncounter}
            onRetreatEncounter={handleRetreatEncounter}
            onSetEncounterActive={handleSetEncounterActive}
            onClearEncounter={handleClearEncounter}
            onSaveVisibilitySettings={handleSaveVisibilitySettings}
            onClearAudit={handleClearAudit}
            loadState={loadState}
            error={error}
            surface={surface}
        />
    );
}
