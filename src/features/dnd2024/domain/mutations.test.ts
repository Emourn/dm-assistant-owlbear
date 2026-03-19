import { describe, expect, it } from 'vitest';
import { createSampleCharacterCollection } from '../../../extension/domain/characterRecords';
import {
    setInitiativeAdjustment,
    setProficiencyBonusOverride,
    updateDeathSaves,
    updateSheetResourceCounter,
} from './mutations';

describe('sheet runtime mutations', () => {
    const baseSheet = createSampleCharacterCollection(1000).characters[0].sheet;

    it('updates bounded resource counters', () => {
        const updated = updateSheetResourceCounter(baseSheet, `${baseSheet.id}:channel-divinity`, -1);
        expect(updated.resources.find((resource) => resource.id.endsWith('channel-divinity'))?.current).toBe(1);

        const clamped = updateSheetResourceCounter(updated, `${baseSheet.id}:channel-divinity`, -5);
        expect(clamped.resources.find((resource) => resource.id.endsWith('channel-divinity'))?.current).toBe(0);
    });

    it('updates spell slot counters independently', () => {
        const slotId = `${baseSheet.id}:slot-2`;
        const updated = updateSheetResourceCounter(baseSheet, slotId, -2);
        expect(updated.spellcasting?.slots.find((slot) => slot.id === slotId)?.current).toBe(1);
    });

    it('clamps death saves between zero and three', () => {
        const failed = updateDeathSaves(baseSheet, 'failures', 2);
        expect(failed.deathSaves.failures).toBe(2);

        const clamped = updateDeathSaves(failed, 'failures', 5);
        expect(clamped.deathSaves.failures).toBe(3);
    });

    it('sets compact manual overrides', () => {
        const overridden = setProficiencyBonusOverride(baseSheet, 4);
        const adjusted = setInitiativeAdjustment(overridden, 2);

        expect(adjusted.proficiencyBonusOverride).toBe(4);
        expect(adjusted.rollAdjustments.initiative).toBe(2);
    });
});
