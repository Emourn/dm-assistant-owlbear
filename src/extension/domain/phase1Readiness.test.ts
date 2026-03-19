import { describe, expect, it } from 'vitest';
import { createPhase1ReadinessChecks } from './phase1Readiness';

describe('phase 1 readiness', () => {
    it('reports incomplete readiness when the room has not exercised runtime features', () => {
        const checks = createPhase1ReadinessChecks({
            hasActiveCharacter: false,
            characterCount: 0,
            hasResources: false,
            hasActions: false,
            linkedCharacterCount: 0,
            hasPromptOrFeed: false,
            encounterParticipantCount: 0,
            auditEntryCount: 0,
        });

        expect(checks.every((check) => check.ready === false)).toBe(true);
    });

    it('reports readiness across the main phase 1 runtime surfaces', () => {
        const checks = createPhase1ReadinessChecks({
            hasActiveCharacter: true,
            characterCount: 2,
            hasResources: true,
            hasActions: true,
            linkedCharacterCount: 2,
            hasPromptOrFeed: true,
            encounterParticipantCount: 3,
            auditEntryCount: 6,
        });

        expect(checks.every((check) => check.ready)).toBe(true);
        expect(checks.find((check) => check.id === 'encounter')?.detail).toContain('3 participants');
    });
});
