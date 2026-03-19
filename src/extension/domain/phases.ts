export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Player assignment and private sheet resolution, so players resolve only their assigned sheet by default unless they explicitly select a public linked token.',
    acceptanceCriteria: [
        'A GM can assign or unassign the active sheet to room players.',
        'Player assignments are stored only in the extension metadata namespace.',
        'Players no longer fall back to the GM active record when they are unassigned.',
        'Players resolve their assigned sheet by default, while public token links remain an explicit override.',
    ],
    nonGoals: [
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
        'Private token visibility beyond the current assigned-sheet gate',
        'Per-player fog/scene permissions',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 6: resource write-back and manual override controls',
    'Phase 1 Slice 7: action and spell editing on top of the character schema',
    'Phase 1 Slice 8: roll prompting and room-visible roll publication',
    'Phase 1 Slice 9: richer permission and visibility controls',
];
