import { describe, expect, it } from 'vitest';
import {
    appendRuntimeAuditEntry,
    clearRuntimeAuditEntries,
    createEmptyRuntimeAuditState,
    createRuntimeAuditEntry,
    parseStoredRuntimeAuditState,
} from './runtimeAudit';

function createActor() {
    return {
        playerId: 'gm-1',
        playerName: 'GM',
        role: 'GM' as const,
        characterId: 'demo-seraphina-vale',
        characterName: 'Seraphina Vale',
    };
}

describe('runtime audit state', () => {
    it('appends audit entries in newest-first order', () => {
        const first = createRuntimeAuditEntry('resource', 'Adjusted Channel Divinity', ['2/2 -> 1/2'], createActor(), 1000);
        const second = createRuntimeAuditEntry('rest', 'Applied short rest', ['Recovered Channel Divinity'], createActor(), 2000);
        const updated = appendRuntimeAuditEntry(
            appendRuntimeAuditEntry(createEmptyRuntimeAuditState(), first),
            second,
        );

        expect(updated.entries).toHaveLength(2);
        expect(updated.entries[0].action).toBe('Applied short rest');
        expect(updated.entries[1].action).toBe('Adjusted Channel Divinity');
    });

    it('parses stored metadata and rejects incompatible shapes', () => {
        const state = {
            version: 1,
            entries: [
                createRuntimeAuditEntry('prompt', 'Opened prompt', ['Prompt Wisdom Check'], createActor(), 3000),
            ],
        };

        expect(parseStoredRuntimeAuditState(state)?.entries).toHaveLength(1);
        expect(parseStoredRuntimeAuditState({ version: 99, entries: [] })).toBeNull();
    });

    it('clears audit history', () => {
        const state = appendRuntimeAuditEntry(
            createEmptyRuntimeAuditState(),
            createRuntimeAuditEntry('roll', 'Published roll', ['Wisdom Check 18'], createActor(), 4000),
        );

        expect(clearRuntimeAuditEntries().entries).toHaveLength(0);
        expect(state.entries).toHaveLength(1);
    });
});
