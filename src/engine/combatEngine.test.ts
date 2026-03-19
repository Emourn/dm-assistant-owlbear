import { describe, expect, it } from 'vitest';
import { convertMonsterToCombatant, createBasicTurnState, parseSpeed } from './combatEngine';

describe('combatEngine hardening', () => {
    it('parses speed from mixed object structures', () => {
        expect(parseSpeed({ walk: '35 ft', fly: { number: 60 } })).toBe(35);
        expect(parseSpeed('40 ft')).toBe(40);
        expect(parseSpeed(undefined)).toBe(30);
    });

    it('normalizes monster AC/HP/CR and defenses from raw 5e.tools-style payloads', () => {
        const monster = convertMonsterToCombatant({
            name: 'Ancient Test Dragon',
            dex: 10,
            str: 27,
            con: 25,
            int: 16,
            wis: 15,
            cha: 19,
            ac: [{ ac: 22, from: ['natural armor'] }],
            hp: { average: 546, formula: '28d20+252' },
            cr: { cr: '24' },
            speed: { walk: 40, fly: { number: 80 }, swim: 40 },
            resist: [{ res: ['fire'], note: 'while raging' }],
            immune: ['poison'],
            vulnerable: [],
            conditionImmune: ['poisoned'],
            source: 'MM',
            spellcasting: [{ spells: { 1: { slots: 4 } } }]
        });

        expect(monster.ac).toBe(22);
        expect(monster.maxHp).toBe(546);
        expect(monster.currentHp).toBe(546);
        expect(monster.proficiencyBonus).toBe(7);
        expect(monster.speed).toContain('walk 40 ft');
        expect(monster.speed).toContain('fly 80 ft');
        expect(monster.resistances).toContain('fire');
        expect(monster.immunities).toContain('poison');
        expect(monster.conditionImmunities).toContain('poisoned');
        expect(monster.damageNotes).toContain('while raging');
        expect(monster.spellSlots?.[1]).toEqual({ current: 4, max: 4 });
    });

    it('derives HP average from dice formula when average field is absent', () => {
        const monster = convertMonsterToCombatant({
            name: 'Formula Ogre',
            ac: 12,
            hp: { formula: '8d8+16' },
            cr: '2',
            speed: '40 ft'
        });
        expect(monster.maxHp).toBe(52);
        expect(monster.currentHp).toBe(52);
    });

    it('enforces no-action state for incapacitated combatants', () => {
        const state = createBasicTurnState({
            id: 'c1',
            type: 'monster',
            name: 'Paralyzed Target',
            ac: 10,
            maxHp: 10,
            currentHp: 10,
            tempHp: 0,
            speed: '30 ft',
            initiativeMod: 0,
            initiativeScore: null,
            dexterityScore: 10,
            conditions: [{ id: 'paralyzed', name: 'Paralyzed', icon: 'x', description: 'Cannot take actions.' }]
        });

        expect(state.hasAction).toBe(false);
        expect(state.hasBonusAction).toBe(false);
        expect(state.hasReaction).toBe(false);
        expect(state.movementRemaining).toBe(0);
    });
});
