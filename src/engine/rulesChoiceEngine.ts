import { WizardStep } from '../components/common/ChoiceWizardModal';
import { FLAVOR_DESCRIPTIONS } from '../data/dnd5e/flavorDescriptions';
import { ALL_OFFICIAL_LANGUAGES, RARE_LANGUAGES, STANDARD_LANGUAGES } from '../data/dnd5e/languages';
import { is2024Source, decomposePack, fetchFeat } from './fiveEToolsParser';
import { Character, StatBlock } from '../types/character';
import EQUIP_DATA_2024 from '../data/rules2024/equipment.json';

/**
 * RULES CHOICE ENGINE
 * 
 * This engine analyzes raw D&D 5e data to detect required user choices
 * and provides definitions for the UI Wizard to present these choices.
 * It also handles the "resolution" of these choices into character updates.
 */

interface Option {
    label: string;
    value: any;
    description?: string;
    is2024?: boolean;
}

export interface DetectedChoice {
    id: string;
    title: string;
    description: string;
    type: 'skill' | 'language' | 'tool' | 'ability' | 'equipment' | 'feature' | 'spell' | 'feat' | 'weaponMastery';
    count: number;
    minCount?: number;
    options: any[];
    originalChoiceBlock: any;
    is2024?: boolean;
}

const EXOTIC_LANGUAGES = RARE_LANGUAGES;
const ALL_LANGUAGES = ALL_OFFICIAL_LANGUAGES;
const EQUIPMENT_OPTION_KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ALL_SKILLS = [
    'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'
];
interface EquipmentChoiceMetadata {
    title: string;
    description: string;
}

interface EquipmentExpansionRule {
    id: string;
    title: string;
    description: string;
    matches: string[];
    options: any[];
}

const ARCANE_FOCUS_OPTIONS = [
    'Arcane Focus (Crystal)',
    'Arcane Focus (Orb)',
    'Arcane Focus (Rod)',
    'Arcane Focus (Staff)',
    'Arcane Focus (Wand)',
    'Component Pouch'
];

const DRUIDIC_FOCUS_OPTIONS = [
    'Druidic Focus (Sprig of Mistletoe)',
    'Druidic Focus (Totem)',
    'Druidic Focus (Wooden Staff)',
    'Druidic Focus (Yew Wand)',
    'Component Pouch'
];

const MUSICAL_INSTRUMENT_OPTIONS = [
    'Bagpipes',
    'Drum',
    'Dulcimer',
    'Flute',
    'Horn',
    'Lute',
    'Lyre',
    'Pan Flute',
    'Shawm',
    'Viol'
];

const GENERIC_EQUIPMENT_EXPANSIONS: EquipmentExpansionRule[] = [
    {
        id: 'arcane_focus_choice',
        title: 'Spellcasting Implement',
        description: 'Choose an Arcane Focus or a Component Pouch.',
        matches: ['arcane focus'],
        options: ARCANE_FOCUS_OPTIONS
    },
    {
        id: 'druidic_focus_choice',
        title: 'Spellcasting Implement',
        description: 'Choose a Druidic Focus or a Component Pouch.',
        matches: ['druidic focus'],
        options: DRUIDIC_FOCUS_OPTIONS
    },
    {
        id: 'scholar_pack_choice',
        title: 'Adventuring Pack',
        description: 'Choose your starting pack.',
        matches: ["scholar's pack"],
        options: ["Scholar's Pack", "Explorer's Pack"]
    },
    {
        id: 'dungeoneer_pack_choice',
        title: 'Adventuring Pack',
        description: 'Choose your starting pack.',
        matches: ["dungeoneer's pack"],
        options: ["Dungeoneer's Pack", "Explorer's Pack"]
    },
    {
        id: 'priest_pack_choice',
        title: 'Adventuring Pack',
        description: 'Choose your starting pack.',
        matches: ["priest's pack"],
        options: ["Priest's Pack", "Explorer's Pack"]
    },
    {
        id: 'entertainer_pack_choice',
        title: 'Adventuring Pack',
        description: 'Choose your starting pack.',
        matches: ["entertainer's pack"],
        options: ["Entertainer's Pack", "Diplomat's Pack"]
    },
    {
        id: 'musical_instrument_choice',
        title: 'Musical Instrument',
        description: 'Choose a musical instrument.',
        matches: ['musical instrument'],
        options: MUSICAL_INSTRUMENT_OPTIONS
    }
];

const CLASS_EQUIPMENT_EXPANSIONS: Record<string, EquipmentExpansionRule[]> = {
    wizard: [
        {
            id: 'wizard_weapon_choice',
            title: 'Starting Weapon',
            description: 'Choose your starting weapon.',
            matches: ['quarterstaff'],
            options: ['Quarterstaff', 'Dagger']
        }
    ]
};

function parseCoinText(value: string): { amount: number; unit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' } | null {
    const match = value.trim().match(/^(\d+)\s*(cp|sp|ep|gp|pp)$/i);
    if (!match) return null;
    return {
        amount: parseInt(match[1], 10),
        unit: match[2].toLowerCase() as 'cp' | 'sp' | 'ep' | 'gp' | 'pp'
    };
}

function addCopperValueToCurrencies(
    currencies: { cp: number; sp: number; ep: number; gp: number; pp: number },
    copperValue: number
) {
    if (!Number.isFinite(copperValue) || copperValue <= 0) return;
    const wholeCp = Math.floor(copperValue);
    currencies.gp += Math.floor(wholeCp / 100);
    currencies.cp += wholeCp % 100;
}

