import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { spendActionResource } from '../../features/dnd2024/domain/actionAutomation';
import { buildInitiativeRoll } from '../../features/dnd2024/domain/sheet';
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
import {
    canManageSheetRuntime,
    canPublishManualRoll,
    canRespondToPrompt,
    createDefaultVisibilitySettings,
    type StoredVisibilitySettings,
} from '../domain/visibilitySettings';
import { ExtensionShell } from '../ui/ExtensionShell';
import {
    assignCharacterToPlayer,
    createBlankCharacter,
    deleteCharacter,
    duplicateCharacter,
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
    openInitiativePrompt,
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
    const [visibilitySettings, setVisibilitySettings] = useState<StoredVisibilitySettings>(createDefaultVisibilitySettings);
    const [lastRoll, setLastRoll] = useState<StructuredRollResult | null>(null);
    const [assigningPlayerId, setAssigningPlayerId] = useState<string | null>(null);
    const [isSavingCharacter, setIsSavingCharacter] = useState(false);
    const [isUpdatingRuntime, setIsUpdatingRuntime] = useState(false);
    const [isLinkingCharacter, setIsLinkingCharacter] = useState(false);
    const [isPublishingRoll, setIsPublishingRoll] = useState(false);
    const [isManagingPrompt, setIsManagingPrompt] = useState(false);
    const [isSavingVisibility, setIsSavingVisibility] = useState(false);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const snapshot = await readRuntimeSnapshot();
            const [nextCharacterState, nextRoomRollState, nextVisibilitySettings] = await Promise.all([
                readCharacterRepositorySnapshot(snapshot.role),
                readRoomRollState(),
                readVisibilitySettings(),
            ]);
            setRuntime(snapshot);
            setCharacterState(nextCharacterState);
            setRoomRollState(nextRoomRollState);
            setVisibilitySettings(nextVisibilitySettings);
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
            const next = await updateCharacterSheetWith(
                activeSheetId,
                (sheet) => updateSheetResourceCounter(sheet, resourceId, delta),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
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
            const next = await updateCharacterSheetWith(
                activeSheetId,
                (sheet) => updateDeathSaves(sheet, kind, delta),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
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

        setIsUpdatingRuntime(true);
        try {
            const next = await updateCharacterSheetWith(
                activeSheet.id,
                (sheet) => spendActionResource(sheet, action),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
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
            const next = await updateCharacterSheetWith(
                activeSheet.id,
                (sheet) => applyRestRecovery(sheet, kind),
            );
            if (next) {
                setCharacterState(next);
                setLastRoll(null);
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
            }
        } finally {
            setIsUpdatingRuntime(false);
        }
    }, [characterState]);

    const handlePromptInitiative = useCallback(async () => {
        setIsManagingPrompt(true);
        try {
            const next = await openInitiativePrompt(visibilitySettings.initiativePromptAudience);
            setRoomRollState(next);
        } finally {
            setIsManagingPrompt(false);
        }
    }, [visibilitySettings]);

    const handleClearPrompt = useCallback(async () => {
        setIsManagingPrompt(true);
        try {
            const next = await clearRoomPrompt();
            setRoomRollState(next);
        } finally {
            setIsManagingPrompt(false);
        }
    }, []);

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
        if (!sheet || prompt?.kind !== 'initiative' || !canRespond) {
            return;
        }

        const result = rollStructuredD20(buildInitiativeRoll(sheet));
        setLastRoll(result);
        setIsPublishingRoll(true);
        try {
            const visibility = prompt.audience === 'room' ? 'room' : 'assigned-only';
            const next = await publishRoomRoll(result, sheet, visibility, 'prompt');
            setRoomRollState(next);
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

    return (
        <ExtensionShell
            runtime={runtime}
            characterState={characterState}
            roomRollState={roomRollState}
            visibilitySettings={visibilitySettings}
            lastRoll={lastRoll}
            assigningPlayerId={assigningPlayerId}
            isSavingCharacter={isSavingCharacter}
            isUpdatingRuntime={isUpdatingRuntime}
            isLinkingCharacter={isLinkingCharacter}
            isPublishingRoll={isPublishingRoll}
            isManagingPrompt={isManagingPrompt}
            isSavingVisibility={isSavingVisibility}
            onRoll={handleRoll}
            onPublishLastRoll={handlePublishLastRoll}
            onSelectCharacter={handleSelectCharacter}
            onCreateCharacter={handleCreateCharacter}
            onDuplicateCharacter={handleDuplicateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onSaveCharacter={handleSaveCharacter}
            onAdjustResource={handleAdjustResource}
            onAdjustDeathSave={handleAdjustDeathSave}
            onApplyRest={handleApplyRest}
            onSpendActionResource={handleSpendActionResource}
            onSaveOverrides={handleSaveOverrides}
            onLinkCharacter={handleLinkCharacter}
            onUnlinkCharacter={handleUnlinkCharacter}
            onAssignCharacter={handleAssignCharacter}
            onPromptInitiative={handlePromptInitiative}
            onClearPrompt={handleClearPrompt}
            onRespondToPrompt={handleRespondToPrompt}
            onSaveVisibilitySettings={handleSaveVisibilitySettings}
            loadState={loadState}
            error={error}
            surface={surface}
        />
    );
}
