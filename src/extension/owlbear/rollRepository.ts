import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import type { Phase1CharacterSheet, StructuredRollResult } from '../../features/dnd2024/domain/types';
import {
    appendPublishedRoll,
    createEmptyRoomRollState,
    createInitiativePrompt,
    createPublishedRollEntry,
    parseStoredRoomRollState,
    setActivePrompt,
    type PublishedRollActor,
    type PublishedRollEntry,
    type StoredRoomRollState,
} from '../domain/roomRolls';
import { EXTENSION_NAMESPACE } from './ids';

export const ROOM_ROLL_STATE_KEY = `${EXTENSION_NAMESPACE}/room-rolls`;

export function getRoomRollStateFromMetadata(metadata: Metadata): StoredRoomRollState {
    return parseStoredRoomRollState(metadata[ROOM_ROLL_STATE_KEY]) ?? createEmptyRoomRollState();
}

async function writeRoomRollState(state: StoredRoomRollState): Promise<void> {
    await OBR.room.setMetadata({
        [ROOM_ROLL_STATE_KEY]: state,
    });
}

export async function readRoomRollState(): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    return getRoomRollStateFromMetadata(metadata);
}

async function buildPublishedRollActor(sheet: Phase1CharacterSheet | null): Promise<PublishedRollActor> {
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

export async function publishRoomRoll(
    result: StructuredRollResult,
    sheet: Phase1CharacterSheet | null,
    source: PublishedRollEntry['source'] = 'manual',
): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const actor = await buildPublishedRollActor(sheet);
    const entry = createPublishedRollEntry(result, actor, source);
    const next = appendPublishedRoll(current, entry);
    await writeRoomRollState(next);
    return next;
}

export async function openInitiativePrompt(): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const [playerId, playerName] = await Promise.all([
        OBR.player.getId().catch(() => null),
        OBR.player.getName().catch(() => 'GM'),
    ]);
    const next = setActivePrompt(current, createInitiativePrompt(Date.now(), playerName, playerId));
    await writeRoomRollState(next);
    return next;
}

export async function clearRoomPrompt(): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const next = setActivePrompt(current, null);
    await writeRoomRollState(next);
    return next;
}
