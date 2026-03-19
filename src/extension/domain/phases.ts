export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Context-menu-first runtime shortcuts inspired by owlbear-hp-tracker, so right-click actions can open the sheet, link selections, unlink selections, and trigger fast initiative flows.',
    acceptanceCriteria: [
        'Right-clicking in Owlbear exposes compact D&D Assistant shortcuts instead of only the generic open action.',
        'The GM can link or unlink the current token selection from the context menu.',
        'Initiative can be published directly from the context menu when the current viewer can resolve a sheet.',
        'The GM can open an initiative prompt from the context menu without opening the sheet first.',
    ],
    nonGoals: [
        'Per-target HP mutation',
        'Batch token operations',
        'Condition application',
        'Encounter ordering',
        'Room-feed publication for non-initiative outcomes',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 17: token- and selection-level batch runtime tools',
    'Phase 1 Slice 18: encounter ordering and active-turn integration',
    'Phase 1 Slice 19: target-aware HP and condition application from action outcomes',
    'Phase 1 Slice 20: Phase 1 hardening and closeout',
];
