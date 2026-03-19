export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Richer permission and visibility controls, so token links, shared rolls, and initiative prompts expose only the surface the GM intends.',
    acceptanceCriteria: [
        'A GM can set default token-link visibility, default published-roll visibility, and initiative prompt audience.',
        'Players resolve selected token links correctly for room, assigned-only, and gm-only visibility modes.',
        'Room roll feeds and prompts are filtered by explicit visibility rules instead of always being public.',
        'Manual player roll publication can be enabled or disabled without breaking GM or prompt-driven flows.',
    ],
    nonGoals: [
        'Encounter or condition automation',
        'Action automation or damage resolution',
        'Per-player custom prompt targeting beyond assignment-aware defaults',
        'Non-initiative prompt types',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 10: deeper automation for attacks, spells, and rest flows',
    'Phase 1 Slice 11: richer import and authoring flows for non-demo characters',
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
];
