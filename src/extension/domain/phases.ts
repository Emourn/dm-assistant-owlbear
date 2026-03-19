export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'GM-side editing for the versioned 2024 character record, with instant recomputation in the compact rollable Owlbear sheet.',
    acceptanceCriteria: [
        'A GM can edit the active character record from within the new Owlbear sheet.',
        'Edited identity, level, HP, AC, notes, and ability scores persist under the extension metadata namespace.',
        'Derived values and click-to-roll outputs update immediately after saving.',
        'Players remain read-only in this slice.',
    ],
    nonGoals: [
        'Token linkage and player assignment',
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
        'Full action, spell, or resource editing',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 4: token linkage foundations and player-safe character resolution',
    'Phase 1 Slice 5: resource write-back and manual override controls',
    'Phase 1 Slice 6: action and spell editing on top of the character schema',
    'Phase 1 Slice 7: roll prompting and room-visible roll publication',
];
