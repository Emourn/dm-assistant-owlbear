import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOfficialSubclassesList, searchSpells, searchSubclasses } from './fiveEToolsParser';

describe('fiveEToolsParser offline fallback behavior', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns local 2024 spells when remote mirrors are unavailable', async () => {
        const results = await searchSpells('guid');
        expect(results.some((s) => s.name.toLowerCase() === 'guidance')).toBe(true);
    });

    it('returns local subclasses for a class when class index cannot be fetched', async () => {
        const results = await searchSubclasses('Wizard');
        expect(results.some((s) => s.name === 'Abjurer')).toBe(true);
    });

    it('returns local official subclass list when remote data is offline', async () => {
        const results = await getOfficialSubclassesList('Wizard');
        expect(results.some((s) => s.name === 'Abjurer' && s.is2024)).toBe(true);
    });
});
