import { describe, expect, it } from 'vitest';
import type { Character } from '../../../types/character';
import { createEmptyCharacter } from '../../../types/character';
import { adaptLegacyCharacterToPhase1Sheet } from '../adapters/fromLegacyCharacter';
import {
    buildInitiativeRoll,
    buildSavingThrowRoll,
    buildSkillCheckRoll,
    createCharacterSheetViewModel,
    getPhase1ProficiencyBonus,
} from './sheet';
import { rollStructuredD20 } from './rolls';

describe('dnd2024 Phase 1 sheet foundation', () => {
    it('derives proficiency, saving throws, and expertise from a legacy character snapshot', () => {
        const legacy: Character = {
            ...createEmptyCharacter(),
            id: 'hero-1',
            name: 'Mira',
            level: 5,
            abilityScores: {
                str: 10,
                dex: 18,
                con: 14,
                int: 12,
                wis: 13,
                cha: 16,
            },
            savingThrows: ['dex', 'cha'],
            initiativeMod: 6,
            skills: createEmptyCharacter().skills.map((skill) => {
                if (skill.name === 'Stealth') {
                    return { ...skill, proficient: true, expertise: true, bonus: 1, source: 'Rogue' };
                }
                if (skill.name === 'Perception') {
                    return { ...skill, proficient: true, expertise: false, bonus: 0, source: 'Background' };
                }
                return skill;
            }),
            resources: [
                { id: 'luck', name: 'Luck', current: 2, max: 3, resetOn: 'long' as const },
            ],
            spellcastingAbility: 'cha' as const,
            spellSaveDc: 14,
            spellAttackMod: 6,
            spellSlots: [
                { current: 0, max: 0 },
                { current: 4, max: 4 },
                { current: 2, max: 3 },
            ],
        };

        const sheet = adaptLegacyCharacterToPhase1Sheet(legacy);
        const model = createCharacterSheetViewModel(sheet);

        expect(getPhase1ProficiencyBonus(sheet)).toBe(3);
        expect(model.initiative.total).toBe(6);
        expect(buildSavingThrowRoll(sheet, 'dex').totalModifier).toBe(7);
        expect(buildSkillCheckRoll(sheet, 'stealth').totalModifier).toBe(11);
        expect(sheet.spellcasting?.slots).toHaveLength(2);
        expect(sheet.resources[0]).toEqual(expect.objectContaining({ name: 'Hit Dice', kind: 'hit-dice' }));
    });

    it('builds auditable structured d20 rolls with deterministic dice', () => {
        const legacy: Character = {
            ...createEmptyCharacter(),
            id: 'hero-2',
            name: 'Cassian',
            level: 3,
            abilityScores: {
                str: 8,
                dex: 14,
                con: 12,
                int: 16,
                wis: 10,
                cha: 10,
            },
            savingThrows: ['int'],
            initiativeMod: 2,
            skills: createEmptyCharacter().skills.map((skill) =>
                skill.name === 'Arcana'
                    ? { ...skill, proficient: true, expertise: false, bonus: 2, source: 'Wizard' }
                    : skill,
            ),
        };

        const sheet = adaptLegacyCharacterToPhase1Sheet(legacy);
        const request = buildSkillCheckRoll(sheet, 'arcana');
        const result = rollStructuredD20(request, {
            rng: () => 0.7,
            timestamp: 1234,
        });

        expect(request.formula).toBe('1d20 + 3 + 2 + 2');
        expect(request.breakdown.map((part) => part.label)).toEqual([
            'Intelligence modifier',
            'Skill proficiency',
            'Skill bonus',
        ]);
        expect(result.kept).toBe(15);
        expect(result.total).toBe(22);
        expect(result.metadata.timestamp).toBe(1234);
    });

    it('preserves manual AC overrides and notes their source', () => {
        const legacy: Character = {
            ...createEmptyCharacter(),
            id: 'hero-3',
            name: 'Rook',
            ac: 19,
            customOverrides: {
                overrides: [
                    {
                        id: 'override-ac',
                        field: 'ac',
                        label: 'Armor Class',
                        value: 19,
                        isActive: true,
                        reason: 'Shield spell',
                    },
                ],
            },
        };

        const sheet = adaptLegacyCharacterToPhase1Sheet(legacy);
        const initiative = buildInitiativeRoll(sheet);

        expect(sheet.armorClass.source).toBe('Manual override');
        expect(sheet.armorClass.audit[0]).toContain('Shield spell');
        expect(initiative.totalModifier).toBe(0);
    });
});
