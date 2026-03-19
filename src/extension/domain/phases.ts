export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Token linkage foundations for the new character record, with public selected-token sheet resolution for players and GM link controls.',
    acceptanceCriteria: [
        'A GM can link or unlink the active sheet to the current Owlbear token selection.',
        'Token links are stored only in the extension metadata namespace.',
        'Players resolve a linked room-visible character sheet from the token they have selected.',
        'GM editing flow still works without selected-token auto-switching.',
    ],
    nonGoals: [
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
        'Player assignment',
        'Private token visibility and permissions beyond room-visible links',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 5: player assignment and private sheet resolution',
    'Phase 1 Slice 6: resource write-back and manual override controls',
    'Phase 1 Slice 7: action and spell editing on top of the character schema',
    'Phase 1 Slice 8: roll prompting and room-visible roll publication',
];
