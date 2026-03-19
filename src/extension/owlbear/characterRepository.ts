import OBR, { type Item, type Metadata } from '@owlbear-rodeo/sdk';
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
import {
    parseStoredTokenLink,
    resolveCharacterIdFromSelection,
    TOKEN_LINK_VERSION,
    type StoredTokenLink,
    type TokenLinkVisibility,
    type TokenSelectionResolution,
} from '../domain/tokenLinks';
import { EXTENSION_NAMESPACE } from './ids';

export const ROOM_CHARACTER_COLLECTION_KEY = `${EXTENSION_NAMESPACE}/characters`;
export const TOKEN_CHARACTER_LINK_KEY = `${EXTENSION_NAMESPACE}/token-link`;

export interface TokenSelectionState {
    count: number;
    linkedCount: number;
    links: StoredTokenLink[];
}

export interface CharacterRepositorySnapshot {
    collection: StoredCharacterCollection;
    activeCharacter: StoredCharacterRecord | null;
    source: 'room-metadata' | 'demo-seed' | 'empty';
    resolution: TokenSelectionResolution;
    selection: TokenSelectionState;
}

export function getCharacterCollectionFromMetadata(metadata: Metadata): StoredCharacterCollection | null {
    return parseStoredCharacterCollection(metadata[ROOM_CHARACTER_COLLECTION_KEY]);
}

function getTokenCharacterLink(item: Item): StoredTokenLink | null {
    return parseStoredTokenLink(item.metadata[TOKEN_CHARACTER_LINK_KEY]);
}

async function getSelectionState(): Promise<TokenSelectionState> {
    const selectedIds = (await OBR.player.getSelection()) ?? [];
    if (!selectedIds.length) {
        return {
            count: 0,
            linkedCount: 0,
            links: [],
        };
    }

    const items = await OBR.scene.items.getItems(selectedIds);
    const links = items
        .map((item) => getTokenCharacterLink(item))
        .filter((value): value is StoredTokenLink => Boolean(value));

    return {
        count: items.length,
        linkedCount: links.length,
        links,
    };
}

function buildSnapshot(
    collection: StoredCharacterCollection,
    source: CharacterRepositorySnapshot['source'],
    role: 'GM' | 'PLAYER' | null,
    selection: TokenSelectionState,
): CharacterRepositorySnapshot {
    const fallback = selectActiveCharacterRecord(collection);
    const preferred = resolveCharacterIdFromSelection(
        role === 'PLAYER' ? role : null,
        selection.links,
        fallback?.sheet.id ?? null,
    );
    const resolvedRecord = collection.characters.find((record) => record.sheet.id === preferred.characterId) ?? null;
    const activeCharacter = resolvedRecord ?? fallback ?? null;
    const resolution = resolvedRecord
        ? preferred
        : activeCharacter
            ? { characterId: activeCharacter.sheet.id, source: 'active-character' as const }
            : { characterId: null, source: 'none' as const };

    return {
        collection,
        activeCharacter,
        source,
        resolution,
        selection,
    };
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
    const selection = await getSelectionState();
    const existing = getCharacterCollectionFromMetadata(metadata);

    if (existing) {
        return buildSnapshot(existing, 'room-metadata', role, selection);
    }

    if (role === 'GM') {
        const seeded = createSampleCharacterCollection();
        await writeCharacterCollection(seeded);
        return buildSnapshot(seeded, 'demo-seed', role, selection);
    }

    const empty = createEmptyCharacterCollection();
    return buildSnapshot(empty, 'empty', role, selection);
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
    const role = await OBR.player.getRole();
    const selection = await getSelectionState();
    return buildSnapshot(next, 'room-metadata', role, selection);
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
    const role = await OBR.player.getRole();
    const selection = await getSelectionState();
    return buildSnapshot(next, 'room-metadata', role, selection);
}

export async function linkActiveCharacterToSelection(
    sheet: Phase1CharacterSheet,
    visibility: TokenLinkVisibility = 'room',
): Promise<CharacterRepositorySnapshot | null> {
    const selectedIds = (await OBR.player.getSelection()) ?? [];
    if (!selectedIds.length) {
        return null;
    }

    const playerId = await OBR.player.getId();
    await OBR.scene.items.updateItems(selectedIds, (draft) => {
        draft.forEach((item) => {
            item.metadata[TOKEN_CHARACTER_LINK_KEY] = {
                version: TOKEN_LINK_VERSION,
                characterId: sheet.id,
                characterName: sheet.name,
                visibility,
                linkedAt: Date.now(),
                linkedBy: playerId,
            };
        });
    });

    const role = await OBR.player.getRole();
    return readCharacterRepositorySnapshot(role);
}

export async function unlinkSelectionCharacters(): Promise<CharacterRepositorySnapshot | null> {
    const selectedIds = (await OBR.player.getSelection()) ?? [];
    if (!selectedIds.length) {
        return null;
    }

    await OBR.scene.items.updateItems(selectedIds, (draft) => {
        draft.forEach((item) => {
            delete item.metadata[TOKEN_CHARACTER_LINK_KEY];
        });
    });

    const role = await OBR.player.getRole();
    return readCharacterRepositorySnapshot(role);
}
