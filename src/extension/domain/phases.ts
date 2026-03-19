export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Richer action outcome automation for attacks and spells, so automated actions can model damage/effect outcomes and roll those formulas directly from the compact runtime sheet.',
    acceptanceCriteria: [
        'Automated actions can model one or more outcomes with labels, formula text, type tags, and summaries.',
        'Attack and save-based action cards can roll modeled outcomes directly in the runtime sheet.',
        'Outcome automation stays separate from room-roll publication and from token HP mutation.',
        'The demo character exposes attack and spell actions with modeled outcomes for Owlbear testing.',
    ],
    nonGoals: [
        'Per-player targeted prompts',
        'Target HP mutation',
        'Full replay or undo tooling',
        'Token-link migration helpers',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 16: context-menu-first runtime shortcuts inspired by hp-tracker',
    'Phase 1 Slice 17: token- and selection-level batch runtime tools',
    'Phase 1 Slice 18: encounter ordering and active-turn integration',
    'Phase 1 Slice 19: target-aware HP and condition application from action outcomes',
];
