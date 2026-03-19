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

export interface HitPointShortcut {
    id: 'damage-5' | 'heal-5';
    label: string;
    kind: 'damage' | 'healing';
    amount: number;
}

export interface ConditionShortcut {
    id: 'apply-prone' | 'clear-prone' | 'apply-paralyzed' | 'clear-paralyzed';
    label: string;
    conditionLabel: 'Prone' | 'Paralyzed';
    mode: 'add' | 'remove';
}

export const HIT_POINT_SHORTCUTS: HitPointShortcut[] = [
    {
        id: 'damage-5',
        label: 'Damage Linked Selection (-5)',
        kind: 'damage',
        amount: 5,
    },
    {
        id: 'heal-5',
        label: 'Heal Linked Selection (+5)',
        kind: 'healing',
        amount: 5,
    },
];

export const CONDITION_SHORTCUTS: ConditionShortcut[] = [
    {
        id: 'apply-prone',
        label: 'Apply Prone',
        conditionLabel: 'Prone',
        mode: 'add',
    },
    {
        id: 'clear-prone',
        label: 'Clear Prone',
        conditionLabel: 'Prone',
        mode: 'remove',
    },
    {
        id: 'apply-paralyzed',
        label: 'Apply Paralyzed',
        conditionLabel: 'Paralyzed',
        mode: 'add',
    },
    {
        id: 'clear-paralyzed',
        label: 'Clear Paralyzed',
        conditionLabel: 'Paralyzed',
        mode: 'remove',
    },
];

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
