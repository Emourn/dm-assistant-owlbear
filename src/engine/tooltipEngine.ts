import GLOSSARY_DATA from '../data/rules2024/glossary.json';

export interface TooltipData {
    term: string;
    definition: string;
    ruleRef: string;
    category?: string;
    details?: string;
}

const glossary = GLOSSARY_DATA.glossary as TooltipData[];

/**
 * Normalizes a string for comparison.
 */
function normalize(str: string): string {
    return str.toLowerCase().trim().replace(/s$/, ''); // Remove trailing 's' for simple plural matching
}

/**
 * Searches the glossary for a term.
 */
export function getTooltip(term: string): TooltipData | null {
    if (!term) return null;

    const search = normalize(term);

    // 1. Exact or normalized simple match
    let matched = glossary.find(item =>
        normalize(item.term) === search ||
        normalize(item.term).includes(search) ||
        search.includes(normalize(item.term))
    );

    // 2. Special case mapping for abbreviations
    if (!matched) {
        const abbrevMap: Record<string, string> = {
            'str': 'strength',
            'dex': 'dexterity',
            'con': 'constitution',
            'int': 'intelligence',
            'wis': 'wisdom',
            'cha': 'charisma',
            'ac': 'armor class',
            'pb': 'proficiency bonus'
        };

        if (abbrevMap[search]) {
            const fullTerm = abbrevMap[search];
            matched = glossary.find(item => normalize(item.term) === fullTerm);
        }
    }

    return matched || null;
}

/**
 * Provides a list of all terms in the glossary for autocomplete or indexing.
 */
export function getAllGlossaryTerms(): string[] {
    return glossary.map(item => item.term);
}
