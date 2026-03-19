import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../types/character';
import { inferCharacterEdition, mergeCharacterProvenance, normalizeCharacterProvenance } from './sourceMetadata';

describe('sourceMetadata', () => {
    it('defaults manual characters to manual provenance', () => {
        const character = createEmptyCharacter();
        const provenance = normalizeCharacterProvenance(character);

        expect(provenance.origin).toBe('manual');
        expect(provenance.edition).toBe('unknown');
        expect(provenance.sourceSummary).toBe('Manual Entry');
    });

    it('infers 2024 edition from imported rules content', () => {
        const edition = inferCharacterEdition({
            ...createEmptyCharacter(),
            provenance: {
                origin: 'dnd-beyond-pdf',
                edition: 'unknown',
                sourceSummary: 'D&D Beyond PDF'
            },
            features: [
                {
                    id: 'f1',
                    name: 'Innate Sorcery',
                    source: 'Sorcerer',
                    description: '',
                    hasUses: false,
                    is2024: true
                }
            ]
        });

        expect(edition).toBe('2024');
    });

    it('merges different import origins into mixed provenance', () => {
        const initial = mergeCharacterProvenance(undefined, {
            origin: '5etools',
            edition: '2024',
            sourceSummary: 'XPHB'
        });

        const mixed = mergeCharacterProvenance(initial, {
            origin: 'homebrew',
            edition: '2014',
            sourceSummary: 'Custom Pack'
        });

        expect(mixed.origin).toBe('mixed');
        expect(mixed.edition).toBe('mixed');
        expect(mixed.sourceSummary).toContain('XPHB');
        expect(mixed.sourceSummary).toContain('Custom Pack');
    });
});
