import { describe, expect, it } from 'vitest';
import { createSampleCharacterCollection } from '../../../extension/domain/characterRecords';
import {
    buildActionOutcomeSummaries,
    buildActionRoll,
    buildActionSaveDcSummary,
    canRollAction,
    canUseActionSaveDc,
    getActionUseState,
    spendActionResource,
} from './actionAutomation';

function getSampleSheet() {
    return createSampleCharacterCollection(1000).characters[0].sheet;
}

describe('action automation', () => {
    it('builds a proficient weapon attack roll from an ability score', () => {
        const sheet = getSampleSheet();
        const mace = sheet.actions.find((action) => action.name === 'Mace')!;

        const request = buildActionRoll(sheet, mace);

        expect(canRollAction(sheet, mace)).toBe(true);
        expect(request?.scope).toBe('attack');
        expect(request?.totalModifier).toBe(3);
        expect(request?.breakdown.map((part) => part.label)).toEqual([
            'Strength modifier',
            'Attack proficiency',
        ]);
    });

    it('builds spell attack rolls from stored spellcasting bonuses and tracks linked costs', () => {
        const sheet = getSampleSheet();
        const guidingBolt = sheet.actions.find((action) => action.name === 'Guiding Bolt')!;

        const request = buildActionRoll(sheet, guidingBolt);
        const useState = getActionUseState(sheet, guidingBolt);

        expect(request?.totalModifier).toBe(7);
        expect(useState.resource?.name).toBe('Spell Slot 1');
        expect(useState.amount).toBe(1);
        expect(useState.canSpend).toBe(true);
    });

    it('spends linked action resources without dropping below zero', () => {
        const sheet = getSampleSheet();
        const guidingBolt = sheet.actions.find((action) => action.name === 'Guiding Bolt')!;

        const once = spendActionResource(sheet, guidingBolt);
        const slot = once.spellcasting?.slots.find((resource) => resource.id.endsWith('slot-1'));
        expect(slot?.current).toBe(3);

        const exhausted = {
            ...sheet,
            spellcasting: {
                ...sheet.spellcasting!,
                slots: sheet.spellcasting!.slots.map((resource) =>
                    resource.id.endsWith('slot-1')
                        ? { ...resource, current: 0 }
                        : resource),
            },
        };

        expect(spendActionResource(exhausted, guidingBolt)).toEqual(exhausted);
    });

    it('builds save DC summaries for effect-oriented actions', () => {
        const sheet = getSampleSheet();
        const sacredFlame = sheet.actions.find((action) => action.name === 'Sacred Flame')!;

        const summary = buildActionSaveDcSummary(sheet, sacredFlame);

        expect(canUseActionSaveDc(sheet, sacredFlame)).toBe(true);
        expect(summary?.saveAbility).toBe('dex');
        expect(summary?.dc).toBe(15);
        expect(summary?.failureSummary).toContain('1d8');
    });

    it('builds modeled outcome summaries for attack and save actions', () => {
        const sheet = getSampleSheet();
        const mace = sheet.actions.find((action) => action.name === 'Mace')!;
        const sacredFlame = sheet.actions.find((action) => action.name === 'Sacred Flame')!;

        const maceOutcomes = buildActionOutcomeSummaries(sheet, mace);
        const sacredFlameOutcomes = buildActionOutcomeSummaries(sheet, sacredFlame);

        expect(maceOutcomes[0]).toMatchObject({
            label: 'On hit',
            kind: 'damage',
            formula: '1d6',
            damageType: 'Bludgeoning',
        });
        expect(maceOutcomes[0].request?.label).toBe('Mace - On hit');
        expect(sacredFlameOutcomes[0]).toMatchObject({
            label: 'On failed save',
            formula: '1d8',
            damageType: 'Radiant',
        });
    });
});
