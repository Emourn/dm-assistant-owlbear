export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Hardening, bug fixes, and acceptance pass, so the rebuilt Owlbear extension can close Phase 1 on a stable, testable, room-usable character runtime foundation.',
    acceptanceCriteria: [
        'The extension surfaces a concrete in-app Phase 1 readiness checklist for the current room state.',
        'Known correctness issues in the current Phase 1 runtime flow are fixed without expanding scope.',
        'The runtime UI copy matches the actual implemented Phase 1 feature set.',
        'The acceptance pass is covered by tests, TypeScript validation, and a production Owlbear build.',
    ],
    nonGoals: [
        'New Phase 2 feature work',
        'Major visual redesign beyond targeted cleanup',
        'Owlbear visual badge syncing for conditions',
        'Per-target spell or attack hit resolution',
        'Automated round effects',
    ],
};

export const NEXT_SLICES = [
    'Phase 2: token linkage and player-safe viewing stabilization',
    'Phase 3: broader prompting and initiative workflow polish',
];
