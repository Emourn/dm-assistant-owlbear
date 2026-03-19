export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'GM-side runtime audit history for metadata-driven actions, so resource changes, rests, prompt activity, and roll publication stay inspectable during live play.',
    acceptanceCriteria: [
        'Runtime actions append versioned audit entries under the extension metadata namespace.',
        'The GM can inspect recent audit history from the Owlbear runtime surface.',
        'Audit entries include actor context, timestamps, and concise action details.',
        'Clearing audit history does not disturb room rolls, prompts, or character state.',
    ],
    nonGoals: [
        'Per-player targeted prompts',
        'Full replay or undo tooling',
        'Token-link migration helpers',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 14: save-DC and effect-oriented action automation',
    'Phase 1 Slice 15: richer action outcome automation for attacks and spells',
    'Phase 1 Slice 16: context-menu-first runtime shortcuts inspired by hp-tracker',
    'Phase 1 Slice 17: token- and selection-level batch runtime tools',
];
