export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'JSON import/export for the versioned Phase 1 character collection, so non-demo sheets can move into and out of Owlbear without manual recreation.',
    acceptanceCriteria: [
        'A GM can export the active record or the full room collection as versioned JSON from the Owlbear sheet.',
        'A GM can append compatible JSON into the current room collection without overwriting existing sheets.',
        'A GM can replace the room collection from compatible JSON in one action.',
        'Imported records are normalized onto unique room-safe ids and names before they are stored.',
    ],
    nonGoals: [
        'Third-party importer integrations',
        'CSV or PDF import paths',
        'Token-link migration helpers',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
    'Phase 1 Slice 14: save-DC and effect-oriented action automation',
    'Phase 1 Slice 15: richer action outcome automation for attacks and spells',
];
