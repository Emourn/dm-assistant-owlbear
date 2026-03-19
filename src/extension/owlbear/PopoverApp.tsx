import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import type { StructuredRollRequest, StructuredRollResult } from '../../features/dnd2024/domain/types';
import { ExtensionShell } from '../ui/ExtensionShell';
import {
    readCharacterRepositorySnapshot,
    setActiveCharacterRecord,
    type CharacterRepositorySnapshot,
} from './characterRepository';
import { readRuntimeSnapshot, type OwlbearRuntimeSnapshot } from './runtime';

export function PopoverApp({ surface = 'popover' }: { surface?: 'popover' | 'panel' }) {
    const [runtime, setRuntime] = useState<OwlbearRuntimeSnapshot | null>(null);
    const [characterState, setCharacterState] = useState<CharacterRepositorySnapshot | null>(null);
    const [lastRoll, setLastRoll] = useState<StructuredRollResult | null>(null);
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

    return (
        <ExtensionShell
            runtime={runtime}
            characterState={characterState}
            lastRoll={lastRoll}
            onRoll={handleRoll}
            onSelectCharacter={handleSelectCharacter}
            loadState={loadState}
            error={error}
            surface={surface}
        />
    );
}
