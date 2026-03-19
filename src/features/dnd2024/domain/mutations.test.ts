import { describe, expect, it } from 'vitest';
import { createSampleCharacterCollection } from '../../../extension/domain/characterRecords';
import {
    addCondition,
    applyHitPointDelta,
    applyRestRecovery,
    removeCondition,
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

    it('applies damage against temp HP first and healing up to max HP', () => {
        const damaged = applyHitPointDelta(baseSheet, 'damage', 7);
        expect(damaged.hitPoints.temp).toBe(0);
        expect(damaged.hitPoints.current).toBe(35);

        const healed = applyHitPointDelta(damaged, 'healing', 10);
        expect(healed.hitPoints.current).toBe(38);
        expect(healed.hitPoints.temp).toBe(0);
    });

    it('adds and removes named conditions idempotently', () => {
        const applied = addCondition(baseSheet, {
            label: 'Paralyzed',
            source: 'Hold Person',
            summary: 'Target cannot move or speak.',
        });
        expect(applied.conditions).toHaveLength(1);
        expect(applied.conditions[0].label).toBe('Paralyzed');

        const reapplied = addCondition(applied, {
            label: 'Paralyzed',
            source: 'Hold Person',
            summary: 'Target cannot move or speak.',
        });
        expect(reapplied.conditions).toHaveLength(1);

        const cleared = removeCondition(reapplied, 'Paralyzed');
        expect(cleared.conditions).toHaveLength(0);
    });

    it('recovers only short-rest modeled resources on a short rest', () => {
        const spent = {
            ...baseSheet,
            resources: baseSheet.resources.map((resource) =>
                resource.id.endsWith('channel-divinity')
                    ? { ...resource, current: 0 }
                    : resource.id.endsWith('hit-dice')
                        ? { ...resource, current: 1 }
                        : resource),
            spellcasting: {
                ...baseSheet.spellcasting!,
                slots: baseSheet.spellcasting!.slots.map((slot) =>
                    slot.id.endsWith('slot-1') ? { ...slot, current: 1 } : slot),
            },
        };

        const rested = applyRestRecovery(spent, 'short');

        expect(rested.resources.find((resource) => resource.id.endsWith('channel-divinity'))?.current).toBe(2);
        expect(rested.resources.find((resource) => resource.id.endsWith('hit-dice'))?.current).toBe(1);
        expect(rested.spellcasting?.slots.find((slot) => slot.id.endsWith('slot-1'))?.current).toBe(1);
    });

    it('recovers long-rest modeled resources and spell slots on a long rest', () => {
        const spent = {
            ...baseSheet,
            resources: baseSheet.resources.map((resource) =>
                resource.id.endsWith('channel-divinity')
                    ? { ...resource, current: 0 }
                    : resource.id.endsWith('hit-dice')
                        ? { ...resource, current: 1 }
                        : resource),
            spellcasting: {
                ...baseSheet.spellcasting!,
                slots: baseSheet.spellcasting!.slots.map((slot) => ({ ...slot, current: 0 })),
            },
        };

        const rested = applyRestRecovery(spent, 'long');

        expect(rested.resources.find((resource) => resource.id.endsWith('channel-divinity'))?.current).toBe(2);
        expect(rested.resources.find((resource) => resource.id.endsWith('hit-dice'))?.current).toBe(1);
        expect(rested.spellcasting?.slots.every((slot) => slot.current === slot.max)).toBe(true);
    });
});
