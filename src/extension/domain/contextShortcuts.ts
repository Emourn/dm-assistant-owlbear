import { canPublishManualRoll, type StoredVisibilitySettings } from './visibilitySettings';

export interface ContextShortcutSelectionLink {
    characterId: string;
    visibility: 'room' | 'assigned-only' | 'gm-only';
}

export interface InitiativeShortcutContext {
    assignedCharacterId: string | null;
    activeCharacterId: string | null;
    resolutionSource: 'selected-token' | 'assigned-character' | 'active-character' | 'none';
    selectionLinks: ContextShortcutSelectionLink[];
}

export function getSelectedShortcutLinkVisibility(
    context: InitiativeShortcutContext,
): ContextShortcutSelectionLink['visibility'] | null {
    if (!context.activeCharacterId || context.resolutionSource !== 'selected-token') {
        return null;
    }

    return context.selectionLinks.find((link) => link.characterId === context.activeCharacterId)?.visibility ?? null;
}

export function canPublishInitiativeShortcut(
    role: 'GM' | 'PLAYER' | null,
    context: InitiativeShortcutContext,
    settings: StoredVisibilitySettings,
): boolean {
    return canPublishManualRoll({
        role,
        assignedCharacterId: context.assignedCharacterId,
        activeCharacterId: context.activeCharacterId,
        resolutionSource: context.resolutionSource,
        selectedLinkVisibility: getSelectedShortcutLinkVisibility(context),
        settings,
    });
}
