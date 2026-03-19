export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'GM-side character collection management for real room sheets, so the extension is no longer limited to the seeded demo character.',
    acceptanceCriteria: [
        'A GM can create a new blank 2024 character record directly from the Owlbear sheet.',
        'A GM can duplicate the active character without carrying stale nested action or resource ids into the copy.',
        'A GM can delete the active character and the collection promotes a sensible next active record or becomes empty safely.',
        'Character collection changes persist through the same versioned room metadata namespace as the rest of Phase 1.',
    ],
    nonGoals: [
        'JSON import/export',
        'Token-link migration helpers',
        'Bulk authoring workflows',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 11b: JSON import/export flows for non-demo characters',
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
    'Phase 1 Slice 14: save-DC and effect-oriented action automation',
];
