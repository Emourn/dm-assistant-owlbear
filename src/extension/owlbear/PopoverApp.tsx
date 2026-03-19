import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import {
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
import { ExtensionShell } from '../ui/ExtensionShell';
import {
    assignCharacterToPlayer,
    linkActiveCharacterToSelection,
    readCharacterRepositorySnapshot,
    setActiveCharacterRecord,
    unlinkSelectionCharacters,
    updateCharacterSheet,
    updateCharacterSheetWith,
    type CharacterRepositorySnapshot,
} from './characterRepository';
import { readRuntimeSnapshot, type OwlbearRuntimeSnapshot } from './runtime';

export function PopoverApp({ surface = 'popover' }: { surface?: 'popover' | 'panel' }) {
    const [runtime, setRuntime] = useState<OwlbearRuntimeSnapshot | null>(null);
    const [characterState, setCharacterState] = useState<CharacterRepositorySnapshot | null>(null);
    const [lastRoll, setLastRoll] = useState<StructuredRollResult | null>(null);
    const [assigningPlayerId, setAssigningPlayerId] = useState<string | null>(null);
    const [isSavingCharacter, setIsSavingCharacter] = useState(false);
    const [isUpdatingRuntime, setIsUpdatingRuntime] = useState(false);
    const [isLinkingCharacter, setIsLinkingCharacter] = useState(false);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const snapshot = await readRuntimeSnapshot();
            const nextCharacterState = await readCharacterRepositorySnapshot(snapshot.role);
            setRuntime(snapshot);
            setCharacterState(nextCharacterState);
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

    const handleLinkCharacter = useCallback(async (sheet: Phase1CharacterSheet) => {
        setIsLinkingCharacter(true);
        try {
            const next = await linkActiveCharacterToSelection(sheet);
            if (next) {
                setCharacterState(next);
            }
        } finally {
            setIsLinkingCharacter(false);
        }
    }, []);

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

    return (
        <ExtensionShell
            runtime={runtime}
            characterState={characterState}
            lastRoll={lastRoll}
            assigningPlayerId={assigningPlayerId}
            isSavingCharacter={isSavingCharacter}
            isUpdatingRuntime={isUpdatingRuntime}
            isLinkingCharacter={isLinkingCharacter}
            onRoll={handleRoll}
            onSelectCharacter={handleSelectCharacter}
            onSaveCharacter={handleSaveCharacter}
            onAdjustResource={handleAdjustResource}
            onAdjustDeathSave={handleAdjustDeathSave}
            onSaveOverrides={handleSaveOverrides}
            onLinkCharacter={handleLinkCharacter}
            onUnlinkCharacter={handleUnlinkCharacter}
            onAssignCharacter={handleAssignCharacter}
            loadState={loadState}
            error={error}
            surface={surface}
        />
    );
}
