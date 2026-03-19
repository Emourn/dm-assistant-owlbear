import type { StoredTokenLink } from './tokenLinks';

export const PLAYER_ASSIGNMENT_VERSION = 1;

export interface StoredPlayerAssignments {
    version: typeof PLAYER_ASSIGNMENT_VERSION;
    assignments: Record<string, string>;
}

export interface CharacterViewResolution {
    characterId: string | null;
    source: 'selected-token' | 'assigned-character' | 'active-character' | 'none';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function parseStoredPlayerAssignments(value: unknown): StoredPlayerAssignments | null {
    if (!isRecord(value) || value.version !== PLAYER_ASSIGNMENT_VERSION || !isRecord(value.assignments)) {
        return null;
    }

    const assignments = Object.fromEntries(
        Object.entries(value.assignments).filter(
            (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
        ),
    );

    return {
        version: PLAYER_ASSIGNMENT_VERSION,
        assignments,
    };
}

export function createEmptyPlayerAssignments(): StoredPlayerAssignments {
    return {
        version: PLAYER_ASSIGNMENT_VERSION,
        assignments: {},
    };
}

export function resolveCharacterView(
    role: 'GM' | 'PLAYER' | null,
    selectedLinks: StoredTokenLink[],
    assignedCharacterId: string | null,
    activeCharacterId: string | null,
): CharacterViewResolution {
    if (role === 'PLAYER') {
        const visibleLink = selectedLinks.find((link) => link.visibility === 'room');
        if (visibleLink) {
            return {
                characterId: visibleLink.characterId,
                source: 'selected-token',
            };
        }

        if (assignedCharacterId) {
            return {
                characterId: assignedCharacterId,
                source: 'assigned-character',
            };
        }

        return {
            characterId: null,
            source: 'none',
        };
    }

    if (activeCharacterId) {
        return {
            characterId: activeCharacterId,
            source: 'active-character',
        };
    }

    return {
        characterId: null,
        source: 'none',
    };
}
