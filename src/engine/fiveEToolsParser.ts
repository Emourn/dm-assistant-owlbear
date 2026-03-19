import { Action, ActionType } from '../types/actions';
import { Spell, Feature, Item, Resource, Character, Effect } from '../types/character';
import { FLAVOR_DESCRIPTIONS } from '../data/dnd5e/flavorDescriptions';
import { ALL_OFFICIAL_LANGUAGES } from '../data/dnd5e/languages';
import LOCAL_CONDITIONS from '../data/dnd5e/conditions.json';
import CAMPAIGN_LORE from '../data/dnd5e/campaignLore.json';

// Local 2024 Rulebook Data (The "Holy Grail")
import CLASSES_2024_DATA from '../data/rules2024/classes.json';
import SPECIES_2024_DATA from '../data/rules2024/species.json';
import BACKGROUNDS_2024_DATA from '../data/rules2024/backgrounds.json';
import EQUIPMENT_2024_DATA from '../data/rules2024/equipment.json';
import SPELLS_2024_DATA from '../data/rules2024/spells.json';
import FEATS_2024_DATA from '../data/rules2024/feats.json';
import { buildSpellSlotsForClass, getClassSpellcastingAbility } from './rulesEngine';

const CLASSES_2024 = (CLASSES_2024_DATA as any).classes || [];
const SPECIES_2024 = (SPECIES_2024_DATA as any).species || [];
const BACKGROUNDS_2024 = (BACKGROUNDS_2024_DATA as any).backgrounds || [];
const EQUIPMENT_2024 = [
    ...((EQUIPMENT_2024_DATA as any).weapons || []),
    ...((EQUIPMENT_2024_DATA as any).armor || []),
    ...((EQUIPMENT_2024_DATA as any).gear || [])
];
const SPELLS_2024 = (SPELLS_2024_DATA as any).spells || [];
const FEATS_2024 = (FEATS_2024_DATA as any).feats || [];

interface LocalSubclassShape {
    name?: string;
    shortName?: string;
}

interface LocalClassShape {
    name?: string;
    source?: string;
    subclasses?: LocalSubclassShape[];
}

function getLocalSubclassesForClass(className: string): { name: string; shortName: string; source: string; is2024: boolean; className: string }[] {
    const normalized = className.toLowerCase().trim();
    if (!normalized) return [];

    const classes = CLASSES_2024 as LocalClassShape[];
    const cls = classes.find((c) => c?.name?.toLowerCase() === normalized);
    if (!cls || !Array.isArray(cls.subclasses)) return [];

    return cls.subclasses
        .filter((sc): sc is LocalSubclassShape & { name: string } => typeof sc?.name === 'string' && sc.name.trim().length > 0)
        .map((sc) => ({
            name: sc.name,
            shortName: sc.shortName || sc.name,
            source: cls.source || 'XPHB',
            is2024: true,
            className: cls.name || className
        }));
}

// 5e.tools hosts its data as raw JSON on GitHub.
// The main site blocks direct API calls (CORS), but the GitHub mirror works perfectly.
const _5ETOOLS_MIRRORS = [
    "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/", // Primary Mirror (Working as of 2024/2025 structure)
    "https://raw.githubusercontent.com/TheGiddyLimit/TheGiddyLimit.github.io/main/data/",
    "https://raw.githubusercontent.com/5etools-mirror-2/5etools-mirror-2.github.io/master/data/",
    "https://5e.tools/data/" // Fallback (CORS will likely block in browser)
];

const DAMAGE_TYPES = [
    'acid',
    'bludgeoning',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'piercing',
    'poison',
    'psychic',
    'radiant',
    'slashing',
    'thunder'
] as const;

const DAMAGE_TYPE_PATTERN = DAMAGE_TYPES.join('|');

function extractDamageTypesFromText(text: string, phrase: 'resistance' | 'immunity'): string[] {
    const matches = Array.from(
        text.matchAll(new RegExp(`${phrase}\\s+to\\s+(${DAMAGE_TYPE_PATTERN})\\s+damage`, 'gi'))
    );
    return matches.map((match) => match[1].toLowerCase());
}

/**
 * Returns true if the source book is a D&D 2024 (One D&D) core or supplement.
 */
export function is2024Source(source?: string): boolean {
    if (!source) return false;
    const s = source.toUpperCase();
    return ['XPHB', 'TDCG', 'XMM', 'XDMG', 'PHB 2024', 'PHB2024', '2024'].some(k => s.includes(k));
}

// In-memory cache so we only fetch once per session
const cache: Record<string, any> = {};

