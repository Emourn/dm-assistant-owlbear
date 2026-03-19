export interface MilestoneSlice {
    milestone: string;
    scope: string;
    acceptanceCriteria: string[];
    nonGoals: string[];
}

export const CURRENT_SLICE: MilestoneSlice = {
    milestone: 'Phase 1 - Automated 2024 character sheet foundation',
    scope: 'Extension reset slice: replace the old DM Assistant Owlbear shell with a new clean D&D Assistant extension skeleton.',
    acceptanceCriteria: [
        'Owlbear loads a brand-new extension shell instead of the old DM Assistant workbench.',
        'The shell shows Owlbear-native runtime context: role, room status, and current selection.',
        'The new code path is organized under explicit domain, Owlbear adapter, and UI boundaries.',
        'The extension can still be installed from the local manifest and production build.',
    ],
    nonGoals: [
        'Character persistence and editing',
        'Derived stat calculations',
        'Roll execution or prompts',
        'Token linking and player assignment',
        'Encounter or condition automation',
    ],
};

export const NEXT_SLICES = [
    'Phase 1 Slice 2: versioned 2024 character schema and local persistence',
    'Phase 1 Slice 3: pure derived stat engine for abilities, skills, saves, initiative, AC, HP, and senses',
    'Phase 1 Slice 4: structured roll engine with auditable breakdowns',
    'Phase 1 Slice 5: compact Owlbear-native sheet UI backed by the new domain',
];