function extractEqOptionKeys(eqChoice: any): string[] {
    if (!eqChoice || typeof eqChoice !== 'object' || Array.isArray(eqChoice)) return [];

    const keys = Object.keys(eqChoice)
        .filter((key) => key !== '_' && eqChoice[key] !== undefined);

    return keys.sort((a, b) => {
        const aIdx = EQUIPMENT_OPTION_KEYS.indexOf(a);
        const bIdx = EQUIPMENT_OPTION_KEYS.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
    });
}

function getDefaultDataChoiceScore(startingEquipment: any): number {
    if (!startingEquipment?.defaultData || !Array.isArray(startingEquipment.defaultData)) return 0;
    return startingEquipment.defaultData.reduce((score: number, block: any) => score + extractEqOptionKeys(block).length, 0);
}

function pickBestEquipmentChoiceSource(startingEquipment: any, legacyStartingEquipment?: any) {
    if (!legacyStartingEquipment) return startingEquipment;
    const currentScore = getDefaultDataChoiceScore(startingEquipment);
    const legacyScore = getDefaultDataChoiceScore(legacyStartingEquipment);

    if (legacyScore > currentScore) {
        return {
            ...startingEquipment,
            defaultData: legacyStartingEquipment.defaultData,
            goldAlternative: startingEquipment?.goldAlternative || legacyStartingEquipment.goldAlternative,
            sourceHint: startingEquipment?.sourceHint || legacyStartingEquipment.sourceHint
        };
    }

    return startingEquipment;
}

/**
 * Recursive formatter for starting equipment packages.
 */
function formatEqPackage(pkg: any): string {
    if (!pkg) return 'Unknown';
    if (typeof pkg === 'string') return pkg.split('|')[0];

    if (Array.isArray(pkg)) {
        return pkg.map(item => formatEqPackage(item)).join(' and ');
    }

    if (typeof pkg === 'object') {
        const qty = pkg.quantity || 1;
        const qtyStr = qty > 1 ? `${qty}x ` : '';

        if (pkg.item) {
            const itemName = pkg.item.split('|')[0];
            return `${qtyStr}${itemName}`;
        }
        if (pkg.special) return pkg.special;
        if (pkg.displayName) return pkg.displayName;
        if (pkg.equipmentType) {
            // "weaponMartialMelee" -> "Martial Melee Weapon"
            return pkg.equipmentType
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str: string) => str.toUpperCase());
        }
        if (pkg.containsValue) {
            return `Pouch with ${pkg.containsValue / 100} gp`;
        }
        if (typeof pkg.value === 'number') {
            return `${pkg.value / 100} gp`;
        }
    }
    return 'Equipment';
}

function normalizeEquipmentEntryLabel(entry: any): string {
    if (typeof entry === 'string') return entry.trim().toLowerCase();
    return formatEqPackage(entry).trim().toLowerCase();
}

function entryMatchesRule(entry: any, rule: EquipmentExpansionRule): boolean {
    const label = normalizeEquipmentEntryLabel(entry);
    return rule.matches.some((match) => label.includes(match.toLowerCase()));
}

function createEquipmentChoiceBlock(options: any[]): any {
    const block: Record<string, any> = {};
    options.forEach((option, idx) => {
        const key = EQUIPMENT_OPTION_KEYS[idx] ?? `option${idx + 1}`;
        block[key] = option;
    });
    return block;
}

function extractGoldAlternativeFromChoiceB(choiceB: any): string | undefined {
    if (typeof choiceB === 'string' && parseCoinText(choiceB)) {
        return choiceB;
    }

    if (Array.isArray(choiceB) && choiceB.length === 1) {
        const entry = choiceB[0];
        if (typeof entry === 'string' && parseCoinText(entry)) return entry;
        if (entry?.isCurrency && typeof entry.quantity === 'number') {
            const unit = (entry.unit || 'gp').toString().toLowerCase();
            if (['cp', 'sp', 'ep', 'gp', 'pp'].includes(unit)) {
                return `${entry.quantity} ${unit}`;
            }
        }
    }

    return undefined;
}

function expandSimplifiedClassEquipment(className: string, startingEquipment: any): any {
    if (!startingEquipment || typeof startingEquipment !== 'object') return startingEquipment;
    if (!Array.isArray(startingEquipment.choiceA) || startingEquipment.choiceA.length === 0) {
        if (!startingEquipment.goldAlternative) {
            const inferredGold = extractGoldAlternativeFromChoiceB(startingEquipment.choiceB);
            if (inferredGold) {
                return { ...startingEquipment, goldAlternative: inferredGold };
            }
        }
        return startingEquipment;
    }

    const classRules = CLASS_EQUIPMENT_EXPANSIONS[className] || [];
    const usedRules = new Set<string>();
    const fixedEntries: any[] = [];
    const defaultData: any[] = [];
    const choiceMetadata: EquipmentChoiceMetadata[] = [];

    for (const entry of startingEquipment.choiceA) {
        const matchedRule = [...classRules, ...GENERIC_EQUIPMENT_EXPANSIONS].find((rule) => {
            if (usedRules.has(rule.id)) return false;
            return entryMatchesRule(entry, rule);
        });

        if (!matchedRule) {
            fixedEntries.push(entry);
            continue;
        }

        usedRules.add(matchedRule.id);
        const block = createEquipmentChoiceBlock(matchedRule.options);
        if (Object.keys(block).length > 0) {
            defaultData.push(block);
            choiceMetadata.push({ title: matchedRule.title, description: matchedRule.description });
        }
    }

    if (defaultData.length === 0) {
        if (!startingEquipment.goldAlternative) {
            const inferredGold = extractGoldAlternativeFromChoiceB(startingEquipment.choiceB);
            if (inferredGold) {
                return { ...startingEquipment, goldAlternative: inferredGold };
            }
        }
        return startingEquipment;
    }

    if (fixedEntries.length > 0) {
        defaultData.unshift({ _: fixedEntries });
    }

    const inferredGold = extractGoldAlternativeFromChoiceB(startingEquipment.choiceB);

    return {
        ...startingEquipment,
        defaultData,
        goldAlternative: startingEquipment.goldAlternative || inferredGold,
        choiceMetadata
    };
}

