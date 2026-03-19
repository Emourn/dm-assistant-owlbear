export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 2 - Token linkage, player assignment, and player-safe sheet viewing',
    scope: 'Stabilize player-safe visibility by making sheet access explicit to the current viewer and inspectable for the GM from the same compact Owlbear runtime surface.',
    acceptanceCriteria: [
        'The current viewer sees an explicit explanation for why the active sheet is visible or hidden.',
        'The GM can preview which sheet each room player would resolve right now from assignment and selected token links.',
        'The GM can inspect the current selected-token visibility audience without opening another surface.',
        'The visibility explanation logic is covered by pure tests, TypeScript validation, and a production Owlbear build.',
    ],
    nonGoals: [
        'New permission modes beyond room, assigned-only, and gm-only',
        'Token badge or status icon syncing',
        'Encounter or prompt behavior changes',
        'Role-specific redesign outside the access preview surfaces',
        'Phase 3 prompting or initiative workflow work',
    ],
};

export const NEXT_SLICES = [
    'Phase 2: player-assignment and token-link workflow polish',
    'Phase 3: broader prompting and initiative workflow polish',
];
