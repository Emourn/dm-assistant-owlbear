export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Versioned 2024 character metadata and compact rollable sheet UI inside the new Owlbear-native extension shell.',
    acceptanceCriteria: [
        'The extension stores a versioned character collection under its own Owlbear room metadata namespace.',
        'A GM can open the shell and immediately see a seeded demo 2024 character sheet for slice validation.',
        'The compact sheet shows derived values and supports click-to-roll for abilities, saves, skills, and initiative.',
        'Rolls display auditable formulas and modifier breakdowns inside the Owlbear popover.',
    ],
    nonGoals: [
        'Character editing and import flows',
        'Token linkage and player assignment',
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 3: formal character creation and editing on top of the versioned schema',
    'Phase 1 Slice 4: token linkage foundations and player-safe character resolution',
    'Phase 1 Slice 5: resource write-back and manual override controls',
    'Phase 1 Slice 6: roll prompting and room-visible roll publication',
];