function getNormalizedClassStartingEquipment(classData: any): any {
    const baseEquipment = pickBestEquipmentChoiceSource(classData?.startingEquipment, classData?.legacyStartingEquipment);
    if (!baseEquipment) return baseEquipment;

    const className = (classData?.name || '').toString().trim().toLowerCase();
    return expandSimplifiedClassEquipment(className, baseEquipment);
}

function getGoldAlternativeLabel(goldAlternative: any): string {
    if (typeof goldAlternative === 'string') {
        const parsedCoin = parseCoinText(goldAlternative);
        if (parsedCoin) {
            return `Start with ${parsedCoin.amount} ${parsedCoin.unit.toUpperCase()}`;
        }

        const formula = goldAlternative.trim();
        if (formula.length > 0) {
            return `Start with Gold (${formula})`;
        }
    }

    return 'Start with Gold';
}
export function detectChoices(
    data: any,
    is2024: boolean,
    type: 'race' | 'class' | 'background' | 'feat'
): DetectedChoice[] {
    const choices: DetectedChoice[] = [];

    // 1. Ability Scores (Race & Background)
    if ((type === 'race' || type === 'background') && data.ability && Array.isArray(data.ability)) {
        data.ability.forEach((ab: any, i: number) => {
            if (ab.choose) {
                choices.push({
                    id: `race_ability_${i}`,
                    title: 'Ability Score Increase',
                    description: `Choose ${ab.choose.count || 1} ability score(s) to increase by ${ab.choose.amount || 1}.`,
                    type: 'ability',
                    count: ab.choose.count || 1,
                    options: (ab.choose.from || ['str', 'dex', 'con', 'int', 'wis', 'cha']).map((s: string) => ({
                        label: s.toUpperCase(),
                        value: { stat: s, bonus: ab.choose.amount || 1 },
                        is2024: is2024
                    })),
                    originalChoiceBlock: ab
                });
            }
        });
    }

    // 2. Skill Proficiencies
    const skillSource = type === 'class' ? data.startingProficiencies?.skills : data.skillProficiencies;
    if (skillSource && Array.isArray(skillSource)) {
        skillSource.forEach((sp: any, i: number) => {
            if (sp.choose || sp.any) {
                const count = sp.choose?.count || sp.any || 1;
                const from = sp.choose?.from || ALL_SKILLS;
                choices.push({
                    id: `${type}_skills_${i}`,
                    title: 'Skill Proficiencies',
                    description: `Choose ${count} skill(s).`,
                    type: 'skill',
                    count,
                    options: from.map((s: string) => ({
                        label: s.charAt(0).toUpperCase() + s.slice(1),
                        value: s,
                        description: FLAVOR_DESCRIPTIONS[s.toLowerCase()],
                        is2024: is2024
                    })),
                    originalChoiceBlock: sp
                });
            }
        });
    }

    // 3. Language Proficiencies
    if (data.languageProficiencies && Array.isArray(data.languageProficiencies)) {
        data.languageProficiencies.forEach((lp: any, i: number) => {
            if (lp.anyStandard || lp.anyExotic || lp.any || lp.choose) {
                const count = (lp.anyStandard || 0) + (lp.anyExotic || 0) + (lp.any || 0) + (lp.choose?.count || 0) || 1;
                let availableOptions = ALL_LANGUAGES;
                if (lp.anyStandard && !lp.anyExotic && !lp.any && !lp.choose) availableOptions = STANDARD_LANGUAGES;
                if (lp.anyExotic && !lp.anyStandard && !lp.any && !lp.choose) availableOptions = EXOTIC_LANGUAGES;
                if (lp.choose?.from) availableOptions = lp.choose.from;

                choices.push({
                    id: `${type}_lang_${i}`,
                    title: 'Languages',
                    description: `Choose ${count} language(s).`,
                    type: 'language',
                    count,
                    options: availableOptions.map(l => ({
                        label: l,
                        value: l,
                        description: FLAVOR_DESCRIPTIONS[l.toLowerCase()],
                        is2024: is2024
                    })),
                    originalChoiceBlock: lp
                });
            }
        });
    }

    // 3b. FALLBACK: Many 5e.tools traits have choices hidden in entries (text)
    if (data.entries) {
        data.entries.forEach((e: any, i: number) => {
            if (typeof e !== 'object' || !e.name) return;
            const nameLower = e.name.toLowerCase();
            const desc = JSON.stringify(e.entries || []).toLowerCase();

            if ((nameLower.includes('language') || nameLower.includes('skill')) && desc.includes('choice')) {
                let count = 1;
                if (desc.includes('two') || desc.includes(' 2 ') || desc.includes('both')) count = 2;
                if (desc.includes('three') || desc.includes(' 3 ')) count = 3;
                if (desc.includes('four') || desc.includes(' 4 ')) count = 4;
                if (desc.includes('five') || desc.includes(' 5 ')) count = 5;
                if (desc.includes('any number') || desc.includes('any other')) count = 2; // Default for 2024 Elf if "any other"

                const choiceType = nameLower.includes('language') ? 'language' : 'skill';
                const id = `extra_${choiceType}_${i}`;

                if (!choices.some(c => c.type === choiceType)) {
                    choices.push({
                        id,
                        title: e.name,
                        description: `Choose ${count} ${choiceType}(s).`,
                        type: choiceType as any,
                        count,
                        options: choiceType === 'language' ? ALL_LANGUAGES.map(l => ({
                            label: l,
                            value: l,
                            description: FLAVOR_DESCRIPTIONS[l.toLowerCase()],
                            is2024: is2024
                        })) : ALL_SKILLS.map(s => ({
                            label: s.charAt(0).toUpperCase() + s.slice(1),
                            value: s,
                            is2024: is2024
                        })),
                        originalChoiceBlock: e
                    });
                }
            }
        });
    }

    // 3c. Background Feats (2024 Rules)
    if (type === 'background' && data.feats && Array.isArray(data.feats)) {
        data.feats.forEach((f: any, i: number) => {
            Object.keys(f).forEach(featKey => {
                const featName = featKey.split('|')[0].split(';')[0].trim().replace(/\b\w/g, l => l.toUpperCase());
                choices.push({
                    id: `bg_feat_${i}`,
                    title: 'Background Feat',
                    description: `You gain the ${featName} feat from your background.`,
                    type: 'feature',
                    count: 1,
                    options: [{
                        label: featName,
                        value: featName,
                        is2024: is2024
                    }],
                    originalChoiceBlock: f
                });
            });
        });
    }

    // 3d. Background Gold / Currency
    if (type === 'background' && data.entries) {
        const entryStr = JSON.stringify(data.entries);
        const goldMatch = entryStr.match(/(\d+)\s*gp/i);
        if (goldMatch) {
            const amount = parseInt(goldMatch[1]);
            choices.push({
                id: `bg_gold`,
                title: 'Starting Gold',
                description: `Your background provides you with ${amount} gold pieces.`,
                type: 'equipment',
                count: 1,
                options: [{
                    label: `${amount} GP`,
                    value: { name: 'Gold Pieces', quantity: amount, isCurrency: true },
                    is2024: is2024
                }],
                originalChoiceBlock: data.entries
            });
        }
    }

        // 4. Equipment Packages (Class)
    if (type === 'class' && data.startingEquipment) {
        const se = getNormalizedClassStartingEquipment(data);
        const hasDefaultData = Array.isArray(se?.defaultData) && se.defaultData.length > 0;
        const choiceMetadata: EquipmentChoiceMetadata[] = Array.isArray(se?.choiceMetadata) ? se.choiceMetadata : [];

        // Handle simplified choiceA/choiceB format when data cannot be normalized further
        if (!hasDefaultData && (se?.choiceA || se?.choiceB)) {
            const options = [];
            if (se.choiceA) options.push({ label: formatEqPackage(se.choiceA), value: se.choiceA, is2024: true });
            if (se.choiceB) options.push({ label: formatEqPackage(se.choiceB), value: se.choiceB, is2024: true });

            choices.push({
                id: 'class_eq_2024',
                title: 'Starting Equipment Choice',
                description: 'Select your starting equipment package (A) or starting gold (B).',
                type: 'equipment',
                count: 1,
                options,
                originalChoiceBlock: se
            });
        }

        // Handle defaultData format with support for large option sets
        if (hasDefaultData) {
            let metadataCursor = 0;
            se.defaultData.forEach((eqChoice: any, i: number) => {
                const optionKeys = extractEqOptionKeys(eqChoice);
                const options = optionKeys.map((key) => ({
                    label: formatEqPackage(eqChoice[key]),
                    value: eqChoice[key],
                    is2024: is2024Source(data.source)
                }));

                if (options.length > 0) {
                    const metadata = choiceMetadata[metadataCursor];
                    metadataCursor += 1;

                    choices.push({
                        id: `class_eq_${i}`,
                        title: metadata?.title || `Equipment Choice ${i + 1}`,
                        description: metadata?.description || 'Choose your starting equipment package.',
                        type: 'equipment',
                        count: 1,
                        minCount: se.goldAlternative ? 0 : 1,
                        options,
                        originalChoiceBlock: eqChoice
                    });
                }
            });
        }

        if (se?.goldAlternative) {
            choices.push({
                id: 'class_gold_alt',
                title: 'Starting Wealth',
                description: 'Optional: choose this instead of class equipment.',
                type: 'equipment',
                count: 1,
                minCount: 0,
                options: [{
                    label: getGoldAlternativeLabel(se.goldAlternative),
                    value: { isGoldAlt: true, formula: se.goldAlternative },
                    is2024: is2024Source(data.source)
                }],
                originalChoiceBlock: se.goldAlternative
            });
        }
    }

    // 5. Class Features
    const featuresSource = data.levels ? (data.levels["1"]?.features || []) : (data.classFeature || []);
    if (type === 'class' && featuresSource.length > 0) {
        featuresSource.forEach((cf: any) => {
            const nameLower = cf.name.toLowerCase();
            // Detect common 2024 choices: Weapon Mastery, Fighting Style, Eldritch Invocation, Metamagic
            if (nameLower.includes('fighting style') ||
                nameLower.includes('eldritch invocation') ||
                nameLower.includes('metamagic') ||
                nameLower.includes('weapon mastery') ||
                nameLower.includes('expertise') ||
                nameLower.includes('divine order') ||
                nameLower.includes('primal order')) {

                const isFighter = data.name === 'Fighter';
                // 2024 Fighter gets 3, Barbarian gets 2 at level 1.
                // We'll try to parse it from description if possible, fallback to 2.
                let count = 2;
                if (isFighter) count = 3;

                const descLower = cf.description?.toLowerCase() || '';
                if (descLower.includes('three')) count = 3;
                else if (descLower.includes('two')) count = 2;
                else if (descLower.includes('four')) count = 4;

                const choiceType = nameLower.includes('weapon mastery') ? 'weaponMastery' : 'feature';

                choices.push({
                    id: `feature_${cf.name.replace(/\s+/g, '_').toLowerCase()}`,
                    title: cf.name,
                    description: `Choose ${count} option(s) for your ${cf.name} feature.`,
                    type: choiceType,
                    count,
                    options: (choiceType === 'weaponMastery'
                        ? getWeaponOptions2024()
                        : getMockOptionsForFeature(cf.name)
                    ).map((o: Option) => ({ ...o, is2024: o.is2024 ?? is2024Source(data.source) })),
                    originalChoiceBlock: cf
                });
            }
        });
    }

    // 2024 Rule: Languages are "Common + 2 other official language choices"
    if (is2024 && type === 'race' && (!data.languageProficiencies || data.languageProficiencies.length === 0)) {
        choices.push({
            id: 'race_languages_2024',
            title: 'Languages',
            description: 'You know Common and two other languages of your choice.',
            type: 'language',
            count: 2,
            options: ALL_LANGUAGES.filter(l => l.toLowerCase() !== 'common').map(l => ({ label: l, value: l, is2024: true })),
            is2024: true,
            originalChoiceBlock: { isSynthetic2024: true }
        });
    }

    // 6. Generic Feat Selection (Level 4+, ASI replacement)
    if (type === 'feat') {
        // This is a special case triggered by the Level-Up Wizard
        // It returns the entire catalog of available feats (filtered by 2024 if preferred)
        // Since detectChoices is synchronous but searchFeats might be async in some contexts,
        // we use the local 2024 feats data directly or wait for the implementation.
        // Actually, for now, let's assume we pass the feat data or use a mock that will be replaced.
        // Wait, searchFeats IS async. I should probably refactor detectChoices to be async or handle it.
        // For now, I'll add a placeholder that the UI can then populate with searchFeats.
        choices.push({
            id: 'feat_selection',
            title: 'Choose a Feat',
            description: 'Select a feat to gain. You must meet the prerequisites.',
            type: 'feat',
            count: 1,
            options: [], // UI will fetch these via searchFeats('')
            originalChoiceBlock: { isFeatSelection: true }
        });
    }

    return choices;
}

