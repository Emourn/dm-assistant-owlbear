import { describe, expect, it } from 'vitest';
import {
    parseStoredTokenLink,
    resolveCharacterIdFromSelection,
    TOKEN_LINK_VERSION,
} from './tokenLinks';

describe('token link domain', () => {
    it('parses valid stored token link metadata', () => {
        const parsed = parseStoredTokenLink({
            version: TOKEN_LINK_VERSION,
            characterId: 'hero-1',
            characterName: 'Seraphina Vale',
            visibility: 'room',
            linkedAt: 123,
            linkedBy: 'player-1',
        });

        expect(parsed?.characterId).toBe('hero-1');
        expect(parsed?.visibility).toBe('room');
    });

    it('prefers a selected linked token when it is visible to the current role', () => {
        const result = resolveCharacterIdFromSelection(
            'PLAYER',
            [
                {
                    version: TOKEN_LINK_VERSION,
                    characterId: 'hero-1',
                    characterName: 'Seraphina Vale',
                    visibility: 'room',
                    linkedAt: 123,
                    linkedBy: 'player-1',
                },
            ],
            null,
            'hero-2',
        );

        expect(result).toEqual({
            characterId: 'hero-1',
            source: 'selected-token',
        });
    });

    it('ignores gm-only links for players and falls back to the active record', () => {
        const result = resolveCharacterIdFromSelection(
            'PLAYER',
            [
                {
                    version: TOKEN_LINK_VERSION,
                    characterId: 'hero-1',
                    characterName: 'Seraphina Vale',
                    visibility: 'gm-only',
                    linkedAt: 123,
                    linkedBy: 'player-1',
                },
            ],
            null,
            'hero-2',
        );

        expect(result).toEqual({
            characterId: 'hero-2',
            source: 'active-character',
        });
    });
});
