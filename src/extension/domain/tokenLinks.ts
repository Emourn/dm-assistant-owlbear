import { canViewVisibilityScopedCharacter, type SharedVisibility } from './visibilitySettings';

export const TOKEN_LINK_VERSION = 1;

export type TokenLinkVisibility = SharedVisibility;

export interface StoredTokenLink {
    version: typeof TOKEN_LINK_VERSION;
    characterId: string;
    characterName: string;
    visibility: TokenLinkVisibility;
    linkedAt: number;
    linkedBy: string;
}

export interface TokenSelectionResolution {
    characterId: string | null;
    source: 'selected-token' | 'active-character' | 'none';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function parseStoredTokenLink(value: unknown): StoredTokenLink | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        value.version !== TOKEN_LINK_VERSION
        || typeof value.characterId !== 'string'
        || typeof value.characterName !== 'string'
        || typeof value.linkedAt !== 'number'
        || typeof value.linkedBy !== 'string'
    ) {
        return null;
    }

    const visibility = value.visibility === 'gm-only'
        ? 'gm-only'
        : value.visibility === 'assigned-only'
            ? 'assigned-only'
            : value.visibility === 'room'
                ? 'room'
                : null;
    if (!visibility) {
        return null;
    }

    return {
        version: TOKEN_LINK_VERSION,
        characterId: value.characterId,
        characterName: value.characterName,
        visibility,
        linkedAt: value.linkedAt,
        linkedBy: value.linkedBy,
    };
}

export function resolveCharacterIdFromSelection(
    role: 'GM' | 'PLAYER' | null,
    selectedLinks: StoredTokenLink[],
    assignedCharacterId: string | null,
    fallbackCharacterId: string | null,
): TokenSelectionResolution {
    const allowedLink = selectedLinks.find((link) =>
        canViewVisibilityScopedCharacter(role, link.visibility, assignedCharacterId, link.characterId),
    );
    if (allowedLink) {
        return {
            characterId: allowedLink.characterId,
            source: 'selected-token',
        };
    }

    if (fallbackCharacterId) {
        return {
            characterId: fallbackCharacterId,
            source: 'active-character',
        };
    }

    return {
        characterId: null,
        source: 'none',
    };
}