export function detectFixedProficiencies(data: any, is2024: boolean): { languages: string[], skills: string[] } {
    const languages: string[] = [];
    const skills: string[] = [];

    if (data.entries) {
        data.entries.forEach((e: any) => {
            if (typeof e !== 'object' || !e.entries) return;
            const entriesText = JSON.stringify(e.entries).toLowerCase();
            const titleLower = (e.name || '').toLowerCase();

            ALL_LANGUAGES.forEach(l => {
                const lLower = l.toLowerCase();
                const knownPatterns = [`know ${lLower}`, `speak ${lLower}`, `read, and write ${lLower}`];
                const matchesPattern = knownPatterns.some(p => entriesText.includes(p));
                const isChoice = entriesText.includes('choice') || entriesText.includes('choose');
                const isLanguageTrait = titleLower.includes('language');

                if (matchesPattern && !isChoice && isLanguageTrait) {
                    if (!languages.includes(l)) languages.push(l);
                }
            });

            if (entriesText.includes('"common"') || titleLower.includes('common') || (is2024 && languages.length === 0)) {
                if (!languages.includes('Common')) languages.push('Common');
            }

            ALL_SKILLS.forEach(s => {
                const sLower = s.toLowerCase();
                const skillPatterns = [`proficiency in ${sLower}`, `proficient in ${sLower}`, `gain proficiency in ${sLower}`];
                const matchesSkill = skillPatterns.some(p => entriesText.includes(p));
                const isSkillChoice = entriesText.includes('choice') || entriesText.includes('choose');
                if (matchesSkill && !isSkillChoice) {
                    const sName = s.charAt(0).toUpperCase() + s.slice(1);
                    if (!skills.includes(sName)) skills.push(sName);
                }
            });
        });
    }

    return { languages, skills };
}

