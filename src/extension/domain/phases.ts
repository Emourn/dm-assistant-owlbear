export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Token- and selection-level batch runtime tools, so the GM can act on multiple linked tokens at once for initiative and rest workflows.',
    acceptanceCriteria: [
        'The GM can publish initiative for all uniquely linked selected characters from the context menu.',
        'The GM can apply short or long rest recovery to all uniquely linked selected characters from the context menu.',
        'Duplicate token links to the same character are deduplicated so a character is only updated once per batch action.',
        'Batch actions stay metadata-first and record their work in runtime audit history.',
    ],
    nonGoals: [
        'Target HP mutation',
        'Condition application',
        'Encounter ordering',
        'Per-target spell or attack resolution',
        'Batch editing outside linked token selection',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 18: encounter ordering and active-turn integration',
    'Phase 1 Slice 19: target-aware HP and condition application from action outcomes',
    'Phase 1 Slice 20: Phase 1 hardening and closeout',
    'Phase 2: token linking, player assignment, and player-safe sheet viewing stabilization',
];
