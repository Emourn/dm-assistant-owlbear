export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Rollable action automation for attacks and linked costs, so runtime actions can generate real attack rolls and spend modeled resources from the sheet.',
    acceptanceCriteria: [
        'An action can model an attack-roll automation source and generate a structured attack roll from the sheet.',
        'An action can link to a resource or spell slot cost and spend it from the runtime sheet.',
        'The GM authoring surface can define attack source, proficiency, bonus, and linked resource cost for an action.',
        'Existing non-automated actions remain descriptive and do not break the sheet.',
    ],
    nonGoals: [
        'Damage resolution',
        'Rest automation',
        'Save-DC-only action automation',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 11: richer import and authoring flows for non-demo characters',
    'Phase 1 Slice 12: broader prompt types for abilities, saves, and skills',
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
    'Phase 1 Slice 14: rest automation for short-rest and long-rest resource recovery',
];