function getMockOptionsForFeature(featureName: string): Option[] {
    const nameLower = featureName.toLowerCase();
    if (nameLower.includes('fighting style')) {
        return [
            { label: 'Archery', value: 'Archery', description: '+2 bonus to attack rolls with ranged weapons.', is2024: true },
            { label: 'Defense', value: 'Defense', description: '+1 bonus to AC while wearing armor.', is2024: true },
            { label: 'Dueling', value: 'Dueling', description: '+2 bonus to damage rolls with one-handed melee weapons.', is2024: true },
            { label: 'Great Weapon Fighting', value: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on damage dice for two-handed weapons.', is2024: true },
            { label: 'Protection', value: 'Protection', description: 'Use reaction to impose disadvantage on attacks against allies.', is2024: true },
            { label: 'Two-Weapon Fighting', value: 'Two-Weapon Fighting', description: 'Add ability modifier to second attack damage.', is2024: true }
        ];
    }
    return [];
}

function getWeaponOptions2024(): Option[] {
    const rawData = EQUIP_DATA_2024 as any;
    const weapons = rawData.weapons || [];

    if (weapons.length === 0) {
        return [{ label: 'DEBUG: No weapons found in data', value: 'none', description: `Check src/data/rules2024/equipment.json. Keys present: ${Object.keys(rawData).join(', ')}`, is2024: true }];
    }

    return weapons.map((w: any) => ({
        label: w.name,
        value: w.name,
        description: `Mastery: ${w.mastery || 'None'}. ${w.damage || ''} ${w.properties?.join(', ') || ''}`,
        is2024: true
    }));
}

export async function resolveAllChoices(
    character: Character,
    selections: Record<string, any[]>,
    originalData: any,
    type: 'race' | 'class' | 'background'
): Promise<Character> {
    let updated = { ...character };
    const choseGoldAlternative = Object.keys(selections).some((choiceId) =>
        choiceId.includes('gold_alt') && Array.isArray(selections[choiceId]) && selections[choiceId].length > 0
    );

    if (type === 'race') {
        updated.race = originalData.name;

        // Ability scores (Fixed - Legacy Only, 2024 uses Background)
        if (!originalData.is2024 && originalData.ability && Array.isArray(originalData.ability) && originalData.ability[0]) {
            Object.entries(originalData.ability[0]).forEach(([stat, bonus]) => {
                const s = stat.toLowerCase() as keyof StatBlock;
                if (typeof bonus === 'number' && (updated.abilityScores as any)[s] !== undefined) {
                    (updated.abilityScores as any)[s] += bonus;
                }
            });
        }

        // Languages (Fixed)
        if (originalData.languageProficiencies && originalData.languageProficiencies[0]) {
            Object.keys(originalData.languageProficiencies[0]).forEach(l => {
                if (originalData.languageProficiencies[0][l] === true) {
                    const name = l.charAt(0).toUpperCase() + l.slice(1);
                    const currentLangs = updated.languages ? updated.languages.split(',').map((s: string) => s.trim()) : [];
                    if (!currentLangs.includes(name)) currentLangs.push(name);
                    updated.languages = currentLangs.join(', ');
                }
            });
        }

        updated.speed = typeof originalData.speed === 'number' ? `${originalData.speed} ft` : `${originalData.speed?.walk || 30} ft`;
        if (originalData.darkvision) {
            updated.senses = (updated.senses || '') + ` Darkvision ${originalData.darkvision} ft`;
            updated.darkvision = originalData.darkvision;
        }

        // Extract Racial Traits
        if (originalData.entries) {
            const racialTraits = originalData.entries
                .filter((e: any) => typeof e === 'object' && e.name)
                .map((e: any) => ({
                    id: crypto.randomUUID(),
                    name: e.name,
                    source: `Race: ${originalData.name}`,
                    description: typeof e.entries === 'string' ? e.entries : JSON.stringify(e.entries || [e]),
                    is2024: originalData.source?.startsWith('X') || false
                }));
            updated.racialTraits = [...(updated.racialTraits || []), ...racialTraits];
        }
    }

    if (type === 'background') {
        updated.background = originalData.name;

        // Fixed Skill Proficiencies
        if (originalData.skillProficiencies && Array.isArray(originalData.skillProficiencies)) {
            originalData.skillProficiencies.forEach((sp: any) => {
                const skillNames = typeof sp === 'string' ? [sp] : Object.keys(sp).filter(k => sp[k] === true);
                skillNames.forEach(skillName => {
                    const skill = updated.skills.find((s: any) => s.name.toLowerCase() === skillName.toLowerCase());
                    if (skill) {
                        skill.proficient = true;
                        skill.source = `Background: ${originalData.name}`;
                    }
                });
            });
        }

        // Background Feature
        if (originalData.entries) {
            const features = originalData.entries
                .filter((e: any) => typeof e === 'object' && e.name)
                .map((e: any) => ({
                    id: crypto.randomUUID(),
                    name: e.name,
                    source: `Background: ${originalData.name}`,
                    description: typeof e.entries === 'string' ? e.entries : JSON.stringify(e.entries || [e]),
                    is2024: originalData.source?.startsWith('X') || false
                }));
            updated.features = [...(updated.features || []), ...features];
        }

        // Background Starting Gold
        if (originalData.startingGold && updated.currencies) {
            updated.currencies.gp += originalData.startingGold;
        } else {
            // Fallback to text parsing
            const entriesText = JSON.stringify(originalData.entries || []).toLowerCase();
            const goldMatch = entriesText.match(/(\d+)\s+gp/);
            if (goldMatch && updated.currencies) {
                updated.currencies.gp += parseInt(goldMatch[1]);
            }
        }
    }

    if (type === 'class') {
        updated.className = originalData.name;
        updated.hitDice = originalData.hitDice;

        // Fixed Class Features (Level 1)
        const level1Data = originalData.levels?.["1"] || {};
        const fixedFeatures = level1Data.features || [];
        fixedFeatures.forEach((ff: any) => {
            if (!updated.features.some(f => f.name === ff.name)) {
                updated.features.push({
                    id: crypto.randomUUID(),
                    name: ff.name,
                    source: `Class: ${originalData.name}`,
                    description: ff.description,
                    is2024: true,
                    hasUses: false
                });
            }
        });

        // Fixed starting equipment entries in defaultData ("_") should always be granted.
        // If optional equipment steps were skipped while taking class equipment,
        // apply the first option as a rules-safe default.
        const startingEquipment = getNormalizedClassStartingEquipment(originalData);
        if (!choseGoldAlternative && startingEquipment?.defaultData && Array.isArray(startingEquipment.defaultData)) {
            for (let i = 0; i < startingEquipment.defaultData.length; i++) {
                const eqChoice = startingEquipment.defaultData[i];
                const fixedEntry = eqChoice?._;
                if (fixedEntry !== undefined) {
                    updated = await applySelection(updated, 'class_eq_auto', [fixedEntry]);
                }

                const optionKeys = extractEqOptionKeys(eqChoice);
                if (optionKeys.length === 0) continue;

                const choiceId = `class_eq_${i}`;
                const hasExplicitSelection = Array.isArray(selections[choiceId]) && selections[choiceId].length > 0;
                if (!hasExplicitSelection) {
                    const defaultSelection = eqChoice[optionKeys[0]];
                    updated = await applySelection(updated, choiceId, [defaultSelection]);
                }
            }
        }
    }

    // Process Selections
    for (const choiceId of Object.keys(selections)) {
        const selectedOptions = selections[choiceId];
        if (!selectedOptions || selectedOptions.length === 0) continue;
        if (choseGoldAlternative && choiceId.includes('eq') && !choiceId.includes('gold_alt')) continue;

        updated = await applySelection(updated, choiceId, selectedOptions);
    }

    return updated;
}

async function applySelection(character: Character, choiceId: string, selections: any[]): Promise<Character> {
    const updated = { ...character };

    if (choiceId === 'flavor_customization') {
        const flavor = selections[0];
        if (flavor) updated.notes = (updated.notes || '') + '\n\n' + flavor;
        return updated;
    }

    if (choiceId.includes('lang')) {
        const currentLangs = updated.languages ? updated.languages.split(',').map((s: string) => s.trim()) : [];
        selections.forEach(l => {
            if (!currentLangs.includes(l)) currentLangs.push(l);
        });
        updated.languages = currentLangs.join(', ');
    }
    else if (choiceId.includes('skills')) {
        const newSkills = [...(updated.skills || [])];
        const sourceLabel = choiceId.split('_')[0];
        const finalSource = sourceLabel.charAt(0).toUpperCase() + sourceLabel.slice(1);

        selections.forEach(skillName => {
            const skill = newSkills.find((s: any) => s.name.toLowerCase() === skillName.toLowerCase());
            if (skill) {
                skill.proficient = true;
                skill.source = finalSource;
                skill.sourceId = choiceId;
            }
        });
        updated.skills = newSkills;
    }
    else if (choiceId.includes('ability')) {
        const newAbilityScores = { ...updated.abilityScores };
        selections.forEach(sel => {
            const statKey = sel.stat?.toLowerCase() as keyof StatBlock;
            if (statKey && (newAbilityScores as any)[statKey] !== undefined) {
                (newAbilityScores as any)[statKey] += sel.bonus;
            }
        });
        updated.abilityScores = newAbilityScores;
    }
    else if (choiceId.includes('eq')) {
        const selection = selections[0];
        if (!selection) return updated;

        const newInventory = [...(updated.inventory || [])];
        const newCurrencies = { ...(updated.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }) };

        const processEntry = async (entry: any) => {
            if (typeof entry === 'string') {
                const name = entry.split('|')[0];

                const parsedCurrency = parseCoinText(name);
                if (parsedCurrency) {
                    newCurrencies[parsedCurrency.unit] += parsedCurrency.amount;
                    return;
                }

                const qtyMatch = name.match(/^(\d+)\s+(.+)$/);
                const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
                const normalizedName = qtyMatch ? qtyMatch[2] : name;
                if (normalizedName.toLowerCase().includes('pack')) {
                    const expanded = await decomposePack(normalizedName);
                    if (expanded.length > 0) {
                        newInventory.push(...expanded);
                        return;
                    }
                }
                newInventory.push({
                    id: crypto.randomUUID(),
                    name: normalizedName,
                    quantity,
                    type: 'gear',
                    weight: 0,
                    description: 'Starting equipment',
                    isEquipped: false,
                    isAttuned: false
                });
            } else if (Array.isArray(entry)) {
                for (const sub of entry) {
                    await processEntry(sub);
                }
            } else if (entry && typeof entry === 'object') {
                if (entry.isGoldAlt) {
                    const formulaText = String(entry.formula || '').trim();
                    const fixedCoin = parseCoinText(formulaText);
                    if (fixedCoin) {
                        newCurrencies[fixedCoin.unit] += fixedCoin.amount;
                        return;
                    }

                    // Extract dice or use average (e.g., "4d4 x 10")
                    const match = formulaText.match(/(\d+)d(\d+)(?:\s*x\s*(\d+))?/i);
                    let amount = 100; // default average
                    if (match) {
                        const count = parseInt(match[1]);
                        const sides = parseInt(match[2]);
                        const multiplier = parseInt(match[3] || '1');
                        amount = Math.floor(count * (sides + 1) / 2) * multiplier;
                    }
                    newCurrencies.gp += amount;
                } else if (entry.isCurrency || entry.containsValue) {
                    const amount = entry.quantity || 0;
                    if (entry.isCurrency) {
                        const unit = (entry.unit || 'gp').toLowerCase() as 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
                        if (['cp', 'sp', 'ep', 'gp', 'pp'].includes(unit)) {
                            newCurrencies[unit] += amount;
                        } else {
                            newCurrencies.gp += amount;
                        }
                    } else {
                        addCopperValueToCurrencies(newCurrencies, entry.containsValue);
                    }
                } else if (typeof entry.value === 'number') {
                    addCopperValueToCurrencies(newCurrencies, entry.value);
                } else if (entry.item) {
                    const name = entry.item.split('|')[0];
                    if (name.toLowerCase().includes('pack')) {
                        const expanded = await decomposePack(name);
                        if (expanded.length > 0) {
                            newInventory.push(...expanded);
                            return;
                        }
                    }
                    newInventory.push({
                        id: crypto.randomUUID(),
                        name,
                        quantity: entry.quantity || 1,
                        type: 'gear',
                        weight: 0,
                        description: 'Starting equipment',
                        isEquipped: false,
                        isAttuned: false
                    });
                } else if (entry.special || entry.displayName) {
                    const name = (entry.displayName || entry.special).toString().trim();
                    if (!name) return;
                    newInventory.push({
                        id: crypto.randomUUID(),
                        name,
                        quantity: entry.quantity || 1,
                        type: 'gear',
                        weight: 0,
                        description: 'Starting equipment',
                        isEquipped: false,
                        isAttuned: false
                    });
                } else if (entry.equipmentType) {
                    const name = entry.equipmentType.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
                    newInventory.push({
                        id: crypto.randomUUID(),
                        name,
                        quantity: 1,
                        type: 'gear',
                        weight: 0,
                        description: 'Generic selection',
                        isEquipped: false,
                        isAttuned: false
                    });
                }
            }
        };

        await processEntry(selection);
        updated.inventory = newInventory;
        updated.currencies = newCurrencies;
    }
    else if (choiceId.includes('feature')) {
        const newFeatures = [...(updated.features || [])];
        selections.forEach(optionName => {
            newFeatures.push({
                id: crypto.randomUUID(),
                name: optionName,
                description: 'Selected during character creation.',
                source: 'Choice',
                hasUses: false
            });
        });
        updated.features = newFeatures;
    }
    else if (choiceId.includes('feat')) {
        const newFeats = [...(updated.feats || [])];
        for (const featName of selections) {
            // Fetch the full feat data to get its effects
            const featData = await fetchFeat(featName);
            if (featData) {
                newFeats.push(featData);
            } else {
                // Fallback if not found
                newFeats.push({
                    id: crypto.randomUUID(),
                    name: featName,
                    description: 'Feat selected.',
                    source: 'Feat',
                    hasUses: false,
                    isFeat: true
                });
            }
        }
        updated.feats = newFeats;
    }
    else if (choiceId.includes('weaponMastery')) {
        const newMastery = [...(updated.masteredWeapons || [])];
        selections.forEach(weaponName => {
            if (!newMastery.includes(weaponName)) {
                newMastery.push(weaponName);
            }
        });
        updated.masteredWeapons = newMastery;
    }

    return updated;
}

