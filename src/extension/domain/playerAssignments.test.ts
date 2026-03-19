import { describe, expect, it } from 'vitest';
import {
    createEmptyPlayerAssignments,
    parseStoredPlayerAssignments,
    PLAYER_ASSIGNMENT_VERSION,
    resolveCharacterView,
} from './playerAssignments';
import { TOKEN_LINK_VERSION } from './tokenLinks';

describe('player assignment domain', () => {
    it('parses valid assignment metadata', () => {
        const parsed = parseStoredPlayerAssignments({
            version: PLAYER_ASSIGNMENT_VERSION,
            assignments: {
                playerA: 'hero-1',
            },
        });

        expect(parsed?.assignments.playerA).toBe('hero-1');
    });

    it('creates an empty assignment map', () => {
        expect(createEmptyPlayerAssignments()).toEqual({
            version: PLAYER_ASSIGNMENT_VERSION,
            assignments: {},
        });
    });

    it('resolves player views from public selected tokens before assignments', () => {
        const resolved = resolveCharacterView(
            'PLAYER',
            [
                {
                    version: TOKEN_LINK_VERSION,
                    characterId: 'hero-public',
                    characterName: 'Public Hero',
                    visibility: 'room',
                    linkedAt: 1,
                    linkedBy: 'gm',
                },
            ],
            'hero-assigned',
            'hero-gm',
        );

        expect(resolved).toEqual({
            characterId: 'hero-public',
            source: 'selected-token',
        });
    });

    it('resolves players to their assignment when no public token is selected', () => {
        const resolved = resolveCharacterView('PLAYER', [], 'hero-assigned', 'hero-gm');
        expect(resolved).toEqual({
            characterId: 'hero-assigned',
            source: 'assigned-character',
        });
    });

    it('resolves GMs to the active character', () => {
        const resolved = resolveCharacterView('GM', [], 'hero-assigned', 'hero-gm');
        expect(resolved).toEqual({
            characterId: 'hero-gm',
            source: 'active-character',
        });
    });
});
