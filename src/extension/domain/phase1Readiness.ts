export interface Phase1ReadinessInput {
    hasActiveCharacter: boolean;
    characterCount: number;
    hasResources: boolean;
    hasActions: boolean;
    linkedCharacterCount: number;
    hasPromptOrFeed: boolean;
    encounterParticipantCount: number;
    auditEntryCount: number;
}

export interface Phase1ReadinessCheck {
    id: 'character-foundation' | 'runtime-sheet' | 'token-runtime' | 'prompting' | 'encounter' | 'auditability';
    label: string;
    ready: boolean;
    detail: string;
}

export function createPhase1ReadinessChecks(input: Phase1ReadinessInput): Phase1ReadinessCheck[] {
    return [
        {
            id: 'character-foundation',
            label: 'Character foundation',
            ready: input.hasActiveCharacter && input.characterCount > 0,
            detail: input.hasActiveCharacter
                ? `${input.characterCount} stored sheet${input.characterCount === 1 ? '' : 's'} in room metadata.`
                : 'No active sheet resolved yet.',
        },
        {
            id: 'runtime-sheet',
            label: 'Rollable runtime sheet',
            ready: input.hasActiveCharacter && (input.hasResources || input.hasActions),
            detail: input.hasActiveCharacter
                ? `${input.hasActions ? 'Actions' : 'No actions'}, ${input.hasResources ? 'resources' : 'no resources'} on the active sheet.`
                : 'No active sheet to validate.',
        },
        {
            id: 'token-runtime',
            label: 'Token-first runtime',
            ready: input.linkedCharacterCount > 0,
            detail: input.linkedCharacterCount > 0
                ? `${input.linkedCharacterCount} linked character${input.linkedCharacterCount === 1 ? '' : 's'} in the current selection.`
                : 'No linked selected tokens right now.',
        },
        {
            id: 'prompting',
            label: 'Prompting and room feed',
            ready: input.hasPromptOrFeed,
            detail: input.hasPromptOrFeed
                ? 'Room roll feed or active prompt is present.'
                : 'No prompt or published roll is visible yet.',
        },
        {
            id: 'encounter',
            label: 'Encounter runtime',
            ready: input.encounterParticipantCount > 0,
            detail: input.encounterParticipantCount > 0
                ? `${input.encounterParticipantCount} participant${input.encounterParticipantCount === 1 ? '' : 's'} in encounter order.`
                : 'No encounter order built yet.',
        },
        {
            id: 'auditability',
            label: 'Auditability',
            ready: input.auditEntryCount > 0,
            detail: input.auditEntryCount > 0
                ? `${input.auditEntryCount} runtime audit entr${input.auditEntryCount === 1 ? 'y' : 'ies'} recorded.`
                : 'No runtime audit entries recorded yet.',
        },
    ];
}
