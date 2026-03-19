import { describe, expect, it } from 'vitest';
import { buildInitiativeRoll } from '../../features/dnd2024/domain/sheet';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import { createSampleCharacterCollection } from './characterRecords';
import {
    appendPublishedRoll,
    createInitiativePrompt,
    createPublishedRollEntry,
    createEmptyRoomRollState,
    parseStoredRoomRollState,
    setActivePrompt,
} from './roomRolls';

function createRollResult() {
    const sheet = createSampleCharacterCollection(1000).characters[0].sheet;
    return rollStructuredD20(buildInitiativeRoll(sheet), {
        rng: () => 0.5,
        timestamp: 1234,
    });
}

describe('room roll state', () => {
    it('creates and appends published roll entries', () => {
        const result = createRollResult();
        const entry = createPublishedRollEntry(result, {
            playerId: 'player-1',
            playerName: 'Ari',
            role: 'PLAYER',
            characterId: 'demo-seraphina-vale',
            characterName: 'Seraphina Vale',
        });

        const updated = appendPublishedRoll(createEmptyRoomRollState(), entry);

        expect(updated.feed).toHaveLength(1);
        expect(updated.feed[0].id).toContain('roll:1234:player-1');
        expect(updated.feed[0].result.total).toBe(result.total);
    });

    it('stores and clears initiative prompts', () => {
        const prompt = createInitiativePrompt(2000, 'GM', 'gm-1');
        const updated = setActivePrompt(createEmptyRoomRollState(), prompt);

        expect(updated.activePrompt?.kind).toBe('initiative');
        expect(setActivePrompt(updated, null).activePrompt).toBeNull();
    });

    it('parses valid metadata and rejects incompatible shapes', () => {
        const result = createRollResult();
        const state = {
            version: 1,
            feed: [
                createPublishedRollEntry(result, {
                    playerId: null,
                    playerName: 'GM',
                    role: 'GM',
                    characterId: null,
                    characterName: null,
                }),
            ],
            activePrompt: createInitiativePrompt(2000, 'GM', null),
        };

        expect(parseStoredRoomRollState(state)?.feed).toHaveLength(1);
        expect(parseStoredRoomRollState({ version: 99, feed: [] })).toBeNull();
    });
});
