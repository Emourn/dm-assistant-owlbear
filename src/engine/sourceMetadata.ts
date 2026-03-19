import type { Character } from '../types/character';
import type { ImportOrigin, ImportProvenance, RulesEdition } from '../types/source';
import { is2024Source } from './fiveEToolsParser';

function summarizeSources(values: string[]): string {
    const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
    if (unique.length === 0) return '';
    if (unique.length <= 3) return unique.join(' • ');
    return `${unique.slice(0, 3).join(' • ')} +${unique.length - 3} more`;
}

function editionFromFlags(flags: boolean[]): RulesEdition {
    const has2024 = flags.includes(true);
    const has2014 = flags.includes(false);
    if (has2024 && has2014) return 'mixed';
    if (has2024) return '2024';
    if (has2014) return '2014';
    return 'unknown';
}

function labelForOrigin(origin: ImportOrigin): string {
    switch (origin) {
        case 'manual': return 'Manual Entry';
        case 'dnd-beyond-pdf': return 'D&D Beyond PDF';
        case '5etools': return '5e.tools';
        case 'homebrew': return 'Homebrew';
        case 'campaign-lore': return 'Campaign Lore';
        case 'mixed': return 'Mixed Sources';
    }
}

export function inferCharacterEdition(character: Partial<Character>, fallback: RulesEdition = 'unknown'): RulesEdition {
    const flags: boolean[] = [];

    [character.importedData?.race, character.importedData?.class, character.importedData?.background, character.importedData?.subclass]
        .forEach((entry) => {
            if (!entry) return;
            if (typeof entry.is2024 === 'boolean') {
                flags.push(entry.is2024);
                return;
            }
            if (typeof entry.source === 'string') {
                flags.push(is2024Source(entry.source));
            }
        });

    [
        ...(character.features || []),
        ...(character.racialTraits || []),
        ...(character.feats || []),
        ...(character.inventory || []),
        ...(character.spells || [])
    ].forEach((entry) => {
        if (typeof entry.is2024 === 'boolean') {
            flags.push(entry.is2024);
        }
    });

    const inferred = editionFromFlags(flags);
    return inferred === 'unknown' ? fallback : inferred;
}

export function mergeImportOrigins(current: ImportOrigin | undefined, incoming: ImportOrigin): ImportOrigin {
    if (!current || current === incoming) return incoming;
    if (current === 'manual') return incoming;
    if (incoming === 'manual') return current;
    return 'mixed';
}

export function mergeCharacterProvenance(
    current: ImportProvenance | undefined,
    incoming: Partial<ImportProvenance> & Pick<ImportProvenance, 'origin'>
): ImportProvenance {
    const nextOrigin = mergeImportOrigins(current?.origin, incoming.origin);
    const nextEdition =
        current?.edition && incoming.edition && current.edition !== incoming.edition
            ? 'mixed'
            : incoming.edition || current?.edition || 'unknown';

    const summaryCandidates = [
        current?.sourceSummary,
        incoming.sourceSummary
    ].filter((value): value is string => Boolean(value));

    return {
        origin: nextOrigin,
        edition: nextEdition,
        sourceSummary: summarizeSources(summaryCandidates) || labelForOrigin(nextOrigin),
        importedAt: current?.importedAt || incoming.importedAt || Date.now()
    };
}

export function normalizeCharacterProvenance(character: Character): ImportProvenance {
    const existing = character.provenance;
    const derivedSources = summarizeSources(
        [
            existing?.sourceSummary,
            character.importedData?.race?.source,
            character.importedData?.class?.source,
            character.importedData?.background?.source,
            character.importedData?.subclass?.source
        ].filter((value): value is string => Boolean(value))
    );

    const origin = existing?.origin || 'manual';
    return {
        origin,
        edition: inferCharacterEdition(character, existing?.edition || 'unknown'),
        sourceSummary: derivedSources || existing?.sourceSummary || labelForOrigin(origin),
        importedAt: existing?.importedAt
    };
}

export function getEditionClasses(edition: RulesEdition): string {
    switch (edition) {
        case '2024': return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
        case '2014': return 'bg-sky-500/15 text-sky-300 border-sky-400/30';
        case 'mixed': return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
        default: return 'bg-stone-500/10 text-stone-300 border-stone-500/20';
    }
}

export function getOriginClasses(origin: ImportOrigin): string {
    switch (origin) {
        case 'dnd-beyond-pdf': return 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30';
        case '5etools': return 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30';
        case 'homebrew': return 'bg-rose-500/15 text-rose-200 border-rose-400/30';
        case 'campaign-lore': return 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30';
        case 'mixed': return 'bg-amber-500/15 text-amber-200 border-amber-400/30';
        default: return 'bg-stone-500/10 text-stone-300 border-stone-500/20';
    }
}

export function getEditionLabel(edition: RulesEdition): string {
    switch (edition) {
        case '2024': return '2024';
        case '2014': return '2014';
        case 'mixed': return 'Mixed';
        default: return 'Unknown';
    }
}

export function getOriginLabel(origin: ImportOrigin): string {
    return labelForOrigin(origin);
}
