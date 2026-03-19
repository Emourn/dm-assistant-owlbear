export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Short-rest and long-rest recovery for modeled resources and spell slots, so the runtime sheet can reset counters without reopening the editor.',
    acceptanceCriteria: [
        'A permitted user can apply short-rest recovery to modeled short-rest resources from the runtime sheet.',
        'A permitted user can apply long-rest recovery to modeled resources and spell slots from the runtime sheet.',
        'Hit dice, HP, temp HP, and death saves remain manual and are not silently changed by rest automation in this slice.',
        'Rest recovery writes back through the same metadata-driven runtime flow as other counters.',
    ],
    nonGoals: [
        'HP or temp HP recovery',
        'Hit dice recovery rules',
        'Death save clearing',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 11: richer import and authoring flows for non-demo characters',
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
    'Phase 1 Slice 14: save-DC and effect-oriented action automation',
];