export async function fetch5eData(endpoint: string): Promise<any> {
    if (cache[endpoint]) return cache[endpoint];

    const FETCH_TIMEOUT = 5000; // 5 second timeout per mirror attempt

    for (const mirror of _5ETOOLS_MIRRORS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const url = `${mirror}${endpoint}`;
            const response = await fetch(url, {
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[5e Parser] Mirror ${mirror} returned ${response.status} for ${endpoint}`);
                continue;
            }

            const data = await response.json();
            cache[endpoint] = data;
            return data;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error(`[5e Parser] Timeout fetching ${endpoint} from ${mirror}`);
            } else {
                console.error(`[5e Parser] Failed to fetch ${endpoint} from ${mirror}:`, error.message || error);
            }
        }
    }

    console.error(`[5e Parser] All mirrors failed for ${endpoint}`);
    return null;
}

export async function fetchCustomUrl(url: string): Promise<any> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Custom fetch error:', e);
        throw e;
    }
}

const SCHOOL_MAP: Record<string, string> = {
    A: 'Abjuration',
    C: 'Conjuration',
    D: 'Divination',
    E: 'Enchantment',
    V: 'Evocation',
    I: 'Illusion',
    N: 'Necromancy',
    T: 'Transmutation',
};

const LOCAL_RULES: Record<string, string> = {
    "strength": "Strength measures bodily power, athletic training, and the extent to which you can exert raw physical force.\n\nA Strength check can model any attempt to lift, push, pull, or break something, to force your body through a space, or to otherwise apply brute force to a situation.",
    "dexterity": "Dexterity measures agility, reflexes, and balance.\n\nA Dexterity check can model any attempt to move nimbly, quickly, or quietly, or to keep from falling on tricky footing.",
    "constitution": "Constitution measures health, stamina, and vital force.\n\nConstitution checks are uncommon, and no skills apply to Constitution checks, because the endurance this ability represents is largely passive.",
    "intelligence": "Intelligence measures mental acuity, accuracy of recall, and the ability to reason.\n\nAn Intelligence check comes into play when you need to draw on logic, education, memory, or deductive reasoning.",
    "wisdom": "Wisdom reflects how attuned you are to the world around you and represents perceptiveness and intuition.\n\nA Wisdom check might reflect an effort to read body language, understand someone's feelings, or notice things about the environment.",
    "charisma": "Charisma measures your ability to interact effectively with others. It includes such factors as confidence and eloquence, and it can represent a charming or commanding personality.",
    "feature": "A feature is a special capability or enhancement derived from your race, class, background, or feat. Class features define your character's main combat and exploration capabilities. Feats provide unique optional benefits.",
    "armor class": "Your Armor Class (AC) represents how well your character avoids being wounded in battle. Things that contribute to your AC include the armor you wear, the shield you carry, and your Dexterity modifier.",
    "initiative": "Initiative determines the order of turns during combat. When combat starts, every participant makes a Dexterity check to determine their place in the initiative order.",
    ...FLAVOR_DESCRIPTIONS
};

/**
 * Recursively flattens 5e.tools "entries" arrays into a readable plain-text string.
 * 5e.tools stores descriptions as deeply nested arrays of strings and objects.
 */
export function flattenEntries(entries: any[]): string {
    if (!entries) return '';
    return entries.map((entry: any) => {
        if (typeof entry === 'string') return entry.replace(/\{@.*?\s(.*?)\}/g, '$1'); // Strips 5e.tools inline tags like {@spell fireball} -> fireball
        if (entry.entries) {
            const prefix = entry.name ? `**${entry.name}.** ` : '';
            return `${prefix}${flattenEntries(entry.entries)}`;
        }
        if (entry.type === 'list' && entry.items) {
            return entry.items.map((item: any) => {
                if (typeof item === 'string') return `• ${item.replace(/\{@.*?\s(.*?)\}/g, '$1')}`;
                if (item.name && item.entry) return `• **${item.name}** ${item.entry.replace(/\{@.*?\s(.*?)\}/g, '$1')}`;
                if (item.entries) return flattenEntries(item.entries);
                return '';
            }).join('\n');
        }
        if (entry.type === 'abilityAttackMod') return "your spellcasting ability modifier";
        return '';
    }).filter(Boolean).join('\n\n');
}

/**
 * Helper to parse 5e.tools resistance/immunity/vulnerability structures.
 * Handles arrays of strings and complex objects with "preNote", "note", or "cond".
 */
export function parseResistances(data: any[] | undefined): { types: string[]; notes: string[] } {
    if (!data) return { types: [], notes: [] };
    const types: string[] = [];
    const notes: string[] = [];

    const processItem = (item: any) => {
        if (typeof item === 'string') {
            types.push(item.toLowerCase());
        } else if (typeof item === 'object' && item !== null) {
            // 5e.tools objects can have 'res', 'immune', 'vulnerable', 'cond' 
            // OR even nested 'resist'/'immune' keys if it's a conditional resistance
            const subTypes = item.res || item.immune || item.vulnerable || item.cond || item.resist || [];

            if (Array.isArray(subTypes)) {
                subTypes.forEach((t: any) => {
                    if (typeof t === 'string') types.push(t.toLowerCase());
                    else if (typeof t === 'object' && (t.res || t.resist)) {
                        // Handle double nesting if it exists
                        const nested = t.res || t.resist;
                        if (Array.isArray(nested)) nested.forEach((nt: string) => types.push(nt.toLowerCase()));
                    }
                });
            } else if (typeof subTypes === 'string') {
                types.push(subTypes.toLowerCase());
            }

            if (item.note) notes.push(item.note);
            if (item.preNote) notes.push(item.preNote);
            if (item.special) notes.push(item.special);
        }
    };

    if (Array.isArray(data)) {
        data.forEach(processItem);
    } else {
        processItem(data);
    }

    return { types, notes };
}

/**
 * Searches the 5e.tools spell database and converts results to our internal Spell type.
 */
export async function searchSpells(query: string, filter?: { className?: string; level?: number }): Promise<Spell[]> {
    const queryLower = query.toLowerCase().trim();
    const classFilter = filter?.className?.toLowerCase();

    const results: Spell[] = [];

    // 1. Check local 2024 Spells first
    for (const s of SPELLS_2024) {
        const matchesQuery = !queryLower || s.name.toLowerCase().includes(queryLower);
        const matchesLevel = filter?.level === undefined || s.level === filter.level;
        if (matchesQuery && matchesLevel) {
            results.push({ ...s, is2024: true });
        }
    }

    // Try to get index
    const index = await fetch5eData('spells/index.json');
    if (!index) return results;

    // Prioritize core books. XPHB is 2024.
    const PRIORITY_SOURCES = ['XPHB', 'PHB', 'XGE', 'TCE', 'FTD', 'SCC', 'AAG', 'AI'];
    const sourceKeys = Object.keys(index).sort((a, b) => {
        const idxA = PRIORITY_SOURCES.indexOf(a);
        const idxB = PRIORITY_SOURCES.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
    }).slice(0, 15); // Slightly larger source set for spells

    for (const key of sourceKeys) {
        if (results.length >= 100) break; // More results for spells

        const fileName = index[key];
        const data = await fetch5eData(`spells/${fileName}`);
        if (!data || !data.spell) continue;

        const matched = data.spell.filter((s: any) => {
            const matchesQuery = !queryLower || s.name.toLowerCase().includes(queryLower);
            const matchesLevel = filter?.level === undefined || s.level === filter.level;

            let matchesClass = true;
            if (classFilter) {
                // 5e.tools spells have a generic 'classes' object or 'class' list
                const classes = s.classes?.fromClassList || [];
                matchesClass = classes.some((c: any) => c.name.toLowerCase() === classFilter);
            }

            return matchesQuery && matchesLevel && matchesClass;
        });

        for (const s of matched) {
            if (results.length >= 100) break;

            // Ensure we have a valid source for the 2024 indicator
            const mapped = mapToInternalSpell(s);
            if (s.source) mapped.source = s.source;
            results.push(mapped);
        }
    }

    return results;
}

/**
 * Fetches all spells available to a specific class and level. (Failure 4 FIX)
 */
export async function getAvailableSpells(className: string, level: number): Promise<Spell[]> {
    return searchSpells('', { className, level });
}

/**
 * Fetches a single spell by name, prioritizing local 2024 data.
 */
export async function fetchSpell(name: string): Promise<Spell | null> {
    const nameLower = name.toLowerCase().trim();

    // 1. Check local 2024 first
    const local = SPELLS_2024.find((s: any) => s.name.toLowerCase() === nameLower);
    if (local) return { ...local, is2024: true };

    // 2. Search via searchSpells (which also checks local first, then prioritizes XPHB)
    const results = await searchSpells(name);
    const exactMatch = results.find(s => s.name.toLowerCase() === nameLower);
    return exactMatch || (results.length > 0 ? results[0] : null);
}

/**
 * Fetches a single feat by name, prioritizing local 2024 data.
 */
export async function fetchFeat(name: string): Promise<Feature | null> {
    const nameLower = name.toLowerCase().trim();

    // 1. Check local 2024 first
    const local = FEATS_2024.find((f: any) => f.name.toLowerCase() === nameLower);
    if (local) return { ...local, is2024: true };

    // 2. Search via searchFeats
    const results = await searchFeats(name);
    const exactMatch = results.find(f => f.name.toLowerCase() === nameLower);
    return exactMatch || (results.length > 0 ? results[0] : null);
}

function mapToInternalFeature(f: any): Feature {
    const abilityScoreBonuses: Partial<Record<string, number>> = {};
    if (f.ability) {
        for (const abSet of f.ability) {
            for (const stat of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
                if (typeof abSet[stat] === 'number') {
                    abilityScoreBonuses[stat as keyof typeof abilityScoreBonuses] = (abilityScoreBonuses[stat as keyof typeof abilityScoreBonuses] || 0) + abSet[stat];
                }
            }
        }
    }

    return {
        id: `feat_${f.name.replace(/\s+/g, '_').toLowerCase()}_${f.source?.toLowerCase() || 'unknown'}`,
        name: f.name,
        source: f.source || '5e.tools',
        description: f.entries ? flattenEntries(f.entries) : '',
        hasUses: false,
        isFeat: true,
        source5eTools: f.source,
        is2024: is2024Source(f.source),
        abilityScoreBonuses: Object.keys(abilityScoreBonuses).length > 0 ? abilityScoreBonuses : undefined,
    };
}

function mapToInternalSpell(s: any): Spell {
    // Parse casting time
    let castingTime = '1 action';
    if (s.time && s.time[0]) {
        const t = s.time[0];
        castingTime = `${t.number} ${t.unit}${t.number > 1 ? 's' : ''}`;
    }

    // Parse range
    let range = 'Self';
    if (s.range) {
        if (s.range.type === 'point' && s.range.distance) {
            const d = s.range.distance;
            range = d.type === 'self' ? 'Self' :
                d.type === 'touch' ? 'Touch' :
                    `${d.amount} ${d.type}`;
        } else if (s.range.type === 'special') {
            range = 'Special';
        }
    }

    // Parse duration
    let duration = 'Instantaneous';
    let concentration = false;
    if (s.duration && s.duration[0]) {
        const dur = s.duration[0];
        concentration = !!dur.concentration;
        if (dur.type === 'instant') {
            duration = 'Instantaneous';
        } else if (dur.type === 'timed' && dur.duration) {
            duration = `${dur.duration.amount} ${dur.duration.type}${dur.duration.amount > 1 ? 's' : ''}`;
        } else if (dur.type === 'permanent') {
            duration = 'Until dispelled';
        } else if (dur.type === 'special') {
            duration = 'Special';
        }
    }

    return {
        id: `spell_${s.name.replace(/\s+/g, '_').toLowerCase()}_${s.source || 'phb'}`,
        name: s.name,
        level: s.level,
        school: SCHOOL_MAP[s.school] || s.school || 'Unknown',
        castingTime,
        range,
        components: {
            v: !!s.components?.v,
            s: !!s.components?.s,
            m: !!s.components?.m,
            mDesc: typeof s.components?.m === 'object' ? s.components.m.text :
                typeof s.components?.m === 'string' ? s.components.m : undefined,
        },
        duration: concentration ? `Concentration, ${duration}` : duration,
        concentration,
        ritual: !!s.meta?.ritual,
        description: s.entries ? flattenEntries(s.entries) : '',
        higherLevels: s.entriesHigherLevel ? flattenEntries(s.entriesHigherLevel) : undefined,
        prepared: false,
        isHomebrew: false,
        source: s.source || 'Unknown',
        is2024: is2024Source(s.source)
    } as Spell;
}

/**
 * Searches the 5e.tools feats database and converts results to our internal Feature type.
 */
export async function searchFeats(query: string): Promise<Feature[]> {
    const queryLower = (query || "").toLowerCase().trim();
    const results: Feature[] = [];

    // 1. Check local 2024 Feats first
    for (const f of FEATS_2024) {
        if (!queryLower || f.name.toLowerCase().includes(queryLower)) {
            results.push({ ...f, is2024: true });
        }
    }

    const data = await fetch5eData('feats.json');
    if (!data || !data.feat) return results;

    const matched = data.feat.filter((f: any) =>
        !queryLower || f.name.toLowerCase().includes(queryLower)
    );

    for (const f of matched) {
        const mapped = mapToInternalFeature(f);
        if (f.source) mapped.source = f.source;
        const existingIdx = results.findIndex(r => r.name === f.name);
        if (existingIdx >= 0) {
            if (results[existingIdx].is2024) continue;
            if (is2024Source(f.source)) {
                results[existingIdx] = mapped;
            }
        } else {
            results.push(mapped);
        }
    }

    return results;
}

export async function searchItems(query: string): Promise<Item[]> {
    const queryLower = query.toLowerCase().trim();
    const results: Item[] = [];

    // 1. Check local 2024 Equipment first (Source of Truth)
    for (const item of EQUIPMENT_2024) {
        if (!queryLower || item.name.toLowerCase().includes(queryLower)) {
            let type: Item['type'] = 'gear';
            if ((item as any).category === 'Simple' || (item as any).category === 'Martial' || (item as any).type === 'Melee' || (item as any).type === 'Ranged') {
                type = 'weapon';
            } else if ((item as any).type === 'HA' || (item as any).type === 'MA' || (item as any).type === 'LA' || (item as any).type === 'S') {
                type = 'armor';
            }

            const description = item.description || '';

            results.push({
                ...item,
                id: `local_2024_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
                type,
                quantity: 1,
                isEquipped: false,
                isAttuned: false,
                is2024: true,
                source: 'PHB 2024',
                effects: extractEffectsFromItem(item, description)
            } as Item);
        }
    }

    try {
        const itemsData = await fetch5eData('items.json');
        const baseItemsData = await fetch5eData('items-base.json');

        // itemsData.item is the array, baseItemsData.baseitem is the array
        const allItems = [...(itemsData?.item || []), ...(baseItemsData?.baseitem || [])];
        const PRIORITY_SOURCES = ['XPHB', 'PHB', 'XGE', 'TCE', 'FTD', 'SCC', 'AAG', 'AI'];

        const remoteResults = allItems
            .filter((i: any) => i.name && (!queryLower || i.name.toLowerCase().includes(queryLower)))
            // Avoid duplicates if we have it in 2024 local
            .filter((i: any) => !results.some(r => r.name.toLowerCase() === i.name.toLowerCase()))
            .sort((a: any, b: any) => {
                const idxA = PRIORITY_SOURCES.indexOf(a.source || 'PHB');
                const idxB = PRIORITY_SOURCES.indexOf(b.source || 'PHB');

                if (idxA !== -1 && idxB !== -1) {
                    if (idxA !== idxB) return idxA - idxB;
                } else if (idxA !== -1) return -1;
                else if (idxB !== -1) return 1;

                return a.name.localeCompare(b.name);
            })
            .slice(0, 100)
            .map((i: any): Item => {
                let type: Item['type'] = 'gear';
                if (i.weaponCategory) type = 'weapon';
                else if (i.armorClass || i.type === 'HA' || i.type === 'MA' || i.type === 'LA' || i.type === 'S') type = 'armor';
                else if (i.wondrous || (i.rarity && i.rarity !== 'None')) type = 'magic';
                else if (i.type === 'P') type = 'potion';
                else if (i.type === 'SC') type = 'scroll';

                let description = i.entries ? flattenEntries(i.entries) : '';
                if (!description) {
                    // Try looking at generic details
                    if (i.weaponCategory) description += `Weapon: ${i.weaponCategory}\n`;
                    if (i.armorClass) description += `Base AC: ${typeof i.ac === 'number' ? i.ac : (i.ac ? i.ac[0] : '')}\n`;
                }

                let damageStr = (i.dmg1 || i.dmg) || undefined;
                if (damageStr && i.dmgType) {
                    const typeMap: Record<string, string> = { S: 'slashing', P: 'piercing', B: 'bludgeoning', F: 'fire', C: 'cold', L: 'lightning', T: 'thunder', A: 'acid', O: 'force', R: 'radiant', N: 'necrotic', Y: 'psychic', M: 'poison' };
                    damageStr = `${damageStr} ${typeMap[i.dmgType] || i.dmgType}`;
                }

                return {
                    id: `item_${i.name.replace(/\s+/g, '_').toLowerCase()}_${i.source?.toLowerCase() || 'unknown'}`,
                    name: i.name,
                    quantity: 1,
                    weight: i.weight || 0,
                    isEquipped: false,
                    isAttuned: false,
                    type,
                    description: description.trim(),
                    acBonus: i.ac ? (typeof i.ac === 'number' ? i.ac : i.ac[0]) : undefined,
                    damage: damageStr,
                    effects: extractEffectsFromItem(i, description),
                    isHomebrew: false,
                    source: i.source || 'Unknown',
                    is2024: is2024Source(i.source)
                } as Item;
            });

        return [...results, ...remoteResults];
    } catch (e) {
        console.error("Error searching items:", e);
        return results;
    }
}

/**
 * Searches the 5e.tools conditions.
 */
export async function searchConditions(query: string): Promise<any[]> {
    const queryLower = query.toLowerCase().trim();

    // 1. Search local high-quality conditions first
    const localMatches = (LOCAL_CONDITIONS as any[])
        .filter(c => !queryLower || c.name.toLowerCase().includes(queryLower))
        .map(c => ({
            name: c.name,
            source: 'PHB (Core Rules)',
            description: c.description
        }));

    // 2. Fetch from 5e.tools for DISEASES and other modules
    const data = await fetch5eData('conditionsdiseases.json');
    if (!data || !data.condition) return localMatches;

    const remoteMatches = data.condition
        .filter((c: any) => !queryLower || c.name.toLowerCase().includes(queryLower))
        // Avoid duplicating if we have a better local version
        .filter((c: any) => !localMatches.some(l => l.name.toLowerCase() === c.name.toLowerCase()))
        .slice(0, 50)
        .map((c: any) => ({
            name: c.name,
            source: c.source || 'PHB',
            description: c.entries ? flattenEntries(c.entries) : ''
        }));

    return [...localMatches, ...remoteMatches].slice(0, 50);
}

