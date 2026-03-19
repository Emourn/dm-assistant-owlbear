import { describe, expect, it } from 'vitest';
import { rollActionOutcome, rollStructuredD20 } from './rolls';

describe('roll engine', () => {
    it('rolls structured d20 requests deterministically with a supplied rng', () => {
        const result = rollStructuredD20(
            {
                id: 'initiative:test',
                label: 'Initiative',
                scope: 'initiative',
                formula: '1d20 + 2',
                totalModifier: 2,
                breakdown: [],
                audit: [],
                advantage: 'normal',
            },
            {
                rng: () => 0.5,
                timestamp: 1000,
            },
        );

        expect(result.kept).toBe(11);
        expect(result.total).toBe(13);
        expect(result.metadata.timestamp).toBe(1000);
    });

    it('rolls action outcomes from simple dice formulas', () => {
        const values = [0, 0.5, 0.99];
        let index = 0;
        const result = rollActionOutcome(
            {
                id: 'outcome:test',
                label: 'Guiding Bolt - On hit',
                kind: 'damage',
                formula: '3d6 + 2',
                damageType: 'Radiant',
                audit: ['Uses modeled hit damage.'],
            },
            {
                rng: () => values[index++ % values.length],
                timestamp: 2000,
            },
        );

        expect(result).not.toBeNull();
        expect(result?.parts).toEqual([
            { kind: 'dice', label: '3d6', value: 11, rolls: [1, 4, 6] },
            { kind: 'modifier', label: '+2', value: 2 },
        ]);
        expect(result?.total).toBe(13);
        expect(result?.metadata.timestamp).toBe(2000);
    });

    it('rejects invalid action outcome formulas', () => {
        const result = rollActionOutcome({
            id: 'outcome:bad',
            label: 'Broken',
            kind: 'damage',
            formula: '2d6 + bad',
            audit: [],
        });

        expect(result).toBeNull();
    });
});
