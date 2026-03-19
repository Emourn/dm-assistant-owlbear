export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'GM authoring for actions and spellcasting, so the rebuilt sheet can model runtime-facing actions, spell stats, and spell slots without leaving Owlbear.',
    acceptanceCriteria: [
        'A GM can add, edit, and remove action summaries from the compact sheet UI.',
        'A GM can enable or disable spellcasting and edit spell ability, attack bonus, save DC, and slot rows.',
        'Authored actions and spell slots persist to versioned room metadata and immediately re-render in the runtime sheet.',
        'Players remain read-only for this authoring surface.',
    ],
    nonGoals: [
        'Room-wide roll prompts or chat broadcast',
        'Encounter or condition automation',
        'Action automation or damage resolution',
        'Prepared spell libraries or import flows',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 8: roll prompting and room-visible roll publication',
    'Phase 1 Slice 9: richer permission and visibility controls',
    'Phase 1 Slice 10: deeper automation for attacks, spells, and rest flows',
    'Phase 1 Slice 11: richer import and authoring flows for non-demo characters',
];