export function enrichFeaturesWithChoices(features: any[]): any[] {
    return features.map(f => {
        const desc = f.description?.toLowerCase() || '';
        if (f.requiresChoice || f.choiceType) return f;

        const detectCount = (text: string) => {
            if (text.includes('two') || text.includes(' 2 ')) return 2;
            if (text.includes('three') || text.includes(' 3 ')) return 3;
            if (text.includes('four') || text.includes(' 4 ')) return 4;
            return 1;
        };

        if ((desc.includes('language') || f.name.toLowerCase().includes('language')) &&
            (desc.includes('of your choice') || desc.includes('choose') || desc.includes('any two') || desc.includes('any one'))) {
            return {
                ...f,
                requiresChoice: true,
                choiceType: 'language',
                count: detectCount(desc)
            };
        }

        if ((desc.includes('skill') || f.name.toLowerCase().includes('skill')) &&
            (desc.includes('of your choice') || desc.includes('choose') || desc.includes('any two') || desc.includes('any one'))) {
            return {
                ...f,
                requiresChoice: true,
                choiceType: 'skill',
                count: detectCount(desc)
            };
        }

        if (desc.includes('tool proficiency') && (desc.includes('of your choice') || desc.includes('choose'))) {
            return {
                ...f,
                requiresChoice: true,
                choiceType: 'tool',
                count: detectCount(desc)
            };
        }

        if (desc.includes('of your choice') && (desc.includes('skill') || desc.includes('language') || desc.includes('tool') || desc.includes('proficiency') || desc.includes('proficiencies'))) {
            const isLang = desc.includes('language');
            const isSkill = desc.includes('skill');
            return {
                ...f,
                requiresChoice: true,
                choiceType: isLang ? 'language' : (isSkill ? 'skill' : 'tool'),
                count: detectCount(desc)
            };
        }

        return f;
    });
}

