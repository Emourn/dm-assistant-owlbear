import { describe, expect, it } from 'vitest';
import { getSelectedLinkedCharacters } from './selectionBatch';
import { TOKEN_LINK_VERSION } from './tokenLinks';

describe('selection batch helpers', () => {
    it('deduplicates linked characters while counting selected tokens', () => {
        const characters = getSelectedLinkedCharacters([
            {
                version: TOKEN_LINK_VERSION,
                characterId: 'sheet-a',
                characterName: 'Seraphina Vale',
                visibility: 'room',
                linkedAt: 1,
                linkedBy: 'gm',
            },
            {
                version: TOKEN_LINK_VERSION,
                characterId: 'sheet-b',
                characterName: 'Brann',
                visibility: 'assigned-only',
                linkedAt: 2,
                linkedBy: 'gm',
            },
            {
                version: TOKEN_LINK_VERSION,
                characterId: 'sheet-a',
                characterName: 'Seraphina Vale',
                visibility: 'room',
                linkedAt: 3,
                linkedBy: 'gm',
            },
        ]);

        expect(characters).toEqual([
            {
                characterId: 'sheet-a',
                characterName: 'Seraphina Vale',
                visibility: 'room',
                tokenCount: 2,
            },
            {
                characterId: 'sheet-b',
                characterName: 'Brann',
                visibility: 'assigned-only',
                tokenCount: 1,
            },
        ]);
    });
});
