import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../types/character';
import { automateCharacter } from './characterAutomation';

describe('characterAutomation', () => {
    it('applies 2024 species, background, and class automation for a sorcerer', async () => {
        const automated = await automateCharacter({
            ...createEmptyCharacter(),
            name: 'Lasair',
            race: 'Dragonborn',
            background: 'Criminal',
            className: 'Sorcerer',
            level: 1,
            abilityScores: {
                str: 13,
                dex: 17,
                con: 14,
                int: 9,
                wis: 14,
                cha: 18
            }
        });

        expect(automated.spellcastingAbility).toBe('cha');
        expect(automated.spellSlots[1].max).toBe(2);
        expect(automated.racialTraits.some((trait) => trait.name === 'Damage Resistance')).toBe(true);
        expect(automated.features.some((feature) => feature.name === 'Innate Sorcery')).toBe(true);
        expect(automated.feats.some((feat) => feat.name === 'Alert')).toBe(true);
        expect(automated.resistances).not.toContain('the');
        expect(automated.initiativeMod).toBeGreaterThanOrEqual(5);
    });

    it('adds feat-driven resources and pact magic automation for a wayfarer warlock', async () => {
        const automated = await automateCharacter({
            ...createEmptyCharacter(),
            name: 'Cassius Neverember',
            race: 'Human',
            background: 'Wayfarer',
            className: 'Warlock',
            level: 1,
            abilityScores: {
                str: 10,
                dex: 14,
                con: 16,
                int: 12,
                wis: 10,
                cha: 16
            }
        });

        expect(automated.spellcastingAbility).toBe('cha');
        expect(automated.spellSlots[1].max).toBe(1);
        expect(automated.feats.some((feat) => feat.name === 'Lucky')).toBe(true);
        expect(automated.resources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Luck Points',
                    max: 2,
                    current: 2,
                    resetOn: 'long'
                })
            ])
        );
    });
});
