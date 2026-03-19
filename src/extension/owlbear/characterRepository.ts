import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import {
    createEmptyCharacterCollection,
    createSampleCharacterCollection,
    parseStoredCharacterCollection,
    selectActiveCharacterRecord,
    updateStoredCharacterRecord,
    type StoredCharacterCollection,
    type StoredCharacterRecord,
} from '../domain/characterRecords';
import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';
import { EXTENSION_NAMESPACE } from './ids';

export const ROOM_CHARACTER_COLLECTION_KEY = `${EXTENSION_NAMESPACE}/characters`;

export interface CharacterRepositorySnapshot {
    collection: StoredCharacterCollection;
    activeCharacter: StoredCharacterRecord | null;
    source: 'room-metadata' | 'demo-seed' | 'empty';
}

export function getCharacterCollectionFromMetadata(metadata: Metadata): StoredCharacterCollection | null {
    return parseStoredCharacterCollection(metadata[ROOM_CHARACTER_COLLECTION_KEY]);
}

async function writeCharacterCollection(collection: StoredCharacterCollection): Promise<void> {
    await OBR.room.setMetadata({
        [ROOM_CHARACTER_COLLECTION_KEY]: collection,
    });
}

export async function readCharacterRepositorySnapshot(
    role: 'GM' | 'PLAYER' | null,
): Promise<CharacterRepositorySnapshot> {
    const metadata = await OBR.room.getMetadata();
    const existing = getCharacterCollectionFromMetadata(metadata);

    if (existing) {
        return {
            collection: existing,
            activeCharacter: selectActiveCharacterRecord(existing),
            source: 'room-metadata',
        };
    }

    if (role === 'GM') {
        const seeded = createSampleCharacterCollection();
        await writeCharacterCollection(seeded);
        return {
            collection: seeded,
            activeCharacter: selectActiveCharacterRecord(seeded),
            source: 'demo-seed',
        };
    }

    const empty = createEmptyCharacterCollection();
    return {
        collection: empty,
        activeCharacter: null,
        source: 'empty',
    };
}

export async function setActiveCharacterRecord(characterId: string): Promise<CharacterRepositorySnapshot | null> {
    const metadata = await OBR.room.getMetadata();
    const current = getCharacterCollectionFromMetadata(metadata);
    if (!current || !current.characters.some((record) => record.sheet.id === characterId)) {
        return null;
    }

    const next: StoredCharacterCollection = {
        ...current,
        activeCharacterId: characterId,
    };

    await writeCharacterCollection(next);
    return {
        collection: next,
        activeCharacter: selectActiveCharacterRecord(next),
        source: 'room-metadata',
    };
}

export async function updateCharacterSheet(
    characterId: string,
    sheet: Phase1CharacterSheet,
): Promise<CharacterRepositorySnapshot | null> {
    const metadata = await OBR.room.getMetadata();
    const current = getCharacterCollectionFromMetadata(metadata);
    if (!current) {
        return null;
    }

    const next = updateStoredCharacterRecord(
        current,
        characterId,
        (record) => ({
            ...record,
            sheet,
        }),
    );

    if (!next) {
        return null;
    }

    await writeCharacterCollection(next);
    return {
        collection: next,
        activeCharacter: selectActiveCharacterRecord(next),
        source: 'room-metadata',
    };
}
