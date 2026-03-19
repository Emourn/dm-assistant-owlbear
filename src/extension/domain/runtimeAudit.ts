export const RUNTIME_AUDIT_VERSION = 1;
const RUNTIME_AUDIT_LIMIT = 50;

export type RuntimeAuditCategory = 'resource' | 'rest' | 'death-save' | 'override' | 'roll' | 'prompt';

export interface RuntimeAuditActor {
    playerId: string | null;
    playerName: string;
    role: 'GM' | 'PLAYER' | null;
    characterId: string | null;
    characterName: string | null;
}

export interface RuntimeAuditEntry {
    id: string;
    recordedAt: number;
    category: RuntimeAuditCategory;
    action: string;
    details: string[];
    actor: RuntimeAuditActor;
}

export interface StoredRuntimeAuditState {
    version: typeof RUNTIME_AUDIT_VERSION;
    entries: RuntimeAuditEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isRuntimeAuditActor(value: unknown): value is RuntimeAuditActor {
    return isRecord(value)
        && (typeof value.playerId === 'string' || value.playerId === null)
        && typeof value.playerName === 'string'
        && (value.role === 'GM' || value.role === 'PLAYER' || value.role === null)
        && (typeof value.characterId === 'string' || value.characterId === null)
        && (typeof value.characterName === 'string' || value.characterName === null);
}

function parseRuntimeAuditEntry(value: unknown): RuntimeAuditEntry | null {
    if (
        !isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.recordedAt !== 'number'
        || !['resource', 'rest', 'death-save', 'override', 'roll', 'prompt'].includes(String(value.category))
        || typeof value.action !== 'string'
        || !Array.isArray(value.details)
        || !isRuntimeAuditActor(value.actor)
    ) {
        return null;
    }

    return {
        id: value.id,
        recordedAt: value.recordedAt,
        category: value.category as RuntimeAuditCategory,
        action: value.action,
        details: value.details.filter((detail): detail is string => typeof detail === 'string'),
        actor: value.actor,
    };
}

export function createEmptyRuntimeAuditState(): StoredRuntimeAuditState {
    return {
        version: RUNTIME_AUDIT_VERSION,
        entries: [],
    };
}

export function parseStoredRuntimeAuditState(value: unknown): StoredRuntimeAuditState | null {
    if (!isRecord(value) || value.version !== RUNTIME_AUDIT_VERSION || !Array.isArray(value.entries)) {
        return null;
    }

    return {
        version: RUNTIME_AUDIT_VERSION,
        entries: value.entries
            .map((entry) => parseRuntimeAuditEntry(entry))
            .filter((entry): entry is RuntimeAuditEntry => Boolean(entry))
            .slice(0, RUNTIME_AUDIT_LIMIT),
    };
}

export function createRuntimeAuditEntry(
    category: RuntimeAuditCategory,
    action: string,
    details: string[],
    actor: RuntimeAuditActor,
    recordedAt: number,
): RuntimeAuditEntry {
    return {
        id: `audit:${category}:${recordedAt}:${actor.playerId ?? 'anon'}:${action.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        recordedAt,
        category,
        action,
        details: details.filter(Boolean),
        actor,
    };
}

export function appendRuntimeAuditEntry(
    state: StoredRuntimeAuditState,
    entry: RuntimeAuditEntry,
): StoredRuntimeAuditState {
    return {
        ...state,
        entries: [entry, ...state.entries].slice(0, RUNTIME_AUDIT_LIMIT),
    };
}

export function clearRuntimeAuditEntries(): StoredRuntimeAuditState {
    return createEmptyRuntimeAuditState();
}
