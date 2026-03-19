import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';
import {
    appendRuntimeAuditEntry,
    clearRuntimeAuditEntries,
    createEmptyRuntimeAuditState,
    createRuntimeAuditEntry,
    parseStoredRuntimeAuditState,
    type RuntimeAuditCategory,
    type RuntimeAuditActor,
    type StoredRuntimeAuditState,
} from '../domain/runtimeAudit';
import { EXTENSION_NAMESPACE } from './ids';

export const RUNTIME_AUDIT_STATE_KEY = `${EXTENSION_NAMESPACE}/runtime-audit`;

export function getRuntimeAuditStateFromMetadata(metadata: Metadata): StoredRuntimeAuditState {
    return parseStoredRuntimeAuditState(metadata[RUNTIME_AUDIT_STATE_KEY]) ?? createEmptyRuntimeAuditState();
}

async function writeRuntimeAuditState(state: StoredRuntimeAuditState): Promise<void> {
    await OBR.room.setMetadata({
        [RUNTIME_AUDIT_STATE_KEY]: state,
    });
}

async function buildRuntimeAuditActor(sheet: Phase1CharacterSheet | null): Promise<RuntimeAuditActor> {
    const [playerId, playerName, role] = await Promise.all([
        OBR.player.getId().catch(() => null),
        OBR.player.getName().catch(() => 'Unknown Player'),
        OBR.player.getRole().catch(() => null),
    ]);

    return {
        playerId,
        playerName,
        role,
        characterId: sheet?.id ?? null,
        characterName: sheet?.name ?? null,
    };
}

export async function readRuntimeAuditState(): Promise<StoredRuntimeAuditState> {
    const metadata = await OBR.room.getMetadata();
    return getRuntimeAuditStateFromMetadata(metadata);
}

export async function recordRuntimeAudit(
    category: RuntimeAuditCategory,
    action: string,
    details: string[],
    sheet: Phase1CharacterSheet | null,
): Promise<StoredRuntimeAuditState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRuntimeAuditStateFromMetadata(metadata);
    const actor = await buildRuntimeAuditActor(sheet);
    const next = appendRuntimeAuditEntry(current, createRuntimeAuditEntry(category, action, details, actor, Date.now()));
    await writeRuntimeAuditState(next);
    return next;
}

export async function clearRuntimeAuditHistory(): Promise<StoredRuntimeAuditState> {
    const next = clearRuntimeAuditEntries();
    await writeRuntimeAuditState(next);
    return next;
}
