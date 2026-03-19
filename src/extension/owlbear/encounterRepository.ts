import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import {
    advanceEncounterTurn,
    createEmptyEncounterState,
    createEncounterFromInitiativeFeed,
    parseStoredEncounterState,
    retreatEncounterTurn,
    setEncounterTurn,
    type StoredEncounterState,
} from '../domain/encounterTracker';
import { getRoomRollStateFromMetadata } from './rollRepository';
import { EXTENSION_NAMESPACE } from './ids';

export const ROOM_ENCOUNTER_STATE_KEY = `${EXTENSION_NAMESPACE}/encounter`;

export function getEncounterStateFromMetadata(metadata: Metadata): StoredEncounterState {
    return parseStoredEncounterState(metadata[ROOM_ENCOUNTER_STATE_KEY]) ?? createEmptyEncounterState();
}

async function writeEncounterState(state: StoredEncounterState): Promise<void> {
    await OBR.room.setMetadata({
        [ROOM_ENCOUNTER_STATE_KEY]: state,
    });
}

export async function readEncounterState(): Promise<StoredEncounterState> {
    const metadata = await OBR.room.getMetadata();
    return getEncounterStateFromMetadata(metadata);
}

export async function buildEncounterFromRoomRollFeed(): Promise<StoredEncounterState> {
    const metadata = await OBR.room.getMetadata();
    const roomRollState = getRoomRollStateFromMetadata(metadata);
    const next = createEncounterFromInitiativeFeed(roomRollState.feed);
    await writeEncounterState(next);
    return next;
}

export async function clearEncounterState(): Promise<StoredEncounterState> {
    const next = createEmptyEncounterState();
    await writeEncounterState(next);
    return next;
}

export async function advanceEncounterState(): Promise<StoredEncounterState> {
    const metadata = await OBR.room.getMetadata();
    const current = getEncounterStateFromMetadata(metadata);
    const next = advanceEncounterTurn(current);
    await writeEncounterState(next);
    return next;
}

export async function retreatEncounterState(): Promise<StoredEncounterState> {
    const metadata = await OBR.room.getMetadata();
    const current = getEncounterStateFromMetadata(metadata);
    const next = retreatEncounterTurn(current);
    await writeEncounterState(next);
    return next;
}

export async function setEncounterActiveParticipant(participantId: string): Promise<StoredEncounterState> {
    const metadata = await OBR.room.getMetadata();
    const current = getEncounterStateFromMetadata(metadata);
    const next = setEncounterTurn(current, participantId);
    await writeEncounterState(next);
    return next;
}
