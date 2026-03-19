import type { CharacterViewResolution } from './playerAssignments';

export const VISIBILITY_SETTINGS_VERSION = 1;

export type SharedVisibility = 'room' | 'assigned-only' | 'gm-only';
export type PromptAudience = 'room' | 'assigned-only';

export interface StoredVisibilitySettings {
    version: typeof VISIBILITY_SETTINGS_VERSION;
    defaultTokenLinkVisibility: SharedVisibility;
    defaultRollVisibility: SharedVisibility;
    initiativePromptAudience: PromptAudience;
    allowPlayerManualRollPublication: boolean;
}

interface ManualPublishOptions {
    role: 'GM' | 'PLAYER' | null;
    assignedCharacterId: string | null;
    activeCharacterId: string | null;
    resolutionSource: CharacterViewResolution['source'];
    selectedLinkVisibility: SharedVisibility | null;
    settings: StoredVisibilitySettings;
}

interface PromptOptions {
    role: 'GM' | 'PLAYER' | null;
    assignedCharacterId: string | null;
    activeCharacterId: string | null;
    audience: PromptAudience;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isSharedVisibility(value: unknown): value is SharedVisibility {
    return value === 'room' || value === 'assigned-only' || value === 'gm-only';
}

function isPromptAudience(value: unknown): value is PromptAudience {
    return value === 'room' || value === 'assigned-only';
}

export function createDefaultVisibilitySettings(): StoredVisibilitySettings {
    return {
        version: VISIBILITY_SETTINGS_VERSION,
        defaultTokenLinkVisibility: 'room',
        defaultRollVisibility: 'room',
        initiativePromptAudience: 'room',
        allowPlayerManualRollPublication: true,
    };
}

export function parseStoredVisibilitySettings(value: unknown): StoredVisibilitySettings | null {
    if (!isRecord(value) || value.version !== VISIBILITY_SETTINGS_VERSION) {
        return null;
    }

    if (
        !isSharedVisibility(value.defaultTokenLinkVisibility)
        || !isSharedVisibility(value.defaultRollVisibility)
        || !isPromptAudience(value.initiativePromptAudience)
        || typeof value.allowPlayerManualRollPublication !== 'boolean'
    ) {
        return null;
    }

    return {
        version: VISIBILITY_SETTINGS_VERSION,
        defaultTokenLinkVisibility: value.defaultTokenLinkVisibility,
        defaultRollVisibility: value.defaultRollVisibility,
        initiativePromptAudience: value.initiativePromptAudience,
        allowPlayerManualRollPublication: value.allowPlayerManualRollPublication,
    };
}

export function canViewVisibilityScopedCharacter(
    role: 'GM' | 'PLAYER' | null,
    visibility: SharedVisibility,
    assignedCharacterId: string | null,
    characterId: string,
): boolean {
    if (role === 'GM') {
        return true;
    }

    if (visibility === 'room') {
        return true;
    }

    if (visibility === 'assigned-only') {
        return assignedCharacterId === characterId;
    }

    return false;
}

export function canManageSheetRuntime(
    role: 'GM' | 'PLAYER' | null,
    assignedCharacterId: string | null,
    activeCharacterId: string | null,
): boolean {
    return role === 'GM' || (role === 'PLAYER' && Boolean(activeCharacterId) && assignedCharacterId === activeCharacterId);
}

export function canPublishManualRoll(options: ManualPublishOptions): boolean {
    if (options.role === 'GM') {
        return true;
    }

    if (!options.settings.allowPlayerManualRollPublication || !options.activeCharacterId) {
        return false;
    }

    if (options.assignedCharacterId === options.activeCharacterId) {
        return true;
    }

    return options.resolutionSource === 'selected-token' && options.selectedLinkVisibility === 'room';
}

export function canViewPublishedRoll(
    role: 'GM' | 'PLAYER' | null,
    playerId: string | null,
    assignedCharacterId: string | null,
    entry: {
        visibility: SharedVisibility;
        actor: {
            playerId: string | null;
            characterId: string | null;
        };
    },
): boolean {
    if (role === 'GM') {
        return true;
    }

    if (entry.actor.playerId && entry.actor.playerId === playerId) {
        return true;
    }

    if (entry.visibility === 'room') {
        return true;
    }

    if (entry.visibility === 'assigned-only') {
        return Boolean(entry.actor.characterId) && entry.actor.characterId === assignedCharacterId;
    }

    return false;
}

export function canViewPrompt(options: PromptOptions): boolean {
    if (options.role === 'GM') {
        return true;
    }

    if (options.audience === 'room') {
        return true;
    }

    return Boolean(options.assignedCharacterId);
}

export function canRespondToPrompt(options: PromptOptions): boolean {
    if (!canViewPrompt(options) || !options.activeCharacterId) {
        return false;
    }

    if (options.role === 'GM') {
        return true;
    }

    if (options.audience === 'room') {
        return true;
    }

    return options.assignedCharacterId === options.activeCharacterId;
}
