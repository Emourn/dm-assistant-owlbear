import type { StructuredRollResult } from '../../features/dnd2024/domain/types';

export const ROOM_ROLL_STATE_VERSION = 1;
const ROOM_ROLL_FEED_LIMIT = 20;

export interface PublishedRollActor {
    playerId: string | null;
    playerName: string;
    role: 'GM' | 'PLAYER' | null;
    characterId: string | null;
    characterName: string | null;
}

export interface PublishedRollEntry {
    id: string;
    publishedAt: number;
    source: 'manual' | 'prompt';
    actor: PublishedRollActor;
    result: StructuredRollResult;
}

export interface RoomRollPrompt {
    id: string;
    kind: 'initiative';
    label: string;
    createdAt: number;
    createdById: string | null;
    createdByName: string;
}

export interface StoredRoomRollState {
    version: typeof ROOM_ROLL_STATE_VERSION;
    feed: PublishedRollEntry[];
    activePrompt: RoomRollPrompt | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isStructuredRollResult(value: unknown): value is StructuredRollResult {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.label === 'string'
        && typeof value.scope === 'string'
        && typeof value.formula === 'string'
        && typeof value.totalModifier === 'number'
        && Array.isArray(value.breakdown)
        && Array.isArray(value.audit)
        && typeof value.advantage === 'string'
        && typeof value.rolled === 'number'
        && (typeof value.secondaryRolled === 'number' || value.secondaryRolled === null)
        && typeof value.kept === 'number'
        && (typeof value.dropped === 'number' || value.dropped === null)
        && typeof value.total === 'number'
        && isRecord(value.metadata)
        && typeof value.metadata.timestamp === 'number';
}

function isPublishedRollActor(value: unknown): value is PublishedRollActor {
    return isRecord(value)
        && (typeof value.playerId === 'string' || value.playerId === null)
        && typeof value.playerName === 'string'
        && (value.role === 'GM' || value.role === 'PLAYER' || value.role === null)
        && (typeof value.characterId === 'string' || value.characterId === null)
        && (typeof value.characterName === 'string' || value.characterName === null);
}

function isPublishedRollEntry(value: unknown): value is PublishedRollEntry {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.publishedAt === 'number'
        && (value.source === 'manual' || value.source === 'prompt')
        && isPublishedRollActor(value.actor)
        && isStructuredRollResult(value.result);
}

function isRoomRollPrompt(value: unknown): value is RoomRollPrompt {
    return isRecord(value)
        && typeof value.id === 'string'
        && value.kind === 'initiative'
        && typeof value.label === 'string'
        && typeof value.createdAt === 'number'
        && (typeof value.createdById === 'string' || value.createdById === null)
        && typeof value.createdByName === 'string';
}

export function createEmptyRoomRollState(): StoredRoomRollState {
    return {
        version: ROOM_ROLL_STATE_VERSION,
        feed: [],
        activePrompt: null,
    };
}

export function parseStoredRoomRollState(value: unknown): StoredRoomRollState | null {
    if (!isRecord(value) || value.version !== ROOM_ROLL_STATE_VERSION || !Array.isArray(value.feed)) {
        return null;
    }

    return {
        version: ROOM_ROLL_STATE_VERSION,
        feed: value.feed.filter(isPublishedRollEntry).slice(0, ROOM_ROLL_FEED_LIMIT),
        activePrompt: isRoomRollPrompt(value.activePrompt) ? value.activePrompt : null,
    };
}

export function createPublishedRollEntry(
    result: StructuredRollResult,
    actor: PublishedRollActor,
    source: PublishedRollEntry['source'] = 'manual',
): PublishedRollEntry {
    return {
        id: `roll:${result.metadata.timestamp}:${actor.playerId ?? 'anon'}:${result.id}`,
        publishedAt: result.metadata.timestamp,
        source,
        actor,
        result,
    };
}

export function appendPublishedRoll(
    state: StoredRoomRollState,
    entry: PublishedRollEntry,
): StoredRoomRollState {
    return {
        ...state,
        feed: [entry, ...state.feed].slice(0, ROOM_ROLL_FEED_LIMIT),
    };
}

export function createInitiativePrompt(
    createdAt: number,
    createdByName: string,
    createdById: string | null,
): RoomRollPrompt {
    return {
        id: `prompt:initiative:${createdAt}`,
        kind: 'initiative',
        label: 'Prompt initiative',
        createdAt,
        createdById,
        createdByName,
    };
}

export function setActivePrompt(
    state: StoredRoomRollState,
    prompt: RoomRollPrompt | null,
): StoredRoomRollState {
    return {
        ...state,
        activePrompt: prompt,
    };
}
