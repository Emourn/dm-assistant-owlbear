import { describe, expect, it } from 'vitest';
import {
    addBlankCharacterRecord,
    CHARACTER_COLLECTION_VERSION,
    createSampleCharacterCollection,
    deleteStoredCharacterRecord,
    duplicateStoredCharacterRecord,
    parseStoredCharacterCollection,
    selectActiveCharacterRecord,
    updateStoredCharacterRecord,
} from './characterRecords';

describe('extension character records', () => {
    it('creates a versioned sample collection with an active character', () => {
        const collection = createSampleCharacterCollection(1000);
        const active = selectActiveCharacterRecord(collection);

        expect(collection.version).toBe(CHARACTER_COLLECTION_VERSION);
        expect(collection.characters).toHaveLength(1);
        expect(active?.sheet.name).toBe('Seraphina Vale');
        expect(active?.sheet.spellcasting?.saveDc).toBe(15);
    });

    it('parses valid stored metadata and falls back to the first character when active id is missing', () => {
        const collection = createSampleCharacterCollection(1000);
        const parsed = parseStoredCharacterCollection({
            ...collection,
            activeCharacterId: null,
        });

        expect(parsed).not.toBeNull();
        expect(selectActiveCharacterRecord(parsed!)?.sheet.id).toBe(collection.characters[0].sheet.id);
    });

    it('rejects incompatible collection shapes', () => {
        expect(parseStoredCharacterCollection({ version: 99, characters: [] })).toBeNull();
        expect(parseStoredCharacterCollection('nope')).toBeNull();
    });

    it('updates a stored record and stamps a new update time', () => {
        const collection = createSampleCharacterCollection(1000);
        const updated = updateStoredCharacterRecord(
            collection,
            collection.characters[0].sheet.id,
            (record) => ({
                ...record,
                sheet: {
                    ...record.sheet,
                    name: 'Seraphina Stormvale',
                    abilities: {
                        ...record.sheet.abilities,
                        wis: 20,
                    },
                },
            }),
            2000,
        );

        expect(updated).not.toBeNull();
        expect(updated?.characters[0].sheet.name).toBe('Seraphina Stormvale');
        expect(updated?.characters[0].sheet.abilities.wis).toBe(20);
        expect(updated?.characters[0].updatedAt).toBe(2000);
    });

    it('adds a new blank character and makes it active', () => {
        const collection = createSampleCharacterCollection(1000);
        const next = addBlankCharacterRecord(collection, 2000);
        const active = selectActiveCharacterRecord(next);

        expect(next.characters).toHaveLength(2);
        expect(active?.sheet.name).toBe('New Character');
        expect(active?.sheet.classSummary).toBe('Adventurer');
        expect(active?.sheet.skills.acrobatics.proficiency).toBe('none');
    });

    it('duplicates a character with remapped owned ids and copied resource references', () => {
        const collection = createSampleCharacterCollection(1000);
        const next = duplicateStoredCharacterRecord(collection, collection.characters[0].sheet.id, 2000);
        const duplicated = next?.characters[1];

        expect(next?.characters).toHaveLength(2);
        expect(duplicated?.sheet.name).toBe('Seraphina Vale Copy');
        expect(duplicated?.sheet.id).not.toBe(collection.characters[0].sheet.id);
        expect(duplicated?.sheet.spellcasting?.slots[0].id).toContain(`${duplicated?.sheet.id}:`);
        expect(duplicated?.sheet.actions[2].automation?.resourceCost?.resourceId).toBe(
            duplicated?.sheet.spellcasting?.slots[0].id,
        );
        expect(duplicated?.updatedAt).toBe(2000);
    });

    it('deletes the active character and promotes a neighbor', () => {
        const seeded = addBlankCharacterRecord(createSampleCharacterCollection(1000), 2000);
        const deleted = deleteStoredCharacterRecord(seeded, seeded.activeCharacterId!);

        expect(deleted?.characters).toHaveLength(1);
        expect(selectActiveCharacterRecord(deleted!)?.sheet.name).toBe('Seraphina Vale');
    });

    it('allows removing the final character and leaves an empty collection', () => {
        const collection = createSampleCharacterCollection(1000);
        const deleted = deleteStoredCharacterRecord(collection, collection.characters[0].sheet.id);

        expect(deleted?.characters).toHaveLength(0);
        expect(deleted?.activeCharacterId).toBeNull();
    });
});