/**
 * Searches the 5e.tools races.
 */
export async function searchRaces(query: string): Promise<any[]> {
    const queryLower = query.toLowerCase().trim();
    const results: any[] = [];

    // 1. Check local 2024 Species first
    for (const s of SPECIES_2024) {
        if (!queryLower || s.name.toLowerCase().includes(queryLower)) {
            results.push({
                ...s,
                is2024: true,
                source: "PHB 2024"
            });
        }
    }

    try {
        const data = await fetch5eData('races.json');
        if (!data || !data.race) return results;

        const remoteResults = data.race
            .filter((r: any) => !queryLower || r.name.toLowerCase().includes(queryLower))
            // Avoid duplicates
            .filter((r: any) => !results.some(res => res.name.toLowerCase() === r.name.toLowerCase()))
            .sort((a: any, b: any) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aExact = aName === queryLower;
                const bExact = bName === queryLower;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;
                const a2024 = is2024Source(a.source);
                const b2024 = is2024Source(b.source);
                if (a2024 && !b2024) return -1;
                if (!a2024 && b2024) return 1;
                return aName.localeCompare(bName);
            })
            .slice(0, 50)
            .map((r: any) => ({
                name: r.name,
                source: r.source,
                speed: r.speed,
                darkvision: r.darkvision,
                size: r.size,
                resist: r.resist,
                description: r.entries ? flattenEntries(r.entries) : '',
                ability: r.ability,
                languageProficiencies: r.languageProficiencies,
                skillProficiencies: r.skillProficiencies,
                entries: r.entries,
                is2024: is2024Source(r.source)
            }));

        return [...results, ...remoteResults].slice(0, 50);
    } catch (e) {
        console.error("Error searching races:", e);
        return results;
    }
}

/**
 * Searches the 5e.tools backgrounds.
 */
export async function searchBackgrounds(query: string): Promise<any[]> {
    const queryLower = query.toLowerCase().trim();
    const results: any[] = [];

    // 1. Check local 2024 Backgrounds first
    for (const b of BACKGROUNDS_2024) {
        if (!queryLower || b.name.toLowerCase().includes(queryLower)) {
            results.push({
                ...b,
                is2024: true,
                source: "PHB 2024"
            });
        }
    }

    try {
        const data = await fetch5eData('backgrounds.json');
        if (!data || !data.background) return results;

        const remoteResults = data.background
            .filter((bg: any) => (!queryLower || bg.name.toLowerCase().includes(queryLower)) && !bg._copy)
            // Avoid duplicates
            .filter((bg: any) => !results.some(res => res.name.toLowerCase() === bg.name.toLowerCase()))
            .sort((a: any, b: any) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aExact = aName === queryLower;
                const bExact = bName === queryLower;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;
                const a2024 = is2024Source(a.source);
                const b2024 = is2024Source(b.source);
                if (a2024 && !b2024) return -1;
                if (!a2024 && b2024) return 1;
                return aName.localeCompare(bName);
            })
            .slice(0, 50)
            .map((bg: any) => ({
                name: bg.name,
                source: bg.source,
                skillProficiencies: bg.skillProficiencies,
                toolProficiencies: bg.toolProficiencies,
                languageProficiencies: bg.languageProficiencies,
                startingEquipment: bg.startingEquipment,
                description: bg.entries ? flattenEntries(bg.entries) : '',
                entries: bg.entries,
                is2024: is2024Source(bg.source)
            }));

        return [...results, ...remoteResults];
    } catch (e) {
        console.error("Error searching backgrounds:", e);
        return results;
    }
}

/**
 * Searches our local campaign-specific lore (pre-extracted from PDFs).
 */
export function searchAdventureLore(query: string) {
    const q = query.toLowerCase().trim();

    // Priority 1: Exact name match
    const exact = CAMPAIGN_LORE.entities.find(e => e.name.toLowerCase() === q);
    if (exact) {
        return { name: exact.name, description: exact.description, source: exact.source || 'Campaign Lore' };
    }

    // Priority 2: Alias match (exact)
    const aliasMatch = CAMPAIGN_LORE.entities.find(e =>
        (e as any).aliases?.some((a: string) => a.toLowerCase() === q)
    );
    if (aliasMatch) {
        return { name: aliasMatch.name, description: aliasMatch.description, source: aliasMatch.source || 'Campaign Lore' };
    }

    // Priority 3: Bidirectional fuzzy match on name and aliases
    const fuzzy = CAMPAIGN_LORE.entities.find(e => {
        const loreName = e.name.toLowerCase();
        // Query contains lore name, or lore name contains query
        if (q.length >= 4 && loreName.includes(q)) return true;
        if (loreName.length >= 4 && q.includes(loreName)) return true;
        // Check aliases too
        if ((e as any).aliases) {
            return (e as any).aliases.some((a: string) => {
                const al = a.toLowerCase();
                if (q.length >= 4 && al.includes(q)) return true;
                if (al.length >= 4 && q.includes(al)) return true;
                return false;
            });
        }
        return false;
    });

    if (fuzzy) {
        return { name: fuzzy.name, description: fuzzy.description, source: fuzzy.source || 'Campaign Lore' };
    }

    return null;
}

/**
 * Generic lookup function for tooltips. Searches through multiple basic datasets
 * to find a matching rule text.
 */
export async function lookupByName(query: string): Promise<{ name: string; description: string; source?: string } | null> {
    const queryLower = query.toLowerCase().trim();

    // 1. Check local lore first (Pre-extracted from PDFs) - PRIORITY 1
    const loreMatch = searchAdventureLore(queryLower);
    if (loreMatch) return loreMatch;

    // 2. Check local fallback dictionary for core mechanics - PRIORITY 2
    if (LOCAL_RULES[queryLower]) {
        return { name: query, description: LOCAL_RULES[queryLower], source: 'PHB (Core Rules)' };
    }

    // Run remote lookups in parallel to minimize latency
    const results = await Promise.all([
        searchConditions(queryLower),
        fetch5eData('skills.json'),
        fetch5eData('actions.json'),
        searchItems(queryLower)
    ]);

    const [conds, skillsData, actionsData, items] = results;

    // 1. Check conditions
    if (conds && conds.length > 0) {
        const match = conds.find((c: any) => c.name.toLowerCase() === queryLower);
        if (match) return match;
    }

    // 2. Check skills
    if (skillsData && skillsData.skill) {
        const skill = skillsData.skill.find((s: any) => s.name.toLowerCase() === queryLower);
        if (skill) return { name: skill.name, description: skill.entries ? flattenEntries(skill.entries) : '', source: 'PHB' };
    }

    // 3. Check actions
    if (actionsData && actionsData.action) {
        const action = actionsData.action.find((a: any) => a.name.toLowerCase() === queryLower);
        if (action) return { name: action.name, description: action.entries ? flattenEntries(action.entries) : '', source: 'PHB' };
    }

    // 4. Check items
    if (items && items.length > 0) {
        const match = items.find((i: any) => i.name.toLowerCase() === queryLower);
        if (match) return { name: match.name, description: match.description, source: 'Items' };
    }

    // Final fallback: Fuzzy matches (if no exact match found)
    if (items && items.length > 0 && items[0].name.toLowerCase().includes(queryLower)) {
        return { name: items[0].name, description: items[0].description, source: 'Items' };
    }
    if (conds && conds.length > 0 && conds[0].name.toLowerCase().includes(queryLower)) {
        return conds[0];
    }

    return null;
}

/**
 * Searches the 5e.tools classes by reading the class/index.json
 * to discover per-class files, then fetching only the matching ones.
 */
