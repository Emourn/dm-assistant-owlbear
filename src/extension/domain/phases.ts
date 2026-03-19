export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Broader roll prompts for initiative, abilities, saving throws, and skills, so the GM can request common checks directly from the live Owlbear runtime surface.',
    acceptanceCriteria: [
        'A GM can open prompts for initiative, any ability check, any saving throw, and any skill from the room roll surface.',
        'Players with a resolved sheet can respond to supported prompts with the correct structured roll.',
        'Prompt labels and generated roll requests stay auditable and aligned with the sheet domain calculations.',
        'Prompt visibility still respects the existing room and assigned-only audience rules.',
    ],
    nonGoals: [
        'Per-player targeted prompts',
        'Chat log threading beyond the existing room feed',
        'Token-link migration helpers',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 13: GM-side audits and history tools for metadata-driven runtime actions',
    'Phase 1 Slice 14: save-DC and effect-oriented action automation',
    'Phase 1 Slice 15: richer action outcome automation for attacks and spells',
    'Phase 1 Slice 16: context-menu-first runtime shortcuts inspired by hp-tracker',
];
