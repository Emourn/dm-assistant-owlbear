export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Save-DC and effect-oriented action automation, so actions like cantrips and save-based abilities can surface DC, effect notes, and direct save prompts from the sheet.',
    acceptanceCriteria: [
        'An action can model a saving throw target, a computed or fixed DC, and effect summaries.',
        'The sheet can prompt the correct saving throw directly from a save-based action card.',
        'Save-DC actions remain auditable and can still link to modeled resource costs.',
        'The demo character exposes at least one save-based action for immediate Owlbear testing.',
    ],
    nonGoals: [
        'Per-player targeted prompts',
        'Damage roll automation',
        'Full replay or undo tooling',
        'Token-link migration helpers',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 15: richer action outcome automation for attacks and spells',
    'Phase 1 Slice 16: context-menu-first runtime shortcuts inspired by hp-tracker',
    'Phase 1 Slice 17: token- and selection-level batch runtime tools',
    'Phase 1 Slice 18: encounter ordering and active-turn integration',
];
