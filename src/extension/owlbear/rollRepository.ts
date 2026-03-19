import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import type { Phase1CharacterSheet, StructuredRollResult } from '../../features/dnd2024/domain/types';
import {
    appendPublishedRoll,
    createEmptyRoomRollState,
    createPublishedRollEntry,
    createRoomRollPrompt,
    parseStoredRoomRollState,
    setActivePrompt,
    type PublishedRollActor,
    type PublishedRollEntry,
    type RoomRollPromptDraft,
    type StoredRoomRollState,
} from '../domain/roomRolls';
import type { PromptAudience, SharedVisibility } from '../domain/visibilitySettings';
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
    visibility: SharedVisibility,
    source: PublishedRollEntry['source'] = 'manual',
): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const actor = await buildPublishedRollActor(sheet);
    const entry = createPublishedRollEntry(result, actor, visibility, source);
    const next = appendPublishedRoll(current, entry);
    await writeRoomRollState(next);
    return next;
}

export async function publishRoomRollBatch(
    entries: Array<{
        result: StructuredRollResult;
        sheet: Phase1CharacterSheet | null;
    }>,
    visibility: SharedVisibility,
    source: PublishedRollEntry['source'] = 'manual',
): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const [playerId, playerName, role] = await Promise.all([
        OBR.player.getId().catch(() => null),
        OBR.player.getName().catch(() => 'Unknown Player'),
        OBR.player.getRole().catch(() => null),
    ]);

    let next = current;
    for (const entry of entries) {
        const actor: PublishedRollActor = {
            playerId,
            playerName,
            role,
            characterId: entry.sheet?.id ?? null,
            characterName: entry.sheet?.name ?? null,
        };
        next = appendPublishedRoll(next, createPublishedRollEntry(entry.result, actor, visibility, source));
    }

    await writeRoomRollState(next);
    return next;
}

export async function openRoomPrompt(
    prompt: RoomRollPromptDraft,
    audience: PromptAudience,
): Promise<StoredRoomRollState> {
    const metadata = await OBR.room.getMetadata();
    const current = getRoomRollStateFromMetadata(metadata);
    const [playerId, playerName] = await Promise.all([
        OBR.player.getId().catch(() => null),
        OBR.player.getName().catch(() => 'GM'),
    ]);
    const next = setActivePrompt(current, createRoomRollPrompt(prompt, Date.now(), playerName, playerId, audience));
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
