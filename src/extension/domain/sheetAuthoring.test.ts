import { describe, expect, it } from 'vitest';
import { createSampleCharacterCollection } from './characterRecords';
import { updateSheetActions, updateSheetSpellcasting } from './sheetAuthoring';

function getSampleSheet() {
    return createSampleCharacterCollection(1000).characters[0].sheet;
}

describe('sheet authoring helpers', () => {
    it('sanitizes action entries and generates stable child ids', () => {
        const sheet = getSampleSheet();
        const updated = updateSheetActions(sheet, [
            {
                name: '  Longsword  ',
                kind: ' Attack ',
                source: ' Equipped weapon ',
                description: '  Melee weapon attack. ',
                automationMode: 'attack-roll',
                attackSource: 'str',
                proficient: true,
                attackBonus: 1,
                attackRange: 'melee',
                outcomes: [
                    {
                        label: ' On hit ',
                        kind: 'damage',
                        formula: ' 1d8 + 3 ',
                        damageType: ' Slashing ',
                        summary: ' Weapon damage. ',
                        hpApplication: 'damage',
                    },
                ],
            },
            {
                name: 'Longsword',
                kind: '',
            },
            {
                name: '   ',
                kind: 'spell',
            },
        ]);

        expect(updated.actions).toHaveLength(2);
        expect(updated.actions[0]).toMatchObject({
            name: 'Longsword',
            kind: 'attack',
            source: 'Equipped weapon',
            description: 'Melee weapon attack.',
        });
        expect(updated.actions[0].automation).toMatchObject({
            kind: 'attack-roll',
            attackSource: 'str',
            proficient: true,
            bonus: 1,
            range: 'melee',
            outcomes: [
                {
                    label: 'On hit',
                    kind: 'damage',
                    formula: '1d8 + 3',
                    damageType: 'Slashing',
                    summary: 'Weapon damage.',
                    application: {
                        hitPoints: 'damage',
                        conditionMode: 'add',
                    },
                },
            ],
        });
        expect(updated.actions[0].id).toBe(`${sheet.id}:action:longsword`);
        expect(updated.actions[1].id).toBe(`${sheet.id}:action:longsword-2`);
        expect(updated.actions[1].kind).toBe('action');
    });

    it('sanitizes save DC actions and preserves effect summaries', () => {
        const sheet = getSampleSheet();
        const updated = updateSheetActions(sheet, [
            {
                name: ' Sacred Flame ',
                kind: ' cantrip ',
                automationMode: 'save-dc',
                saveAbility: 'dex',
                dcSource: 'spellcasting',
                attackBonus: 1,
                effectSummary: ' Target makes a Dexterity save. ',
                successSummary: ' No damage. ',
                failureSummary: ' Radiant damage. ',
                outcomes: [
                    {
                        label: ' On failed save ',
                        kind: 'damage',
                        formula: ' 2d8 ',
                        damageType: ' Radiant ',
                        summary: ' Cantrip scaling damage. ',
                        hpApplication: 'damage',
                        conditionLabel: ' Blinded ',
                        conditionMode: 'add',
                    },
                ],
            },
        ]);

        expect(updated.actions[0].automation).toMatchObject({
            kind: 'save-dc',
            saveAbility: 'dex',
            dcSource: 'spellcasting',
            bonus: 1,
            effectSummary: 'Target makes a Dexterity save.',
            successSummary: 'No damage.',
            failureSummary: 'Radiant damage.',
            outcomes: [
                {
                    label: 'On failed save',
                    kind: 'damage',
                    formula: '2d8',
                    damageType: 'Radiant',
                    summary: 'Cantrip scaling damage.',
                    application: {
                        hitPoints: 'damage',
                        conditionLabel: 'Blinded',
                        conditionMode: 'add',
                    },
                },
            ],
        });
    });

    it('normalizes spellcasting values and slot counters', () => {
        const sheet = getSampleSheet();
        const updated = updateSheetSpellcasting(sheet, {
            ability: 'wis',
            attackBonus: 99,
            saveDc: -3,
            slots: [
                {
                    name: '  Spell Slot 1 ',
                    current: 9,
                    max: 4,
                    resetOn: 'long',
                    level: 12,
                    detail: '  Prepared magic ',
                },
                {
                    name: '   ',
                    current: 1,
                    max: 1,
                    resetOn: 'short',
                    level: 1,
                },
            ],
        });

        expect(updated.spellcasting).not.toBeNull();
        expect(updated.spellcasting?.attackBonus).toBe(40);
        expect(updated.spellcasting?.saveDc).toBe(1);
        expect(updated.spellcasting?.slots).toHaveLength(1);
        expect(updated.spellcasting?.slots[0]).toMatchObject({
            name: 'Spell Slot 1',
            current: 4,
            max: 4,
            resetOn: 'long',
            level: 9,
            detail: 'Prepared magic',
        });
        expect(updated.spellcasting?.slots[0].id).toBe(`${sheet.id}:slot:spell-slot-1`);
    });

    it('can clear spellcasting when a sheet should no longer cast spells', () => {
        const sheet = getSampleSheet();
        const updated = updateSheetSpellcasting(sheet, null);

        expect(updated.spellcasting).toBeNull();
    });
});
