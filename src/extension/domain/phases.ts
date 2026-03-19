export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Room-visible roll publication with a compact initiative prompt, so structured rolls can leave the local preview and become shared table state.',
    acceptanceCriteria: [
        'Any user can publish their current structured roll into a room-visible feed.',
        'A GM can issue and clear a compact initiative prompt from the Owlbear sheet.',
        'A user with a resolved sheet can answer the initiative prompt and publish the result in one step.',
        'Published rolls and the active prompt persist in versioned room metadata.',
    ],
    nonGoals: [
        'Encounter or condition automation',
        'Action automation or damage resolution',
        'General-purpose chat or dice history outside our metadata namespace',
        'Non-initiative prompt types',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 9: richer permission and visibility controls',
    'Phase 1 Slice 10: deeper automation for attacks, spells, and rest flows',
    'Phase 1 Slice 11: richer import and authoring flows for non-demo characters',
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
];
