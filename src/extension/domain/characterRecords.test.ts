import { describe, expect, it } from 'vitest';
import {
    CHARACTER_COLLECTION_VERSION,
    createSampleCharacterCollection,
    parseStoredCharacterCollection,
    selectActiveCharacterRecord,
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
});
