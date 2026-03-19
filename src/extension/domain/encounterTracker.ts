import type { PublishedRollEntry } from './roomRolls';

export const ENCOUNTER_STATE_VERSION = 1;

export interface EncounterParticipant {
    id: string;
    characterId: string | null;
    label: string;
    initiative: number;
    sourceRollId: string;
    publishedAt: number;
}

export interface StoredEncounterState {
    version: typeof ENCOUNTER_STATE_VERSION;
    round: number;
    turnIndex: number;
    participants: EncounterParticipant[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function parseEncounterParticipant(value: unknown): EncounterParticipant | null {
    if (
        !isRecord(value)
        || typeof value.id !== 'string'
        || (typeof value.characterId !== 'string' && value.characterId !== null)
        || typeof value.label !== 'string'
        || typeof value.initiative !== 'number'
        || typeof value.sourceRollId !== 'string'
        || typeof value.publishedAt !== 'number'
    ) {
        return null;
    }

    return {
        id: value.id,
        characterId: value.characterId,
        label: value.label,
        initiative: value.initiative,
        sourceRollId: value.sourceRollId,
        publishedAt: value.publishedAt,
    };
}

export function createEmptyEncounterState(): StoredEncounterState {
    return {
        version: ENCOUNTER_STATE_VERSION,
        round: 0,
        turnIndex: 0,
        participants: [],
    };
}

export function parseStoredEncounterState(value: unknown): StoredEncounterState | null {
    if (!isRecord(value) || value.version !== ENCOUNTER_STATE_VERSION || !Array.isArray(value.participants)) {
        return null;
    }

    const participants = value.participants
        .map((participant) => parseEncounterParticipant(participant))
        .filter((participant): participant is EncounterParticipant => Boolean(participant));

    return {
        version: ENCOUNTER_STATE_VERSION,
        round: typeof value.round === 'number' && value.round >= 0 ? Math.trunc(value.round) : 0,
        turnIndex: typeof value.turnIndex === 'number' && value.turnIndex >= 0 ? Math.trunc(value.turnIndex) : 0,
        participants,
    };
}

function toParticipantKey(entry: PublishedRollEntry): string {
    return entry.actor.characterId ?? `player:${entry.actor.playerId ?? entry.actor.playerName}`;
}

export function createEncounterFromInitiativeFeed(feed: PublishedRollEntry[]): StoredEncounterState {
    const initiativeEntries = feed.filter((entry) => entry.result.scope === 'initiative');
    const byParticipant = new Map<string, PublishedRollEntry>();

    for (const entry of initiativeEntries) {
        const key = toParticipantKey(entry);
        const existing = byParticipant.get(key);
        if (!existing || entry.publishedAt > existing.publishedAt) {
            byParticipant.set(key, entry);
        }
    }

    const participants = [...byParticipant.values()]
        .sort((left, right) => {
            if (right.result.total !== left.result.total) {
                return right.result.total - left.result.total;
            }

            if (left.publishedAt !== right.publishedAt) {
                return left.publishedAt - right.publishedAt;
            }

            return left.result.label.localeCompare(right.result.label);
        })
        .map((entry) => ({
            id: `encounter:${toParticipantKey(entry)}`,
            characterId: entry.actor.characterId,
            label: entry.actor.characterName ?? entry.actor.playerName,
            initiative: entry.result.total,
            sourceRollId: entry.id,
            publishedAt: entry.publishedAt,
        }));

    return {
        version: ENCOUNTER_STATE_VERSION,
        round: participants.length > 0 ? 1 : 0,
        turnIndex: 0,
        participants,
    };
}

export function getActiveEncounterParticipant(state: StoredEncounterState): EncounterParticipant | null {
    if (state.participants.length === 0) {
        return null;
    }

    return state.participants[Math.min(state.turnIndex, state.participants.length - 1)] ?? null;
}

export function advanceEncounterTurn(state: StoredEncounterState): StoredEncounterState {
    if (state.participants.length === 0) {
        return state;
    }

    const nextIndex = state.turnIndex + 1;
    if (nextIndex < state.participants.length) {
        return {
            ...state,
            turnIndex: nextIndex,
        };
    }

    return {
        ...state,
        round: Math.max(1, state.round) + 1,
        turnIndex: 0,
    };
}

export function retreatEncounterTurn(state: StoredEncounterState): StoredEncounterState {
    if (state.participants.length === 0) {
        return state;
    }

    const previousIndex = state.turnIndex - 1;
    if (previousIndex >= 0) {
        return {
            ...state,
            turnIndex: previousIndex,
        };
    }

    return {
        ...state,
        round: Math.max(1, state.round - 1),
        turnIndex: Math.max(0, state.participants.length - 1),
    };
}

export function setEncounterTurn(state: StoredEncounterState, participantId: string): StoredEncounterState {
    const nextIndex = state.participants.findIndex((participant) => participant.id === participantId);
    if (nextIndex === -1) {
        return state;
    }

    return {
        ...state,
        turnIndex: nextIndex,
        round: Math.max(1, state.round || 1),
    };
}
