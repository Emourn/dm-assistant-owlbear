import { describe, expect, it } from 'vitest';
import {
    canManageSheetRuntime,
    canPublishManualRoll,
    canRespondToPrompt,
    canViewPrompt,
    canViewPublishedRoll,
    canViewVisibilityScopedCharacter,
    createDefaultVisibilitySettings,
    parseStoredVisibilitySettings,
} from './visibilitySettings';

describe('visibility settings and permissions', () => {
    it('parses valid settings and rejects incompatible shapes', () => {
        const settings = createDefaultVisibilitySettings();

        expect(parseStoredVisibilitySettings(settings)).toEqual(settings);
        expect(parseStoredVisibilitySettings({ version: 99 })).toBeNull();
    });

    it('applies token visibility to assigned-only character access', () => {
        expect(canViewVisibilityScopedCharacter('PLAYER', 'room', null, 'char-1')).toBe(true);
        expect(canViewVisibilityScopedCharacter('PLAYER', 'assigned-only', 'char-1', 'char-1')).toBe(true);
        expect(canViewVisibilityScopedCharacter('PLAYER', 'assigned-only', 'char-2', 'char-1')).toBe(false);
        expect(canViewVisibilityScopedCharacter('PLAYER', 'gm-only', 'char-1', 'char-1')).toBe(false);
    });

    it('uses explicit rules for runtime and manual roll publication', () => {
        const settings = createDefaultVisibilitySettings();

        expect(canManageSheetRuntime('PLAYER', 'char-1', 'char-1')).toBe(true);
        expect(canManageSheetRuntime('PLAYER', 'char-2', 'char-1')).toBe(false);

        expect(canPublishManualRoll({
            role: 'PLAYER',
            assignedCharacterId: 'char-1',
            activeCharacterId: 'char-1',
            resolutionSource: 'assigned-character',
            selectedLinkVisibility: null,
            settings,
        })).toBe(true);

        expect(canPublishManualRoll({
            role: 'PLAYER',
            assignedCharacterId: null,
            activeCharacterId: 'char-1',
            resolutionSource: 'selected-token',
            selectedLinkVisibility: 'room',
            settings,
        })).toBe(true);

        expect(canPublishManualRoll({
            role: 'PLAYER',
            assignedCharacterId: null,
            activeCharacterId: 'char-1',
            resolutionSource: 'selected-token',
            selectedLinkVisibility: 'assigned-only',
            settings,
        })).toBe(false);
    });

    it('filters published roll visibility and prompt audience', () => {
        expect(canViewPublishedRoll('PLAYER', 'player-1', 'char-1', {
            visibility: 'assigned-only',
            actor: { playerId: 'player-2', characterId: 'char-1' },
        })).toBe(true);

        expect(canViewPublishedRoll('PLAYER', 'player-1', 'char-2', {
            visibility: 'assigned-only',
            actor: { playerId: 'player-2', characterId: 'char-1' },
        })).toBe(false);

        expect(canViewPublishedRoll('PLAYER', 'player-1', null, {
            visibility: 'gm-only',
            actor: { playerId: 'player-1', characterId: null },
        })).toBe(true);

        expect(canViewPrompt({
            role: 'PLAYER',
            assignedCharacterId: 'char-1',
            activeCharacterId: 'char-1',
            audience: 'assigned-only',
        })).toBe(true);

        expect(canRespondToPrompt({
            role: 'PLAYER',
            assignedCharacterId: 'char-2',
            activeCharacterId: 'char-1',
            audience: 'assigned-only',
        })).toBe(false);
    });
});
