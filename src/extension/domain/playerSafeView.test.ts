import { describe, expect, it } from 'vitest';
import {
    buildCurrentViewerAccessSummary,
    buildPlayerAccessPreview,
    buildSelectedLinkVisibilityPreview,
    type AccessPreviewCharacter,
    type AccessPreviewPlayer,
} from './playerSafeView';
import type { StoredTokenLink } from './tokenLinks';

const characters: AccessPreviewCharacter[] = [
    { id: 'cleric', name: 'Seraphina Vale' },
    { id: 'fighter', name: 'Mira Stone' },
];

const players: AccessPreviewPlayer[] = [
    { id: 'gm-1', name: 'GM', role: 'GM' },
    { id: 'player-a', name: 'Ari', role: 'PLAYER' },
    { id: 'player-b', name: 'Bex', role: 'PLAYER' },
];

function createLink(overrides: Partial<StoredTokenLink> = {}): StoredTokenLink {
    return {
        version: 1,
        characterId: 'cleric',
        characterName: 'Seraphina Vale',
        visibility: 'room',
        linkedAt: 1,
        linkedBy: 'gm-1',
        ...overrides,
    };
}

describe('player-safe visibility summaries', () => {
    it('explains selected-token access for a player', () => {
        const summary = buildCurrentViewerAccessSummary({
            role: 'PLAYER',
            resolution: { characterId: 'cleric', source: 'selected-token' },
            activeCharacterName: 'Seraphina Vale',
            assignedCharacterName: 'Mira Stone',
            selectedLinks: [createLink({ visibility: 'assigned-only' })],
        });

        expect(summary.title).toContain('selected token');
        expect(summary.detail).toContain('Seraphina Vale');
        expect(summary.notes[0]).toContain('assigned-only');
    });

    it('explains hidden token selection when a player cannot resolve a sheet', () => {
        const summary = buildCurrentViewerAccessSummary({
            role: 'PLAYER',
            resolution: { characterId: null, source: 'none' },
            activeCharacterName: null,
            assignedCharacterName: null,
            selectedLinks: [createLink({ visibility: 'gm-only' })],
        });

        expect(summary.tone).toBe('rose');
        expect(summary.detail).toContain('hidden from this player');
    });
});

describe('player access preview', () => {
    it('prefers a visible selected token over assignment in the GM preview', () => {
        const preview = buildPlayerAccessPreview(
            players,
            characters,
            {
                'player-a': 'fighter',
            },
            [createLink({ characterId: 'cleric', characterName: 'Seraphina Vale', visibility: 'room' })],
        );

        const ari = preview.find((row) => row.playerId === 'player-a');
        expect(ari).toEqual(expect.objectContaining({
            visibleCharacterName: 'Seraphina Vale',
            assignedCharacterName: 'Mira Stone',
            source: 'selected-token',
        }));
    });

    it('keeps assigned-only token links visible only to the matching assignment', () => {
        const preview = buildPlayerAccessPreview(
            players,
            characters,
            {
                'player-a': 'cleric',
                'player-b': 'fighter',
            },
            [createLink({ visibility: 'assigned-only' })],
        );

        const ari = preview.find((row) => row.playerId === 'player-a');
        const bex = preview.find((row) => row.playerId === 'player-b');

        expect(ari).toEqual(expect.objectContaining({
            visibleCharacterName: 'Seraphina Vale',
            source: 'selected-token',
        }));
        expect(bex).toEqual(expect.objectContaining({
            visibleCharacterName: 'Mira Stone',
            source: 'assigned-character',
        }));
    });
});

describe('selected link visibility preview', () => {
    it('shows audience summaries for selected token links', () => {
        const preview = buildSelectedLinkVisibilityPreview(
            players,
            {
                'player-a': 'cleric',
            },
            [
                createLink({ visibility: 'room' }),
                createLink({ characterId: 'fighter', characterName: 'Mira Stone', visibility: 'assigned-only' }),
                createLink({ characterId: 'rogue', characterName: 'Nyx Ember', visibility: 'gm-only' }),
            ],
        );

        expect(preview[0]?.audienceLabel).toContain('Visible to all');
        expect(preview[1]).toEqual(expect.objectContaining({
            characterName: 'Mira Stone',
            audienceLabel: 'No assigned player can currently see this link',
        }));
        expect(preview[2]).toEqual(expect.objectContaining({
            characterName: 'Nyx Ember',
            audienceLabel: 'GM only',
        }));
    });
});