function scoreStartingEquipmentData(startingEquipment: any): number {
    if (!startingEquipment) return 0;
    if (Array.isArray(startingEquipment.defaultData)) {
        return startingEquipment.defaultData.reduce((score: number, block: any) => {
            const keys = ['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].filter((key) => block?.[key] !== undefined);
            return score + keys.length;
        }, 0);
    }
    let score = 0;
    if (startingEquipment.choiceA) score += 1;
    if (startingEquipment.choiceB) score += 1;
    return score;
}

function classRecordScore(cls: any): number {
    const equipmentScore = scoreStartingEquipmentData(cls.startingEquipment);
    const featureScore = Array.isArray(cls.classFeatures) ? cls.classFeatures.length : 0;
    const hdScore = cls.hd?.faces ? 1 : 0;
    return equipmentScore * 10 + featureScore + hdScore;
}

function shouldReplaceClassResult(existing: any, incoming: any): boolean {
    if (!existing) return true;
    if (incoming.is2024 && !existing.is2024) return true;
    if (!incoming.is2024 && existing.is2024) return false;

    const existingScore = classRecordScore(existing);
    const incomingScore = classRecordScore(incoming);
    if (incomingScore !== existingScore) return incomingScore > existingScore;

    const incomingSource = (incoming.source || '').toUpperCase();
    const existingSource = (existing.source || '').toUpperCase();
    if (incomingSource === 'XPHB' && existingSource !== 'XPHB') return true;
    return false;
}

export async function searchClasses(query: string): Promise<any[]> {
    const queryLower = query.toLowerCase().trim();
    const results: any[] = [];

    // 1. Check local 2024 Classes first
    for (const c of CLASSES_2024) {
        if (!queryLower || c.name.toLowerCase().includes(queryLower)) {
            results.push({
                ...c,
                is2024: true,
                source: "PHB 2024"
            });
        }
    }

    try {
        const index = await fetch5eData('class/index.json');
        if (!index) return results;

        const matchingKeys = Object.keys(index).filter(key =>
            !queryLower || key.toLowerCase().includes(queryLower)
        );

        if (matchingKeys.length === 0) return results;

        const fetches = matchingKeys.slice(0, 10).map(async (key) => {
            const fileName = index[key];
            const data = await fetch5eData(`class/${fileName}`);
            if (!data || !data.class) return;

            const legacyStartingEquipmentByClass = new Map<string, any>();
            for (const cls of data.class) {
                if (is2024Source(cls.source)) continue;
                if (cls.startingEquipment?.defaultData) {
                    legacyStartingEquipmentByClass.set(cls.name.toLowerCase(), cls.startingEquipment);
                }
            }

            for (const c of data.class) {
                if (queryLower && !c.name.toLowerCase().includes(queryLower)) continue;

                const is2024 = is2024Source(c.source);
                const existingIdx = results.findIndex(r => r.name === c.name);

                const saves = (c.proficiency || []).map((s: string) => s.toUpperCase()).join(', ');
                const armorProfs = c.startingProficiencies?.armor?.join(', ') || 'None';
                const weaponProfs = c.startingProficiencies?.weapons?.join(', ') || 'None';

                const features = (c.classFeatures || [])
                    .map((f: any) => typeof f === 'string' ? f.split('|')[0] : (f.classFeature?.split('|')[0] || ''))
                    .filter(Boolean);

                const descParts = [
                    `**Hit Dice:** 1d${c.hd?.faces || '?'}`,
                    `**Saving Throws:** ${saves}`,
                    `**Armor:** ${armorProfs}`,
                    `**Weapons:** ${weaponProfs}`,
                    `\n**Features:** ${features.join(', ')}`,
                ];
                const candidate = {
                    name: c.name,
                    source: c.source || 'PHB',
                    hitDice: c.hd ? `1d${c.hd.faces}` : 'Unknown',
                    hdFaces: c.hd?.faces,
                    savingThrowsRaw: c.proficiency || [],
                    savingThrows: saves,
                    armorProficiencies: armorProfs,
                    weaponProficiencies: weaponProfs,
                    startingProficiencies: c.startingProficiencies,
                    startingEquipment: c.startingEquipment,
                    legacyStartingEquipment: legacyStartingEquipmentByClass.get(c.name.toLowerCase()),
                    subclassTitle: c.subclassTitle || 'Subclass',
                    description: descParts.join('\n'),
                    classFeatures: c.classFeatures, // Pass raw for processing
                    is2024: is2024
                };

                if (existingIdx >= 0) {
                    if (shouldReplaceClassResult(results[existingIdx], candidate)) {
                        results[existingIdx] = candidate;
                    }
                    continue;
                }

                results.push(candidate);
            }
        });

        await Promise.all(fetches);

        // Sort: 2024 versions first, then alphabetical by name
        return results.sort((a, b) => {
            if (a.is2024 && !b.is2024) return -1;
            if (!a.is2024 && b.is2024) return 1;
            return a.name.localeCompare(b.name);
        }).slice(0, 20);
    } catch (e) {
        console.error("Error searching classes:", e);
        return results;
    }
}

/**
 * Searches for subclasses of a specific class using the class/index.json.
 */
export async function searchSubclasses(className: string): Promise<any[]> {
    const classNameLower = className.toLowerCase().trim();
    const localFallback = getLocalSubclassesForClass(className);
    const index = await fetch5eData('class/index.json');
    if (!index) return localFallback;

    const matchingKey = Object.keys(index).find(key => key.toLowerCase() === classNameLower);
    if (!matchingKey) return localFallback; // Class not found

    const fileName = index[matchingKey];
    const data = await fetch5eData(`class/${fileName}`);
    if (!data || !data.subclass) return localFallback;

    const remote = data.subclass.map((sc: any) => ({
        name: sc.name,
        source: sc.source,
        shortName: sc.shortName,
        className: sc.className,
        subclassFeatures: sc.subclassFeatures,
        additionalSpells: sc.additionalSpells,
        is2024: is2024Source(sc.source)
    }));

    const combined = [...remote, ...localFallback];
    return Array.from(
        new Map(
            combined.map((entry: any) => [
                `${(entry.name || '').toLowerCase()}|${(entry.source || '').toLowerCase()}`,
                entry
            ])
        ).values()
    );
}

/**
 * Searches the 5e.tools bestiary (Monster Manual only for now).
 */
export async function searchMonsters(query: string): Promise<any[]> {
    const queryLower = query.toLowerCase().trim();

    const results: any[] = [];

    const index = await fetch5eData('bestiary/index.json');
    if (!index) return [];

    // Prioritize core monster books. Cap at 15 sources for performance.
    const sourceKeys = Object.keys(index).sort((a, b) => {
        const priorities = ['XMM', 'MM', 'MPMM', 'VGM', 'MTF', 'ToB', 'CoS', 'SKT', 'GoS'];
        const idxA = priorities.indexOf(a);
        const idxB = priorities.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
    }).slice(0, 15);

    for (const key of sourceKeys) {
        if (results.length >= 50) break;

        const fileName = index[key];
        const data = await fetch5eData(`bestiary/${fileName}`);
        if (!data || !data.monster) continue;

        const matched = data.monster.filter((m: any) =>
            (!queryLower || m.name.toLowerCase().includes(queryLower))
        );

        for (const m of matched) {
            if (results.length >= 50) break;

            const ac = m.ac ? (typeof m.ac[0] === 'number' ? m.ac[0] : m.ac[0]?.ac || 10) : 10;
            const hp = m.hp ? m.hp.average || 10 : 10;
            const hpFormula = m.hp?.formula || '';
            const cr = typeof m.cr === 'string' ? m.cr : (m.cr?.cr || 'Unknown');
            const typeName = typeof m.type === 'string' ? m.type : m.type?.type || 'unknown';

            // Extract Resistances, Immunities, Vulnerabilities
            const resData = parseResistances(m.resist);
            const immuneData = parseResistances(m.immune);
            const vulnerableData = parseResistances(m.vulnerable);
            const condImmuneData = parseResistances(m.conditionImmune);

            const speed = m.speed
                ? Object.entries(m.speed).map(([k, v]: [string, any]) =>
                    typeof v === 'number' ? `${k} ${v} ft` : (v?.number ? `${k} ${v.number} ft` : '')).filter(Boolean).join(', ')
                : '30 ft';

            // Ability scores
            const abilityStr = ['str', 'dex', 'con', 'int', 'wis', 'cha']
                .map(a => `${a.toUpperCase()} ${m[a] || 10}`)
                .join(' | ');

            // Actions list
            const actions = m.action
                ? m.action.map((a: any) => a.name).join(', ')
                : 'None listed';

            const resStr = resData.types.length > 0 ? `**Res:** ${resData.types.join(', ')}` : '';
            const immStr = immuneData.types.length > 0 ? `**Imm:** ${immuneData.types.join(', ')}` : '';
            const vulnStr = vulnerableData.types.length > 0 ? `**Vuln:** ${vulnerableData.types.join(', ')}` : '';
            const notesStr = [...resData.notes, ...immuneData.notes].join('; ');

            const description = [
                `**Type:** ${typeName} | **CR:** ${cr}`,
                `**AC:** ${ac} | **HP:** ${hp}${hpFormula ? ` (${hpFormula})` : ''}`,
                resStr, immStr, vulnStr, notesStr ? `*Note: ${notesStr}*` : '',
                `**Speed:** ${speed}`,
                `**Stats:** ${abilityStr}`,
                `**Actions:** ${actions}`,
            ].filter(Boolean).join('\n');

            results.push({
                ...m, // Preserve raw data (action, trait, legendary, reaction, bonus, ability scores)
                name: m.name,
                source: m.source || key,
                type: typeName,
                cr,
                ac,
                hp,
                speed,
                description,
                resistances: resData.types,
                immunities: immuneData.types,
                vulnerabilities: vulnerableData.types,
                conditionImmunities: condImmuneData.types,
                damageNotes: notesStr,
                isHomebrew: false,
                is2024: is2024Source(m.source || key)
            });
        }
    }

    return results;
}


/**
 * Extracts racial traits from 5e.tools for a given race name.
 * Returns Feature[] objects ready to be injected into character.features.
 */
export async function getRacialTraits(raceName: string, subraceName?: string): Promise<{
    features: Feature[];
    speed?: string;
    darkvision?: number;
    languages?: string;
    senses?: string;
    skillProficiencies?: string[];
    resistances?: string[];
    immunities?: string[];
    vulnerabilities?: string[];
}> {
    if (!raceName || raceName.trim() === '') return { features: [] };

    const queryLower = raceName.toLowerCase().trim();
    let sourceFilter: string | null = null;
    if (raceName.includes('|')) {
        const parts = raceName.split('|');
        sourceFilter = parts[1].toUpperCase().trim();
    }

    // 1. Check Local 2024 Species first (The "Holy Grail")
    const localSpecies = SPECIES_2024.find((s: any) =>
        s.name.toLowerCase() === queryLower.split('|')[0] && (!sourceFilter || s.source?.toUpperCase() === sourceFilter)
    );

    if (localSpecies) {
        const darkvisionTrait = localSpecies.traits.find((t: any) => t.name.toLowerCase().includes('darkvision'));
        const darkvision = darkvisionTrait
            ? parseInt(darkvisionTrait.description.match(/(\d+)\s*feet?/i)?.[1] || '60', 10)
            : undefined;
        const traitText = (localSpecies.traits || [])
            .map((trait: any) => `${trait.name} ${trait.description}`.toLowerCase());
        const resistances = traitText
            .flatMap((entry: string) => extractDamageTypesFromText(entry, 'resistance'));
        const immunities = traitText
            .flatMap((entry: string) => extractDamageTypesFromText(entry, 'immunity'));
        const skillProficiencies = traitText.some((entry: string) => entry.includes('keen senses'))
            ? ['Insight', 'Perception', 'Survival']
            : undefined;

        return {
            features: localSpecies.traits.map((t: any) => ({
                id: crypto.randomUUID(),
                name: t.name,
                source: `Species: ${localSpecies.name}`,
                description: t.description,
                is2024: true,
                hasUses: false
            })),
            speed: localSpecies.speed ? `${localSpecies.speed} ft` : undefined,
            darkvision,
            senses: darkvision ? `Darkvision ${darkvision} ft.` : undefined,
            resistances,
            immunities,
            skillProficiencies
        };
    }

    const data = await fetch5eData('races.json');
    if (!data || !data.race) return { features: [] };

    let matchedRace: any = null;
    let matchedSubraceInfo: any = null;

    // 1. Try to find if the query is a specific subrace entry in the top-level subrace array
    if (data.subrace) {
        matchedSubraceInfo = data.subrace.find((sr: any) => {
            if (!sr.name || !sr.raceName) return false;
            const fullName = `${sr.name} ${sr.raceName}`.toLowerCase();
            const matchesName = (fullName === queryLower || queryLower === sr.name.toLowerCase());
            if (sourceFilter) {
                return matchesName && sr.source?.toUpperCase() === sourceFilter;
            }
            return matchesName;
        });

        if (matchedSubraceInfo) {
            matchedRace = data.race.find((r: any) => r.name.toLowerCase() === matchedSubraceInfo.raceName.toLowerCase());
        }
    }

    // 2. If not found via subrace, find the base race that is NOT a copy
    if (!matchedRace) {
        const possibleMatches = data.race.filter((r: any) => r.name.toLowerCase() === queryLower || r.name.toLowerCase().includes(queryLower));

        if (sourceFilter) {
            matchedRace = possibleMatches.find((r: any) => !r._copy && r.source?.toUpperCase() === sourceFilter);
        } else {
            // Prioritize 2024 XPHB first if no filter
            matchedRace = possibleMatches.find((r: any) => !r._copy && !r.isReprinted && r.source === 'XPHB') ||
                possibleMatches.find((r: any) => !r._copy && !r.isReprinted && (r.source === 'PHB' || r.source === 'MPMM'));
        }

        if (!matchedRace) {
            // Fallback to first non-copy
            matchedRace = possibleMatches.find((r: any) => !r._copy) || possibleMatches[0];
        }
    }

    if (!matchedRace) return { features: [] };

    // 3. If we have a base race but no subrace yet, check if one was requested
    if (!matchedSubraceInfo && subraceName && matchedRace.subraces) {
        matchedSubraceInfo = matchedRace.subraces.find((sr: any) => sr.name.toLowerCase() === subraceName.toLowerCase());
    }

    const features: Feature[] = [];
    const entries = [...(matchedRace.entries || []), ...(matchedSubraceInfo?.entries || [])];

    entries.forEach((e: any) => {
        if (typeof e === 'string') return;
        features.push({
            id: crypto.randomUUID(),
            name: e.name || 'Racial Trait',
            source: `Race: ${matchedRace.name}`,
            description: flattenEntries(e.entries || [e]),
            hasUses: false,
            source5eTools: matchedRace.source || 'PHB'
        });
    });

    let speed = '30 ft';
    const speedObj = matchedSubraceInfo?.speed || matchedRace.speed;
    if (speedObj) {
        if (typeof speedObj === 'number') {
            speed = `${speedObj} ft`;
        } else if (typeof speedObj === 'object') {
            const parts = Object.entries(speedObj)
                .map(([k, v]: [string, any]) => typeof v === 'number' ? `${k === 'walk' ? '' : k + ' '}${v} ft` : '')
                .filter(Boolean);
            speed = parts.join(', ');
        }
    }

    let languages: string | undefined;
    const langObj = matchedSubraceInfo?.languageProficiencies || matchedRace.languageProficiencies;
    if (langObj && langObj.length > 0) {
        const langProf = langObj[0];
        const fixedLangs: string[] = [];
        for (const [key, val] of Object.entries(langProf)) {
            if (key === 'anyStandard') {
                for (let i = 0; i < (val as number); i++) {
                    features.push({
                        id: crypto.randomUUID(),
                        name: 'Racial Language Choice',
                        source: `Race: ${matchedRace.name}`,
                        description: 'Choose a language of your choice.',
                        hasUses: false,
                        requiresChoice: true,
                        choiceType: 'Language',
                        source5eTools: matchedRace.source || 'PHB',
                        is2024: is2024Source(matchedRace.source)
                    });
                }
            } else if (val === true) {
                fixedLangs.push(key.charAt(0).toUpperCase() + key.slice(1));
            }
        }
        if (fixedLangs.length > 0) languages = fixedLangs.join(', ');
    }

    let skillProficiencies: string[] | undefined;
    const skillObj = matchedSubraceInfo?.skillProficiencies || matchedRace.skillProficiencies;
    if (skillObj && skillObj.length > 0) {
        const skillProf = skillObj[0];
        skillProficiencies = [];
        for (const [key, val] of Object.entries(skillProf)) {
            if (key === 'any') continue;
            if (val === true) {
                skillProficiencies.push(key.charAt(0).toUpperCase() + key.slice(1));
            }
        }
    }

    const darkvision = matchedSubraceInfo?.darkvision || matchedRace.darkvision || undefined;
    const resData = parseResistances(matchedSubraceInfo?.resist || matchedRace.resist);
    const immuneData = parseResistances(matchedSubraceInfo?.immune || matchedRace.immune);
    const vulnData = parseResistances(matchedSubraceInfo?.vulnerable || matchedRace.vulnerable);

    let senses: string | undefined;
    if (darkvision) senses = `Darkvision ${darkvision} ft.`;

    return {
        features,
        speed,
        darkvision,
        languages,
        senses,
        skillProficiencies,
        resistances: resData.types,
        immunities: immuneData.types,
        vulnerabilities: vulnData.types
    };
}

/**
 * Creates a generic action block from any source.
 */
export function parseToAction(name: string, description: string, type: ActionType = 'action'): Action {
    return {
        id: crypto.randomUUID(),
        name,
        type,
        source: '5e.tools Import',
        description,
        costs: type !== 'free' ? [{ resource: type, amount: 1 }] : [],
    };
}

/**
 * Extracts spell slot counts from 5e.tools monster spellcasting data.
 */
export function parseMonsterSpellSlots(spellcasting: any[]): { current: number; max: number }[] {
    const slots = Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));

    if (!spellcasting || !Array.isArray(spellcasting)) return slots;

    spellcasting.forEach(sc => {
        if (!sc.spells) return;

        Object.entries(sc.spells).forEach(([level, data]: [string, any]) => {
            const lvl = parseInt(level);
            if (isNaN(lvl) || lvl < 1 || lvl > 9) return;

            const count = data.slots || 0;
            slots[lvl] = { current: count, max: count };
        });
    });

    return slots;
}

