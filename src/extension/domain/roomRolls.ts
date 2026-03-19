import { ABILITY_BY_ID, SKILL_BY_ID } from '../../features/dnd2024/domain/constants';
import {
    buildAbilityCheckRoll,
    buildInitiativeRoll,
    buildSavingThrowRoll,
    buildSkillCheckRoll,
} from '../../features/dnd2024/domain/sheet';
import type {
    AbilityId,
    Phase1CharacterSheet,
    SkillId,
    StructuredRollRequest,
    StructuredRollResult,
} from '../../features/dnd2024/domain/types';
import type { PromptAudience, SharedVisibility } from './visibilitySettings';

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
    visibility: SharedVisibility;
    actor: PublishedRollActor;
    result: StructuredRollResult;
}

export type RoomRollPromptDraft =
    | { kind: 'initiative' }
    | { kind: 'ability'; ability: AbilityId }
    | { kind: 'saving-throw'; ability: AbilityId }
    | { kind: 'skill'; skillId: SkillId };

interface BaseRoomRollPrompt {
    id: string;
    label: string;
    audience: PromptAudience;
    createdAt: number;
    createdById: string | null;
    createdByName: string;
}

export type RoomRollPrompt =
    | (BaseRoomRollPrompt & { kind: 'initiative' })
    | (BaseRoomRollPrompt & { kind: 'ability'; ability: AbilityId })
    | (BaseRoomRollPrompt & { kind: 'saving-throw'; ability: AbilityId })
    | (BaseRoomRollPrompt & { kind: 'skill'; skillId: SkillId });

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

function parsePublishedRollEntry(value: unknown): PublishedRollEntry | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        typeof value.id !== 'string'
        || typeof value.publishedAt !== 'number'
        || (value.source !== 'manual' && value.source !== 'prompt')
        || !isPublishedRollActor(value.actor)
        || !isStructuredRollResult(value.result)
    ) {
        return null;
    }

    const visibility: SharedVisibility = value.visibility === 'assigned-only'
        ? 'assigned-only'
        : value.visibility === 'gm-only'
            ? 'gm-only'
            : 'room';

    return {
        id: value.id,
        publishedAt: value.publishedAt,
        source: value.source,
        visibility,
        actor: value.actor,
        result: value.result,
    };
}

function parseRoomRollPrompt(value: unknown): RoomRollPrompt | null {
    if (
        !isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.label !== 'string'
        || typeof value.createdAt !== 'number'
        || (typeof value.createdById !== 'string' && value.createdById !== null)
        || typeof value.createdByName !== 'string'
    ) {
        return null;
    }

    const audience: PromptAudience = value.audience === 'assigned-only' ? 'assigned-only' : 'room';
    const base = {
        id: value.id,
        label: value.label,
        audience,
        createdAt: value.createdAt,
        createdById: value.createdById,
        createdByName: value.createdByName,
    };

    if (value.kind === 'initiative') {
        return {
            ...base,
            kind: 'initiative',
        };
    }

    if (
        value.kind === 'ability'
        && typeof value.ability === 'string'
        && value.ability in ABILITY_BY_ID
    ) {
        return {
            ...base,
            kind: 'ability',
            ability: value.ability as AbilityId,
        };
    }

    if (
        value.kind === 'saving-throw'
        && typeof value.ability === 'string'
        && value.ability in ABILITY_BY_ID
    ) {
        return {
            ...base,
            kind: 'saving-throw',
            ability: value.ability as AbilityId,
        };
    }

    if (
        value.kind === 'skill'
        && typeof value.skillId === 'string'
        && value.skillId in SKILL_BY_ID
    ) {
        return {
            ...base,
            kind: 'skill',
            skillId: value.skillId as SkillId,
        };
    }

    return null;
}

function describePromptLabel(prompt: RoomRollPromptDraft): string {
    if (prompt.kind === 'initiative') {
        return 'Prompt initiative';
    }

    if (prompt.kind === 'ability') {
        return `Prompt ${ABILITY_BY_ID[prompt.ability].name} Check`;
    }

    if (prompt.kind === 'saving-throw') {
        return `Prompt ${ABILITY_BY_ID[prompt.ability].name} Saving Throw`;
    }

    return `Prompt ${SKILL_BY_ID[prompt.skillId].label}`;
}

export function describeRoomRollPrompt(prompt: RoomRollPromptDraft | RoomRollPrompt): string {
    return describePromptLabel(prompt);
}

export function buildPromptRollRequest(
    sheet: Phase1CharacterSheet,
    prompt: RoomRollPrompt,
): StructuredRollRequest {
    if (prompt.kind === 'initiative') {
        return buildInitiativeRoll(sheet);
    }

    if (prompt.kind === 'ability') {
        return buildAbilityCheckRoll(sheet, prompt.ability);
    }

    if (prompt.kind === 'saving-throw') {
        return buildSavingThrowRoll(sheet, prompt.ability);
    }

    return buildSkillCheckRoll(sheet, prompt.skillId);
}

export function createRoomRollPrompt(
    prompt: RoomRollPromptDraft,
    createdAt: number,
    createdByName: string,
    createdById: string | null,
    audience: PromptAudience,
): RoomRollPrompt {
    const base = {
        id: `prompt:${prompt.kind}:${createdAt}`,
        label: describePromptLabel(prompt),
        audience,
        createdAt,
        createdById,
        createdByName,
    };

    if (prompt.kind === 'initiative') {
        return {
            ...base,
            kind: 'initiative',
        };
    }

    if (prompt.kind === 'ability') {
        return {
            ...base,
            kind: 'ability',
            ability: prompt.ability,
        };
    }

    if (prompt.kind === 'saving-throw') {
        return {
            ...base,
            kind: 'saving-throw',
            ability: prompt.ability,
        };
    }

    return {
        ...base,
        kind: 'skill',
        skillId: prompt.skillId,
    };
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
        feed: value.feed
            .map((entry) => parsePublishedRollEntry(entry))
            .filter((entry): entry is PublishedRollEntry => Boolean(entry))
            .slice(0, ROOM_ROLL_FEED_LIMIT),
        activePrompt: parseRoomRollPrompt(value.activePrompt),
    };
}

export function createPublishedRollEntry(
    result: StructuredRollResult,
    actor: PublishedRollActor,
    visibility: SharedVisibility,
    source: PublishedRollEntry['source'] = 'manual',
): PublishedRollEntry {
    return {
        id: `roll:${result.metadata.timestamp}:${actor.playerId ?? 'anon'}:${result.id}`,
        publishedAt: result.metadata.timestamp,
        source,
        visibility,
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

export function setActivePrompt(
    state: StoredRoomRollState,
    prompt: RoomRollPrompt | null,
): StoredRoomRollState {
    return {
        ...state,
        activePrompt: prompt,
    };
}
