export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Context-menu shortcuts for HP and condition application, so the GM can run fast token-first runtime updates from linked selections without reopening deeper sheet UI.',
    acceptanceCriteria: [
        'The GM can apply fixed HP shortcut changes to linked selected targets from the Owlbear context menu.',
        'The GM can apply and clear a small set of high-value conditions from the Owlbear context menu.',
        'Shortcut mutations persist to the stored linked character records.',
        'Shortcut mutations record to runtime audit with enough detail to explain what changed.',
    ],
    nonGoals: [
        'Arbitrary numeric HP entry from the context menu',
        'Owlbear visual badge syncing for conditions',
        'Per-target spell or attack hit resolution',
        'Automated round effects',
        'Full encounter-state automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Closeout B: hardening, bug fixes, and acceptance pass',
    'Phase 2: token linking, player assignment, and player-safe sheet viewing stabilization',
    'Phase 3: broader prompting and initiative workflow polish',
];