export function parseHomebrew(data: any, query: string, category: string): any[] {
    const queryLower = query.toLowerCase().trim();
    let results: any[] = [];

    // Very simplified parser mapped roughly to the same objects we built above.
    const sourceName = data._meta?.sources?.[0]?.json || 'Homebrew';

    if (category === 'Spells' && data.spell) {
        results = data.spell.filter((s: any) => s.name?.toLowerCase().includes(queryLower)).map((s: any) => ({
            id: `hb_spell_${s.name.replace(/\s+/g, '_').toLowerCase()}`,
            name: s.name, level: s.level, school: SCHOOL_MAP[s.school] || s.school || 'Unknown',
            castingTime: s.time?.[0] ? `${s.time[0].number} ${s.time[0].unit}${s.time[0].number > 1 ? 's' : ''}` : '1 action',
            range: 'Special', duration: 'Special', concentration: false, ritual: !!s.meta?.ritual,
            components: { v: !!s.components?.v, s: !!s.components?.s, m: !!s.components?.m },
            description: s.entries ? flattenEntries(s.entries) : '', prepared: false,
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Feats' && data.feat) {
        results = data.feat.filter((f: any) => f.name?.toLowerCase().includes(queryLower)).map((f: any) => ({
            id: `hb_feat_${f.name.replace(/\s+/g, '_').toLowerCase()}`,
            name: f.name, source: `Feat (${sourceName})`,
            description: f.entries ? flattenEntries(f.entries) : '', hasUses: false, isFeat: true,
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Items' && data.item) {
        results = data.item.filter((i: any) => i.name?.toLowerCase().includes(queryLower)).map((i: any) => ({
            id: `hb_item_${i.name.replace(/\s+/g, '_').toLowerCase()}`,
            name: i.name, quantity: 1, weight: i.weight || 0, isEquipped: false, isAttuned: false,
            type: i.weaponCategory ? 'weapon' : (i.armorClass ? 'armor' : 'gear'),
            description: i.entries ? flattenEntries(i.entries) : '',
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Classes' && data.class) {
        results = data.class.filter((c: any) => c.name?.toLowerCase().includes(queryLower)).map((c: any) => ({
            ...c,
            name: c.name, source: sourceName,
            description: c.entries ? flattenEntries(c.entries) : 'Homebrew Class',
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Races' && data.race) {
        results = data.race.filter((r: any) => r.name?.toLowerCase().includes(queryLower)).map((r: any) => ({
            ...r,
            name: r.name, source: sourceName,
            description: r.entries ? flattenEntries(r.entries) : 'Homebrew Race',
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Backgrounds' && data.background) {
        results = data.background.filter((b: any) => b.name?.toLowerCase().includes(queryLower)).map((b: any) => ({
            ...b,
            name: b.name, source: sourceName,
            description: b.entries ? flattenEntries(b.entries) : 'Homebrew Background',
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Subclasses' && data.subclass) {
        results = data.subclass.filter((sc: any) => sc.name?.toLowerCase().includes(queryLower)).map((sc: any) => ({
            ...sc,
            name: sc.name, source: sourceName,
            description: sc.entries ? flattenEntries(sc.entries) : 'Homebrew Subclass',
            isHomebrew: true, homebrewSource: sourceName
        }));
    } else if (category === 'Monsters' && data.monster) {
        results = data.monster.filter((m: any) => m.name?.toLowerCase().includes(queryLower)).map((m: any) => ({
            name: m.name, type: typeof m.type === 'string' ? m.type : (m.type?.type || 'unknown'),
            cr: typeof m.cr === 'string' ? m.cr : (m.cr?.cr || 'Unknown'),
            ac: 10, hp: 10,
            description: m.entries ? flattenEntries(m.entries) : 'Homebrew Monster',
            isHomebrew: true, homebrewSource: sourceName
        }));
    }

    return results;
}

/**
 * Fetches a lightweight list of official classes for dropdown menus.
 */
export async function getOfficialClassesList(): Promise<{ name: string; source: string; is2024: boolean }[]> {
    const results: { name: string; source: string; is2024: boolean }[] = [];

    // 1. Load Local 2024 Classes (The "Holy Grail")
    CLASSES_2024.forEach((c: any) => {
        results.push({
            name: c.name,
            source: c.source || 'XPHB',
            is2024: true
        });
    });

    // 2. Load Remote 5e.tools Classes
    try {
        const index = await fetch5eData('class/index.json');
        if (index) {
            const classFiles = Object.values(index) as string[];
            const fetches = classFiles.map(async (fileName) => {
                const data = await fetch5eData(`class/${fileName}`);
                if (!data || !data.class) return;

                for (const c of data.class) {
                    const existingIdx = results.findIndex(r => r.name === c.name);
                    const sourceUpper = (c.source || 'PHB').toUpperCase();
                    const is2024 = is2024Source(sourceUpper);

                    if (existingIdx >= 0) {
                        if (results[existingIdx].is2024) continue;
                        if (is2024) {
                            results[existingIdx] = { name: c.name, source: sourceUpper, is2024 };
                        }
                        continue;
                    }

                    results.push({
                        name: c.name,
                        source: sourceUpper,
                        is2024: is2024
                    });
                }
            });
            await Promise.all(fetches);
        }
    } catch (e) {
        console.error("Failed to fetch remote class list, relying on local data.", e);
    }

    // Deduplicate
    const uniqueMap = new Map();
    results.forEach(r => uniqueMap.set(`${r.name}-${r.source}`, r));
    const unique = Array.from(uniqueMap.values());

    // Sort: 2024 versions first, then alphabetical by name
    return unique.sort((a, b) => {
        if (a.is2024 && !b.is2024) return -1;
        if (!a.is2024 && b.is2024) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Fetches a lightweight list of official subclasses for a specific class.
 */
export async function getClassFeatures(className: string, level: number = 1): Promise<{ features: Feature[]; hitDice?: string; hdFaces?: number; proficiencies?: string; savingThrows?: string[]; spellcastingAbility?: string; spellSlots?: { current: number; max: number }[]; resources?: Resource[] }> {
    if (!className || className.trim() === '') return { features: [] };

    let queryLower = className.toLowerCase().trim();
    let sourceFilter: string | null = null;

    if (className.includes('|')) {
        const parts = className.split('|');
        queryLower = parts[0].toLowerCase().trim();
        sourceFilter = parts[1].toUpperCase().trim();
    }

    // 1. Try Local 2024 Data first (The "Holy Grail")
    const localClass = CLASSES_2024.find((c: any) =>
        c.name.toLowerCase() === queryLower && (!sourceFilter || c.source?.toUpperCase() === sourceFilter)
    );

    if (localClass) {
        const features: Feature[] = [];
        const levelData = localClass.levels?.[level.toString()] || {};
        const fixedFeatures = levelData.features || [];

        fixedFeatures.forEach((ff: any) => {
            features.push({
                id: crypto.randomUUID(),
                name: ff.name,
                source: `Class: ${localClass.name}`,
                description: ff.description,
                is2024: true,
                hasUses: false
            });
        });

        return {
            features,
            hitDice: localClass.hitDice,
            hdFaces: parseInt(localClass.hitDice?.replace('d', '') || '8'),
            proficiencies: `Weapons: ${localClass.proficiencies?.weapons?.join(', ')}, Armor: ${localClass.proficiencies?.armor?.join(', ')}`,
            savingThrows: localClass.savingThrows,
            spellcastingAbility: getClassSpellcastingAbility(localClass.name) === 'none'
                ? undefined
                : getClassSpellcastingAbility(localClass.name),
            spellSlots: buildSpellSlotsForClass(localClass.name, level),
            resources: levelData.resources || []
        };
    }

    // 2. Fallback to Remote 5e.tools Data
    const index = await fetch5eData('class/index.json');
    if (!index) return { features: [] };

    const matchingKey = Object.keys(index).find(key => {
        const kLower = key.toLowerCase();
        return kLower === queryLower || kLower.includes(queryLower);
    });
    if (!matchingKey) return { features: [] };

    const fileName = index[matchingKey];
    const data = await fetch5eData(`class/${fileName}`);
    if (!data || !data.class) return { features: [] };

    let cls = data.class.find((c: any) => {
        const nameMatch = c.name.toLowerCase() === queryLower;
        if (sourceFilter) return nameMatch && c.source?.toUpperCase() === sourceFilter;
        return nameMatch && !c.isReprinted;
    });

    if (!cls) {
        cls = data.class.find((c: any) => c.name.toLowerCase() === queryLower) || data.class[0];
    }
    if (!cls) return { features: [] };

    const features: Feature[] = [];
    const profParts: string[] = [];
    const savingThrows: string[] = [];
    let hitDice: string | undefined;
    let spellSlots: { current: number; max: number }[] | undefined;
    const resources: Resource[] = [];
    if (cls.hd?.faces) {
        hitDice = `1d${cls.hd.faces}`;
    }

    // Saving Throws
    if (cls.saves) {
        savingThrows.push(...cls.saves.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)));
    }

    // Proficiencies (Legacy field)
    if (cls.proficiency) {
        cls.proficiency.forEach((p: any) => {
            if (p.armor) profParts.push(`Armor: ${p.armor.join(', ')}`);
            if (p.weapons) profParts.push(`Weapons: ${p.weapons.join(', ')}`);
            if (p.skills) {
                const skillChoices = p.skills.map((s: any) => {
                    if (s.choose) {
                        return `Choose ${s.choose.count} from ${s.choose.from.join(', ')}`;
                    }
                    return s;
                });
                profParts.push(`Skills: ${skillChoices.join(', ')}`);
            }
            if (p.tools) {
                const toolChoices = p.tools.map((t: any) => {
                    if (t.choose) {
                        return `Choose ${t.choose.count} from ${t.choose.from.join(', ')}`;
                    }
                    return t;
                });
                profParts.push(`Tools: ${toolChoices.join(', ')}`);
            }
        });
    }

    // Starting Proficiencies (2024 Data field)
    if (cls.startingProficiencies) {
        const sp = cls.startingProficiencies;
        if (sp.armor) profParts.push(`Armor: ${sp.armor.join(', ')}`);
        if (sp.weapons) profParts.push(`Weapons: ${sp.weapons.join(', ')}`);
        if (sp.skills) {
            const skillChoices = sp.skills.map((s: any) => {
                if (s.choose) {
                    return `Choose ${s.choose.count} from ${s.choose.from.join(', ')}`;
                }
                return s;
            });
            profParts.push(`Skills: ${skillChoices.join(', ')}`);
        }
        if (sp.tools) {
            const toolChoices = sp.tools.map((t: any) => {
                if (t.choose) {
                    return `Choose ${t.choose.count} from ${t.choose.from.join(', ')}`;
                }
                return t;
            });
            profParts.push(`Tools: ${toolChoices.join(', ')}`);
        }
    }

    // Class Features
    if (data.classFeature) {
        data.classFeature.forEach((cf: any) => {
            if (cf.className?.toLowerCase() === queryLower && cf.level <= level) {
                let hasUses = false;
                let usesMax = 0;
                let resetOn: 'short' | 'long' | 'never' = 'never';

                const nameLower = cf.name.toLowerCase();
                if (nameLower.includes('action surge')) {
                    hasUses = true; usesMax = 1; resetOn = 'short';
                } else if (nameLower.includes('ki points')) {
                    hasUses = true; usesMax = level; resetOn = 'short';
                } else if (nameLower.includes('sorcery points')) {
                    hasUses = true; usesMax = level; resetOn = 'long';
                } else if (nameLower.includes('inspiration')) {
                    hasUses = true; usesMax = 1; resetOn = 'long'; // Bardic Inspiration
                } else if (nameLower.includes('lay on hands')) {
                    hasUses = true; usesMax = level * 5; resetOn = 'long';
                } else if (nameLower.includes('rage')) {
                    hasUses = true; usesMax = 2; // Varies by level, but 2 at low levels
                    if (level >= 3) usesMax = 3;
                    if (level >= 6) usesMax = 4;
                    if (level >= 12) usesMax = 5;
                    if (level >= 17) usesMax = 6;
                    resetOn = 'long';
                } else if (nameLower.includes('channel divinity')) {
                    hasUses = true; usesMax = 1; resetOn = 'short';
                }

                features.push({
                    id: crypto.randomUUID(),
                    name: cf.name,
                    source: `Class: ${cls.name} (Level ${cf.level})`,
                    description: cf.entries ? flattenEntries(cf.entries) : '',
                    hasUses,
                    usesCurrent: usesMax,
                    usesMax: usesMax || undefined,
                    resetOn: hasUses ? resetOn : undefined,
                    source5eTools: cls.source || 'PHB',
                    is2024: is2024Source(cls.source)
                });

                // Handle specific resources that are not "uses" of a feature but separate pools
                if (nameLower.includes('ki points')) {
                    resources.push({ id: crypto.randomUUID(), name: 'Ki Points', current: level, max: level, resetOn: 'short' });
                } else if (nameLower.includes('sorcery points')) {
                    resources.push({ id: crypto.randomUUID(), name: 'Sorcery Points', current: level, max: level, resetOn: 'long' });
                }
            }
        });
    }

    // Spell Slots (Standard progression)
    if (cls.spellcastingAbility && cls.classTableGroups) {
        const spellGroup = cls.classTableGroups.find((g: any) => g.colLabels && g.colLabels.includes('1st') && g.colLabels.includes('2nd'));
        if (spellGroup && spellGroup.rows) {
            const row = spellGroup.rows[level - 1];
            if (row) {
                spellSlots = Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));
                spellGroup.colLabels.forEach((label: string, idx: number) => {
                    const slotLevel = parseInt(label.replace(/\D/g, ''));
                    if (!isNaN(slotLevel) && slotLevel >= 1 && slotLevel <= 9) {
                        const numSlots = parseInt(row[idx] as string) || 0;
                        if (spellSlots) spellSlots[slotLevel] = { current: numSlots, max: numSlots };
                    }
                });
            }
        }
    }

    // Warlock spell slots handling (Pact Magic)
    if (!spellSlots && cls.classTableGroups) {
        // Find group with "Spell Slots" or "Slot Level" (Common Warlock patterns)
        const pactGroup = cls.classTableGroups.find((g: any) =>
            g.colLabels && (
                (g.colLabels.includes('Spell Slots') && g.colLabels.includes('Slot Level')) ||
                (g.colLabels.includes('Slots') && g.colLabels.includes('Level'))
            )
        );

        if (pactGroup && pactGroup.rows) {
            const slotsIdx = pactGroup.colLabels.findIndex((l: string) => l.includes('Slot') && !l.includes('Level'));
            const levelIdx = pactGroup.colLabels.findIndex((l: string) => l.includes('Level'));

            if (slotsIdx >= 0 && levelIdx >= 0) {
                const row = pactGroup.rows[level - 1];
                if (row) {
                    // Warlock slots are often objects { "slots": 2, "level": 2 } or just numbers
                    let numSlots = 0;
                    let slotLvl = 0;

                    const rawSlots = row[slotsIdx];
                    const rawLvl = row[levelIdx];

                    if (typeof rawSlots === 'object' && rawSlots.slots) numSlots = rawSlots.slots;
                    else numSlots = parseInt(rawSlots as string) || 0;

                    if (typeof rawLvl === 'object' && rawLvl.level) slotLvl = rawLvl.level;
                    else slotLvl = parseInt((rawLvl as string).replace(/\D/g, '')) || 0;

                    if (numSlots && slotLvl) {
                        spellSlots = Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));
                        spellSlots[slotLvl] = { current: numSlots, max: numSlots };
                    }
                }
            }
        }
    }

    return {
        features,
        savingThrows: savingThrows,
        hitDice,
        hdFaces: cls.hd?.faces,
        proficiencies: profParts.length > 0 ? profParts.join('; ') : undefined,
        spellcastingAbility: cls.spellcastingAbility || undefined,
        spellSlots: spellSlots || [],
        resources
    };
}

/**
 * Fetches a lightweight list of official subclasses for a specific class.
 */
export async function getOfficialSubclassesList(className: string): Promise<{ name: string; shortName: string; source: string; is2024: boolean }[]> {
    if (!className) return [];
    const classNameLower = className.toLowerCase().trim();
    const localFallback = getLocalSubclassesForClass(className).map((sc) => ({
        name: sc.name,
        shortName: sc.shortName,
        source: sc.source,
        is2024: sc.is2024
    }));
    const index = await fetch5eData('class/index.json');
    if (!index) return localFallback;

    const matchingKey = Object.keys(index).find(key => key.toLowerCase() === classNameLower || key.toLowerCase().includes(classNameLower));
    if (!matchingKey) return localFallback;

    const fileName = index[matchingKey];
    const data = await fetch5eData(`class/${fileName}`);
    if (!data || !data.subclass) return localFallback;

    const results = data.subclass
        .filter((sc: any) => sc.className.toLowerCase() === classNameLower && !sc.isReprinted)
        .map((sc: any) => ({
            name: sc.name,
            shortName: sc.shortName || sc.name,
            source: sc.source || 'PHB',
            is2024: is2024Source(sc.source)
        }));

    const combined = [...results, ...localFallback];
    const unique = Array.from(new Set(combined.map((r: any) => JSON.stringify(r)))).map((s: unknown) => JSON.parse(s as string));
    return unique.sort((a: any, b: any) => {
        if (a.is2024 && !b.is2024) return -1;
        if (!a.is2024 && b.is2024) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Fetches a lightweight list of official races for dropdown menus.
 */
export async function getOfficialRacesList(): Promise<{ name: string; source: string; is2024: boolean }[]> {
    const results: { name: string; source: string; is2024: boolean }[] = [];

    // 1. Local 2024 Species
    SPECIES_2024.forEach((s: any) => {
        results.push({
            name: s.name,
            source: s.source || 'XPHB',
            is2024: true
        });
    });

    // 2. Remote 5e.tools Races
    try {
        const data = await fetch5eData('races.json');
        if (data && data.race) {
            data.race.map((r: any) => {
                const existingIdx = results.findIndex(res => res.name === r.name);
                if (existingIdx >= 0 && results[existingIdx].is2024) return;

                results.push({
                    name: r.name,
                    source: r.source || 'PHB',
                    is2024: is2024Source(r.source)
                });
            });
        }
    } catch (e) {
        console.error("Failed to fetch remote races, relying on local data.", e);
    }

    // Deduplicate and Sort
    const unique = results.filter((r, index, self) =>
        index === self.findIndex((t) => t.name === r.name && t.source === r.source)
    );

    return unique.sort((a, b) => {
        if (a.is2024 && !b.is2024) return -1;
        if (!a.is2024 && b.is2024) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Fetches a lightweight list of official backgrounds for dropdown menus.
 */
export async function getOfficialBackgroundsList(): Promise<{ name: string; source: string; is2024: boolean }[]> {
    const results: { name: string; source: string; is2024: boolean }[] = [];

    // 1. Local 2024 Backgrounds
    BACKGROUNDS_2024.forEach((bg: any) => {
        results.push({
            name: bg.name,
            source: bg.source || 'XPHB',
            is2024: true
        });
    });

    // 2. Remote 5e.tools Backgrounds
    try {
        const data = await fetch5eData('backgrounds.json');
        if (data && data.background) {
            data.background.filter((bg: any) => !bg._copy).map((bg: any) => {
                const existingIdx = results.findIndex(res => res.name === bg.name);
                if (existingIdx >= 0 && results[existingIdx].is2024) return;

                results.push({
                    name: bg.name,
                    source: bg.source || 'PHB',
                    is2024: is2024Source(bg.source)
                });
            });
        }
    } catch (e) {
        console.error("Failed to fetch remote backgrounds, relying on local data.", e);
    }

    // Deduplicate and Sort
    const unique = results.filter((bg, index, self) =>
        index === self.findIndex((t) => t.name === bg.name && t.source === bg.source)
    );

    return unique.sort((a, b) => {
        if (a.is2024 && !b.is2024) return -1;
        if (!a.is2024 && b.is2024) return 1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Extracts background features and proficiencies from 5e.tools.
 */
export async function getBackgroundFeatures(backgroundName: string): Promise<{
    features: Feature[];
    skillProficiencies?: string[];
    startingEquipment?: Item[];
}> {
    if (!backgroundName) return { features: [] };
    const queryLower = backgroundName.toLowerCase().trim();

    // 1. Check Local 2024 Backgrounds first (The "Holy Grail")
    const localBg = BACKGROUNDS_2024.find((b: any) =>
        b.name.toLowerCase() === queryLower.split('|')[0]
    );

    if (localBg) {
        return {
            features: [
                {
                    id: crypto.randomUUID(),
                    name: localBg.feat || 'Background Feature',
                    source: `Background: ${localBg.name}`,
                    description: localBg.description || '',
                    hasUses: false,
                    is2024: true
                }
            ],
            skillProficiencies: localBg.skills,
            startingEquipment: (localBg.equipment || []).map((name: string) => ({
                id: crypto.randomUUID(),
                name,
                quantity: 1,
                weight: 0,
                isEquipped: false,
                isAttuned: false,
                description: `Starting equipment from ${localBg.name}`,
                type: 'gear'
            }))
        };
    }

    const data = await fetch5eData('backgrounds.json');
    if (!data || !data.background) return { features: [] };

    const bg = data.background.find((b: any) => b.name.toLowerCase() === queryLower && !b._copy && (b.source === 'PHB' || b.source === 'XPHB')) ||
        data.background.find((b: any) => b.name.toLowerCase() === queryLower && !b._copy) ||
        data.background.find((b: any) => b.name.toLowerCase().includes(queryLower) && !b._copy);

    if (!bg) return { features: [] };

    const features: Feature[] = [];
    if (bg.entries) {
        bg.entries.forEach((e: any) => {
            if (typeof e === 'string') return;
            // Previously we were skipping Equipment/Suggested Characteristics, but backgrounds 
            // often list Language/Skill choices inside these entries in 5e.tools.
            // We'll keep them but skip the pure "Starting Equipment" logic items later.
            features.push({
                id: crypto.randomUUID(),
                name: e.name || 'Background Feature',
                source: `Background: ${bg.name}`,
                description: flattenEntries([e]),
                hasUses: false,
                source5eTools: bg.source || 'PHB',
                is2024: is2024Source(bg.source)
            });
        });
    }

    let skillProficiencies: string[] | undefined;
    if (bg.skillProficiencies && bg.skillProficiencies.length > 0) {
        const profs = bg.skillProficiencies[0];
        skillProficiencies = Object.entries(profs)
            .filter(([, val]) => val === true)
            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
    }

    const startingEquipment: Item[] = [];
    if (bg.startingEquipment && bg.startingEquipment.length > 0) {
        const defaultEquip = bg.startingEquipment.find((e: any) => e._);
        if (defaultEquip && defaultEquip._) {
            defaultEquip._.forEach((itemData: any) => {
                let name = 'Unknown Item';
                let quantity = 1;
                if (typeof itemData === 'string') {
                    name = itemData.split('|')[0];
                } else if (typeof itemData === 'object') {
                    if (itemData.item) name = itemData.item.split('|')[0];
                    if (itemData.special) name = itemData.special;
                    if (itemData.displayName) name = itemData.displayName;
                    if (itemData.quantity) quantity = itemData.quantity;
                    if (itemData.containsValue) name += ` (${itemData.containsValue / 100} gp)`; // 5eTools uses copper for containsValue sometimes, or maybe cp. Usually pouch containsValue is in copper.
                }

                startingEquipment.push({
                    id: crypto.randomUUID(),
                    name,
                    quantity,
                    weight: 0,
                    isEquipped: false,
                    isAttuned: false,
                    description: `Starting equipment from ${bg.name}`,
                    type: 'gear'
                });
            });
        }
    }

    return {
        features,
        skillProficiencies,
        startingEquipment
    };
}

/**
 * Extracts subclass features from 5e.tools.
 */
export async function getSubclassFeatures(className: string, subclassName: string, level: number): Promise<{
    features: Feature[];
}> {
    if (!className || !subclassName) return { features: [] };
    const classLower = className.toLowerCase().trim();
    const subclassLower = subclassName.toLowerCase().trim();

    const index = await fetch5eData('class/index.json');
    if (!index) return { features: [] };

    const matchingKey = Object.keys(index).find(key => key.toLowerCase().includes(classLower));
    if (!matchingKey) return { features: [] };

    const data = await fetch5eData(`class/${index[matchingKey]}`);
    if (!data || !data.subclassFeature) return { features: [] };

    const sc = data.subclass?.find((s: any) => s.name.toLowerCase() === subclassLower && s.className.toLowerCase() === classLower) ||
        data.subclass?.find((s: any) => s.name.toLowerCase().includes(subclassLower) && s.className.toLowerCase() === classLower);

    const shortName = sc?.shortName || subclassName;

    const features: Feature[] = [];

    for (const scf of data.subclassFeature) {
        if (scf.className?.toLowerCase() !== classLower) continue;

        const matchSubclass = scf.subclassShortName?.toLowerCase() === shortName.toLowerCase() ||
            scf.subclassName?.toLowerCase() === subclassLower ||
            scf.subclassShortName?.toLowerCase() === subclassLower ||
            subclassLower.includes(scf.subclassShortName?.toLowerCase() || 'xxx');

        if (!matchSubclass) continue;
        if (scf.level > level) continue;

        let hasUses = false;
        let usesMax = 0;
        let resetOn: 'short' | 'long' | 'never' = 'never';

        const nameLower = scf.name.toLowerCase();
        if (nameLower.includes('channel divinity')) {
            hasUses = true; usesMax = 1; resetOn = 'short';
        }

        features.push({
            id: crypto.randomUUID(),
            name: scf.name,
            source: `Subclass: ${sc?.name || subclassName} (Level ${scf.level})`,
            description: scf.entries ? flattenEntries(scf.entries) : '',
            hasUses,
            usesCurrent: usesMax,
            usesMax: usesMax || undefined,
            resetOn: hasUses ? resetOn : undefined,
            source5eTools: scf.source || sc?.source || 'PHB',
            is2024: is2024Source(scf.source || sc?.source)
        });
    }

    return { features };
}

/**
 * Heuristically extracts a combat Action from a Feature's description.
 * This ensures that when a user imports a Class/Race feature, it becomes 
 * fully usable in the Combat Screen's action economy.
 */
export function extractActionsFromFeature(feature: Feature): Action | null {
    const descLower = feature.description.toLowerCase();
    let type: ActionType | null = null;

    // Semantic scraping 
    if (descLower.includes('as a bonus action') || descLower.includes('bonus action to')) {
        type = 'bonus';
    } else if (descLower.includes('as a reaction') || descLower.includes('reaction when') || descLower.includes('take a reaction')) {
        type = 'reaction';
    } else if (descLower.includes('as an action') || descLower.includes('action to') || descLower.includes('use your action')) {
        type = 'action';
    }

    // Explicit hardcodes for common 5e features that sometimes use weird phrasing
    const nameLower = feature.name.toLowerCase();
    if (nameLower.includes('second wind')) type = 'bonus';
    if (nameLower.includes('action surge')) type = 'free'; // Typically a free action to trigger
    if (nameLower.includes('uncanny dodge')) type = 'reaction';
    if (nameLower.includes('cunning action')) type = 'bonus';
    if (nameLower.includes('font of magic')) type = 'bonus';
    if (nameLower.includes('bardic inspiration')) type = 'bonus';
    if (nameLower.includes('deflect missiles')) type = 'reaction';
    if (nameLower.includes('slow fall')) type = 'reaction';
    if (nameLower === 'rage') type = 'bonus';
    if (nameLower.includes('channel divinity')) type = 'action';
    if (nameLower.includes('wild shape')) type = 'action'; // Moon druid overrides contextually but base is action
    if (nameLower.includes('step of the wind') || nameLower.includes('patient defense')) type = 'bonus';
    if (nameLower.includes('flurry of blows')) type = 'bonus';

    if (!type) return null;

    const action: Action = {
        id: crypto.randomUUID(),
        name: feature.name,
        type,
        source: feature.source, // Keep same source so sync cleaning works!
        description: feature.description,
        isCustom: false,
        featureId: feature.id
    };

    if (feature.hasUses) {
        action.costs = [{ resource: 'featureUse', amount: 1, featureId: feature.id }];
    }

    return action;
}

/**
 * Fetches choice options for dynamic features like Fighting Styles or Invocations.
 */
export async function getFeatureChoices(choiceType: string, className?: string): Promise<Feature[]> {
    if (!choiceType) return [];

    // Determine the feature type code based on the human readable name
    const ctLower = choiceType.toLowerCase();
    let ftCode = '';
    if (ctLower.includes('fighting style')) {
        if (className?.toLowerCase() === 'fighter') ftCode = 'FS:F';
        else if (className?.toLowerCase() === 'paladin') ftCode = 'FS:P';
        else if (className?.toLowerCase() === 'ranger') ftCode = 'FS:R';
        else ftCode = 'FS:F'; // Fallback
    } else if (ctLower.includes('invocation')) {
        ftCode = 'EI';
    } else if (ctLower.includes('metamagic')) {
        ftCode = 'MM';
    } else if (ctLower.includes('pact boon')) {
        ftCode = 'PB';
    }

    // Special case for generic choices (Languages, Skills)
    if (ctLower === 'language') {
        return ALL_OFFICIAL_LANGUAGES.map(l => ({
            id: crypto.randomUUID(),
            name: l,
            source: 'Language',
            description: FLAVOR_DESCRIPTIONS[l.toLowerCase()] || `The ${l} language.`,
            hasUses: false,
            source5eTools: 'PHB'
        }));
    }

    if (ctLower === 'skill') {
        const skills = [
            'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
            'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
            'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'
        ];
        return skills.map(s => ({
            id: crypto.randomUUID(),
            name: s,
            source: 'Skill',
            description: FLAVOR_DESCRIPTIONS[s.toLowerCase()] || `Proficiency in the ${s} skill.`,
            hasUses: false,
            source5eTools: 'PHB'
        }));
    }

    if (!ftCode) return []; // Unknown choice type

    const data = await fetch5eData('optionalfeatures.json');
    if (!data || !data.optionalfeature) return [];

    const choices: Feature[] = [];
    for (const opt of data.optionalfeature) {
        if (opt.featureType && opt.featureType.includes(ftCode)) {
            // Check source matching if applicable to prevent 2014/2024 mixing in choices
            // EL is global usually but they have reprints.

            choices.push({
                id: crypto.randomUUID(),
                name: opt.name,
                source: choiceType,
                description: opt.entries ? flattenEntries(opt.entries) : '',
                hasUses: false,
                source5eTools: opt.source || 'PHB',
                is2024: is2024Source(opt.source),
                prerequisite: opt.prerequisite
            });
        }
    }

    return choices;
}

/**
 * Validates if a character meets the prerequisites for a feature or choice.
 */
export function checkPrerequisites(prerequisite: any[], character: Partial<Character>): boolean {
    if (!prerequisite || prerequisite.length === 0) return true;

    // Prerequisite is usually an array of objects. ALL must be met (AND).
    return prerequisite.every(req => {
        // Class/Level requirement
        if (req.level) {
            const charLevel = character.level || 1;
            const targetLevel = (typeof req.level === 'number') ? req.level : req.level.level;

            if (req.level.class) {
                // If it's a class-specific level requirement, we check the class name
                const targetClassName = req.level.class.name.toLowerCase();
                const charClassName = character.className?.toLowerCase();
                if (charClassName !== targetClassName) return false;
            }

            if (charLevel < targetLevel) return false;
        }

        // Spell requirement (e.g. Agonizing Blast requires Eldritch Blast)
        if (req.spell) {
            const charSpells = character.spells || [];
            const charFeatures = character.features || [];

            return req.spell.every((sReq: any) => {
                const sName = (typeof sReq === 'string') ? (sReq as string).split('#')[0].toLowerCase() : ((sReq as any).choose || '').toLowerCase();
                if (!sName) return true; // Complex choice spell reqs might be handled loosely

                const hasSpell = charSpells.some((s: Spell) => s.name.toLowerCase().includes(sName));
                const fromFeature = charFeatures.some((f: Feature) => f.description.toLowerCase().includes(sName));
                return hasSpell || fromFeature;
            });
        }

        // Pact requirement (Warlock Invocations)
        if (req.pact) {
            const charFeatures = character.features || [];
            const pactName = (req.pact as string).toLowerCase();
            return charFeatures.some((f: Feature) => f.name.toLowerCase().includes(pactName));
        }

        // Feature requirement
        if (req.feature) {
            const charFeatures = character.features || [];
            return req.feature.every((fReq: any) => {
                const fName = (fReq as string).toLowerCase();
                return charFeatures.some((f: Feature) => f.name.toLowerCase().includes(fName));
            });
        }

        // Ability requirement
        if (req.ability) {
            const scores = character.abilityScores;
            if (!scores) return true;
            return Object.entries(req.ability[0]).every(([stat, val]: [string, any]) => {
                const charVal = (scores as any)[stat.toLowerCase()] || 10;
                return charVal >= val;
            });
        }

        return true;
    });
}

/**
 * Heuristically extracts items implicitly granted or strictly referenced by a feature.
 * Uses the raw unflattened description or parses the text for known item names if it was flattened.
 */
export function extractItemsFromFeature(feature: Feature): Item[] {
    const items: Item[] = [];
    const descLower = feature.description.toLowerCase();

    // Some hardcoded common feat/feature items
    if (feature.name.toLowerCase() === 'healer' && !descLower.includes("doesn't grant")) {
        items.push({
            id: crypto.randomUUID(),
            name: "Healer's Kit",
            quantity: 1,
            weight: 3,
            isEquipped: false,
            isAttuned: false,
            description: "A leather pouch containing bandages, salves, and splints.",
            type: 'gear'
        });
    }

    if (feature.name.toLowerCase() === 'poisoner') {
        items.push({
            id: crypto.randomUUID(),
            name: "Poisoner's Kit",
            quantity: 1,
            weight: 2,
            isEquipped: false,
            isAttuned: false,
            description: "A kit for brewing and applying poisons.",
            type: 'gear'
        });
    }

    if (feature.name.toLowerCase() === 'artificer initiate' || feature.name.toLowerCase() === 'chef') {
        const toolMatch = descLower.match(/artisan's tools|cook's utensils|alchemist's supplies|tinker's tools/);
        if (toolMatch) {
            items.push({
                id: crypto.randomUUID(),
                name: toolMatch[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                quantity: 1,
                weight: 5,
                isEquipped: false,
                isAttuned: false,
                description: `Granted by ${feature.name}`,
                type: 'gear'
            });
        }
    }

    return items;
}

const PACK_DEFINITIONS: Record<string, string[]> = {
    "Diplomat's Pack": [
        "Chest|PHB", "2x Case, map or scroll|PHB", "Set of fine clothes|PHB", "Ink, 1 ounce bottle|PHB",
        "Ink pen|PHB", "Lamp|PHB", "2x Oil, flask|PHB", "5x Paper, sheet|PHB", "Perfume, vial|PHB",
        "Sealing wax|PHB", "Soap|PHB"
    ],
    "Entertainer's Pack": [
        "Backpack|PHB", "Bedroll|PHB", "2x Costume|PHB", "5x Candle|PHB", "5x Rations, day|PHB",
        "Waterskin|PHB", "Disguise kit|PHB"
    ],
    "Explorer's Pack": [
        "Backpack|PHB", "Bedroll|PHB", "Mess kit|PHB", "Tinderbox|PHB", "10x Torch|PHB",
        "10x Rations, day|PHB", "Waterskin|PHB", "Rope, hempen (50 feet)|PHB"
    ],
    "Priest's Pack": [
        "Backpack|PHB", "Blanket|PHB", "10x Candle|PHB", "Tinderbox|PHB", "Alms box|PHB",
        "2x Incense, block|PHB", "Censer|PHB", "Vestments|PHB", "2x Rations, day|PHB", "Waterskin|PHB"
    ],
    "Scholar's Pack": [
        "Backpack|PHB", "Book|PHB", "Ink, 1 ounce bottle|PHB", "Ink pen|PHB", "10x Parchment, sheet|PHB",
        "Little bag of sand|PHB", "Small knife|PHB"
    ],
    "Dungeoneer's Pack": [
        "Backpack|PHB", "Crowbar|PHB", "Hammer|PHB", "10x Piton|PHB", "10x Torch|PHB",
        "Tinderbox|PHB", "10x Rations, day|PHB", "Waterskin|PHB", "Rope, hempen (50 feet)|PHB"
    ],
    "Burglar's Pack": [
        "Backpack|PHB", "Bag of 1,000 ball bearings|PHB", "10 feet of string|PHB", "Bell|PHB",
        "5x Candle|PHB", "Crowbar|PHB", "Hammer|PHB", "10x Piton|PHB", "Lantern, hooded|PHB",
        "2x Oil, flask|PHB", "5x Rations, day|PHB", "Tinderbox|PHB", "Waterskin|PHB", "Rope, hempen (50 feet)|PHB"
    ]
};

/**
 * Expands a pack item (e.g. "Priest's Pack") into its component items.
 * (Failure 3 FIX)
 */
export async function decomposePack(packName: string): Promise<Item[]> {
    const componentNames = PACK_DEFINITIONS[packName];
    if (!componentNames) return [];

    const items: Item[] = [];
    for (const entry of componentNames) {
        let name = entry;
        let quantity = 1;
        if (entry.includes('x ')) {
            const parts = entry.split('x ');
            quantity = parseInt(parts[0]) || 1;
            name = parts[1];
        }

        // Strip source if present
        const cleanName = name.split('|')[0];

        items.push({
            id: crypto.randomUUID(),
            name: cleanName,
            quantity,
            weight: 0, // In a real system we'd lookup weights, but for now 0 is better than broken
            isEquipped: false,
            isAttuned: false,
            description: `Part of the ${packName}`,
            type: 'gear'
        });
    }
    return items;
}
/**
 * Extracts automated effects (AC bonuses, stat mods, etc.) from 5eTools item data.
 * Uses both structured data and natural language parsing (Regex).
 */
function extractEffectsFromItem(i: any, description: string): Effect[] {
    const effects: Effect[] = [];

    // 1. Armor/Shield Base AC (Structured)
    if (i.ac || i.type === 'HA' || i.type === 'MA' || i.type === 'LA' || i.type === 'S') {
        const baseAc = typeof i.ac === 'number' ? i.ac : (Array.isArray(i.ac) ? i.ac[0] : (i.type === 'S' ? 2 : 10));

        if (i.type === 'S' || i.name.toLowerCase().includes('shield')) {
            effects.push({
                id: crypto.randomUUID(),
                type: 'add_ac_bonus',
                value: baseAc,
                target: 'ac',
                note: i.name
            });
        } else {
            // Armor - Set base AC logic
            let dexCap: number | null = null;
            if (i.type === 'HA') dexCap = 0;
            if (i.type === 'MA') dexCap = 2;

            effects.push({
                id: crypto.randomUUID(),
                type: 'set_ac',
                value: `${baseAc}${dexCap !== null ? ` + DEX (MAX ${dexCap})` : ' + DEX'}`,
                note: i.name
            });
        }
    }

    // 2. Magic Bonuses (Regex / NLP)
    // AC Bonus: "+1 bonus to AC" or "+2 armor class"
    const acBonusMatch = description.match(/\+([1-3])\s+bonus\s+to\s+(?:your\s+)?AC/i) ||
        description.match(/\+([1-3])\s+bonus\s+to\s+armor\s+class/i);
    if (acBonusMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'add_ac_bonus',
            value: parseInt(acBonusMatch[1]),
            target: 'ac',
            note: 'Magical Bonus'
        });
    }

    // Save Bonus: "+1 bonus to all saving throws" or "+1 bonus to AC and saving throws"
    const saveBonusMatch = description.match(/\+([1-3])\s+bonus\s+to\s+all\s+saving\s+throws/i) ||
        description.match(/\+([1-3])\s+bonus\s+to\s+AC\s+and\s+saving\s+throws/i);
    if (saveBonusMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'add_save_bonus',
            value: parseInt(saveBonusMatch[1]),
            target: 'all',
            note: 'Magical Resistance'
        });
    }

    // AC Bonus from "AC and saving throws" phrasing
    if (description.match(/\+([1-3])\s+bonus\s+to\s+AC\s+and\s+saving\s+throws/i)) {
        const bonus = parseInt(description.match(/\+([1-3])\s+bonus\s+to\s+AC\s+and\s+saving\s+throws/i)![1]);
        effects.push({
            id: crypto.randomUUID(),
            type: 'add_ac_bonus',
            value: bonus,
            target: 'ac',
            note: 'Magical Defense'
        });
    }

    // Ability Score Increases (e.g. "increases your Strength score by 2") or Sets (e.g. "Strength score becomes 19")
    const statBonusMatch = description.match(/increases?\s+your\s+([a-z]+)\s+score\s+by\s+([1-4])/i);
    if (statBonusMatch) {
        const stat = statBonusMatch[1].toLowerCase().substring(0, 3);
        const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (stats.includes(stat)) {
            effects.push({
                id: crypto.randomUUID(),
                type: 'modify_ability_score',
                value: parseInt(statBonusMatch[2]),
                target: stat,
                note: i.name
            });
        }
    }

    const statSetMatch = description.match(/([a-z]+)\s+score\s+becomes\s+(\d+)/i) ||
        description.match(/([a-z]+)\s+score\s+is\s+(\d+)/i);
    if (statSetMatch) {
        const stat = statSetMatch[1].toLowerCase().substring(0, 3);
        const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (stats.includes(stat)) {
            effects.push({
                id: crypto.randomUUID(),
                type: 'modify_ability_score',
                value: `SET:${statSetMatch[2]}`, // mechanicsEngine will need to handle this
                target: stat,
                note: i.name
            });
        }
    }

    // Initiative Bonus: "+1 bonus to initiative"
    const initMatch = description.match(/\+([1-3])\s+bonus\s+to\s+initiative/i);
    if (initMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'add_initiative_bonus',
            value: parseInt(initMatch[1]),
            note: i.name
        });
    }

    // 3. Advantage and Resistance (Regex / NLP)
    // Advantage on Saves: "advantage on Strength saving throws"
    const advantageMatch = description.match(/advantage\s+on\s+([a-z]+)\s+saving\s+throws/i);
    if (advantageMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'grant_advantage',
            value: advantageMatch[1].toLowerCase().substring(0, 3),
            note: i.name
        });
    }

    // Resistance: "resistance to necrotic damage"
    const resistanceMatch = description.match(new RegExp(`resistance\\s+to\\s+(${DAMAGE_TYPE_PATTERN})\\s+damage`, 'i'));
    if (resistanceMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'grant_resistance',
            value: resistanceMatch[1].toLowerCase(),
            note: i.name
        });
    }

    // 4. Movement Modifiers: "walking speed increases by 10 feet"
    const speedMatch = description.match(/speed\s+increases\s+by\s+(\d+)\s+feet/i);
    if (speedMatch) {
        effects.push({
            id: crypto.randomUUID(),
            type: 'increase_speed',
            value: parseInt(speedMatch[1]),
            note: i.name
        });
    }

    return effects;
}
