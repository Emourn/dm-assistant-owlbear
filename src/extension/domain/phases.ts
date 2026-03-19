export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Target-aware HP and condition application from action outcomes, so the GM can apply modeled damage, healing, and status effects directly to linked selected tokens from the compact runtime sheet.',
    acceptanceCriteria: [
        'The GM can apply modeled damage or healing outcomes to linked selected targets from action cards.',
        'The GM can apply or clear named conditions on linked selected targets from effect-oriented outcomes.',
        'Applied HP and condition changes persist to the stored target character records.',
        'Target mutations record to runtime audit with enough detail to explain what changed.',
    ],
    nonGoals: [
        'Per-target spell or attack hit resolution',
        'Automated round effects',
        'Owlbear visual badge syncing for conditions',
        'Freeform combatant authoring outside linked characters',
        'Full encounter-state automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 20: context-menu shortcuts for HP and condition application',
    'Phase 1 Slice 21: Phase 1 hardening and closeout',
    'Phase 2: token linking, player assignment, and player-safe sheet viewing stabilization',
    'Phase 3: broader prompting and initiative workflow polish',
];
