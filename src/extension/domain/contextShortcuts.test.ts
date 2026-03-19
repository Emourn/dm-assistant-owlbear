import { describe, expect, it } from 'vitest';
import {
    CONDITION_SHORTCUTS,
    HIT_POINT_SHORTCUTS,
    canPublishInitiativeShortcut,
    getSelectedShortcutLinkVisibility,
    type InitiativeShortcutContext,
} from './contextShortcuts';
import { createDefaultVisibilitySettings } from './visibilitySettings';

function createContext(overrides: Partial<InitiativeShortcutContext> = {}): InitiativeShortcutContext {
    return {
        assignedCharacterId: null,
        activeCharacterId: 'sheet-1',
        resolutionSource: 'active-character',
        selectionLinks: [],
        ...overrides,
    };
}

describe('context shortcut permissions', () => {
    it('exposes stable hit point and condition shortcut presets', () => {
        expect(HIT_POINT_SHORTCUTS).toEqual([
            expect.objectContaining({ id: 'damage-5', kind: 'damage', amount: 5 }),
            expect.objectContaining({ id: 'heal-5', kind: 'healing', amount: 5 }),
        ]);
        expect(CONDITION_SHORTCUTS).toEqual([
            expect.objectContaining({ id: 'apply-prone', conditionLabel: 'Prone', mode: 'add' }),
            expect.objectContaining({ id: 'clear-prone', conditionLabel: 'Prone', mode: 'remove' }),
            expect.objectContaining({ id: 'apply-paralyzed', conditionLabel: 'Paralyzed', mode: 'add' }),
            expect.objectContaining({ id: 'clear-paralyzed', conditionLabel: 'Paralyzed', mode: 'remove' }),
        ]);
    });

    it('reads selected-token visibility for the active resolved sheet', () => {
        const context = createContext({
            resolutionSource: 'selected-token',
            selectionLinks: [
                { characterId: 'sheet-2', visibility: 'gm-only' },
                { characterId: 'sheet-1', visibility: 'assigned-only' },
            ],
        });

        expect(getSelectedShortcutLinkVisibility(context)).toBe('assigned-only');
    });

    it('allows initiative publication for players on public selected-token sheets', () => {
        const settings = {
            ...createDefaultVisibilitySettings(),
            allowPlayerManualRollPublish: true,
            defaultRollVisibility: 'room' as const,
        };

        expect(canPublishInitiativeShortcut('PLAYER', createContext({
            resolutionSource: 'selected-token',
            selectionLinks: [{ characterId: 'sheet-1', visibility: 'room' }],
        }), settings)).toBe(true);
    });

    it('blocks initiative publication for players on assigned-only selected tokens when manual publish is public-only', () => {
        const settings = {
            ...createDefaultVisibilitySettings(),
            allowPlayerManualRollPublish: true,
            defaultRollVisibility: 'room' as const,
        };

        expect(canPublishInitiativeShortcut('PLAYER', createContext({
            resolutionSource: 'selected-token',
            selectionLinks: [{ characterId: 'sheet-1', visibility: 'assigned-only' }],
        }), settings)).toBe(false);
    });
});
