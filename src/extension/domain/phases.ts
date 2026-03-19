export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Encounter ordering and active-turn integration, so the GM can build a turn order from initiative results and run rounds directly inside the Owlbear runtime surface.',
    acceptanceCriteria: [
        'The GM can build an encounter order from initiative results already stored in room metadata.',
        'The GM can advance, retreat, clear, and directly set the active turn from a compact encounter panel.',
        'Encounter state is stored independently from the room roll feed and survives popover reloads.',
        'Encounter actions record to runtime audit history.',
    ],
    nonGoals: [
        'Target HP mutation',
        'Condition application',
        'Per-target spell or attack resolution',
        'Automated round effects',
        'Full combatant authoring outside initiative-based ordering',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 19: target-aware HP and condition application from action outcomes',
    'Phase 1 Slice 20: Phase 1 hardening and closeout',
    'Phase 2: token linking, player assignment, and player-safe sheet viewing stabilization',
    'Phase 3: broader prompting and initiative workflow polish',
];