export function choicesToWizardSteps(choices: DetectedChoice[]): WizardStep[] {
    return choices.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        maxChoices: c.count,
        minChoices: c.minCount ?? c.count,
        options: c.options.map(o => ({ ...o, is2024: o.is2024 ?? c.is2024 }))
    }));
}

export function getSkillAllowance(character: any): number {
    const className = character.className?.toLowerCase() || '';
    if (className === 'rogue') return 4;
    if (className === 'bard' || className === 'ranger') return 3;
    return 2;
}

export function validateSkillSelection(character: any, skillName: string, currentlyProficient: boolean): { allowed: boolean; reason?: string } {
    if (currentlyProficient) {
        const skill = character.skills.find((s: any) => s.name.toLowerCase() === skillName.toLowerCase());
        if (skill?.source && (skill.source.includes('Background') || skill.source.includes('Race'))) {
            return { allowed: false, reason: `This proficiency is fixed by your ${skill.source}.` };
        }
        return { allowed: true };
    }

    const chosenSkills = character.skills.filter((s: any) => s.proficient && (!s.source || s.source === 'Class' || s.source === 'Manual'));
    const allowance = getSkillAllowance(character);

    if (chosenSkills.length >= allowance) {
        return {
            allowed: false,
            reason: `You have already selected the maximum of ${allowance} skills for your class.`
        };
    }

    return { allowed: true };
}










