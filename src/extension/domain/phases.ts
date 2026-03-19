export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Resource write-back and compact manual overrides for runtime play, so counters and key computed values stop being read-only.',
    acceptanceCriteria: [
        'Resource counters and spell slots can be adjusted from the sheet and persist immediately.',
        'Death save successes and failures can be tracked from the runtime sheet.',
        'A GM can set a compact proficiency bonus override and initiative adjustment without opening the full editor.',
        'Only the GM or the assigned player can perform runtime write actions.',
    ],
    nonGoals: [
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
        'Full skill/save manual override editing',
        'Action automation or damage resolution',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 7: action and spell editing on top of the character schema',
    'Phase 1 Slice 8: roll prompting and room-visible roll publication',
    'Phase 1 Slice 9: richer permission and visibility controls',
    'Phase 1 Slice 10: deeper automation for attacks, spells, and rest flows',
];
