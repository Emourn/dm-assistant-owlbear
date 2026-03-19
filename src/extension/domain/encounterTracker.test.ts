import { describe, expect, it } from 'vitest';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import { buildInitiativeRoll } from '../../features/dnd2024/domain/sheet';
import { createSampleCharacterCollection } from './characterRecords';
import { createPublishedRollEntry } from './roomRolls';
import {
    advanceEncounterTurn,
    createEncounterFromInitiativeFeed,
    createEmptyEncounterState,
    getActiveEncounterParticipant,
    retreatEncounterTurn,
    setEncounterTurn,
} from './encounterTracker';

function createInitiativeEntry(name: string, totalModifier: number, timestamp: number) {
    const sheet = {
        ...createSampleCharacterCollection(timestamp).characters[0].sheet,
        id: `sheet-${name.toLowerCase()}`,
        name,
        rollAdjustments: {
            initiative: totalModifier - 2,
            saves: {},
            skills: {},
        },
    };
    const result = rollStructuredD20(buildInitiativeRoll(sheet), {
        rng: () => 0.45,
        timestamp,
    });

    return createPublishedRollEntry(
        result,
        {
            playerId: `${name}-player`,
            playerName: `${name} Player`,
            role: 'PLAYER',
            characterId: sheet.id,
            characterName: sheet.name,
        },
        'room',
        'manual',
    );
}

describe('encounter tracker', () => {
    it('creates encounter order from the latest initiative feed entries', () => {
        const olderA = createInitiativeEntry('Alpha', 3, 1000);
        const newerA = createInitiativeEntry('Alpha', 5, 2000);
        const bravo = createInitiativeEntry('Bravo', 4, 1500);

        const state = createEncounterFromInitiativeFeed([olderA, bravo, newerA]);

        expect(state.round).toBe(1);
        expect(state.participants).toHaveLength(2);
        expect(state.participants[0].label).toBe('Alpha');
        expect(state.participants[0].sourceRollId).toBe(newerA.id);
        expect(state.participants[1].label).toBe('Bravo');
    });

    it('advances and retreats active turn through rounds', () => {
        const state = createEncounterFromInitiativeFeed([
            createInitiativeEntry('Alpha', 3, 1000),
            createInitiativeEntry('Bravo', 4, 1500),
        ]);

        const second = advanceEncounterTurn(state);
        const wrapped = advanceEncounterTurn(second);
        const previous = retreatEncounterTurn(wrapped);

        expect(getActiveEncounterParticipant(state)?.label).toBe('Bravo');
        expect(getActiveEncounterParticipant(second)?.label).toBe('Alpha');
        expect(wrapped.round).toBe(2);
        expect(getActiveEncounterParticipant(previous)?.label).toBe('Alpha');
    });

    it('can select a participant directly and ignores unknown ids', () => {
        const state = createEncounterFromInitiativeFeed([
            createInitiativeEntry('Alpha', 3, 1000),
            createInitiativeEntry('Bravo', 4, 1500),
        ]);
        const bravo = state.participants.find((participant) => participant.label === 'Alpha')!;

        expect(setEncounterTurn(state, bravo.id).turnIndex).toBe(1);
        expect(setEncounterTurn(createEmptyEncounterState(), 'missing')).toEqual(createEmptyEncounterState());
    });
});
