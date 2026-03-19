import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Character, Spell, Feature } from '../types/character';
import { searchItems, searchSpells, searchFeats, getRacialTraits, getClassFeatures } from './fiveEToolsParser';
import { mapPdfFieldsToCharacter as mapPdfFieldsToCharacterRecord } from './pdfImportEngine';

// Configure worker to use the local bundle properly via Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ─────────────────────────────────────────────────────────
// EXPANDED FIELD NAME DICTIONARY
// Covers: WotC standard, D&D Beyond, MPMB, Aurora, MorePurpleMoreBetter, common variants
// ─────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
    // Core Identity
    name: ['CharacterName', 'Character Name', 'CharacterName 2', 'Name', 'PC Name', 'Character_Name'],
    playerName: ['PLAYER NAME', 'PlayerName', 'Player Name', 'Player', 'Player_Name'],
    classLevel: ['ClassLevel', 'Class and Level', 'CLASS  LEVEL', 'CLASS LEVEL', 'Class & Level', 'Class_Level', 'ClassesLevel'],
    race: ['Race', 'RACE', 'Race ', 'Species', 'Ancestry', 'Race_Ancestry'],
    background: ['Background', 'BACKGROUND', 'Background '],
    alignment: ['Alignment', 'ALIGNMENT', 'Alignment '],

    // Ability Scores — support both "STR" and "Str", "Strength", numbered variants
    str: ['STR', 'Str', 'Strength', 'STRscore', 'STR Score', 'Str Score', 'STR_Score'],
    dex: ['DEX', 'Dex', 'Dexterity', 'DEXscore', 'DEX Score', 'Dex Score', 'DEX_Score'],
    con: ['CON', 'Con', 'Constitution', 'CONscore', 'CON Score', 'Con Score', 'CON_Score'],
    int: ['INT', 'Int', 'Intelligence', 'INTscore', 'INT Score', 'Int Score', 'INT_Score'],
    wis: ['WIS', 'Wis', 'Wisdom', 'WISscore', 'WIS Score', 'Wis Score', 'WIS_Score'],
    cha: ['CHA', 'Cha', 'Charisma', 'CHAscore', 'CHA Score', 'Cha Score', 'CHA_Score'],

    // Ability Score Modifiers (some sheets store these separately)
    strMod: ['STRmod', 'STR Mod', 'STRModifier', 'Str Modifier', 'STR_Mod'],
    dexMod: ['DEXmod', 'DEX Mod', 'DEXModifier', 'Dex Modifier', 'DEX_Mod'],
    conMod: ['CONmod', 'CON Mod', 'CONModifier', 'Con Modifier', 'CON_Mod'],
    intMod: ['INTmod', 'INT Mod', 'INTModifier', 'Int Modifier', 'INT_Mod'],
    wisMod: ['WISmod', 'WIS Mod', 'WISModifier', 'Wis Modifier', 'WIS_Mod'],
    chaMod: ['CHAmod', 'CHA Mod', 'CHAModifier', 'Cha Modifier', 'CHA_Mod'],

    // Combat Stats
    ac: ['AC', 'Armor Class', 'ArmorClass', 'AC_field', 'AC '],
    maxHp: ['HPMax', 'MaxHP', 'HP Max', 'HP Maximum', 'Max HP', 'HPMaximum', 'Max_HP'],
    currentHp: ['HPCurrent', 'CurrentHP', 'HP Current', 'Current HP', 'HP'],
    tempHp: ['HPTemp', 'TempHP', 'Temporary HP', 'Temp HP', 'HPTemporary'],
    speed: ['Speed', 'SPEED', 'Speed '],
    hitDice: ['Total', 'HDTotal', 'Hit Dice', 'HD Total', 'HitDice', 'Hit_Dice_Total'],
    initiative: ['Init', 'Initiative', 'INITIATIVE', 'Initiative '],
    profBonus: ['ProfBonus', 'Proficiency Bonus', 'Prof Bonus', 'Proficiency', 'Prof_Bonus'],

    // Experience
    experience: ['EXPERIENCE POINTS', 'Exp', 'Experience', 'XP', 'Experience Points'],

    // Saving Throw Proficiencies
    strSaveProf: ['StrProf', 'ST Strength', 'Check Box 11', 'ST_Str'],
    dexSaveProf: ['DexProf', 'ST Dexterity', 'Check Box 18', 'ST_Dex'],
    conSaveProf: ['ConProf', 'ST Constitution', 'Check Box 19', 'ST_Con'],
    intSaveProf: ['IntProf', 'ST Intelligence', 'Check Box 20', 'ST_Int'],
    wisSaveProf: ['WisProf', 'ST Wisdom', 'Check Box 21', 'ST_Wis'],
    chaSaveProf: ['ChaProf', 'ST Charisma', 'Check Box 22', 'ST_Cha'],

    // Passives
    passivePerception: ['Passive1', 'Passive Perception', 'PassivePerception', 'Passive_Perception', 'Passive Wisdom (Perception)'],
    passiveInvestigation: ['Passive2', 'Passive Investigation', 'PassiveInvestigation', 'Passive_Investigation'],
    passiveInsight: ['Passive3', 'Passive Insight', 'PassiveInsight', 'Passive_Insight'],
    senses: ['AdditionalSenses', 'Senses', 'Senses '],

    // Spellcasting
    spellAbility: ['spellCastingAbility0', 'SpellcastingAbility', 'Spellcasting Ability', 'Spell Ability', 'SpellAbility'],
    spellDC: ['spellSaveDC0', 'SpellSaveDC', 'Spell Save DC', 'SpellDC'],
    spellAtkMod: ['spellSaveHit0', 'SpellAttackMod', 'Spell Attack Mod', 'SpellAtkMod', 'Spell Attack'],

    // Flavor
    personality: ['PersonalityTraits ', 'PersonalityTraits', 'Personality Traits', 'Personality'],
    ideals: ['Ideals', 'Ideals '],
    bonds: ['Bonds', 'Bonds '],
    flaws: ['Flaws', 'Flaws '],
    backstory: ['Backstory', 'Character Backstory', 'Backstory '],

    // Proficiencies & Languages
    profsLangs: ['ProficienciesLang', 'Proficiencies and Languages', 'Proficiencies & Languages', 'OtherProficiencies'],
    additionalNotes1: ['AdditionalNotes1', 'Additional Notes 1'],
    additionalNotes2: ['AdditionalNotes2', 'Additional Notes 2'],
    alliesOrganizations: ['AlliesOrganizations', 'Allies & Organizations', 'Allies'],

    // Features & Traits (these are the big text blocks we'll smart-parse)
    featuresTraits1: ['FeaturesTraits1', 'Features and Traits', 'Features & Traits', 'Features_and_Traits'],
    featuresTraits2: ['FeaturesTraits2', 'Features and Traits 2'],
    featuresTraits3: ['FeaturesTraits3', 'Features and Traits 3'],

    // Currencies
    cp: ['CP', 'Copper', 'CP '],
    sp: ['SP', 'Silver', 'SP '],
    ep: ['EP', 'Electrum', 'EP '],
    gp: ['GP', 'Gold', 'GP '],
    pp: ['PP', 'Platinum', 'PP '],
};

// ─────────────────────────────────────────────────────────
// SKILL MAP (key = PDF field prefix, label = display name)
// ─────────────────────────────────────────────────────────
const SKILL_MAP: Array<{ keys: string[], label: string, stat: keyof Character['abilityScores'] }> = [
    { keys: ['Acrobatics', 'AcrobaticsProf'], label: 'Acrobatics', stat: 'dex' },
    { keys: ['Animal', 'AnimalProf', 'Animal Handling'], label: 'Animal Handling', stat: 'wis' },
    { keys: ['Arcana', 'ArcanaProf'], label: 'Arcana', stat: 'int' },
    { keys: ['Athletics', 'AthleticsProf'], label: 'Athletics', stat: 'str' },
    { keys: ['Deception', 'DeceptionProf'], label: 'Deception', stat: 'cha' },
    { keys: ['History', 'HistoryProf'], label: 'History', stat: 'int' },
    { keys: ['Insight', 'InsightProf'], label: 'Insight', stat: 'wis' },
    { keys: ['Intimidation', 'IntimidationProf'], label: 'Intimidation', stat: 'cha' },
    { keys: ['Investigation', 'InvestigationProf'], label: 'Investigation', stat: 'int' },
    { keys: ['Medicine', 'MedicineProf'], label: 'Medicine', stat: 'wis' },
    { keys: ['Nature', 'NatureProf'], label: 'Nature', stat: 'int' },
    { keys: ['Perception', 'PerceptionProf'], label: 'Perception', stat: 'wis' },
    { keys: ['Performance', 'PerformanceProf'], label: 'Performance', stat: 'cha' },
    { keys: ['Persuasion', 'PersuasionProf'], label: 'Persuasion', stat: 'cha' },
    { keys: ['Religion', 'ReligionProf'], label: 'Religion', stat: 'int' },
    { keys: ['SleightofHand', 'SleightofHandProf', 'Sleight of Hand'], label: 'Sleight of Hand', stat: 'dex' },
    { keys: ['Stealth ', 'StealthProf', 'Stealth'], label: 'Stealth', stat: 'dex' },
    { keys: ['Survival', 'SurvivalProf'], label: 'Survival', stat: 'wis' },
];

// ─────────────────────────────────────────────────────────
// WELL-KNOWN FEAT NAMES (for fuzzy matching during smart text splitting)
// ─────────────────────────────────────────────────────────
const WELL_KNOWN_FEATS = new Set([
    'alert', 'athlete', 'actor', 'charger', 'crossbow expert', 'defensive duelist',
    'dual wielder', 'dungeon delver', 'durable', 'elemental adept', 'grappler',
    'great weapon master', 'healer', 'heavily armored', 'heavy armor master',
    'inspiring leader', 'keen mind', 'lightly armored', 'linguist', 'lucky',
    'mage slayer', 'magic initiate', 'martial adept', 'medium armor master',
    'mobile', 'moderately armored', 'mounted combatant', 'observant', 'polearm master',
    'resilient', 'ritual caster', 'savage attacker', 'sentinel', 'sharpshooter',
    'shield master', 'skilled', 'skulker', 'spell sniper', 'tavern brawler',
    'tough', 'war caster', 'weapon master', 'fey touched', 'shadow touched',
    'telekinetic', 'telepathic', 'fighting initiate', 'artificer initiate',
    'chef', 'crusher', 'eldritch adept', 'fey touched', 'gift of the chromatic dragon',
    'gift of the gem dragon', 'gift of the metallic dragon', 'gunner',
    'metamagic adept', 'piercer', 'poisoner', 'shadow touched', 'skill expert',
    'slasher', 'strixhaven initiate', 'war caster', 'aberrant dragonmark',
]);

// ─────────────────────────────────────────────────────────
// WELL-KNOWN RACIAL TRAIT NAMES
// ─────────────────────────────────────────────────────────
const WELL_KNOWN_RACIAL_TRAITS = new Set([
    // Elf
    'darkvision', 'keen senses', 'fey ancestry', 'trance', 'elf weapon training',
    'cantrip', 'extra language', 'mask of the wild', 'superior darkvision',
    'sunlight sensitivity', 'drow magic', 'drow weapon training', 'fleet of foot',
    // Dwarf
    'dwarven resilience', 'dwarven combat training', 'stonecunning', 'tool proficiency',
    'dwarven toughness', 'dwarven armor training',
    // Halfling
    'lucky', 'brave', 'halfling nimbleness', 'naturally stealthy', 'stout resilience',
    // Human
    'extra language',
    // Half-Elf
    'skill versatility',
    // Half-Orc
    'menacing', 'relentless endurance', 'savage attacks',
    // Gnome
    'gnome cunning', 'artificer\'s lore', 'tinker', 'natural illusionist',
    'speak with small beasts',
    // Dragonborn
    'breath weapon', 'damage resistance', 'draconic ancestry',
    // Tiefling
    'hellish resistance', 'infernal legacy',
    // Aasimar
    'celestial resistance', 'healing hands', 'light bearer',
    'radiant soul', 'radiant consumption', 'necrotic shroud',
    // Goliath
    'stone\'s endurance', 'powerful build', 'mountain born',
    // Firbolg
    'firbolg magic', 'hidden step', 'speech of beast and leaf',
    // Kenku
    'expert forgery', 'kenku training', 'mimicry',
    // Lizardfolk
    'bite', 'cunning artisan', 'hold breath', 'hunter\'s lore', 'natural armor',
    'hungry jaws',
    // Tabaxi
    'feline agility', 'cat\'s claws', 'cat\'s talent',
    // Triton
    'amphibious', 'control air and water', 'emissary of the sea', 'guardians of the depths',
    // Bugbear
    'long-limbed', 'surprise attack', 'sneaky',
    // Goblin
    'fury of the small', 'nimble escape',
    // Hobgoblin
    'martial training', 'saving face',
    // Kobold
    'grovel, cower, and beg', 'pack tactics',
    // Orc
    'aggressive',
    // Yuan-Ti
    'innate spellcasting', 'magic resistance', 'poison immunity',
    // Genasi
    'unending breath', 'mingle with the wind', 'earth walk', 'merge with stone',
    'reach to the blaze', 'fire resistance', 'call to the wave', 'acid resistance',
    // Changeling
    'shapechanger', 'changeling instincts',
    // Shifter
    'shifting', 'bestial instincts',
    // Warforged
    'constructed resilience', 'sentry\'s rest', 'integrated protection', 'specialized design',
    // Kalashtar
    'dual mind', 'mental discipline', 'mind link', 'severed from dreams',
]);

export async function extractCharacterFromPdf(file: File, onProgress?: (msg: string) => void): Promise<Partial<Character>> {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
    });
    const pdfDocument = await loadingTask.promise;

    const extractedFields: Record<string, string> = {};

    // Standard D&D 5e PDFs usually have important fields on the first 1-3 pages
    const numPages = pdfDocument.numPages;
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const annotations = await page.getAnnotations();

        for (const annotation of annotations) {
            if (annotation.subtype === 'Widget' && annotation.fieldName) {
                const value = annotation.fieldValue ?? annotation.buttonValue ?? '';
                extractedFields[annotation.fieldName] = typeof value === 'string' ? value : String(value);
            }
        }
    }

    if (onProgress) onProgress('Mapping PDF fields to character...');
    return await mapPdfFieldsToCharacterRecord(
        extractedFields,
        { sourceFileName: file.name, applyCompendiumAutomation: true, enrichExternalData: true },
        onProgress
    );
}

// ─────────────────────────────────────────────────────────
// MAIN MAPPING FUNCTION
// ─────────────────────────────────────────────────────────
export async function mapPdfFieldsToCharacter(fields: Record<string, string>, onProgress?: (msg: string) => void): Promise<Partial<Character>> {
    const character: Partial<Character> = {};

    const parseNum = (val: string | undefined, fallback: number = 0): number => {
        if (!val) return fallback;
        const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? fallback : parsed;
    };

    // Resolve a field using the expanded alias dictionary
    const getField = (aliasKey: string): string | undefined => {
        const aliases = FIELD_ALIASES[aliasKey];
        if (!aliases) return undefined;
        for (const key of aliases) {
            if (fields[key] !== undefined && fields[key].trim() !== '') return fields[key];
            if (fields[key + ' '] !== undefined && fields[key + ' '].trim() !== '') return fields[key + ' '];
        }
        return undefined;
    };

    // Also allow direct field lookup for dynamic keys (weapons, equipment, spells)
    const getFieldDirect = (keys: string[]): string | undefined => {
        for (const key of keys) {
            if (fields[key] !== undefined && fields[key].trim() !== '') return fields[key];
            if (fields[key + ' '] !== undefined && fields[key + ' '].trim() !== '') return fields[key + ' '];
        }
        return undefined;
    };

    // Helper: parse "Fighter 1" or "Paladin 3 / Warlock 2"
    const parseClassAndLevel = (classLevelString: string | undefined): { className: string, level: number } | null => {
        if (!classLevelString) return null;
        // Handle multiclass strings like "Paladin 3 / Warlock 2" — take first class, sum levels
        const parts = classLevelString.split(/[/,]/).map(p => p.trim()).filter(Boolean);
        let totalLevel = 0;
        let primaryClass = '';
        for (const part of parts) {
            const match = part.match(/([a-zA-Z\s]+)\s+(\d+)/);
            if (match) {
                if (!primaryClass) primaryClass = match[1].trim();
                totalLevel += parseInt(match[2]);
            } else if (!primaryClass) {
                primaryClass = part.trim();
            }
        }
        return { className: primaryClass || classLevelString.trim(), level: totalLevel || 1 };
    };

    // ── Core Identity ──
    const charName = getField('name');
    if (charName) character.name = charName;
    const playerName = getField('playerName');
    if (playerName) character.playerName = playerName;

    const classLevelValue = getField('classLevel');
    if (classLevelValue) {
        const parsed = parseClassAndLevel(classLevelValue);
        if (parsed) {
            character.className = parsed.className;
            character.level = parsed.level;
        }
    }

    const raceVal = getField('race');
    if (raceVal) character.race = raceVal;
    const bgVal = getField('background');
    if (bgVal) character.background = bgVal;
    const alignVal = getField('alignment');
    if (alignVal) character.alignment = alignVal;

    // ── Ability Scores ──
    const abilityScores: Partial<Character['abilityScores']> = {};
    for (const stat of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
        const val = getField(stat);
        if (val) abilityScores[stat] = parseNum(val, 10);
    }
    if (Object.keys(abilityScores).length > 0) {
        character.abilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...abilityScores };
    }

    // ── Combat Stats ──
    const hpMaxVal = getField('maxHp');
    if (hpMaxVal) {
        character.maxHp = parseNum(hpMaxVal);
        character.currentHp = character.maxHp;
    }

    const speedVal = getField('speed');
    if (speedVal) {
        let normalized = speedVal.replace(/\s*(ft\.?\s*)+/gi, ' ft').trim();
        const speedNum = parseInt(normalized.replace(/[^0-9]/g, ''));
        if (speedNum > 120) normalized = '30 ft';
        character.speed = normalized;
    }

    const hitDiceVal = getField('hitDice');
    if (hitDiceVal) character.hitDice = hitDiceVal;
    const expVal = getField('experience');
    if (expVal) character.experience = parseNum(expVal, 0) || 0;
    const acVal = getField('ac');
    if (acVal) character.ac = parseNum(acVal, 10);
    const profVal = getField('profBonus');
    if (profVal) character.proficiencyBonus = parseNum(profVal, 2);
    const initVal = getField('initiative');
    if (initVal) character.initiativeMod = parseNum(initVal, 0);

    // ── Saving Throws ──
    const saves: Array<keyof Character['abilityScores']> = [];
    const saveMap: Record<string, keyof Character['abilityScores']> = {
        strSaveProf: 'str', dexSaveProf: 'dex', conSaveProf: 'con',
        intSaveProf: 'int', wisSaveProf: 'wis', chaSaveProf: 'cha',
    };
    for (const [aliasKey, stat] of Object.entries(saveMap)) {
        const val = getField(aliasKey);
        if (val && val.trim() !== '') saves.push(stat);
    }
    if (saves.length > 0) character.savingThrows = saves;

    // ── Passives ──
    const pPerc = getField('passivePerception');
    if (pPerc) character.passivePerception = parseNum(pPerc, 10);
    const pInv = getField('passiveInvestigation');
    if (pInv) character.passiveInvestigation = parseNum(pInv, 10);
    const pIns = getField('passiveInsight');
    if (pIns) character.passiveInsight = parseNum(pIns, 10);
    const sensesVal = getField('senses');
    if (sensesVal) character.senses = sensesVal;

    // ── Flavor ──
    const personality = getField('personality');
    if (personality) character.personalityTraits = personality;
    const ideals = getField('ideals');
    if (ideals) character.ideals = ideals;
    const bonds = getField('bonds');
    if (bonds) character.bonds = bonds;
    const flaws = getField('flaws');
    if (flaws) character.flaws = flaws;
    const backstory = getField('backstory');
    if (backstory) character.backstory = backstory;

    // ── Proficiencies & Languages ──
    const profsLangs = getField('profsLangs');
    if (profsLangs) {
        character.proficiencies = profsLangs;
        const langMatch = profsLangs.split(/===\s*LANGUAGES\s*===/i);
        if (langMatch.length > 1) {
            character.languages = langMatch[1].trim();
        } else {
            const langFallback = profsLangs.split(/languages?\s*:/i);
            if (langFallback.length > 1) {
                character.languages = langFallback[1].trim();
            }
        }
    }

    const alliesOrgs = getField('alliesOrganizations');
    if (alliesOrgs) character.backstory = (character.backstory ? character.backstory + '\n\n' : '') + alliesOrgs;

    const addNotes1 = getField('additionalNotes1');
    const addNotes2 = getField('additionalNotes2');
    if (addNotes1 || addNotes2) {
        character.notes = [addNotes1, addNotes2].filter(Boolean).join('\n\n');
    }

    // ── Currencies ──
    const cp = getField('cp'), sp = getField('sp'), ep = getField('ep'), gp = getField('gp'), pp = getField('pp');
    if (cp || sp || ep || gp || pp) {
        character.currencies = {
            cp: parseNum(cp || '0'), sp: parseNum(sp || '0'), ep: parseNum(ep || '0'),
            gp: parseNum(gp || '0'), pp: parseNum(pp || '0'),
        };
    }

    // ── Inventory & Equipment ──
    if (onProgress) onProgress('Extracting inventory...');
    const inventory: Character['inventory'] = [];

    for (let i = 0; i <= 30; i++) {
        const eqName = getFieldDirect([`Eq Name${i}`, `EquipmentName${i}`, `Equipment Name ${i}`]);
        const eqQty = getFieldDirect([`Eq Qty${i}`, `EquipmentQty${i}`, `Equipment Quantity ${i}`]);
        const eqWeight = getFieldDirect([`Eq Weight${i}`, `EquipmentWeight${i}`]);
        if (eqName && eqName.trim() !== '') {
            inventory.push({
                id: crypto.randomUUID(),
                name: eqName,
                quantity: parseNum(eqQty || '1', 1),
                weight: parseNum((eqWeight || '0').replace('lb.', '').replace('lb', '').trim(), 0),
                isEquipped: false, isAttuned: false, description: '', type: 'gear',
            });
        }
    }

    // Weapons
    for (let i = 1; i <= 6; i++) {
        const nameSuffix = i === 1 ? ['', ' 1'] : [` ${i}`];
        let wpnName;
        for (const suffix of nameSuffix) { wpnName = wpnName || getFieldDirect([`Wpn Name${suffix}`]); }
        const wpnAtk = getFieldDirect([`Wpn${i} AtkBonus`, `Wpn${i} AtkBonus `]);
        const wpnDmg = getFieldDirect([`Wpn${i} Damage`, `Wpn${i} Damage `]);
        const wpnNotes = getFieldDirect([`Wpn Notes ${i}`]);
        if (wpnName && wpnName.trim() !== '') {
            if (wpnName.toLowerCase().includes('unarmed strike')) continue;
            let dmgStr = wpnDmg ? wpnDmg.trim() : '';
            if (wpnAtk && wpnAtk.trim() !== '') dmgStr += ` (Atk: ${wpnAtk})`;
            const cleanWpnName = wpnName.trim();
            const existingItem = inventory.find(i => i.name.toLowerCase() === cleanWpnName.toLowerCase() || i.name.toLowerCase() === cleanWpnName.toLowerCase() + 's');
            if (existingItem) {
                existingItem.type = 'weapon';
                existingItem.isEquipped = true;
                existingItem.damage = dmgStr;
                if (existingItem.description && wpnNotes) existingItem.description += `\n${wpnNotes}`;
                else if (wpnNotes) existingItem.description = wpnNotes;
            } else {
                inventory.push({
                    id: crypto.randomUUID(), name: cleanWpnName, quantity: 1, weight: 0,
                    isEquipped: true, isAttuned: false, description: wpnNotes || '',
                    type: 'weapon', damage: dmgStr,
                });
            }
        }
    }

    // Enrich items from 5e.tools
    if (inventory.length > 0) {
        let itemsEnriched = 0;
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i];
            const cleanName = item.name.replace(/\s*\(.*\)/, '').replace(/^\d+x?\s+/, '').replace(/,\s*\d+$/, '').trim();
            if (cleanName) {
                itemsEnriched++;
                if (onProgress) onProgress(`Enriching item: ${cleanName} (${itemsEnriched}/${inventory.length})...`);
                try {
                    const searchResults = await searchItems(cleanName);
                    if (searchResults && searchResults.length > 0) {
                        const match = searchResults.find(r => r.name.toLowerCase() === cleanName.toLowerCase()) || searchResults[0];
                        if (match) {
                            item.type = match.type;
                            if (!item.description && match.description) item.description = match.description;
                            if (match.weight > 0) item.weight = match.weight;
                            if (item.quantity > 1 && (item.name.includes(item.quantity.toString()) || item.name.includes(item.quantity.toLocaleString()))) {
                                item.quantity = 1;
                            }
                            if (match.damage && !item.damage) item.damage = match.damage;
                            if (match.acBonus && !item.acBonus) item.acBonus = match.acBonus;
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to enrich equipment: ${cleanName}`, e);
                }
            }
        }
        character.inventory = inventory;

        // Smart AC Deduction (auto-equip armor/shield)
        if (character.ac) {
            const dexMod = Math.floor(((character.abilityScores?.dex || 10) - 10) / 2);
            const unarmoredAC = 10 + dexMod;
            if (character.ac > unarmoredAC) {
                let shieldEquipped = false;
                for (const item of character.inventory) {
                    if (item.name.toLowerCase().includes('shield')) {
                        item.isEquipped = true;
                        shieldEquipped = true;
                    }
                }
                const targetAC = character.ac - (shieldEquipped ? 2 : 0);
                if (targetAC > unarmoredAC) {
                    for (const item of character.inventory) {
                        if (item.type === 'armor' && !item.name.toLowerCase().includes('shield')) {
                            const acBase = item.acBonus || 11;
                            if (acBase === targetAC || (acBase + dexMod) === targetAC ||
                                (acBase + Math.min(dexMod, 2)) === targetAC || (acBase + Math.min(dexMod, 2)) <= targetAC) {
                                item.isEquipped = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Spellcasting ──
    if (onProgress) onProgress('Extracting spells...');
    const spellAbility = getField('spellAbility');
    if (spellAbility) {
        const abilityMap: Record<string, keyof Character['abilityScores']> = {
            'STR': 'str', 'DEX': 'dex', 'CON': 'con', 'INT': 'int', 'WIS': 'wis', 'CHA': 'cha',
        };
        const mapped = abilityMap[spellAbility.trim().toUpperCase()];
        if (mapped) character.spellcastingAbility = mapped;
    }

    const spellDC = getField('spellDC');
    if (spellDC) character.spellSaveDc = parseNum(spellDC.replace(/[^\d]/g, ''), 0);
    const spellAtkMod = getField('spellAtkMod');
    if (spellAtkMod) {
        const cleaned = spellAtkMod.replace(/[^\d+-]/g, '');
        if (cleaned) character.spellAttackMod = parseNum(cleaned, 0);
    }

    // Parse spell slots
    const spellSlots: { current: number; max: number }[] = Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));
    let hasAnySlots = false;
    for (let lvl = 0; lvl <= 9; lvl++) {
        const header = getFieldDirect([`spellSlotHeader${lvl}`]);
        if (!header) continue;
        if (header.toLowerCase().includes('at will') || header.toLowerCase().includes('cantrip')) continue;
        const slotMatch = header.match(/(\d+)\s*Slot/i);
        if (slotMatch) {
            const maxSlots = parseInt(slotMatch[1]);
            if (maxSlots > 0 && lvl < 10) {
                spellSlots[lvl] = { current: maxSlots, max: maxSlots };
                hasAnySlots = true;
            }
        }
    }
    if (hasAnySlots) character.spellSlots = spellSlots;

    // Extract spell names and enrich from 5e.tools
    const extractedSpellNames: { name: string; source: string; level: number }[] = [];
    const levelBoundaries: { level: number; startIdx: number }[] = [];
    let spellIdx = 0;
    for (let headerIdx = 0; headerIdx <= 9; headerIdx++) {
        const header = getFieldDirect([`spellSlotHeader${headerIdx}`]);
        if (!header) continue;
        const level = header.toLowerCase().includes('at will') || header.toLowerCase().includes('cantrip') ? 0 : headerIdx;
        levelBoundaries.push({ level, startIdx: spellIdx });
        for (let i = spellIdx; i < 50; i++) {
            const name = getFieldDirect([`spellName${i}`]);
            if (!name || !name.trim()) break;
            spellIdx = i + 1;
        }
    }
    for (let i = 0; i < 50; i++) {
        const name = getFieldDirect([`spellName${i}`, `SpellName${i}`]);
        if (!name || !name.trim()) continue;
        let spellLevel = 0;
        for (const boundary of levelBoundaries) {
            if (i >= boundary.startIdx) spellLevel = boundary.level;
        }
        const source = getFieldDirect([`spellSource${i}`, `SpellSource${i}`]) || '';
        extractedSpellNames.push({ name: name.trim(), source: source.trim(), level: spellLevel });
    }

    if (extractedSpellNames.length > 0) {
        const spells: Spell[] = [];
        const knownSpellNames = new Set<string>();
        for (const spellInfo of extractedSpellNames) {
            if (knownSpellNames.has(spellInfo.name.toLowerCase())) continue;
            knownSpellNames.add(spellInfo.name.toLowerCase());
            if (onProgress) onProgress(`Enriching spell: ${spellInfo.name}...`);
            let spell: Spell = {
                id: crypto.randomUUID(), name: spellInfo.name, level: spellInfo.level,
                school: '', castingTime: '', range: '',
                components: { v: false, s: false, m: false },
                duration: '', concentration: false, ritual: false,
                description: '', prepared: true,
            };
            try {
                const results = await searchSpells(spellInfo.name);
                if (results.length > 0) {
                    const match = results.find(r => r.name.toLowerCase() === spellInfo.name.toLowerCase()) || results[0];
                    spell = { ...match, id: crypto.randomUUID(), prepared: true };
                }
            } catch (e) { console.warn(`Failed to enrich spell: ${spellInfo.name}`, e); }
            spells.push(spell);
        }
        character.spells = spells;
        // Remove cantrips from inventory if incorrectly added as weapons
        if (character.inventory) {
            character.inventory = character.inventory.filter(item =>
                !spells.some(s => s.level === 0 && s.name.toLowerCase() === item.name.toLowerCase())
            );
        }
    }

    // ── Skills ──
    if (onProgress) onProgress('Parsing skills...');
    const pdfSkills: Character['skills'] = [];
    for (const skillDf of SKILL_MAP) {
        const baseKey = skillDf.keys[0].trim();
        const profStr = getFieldDirect([`${baseKey}Prof`]);
        let isProf = false;
        let isExp = false;
        if (profStr) {
            const p = profStr.trim().toUpperCase();
            if (p === 'P' || p === '•' || p === 'X' || p === 'TRUE' || p === 'YES' || p === '1') isProf = true;
            if (p === 'E' || p === 'EXPERTISE') { isProf = true; isExp = true; }
        }
        pdfSkills.push({ name: skillDf.label, stat: skillDf.stat, proficient: isProf, expertise: isExp, bonus: 0 });
    }
    if (pdfSkills.length > 0) character.skills = pdfSkills;

    // ═══════════════════════════════════════════════════════
    // SMART FEATURES/TRAITS TEXT SPLITTER
    // Parses the Features & Traits text blocks and auto-categorizes
    // ═══════════════════════════════════════════════════════
    if (onProgress) onProgress('Smart-parsing Features & Traits...');
    const featuresText = [
        getField('featuresTraits1'),
        getField('featuresTraits2'),
        getField('featuresTraits3'),
    ].filter(Boolean).join('\n\n');

    const parsedTraits: Feature[] = [];
    const parsedFeats: Feature[] = [];
    const parsedRacialTraits: Feature[] = [];
    const unmatchedNotes = '';

    if (featuresText.trim()) {
        const entries = splitFeaturesText(featuresText);

        for (const entry of entries) {
            if (onProgress) onProgress(`Identifying: ${entry.title}...`);

            const titleLower = entry.title.toLowerCase().trim();

            // Check if it's a well-known racial trait
            if (WELL_KNOWN_RACIAL_TRAITS.has(titleLower)) {
                parsedRacialTraits.push({
                    id: crypto.randomUUID(),
                    name: entry.title,
                    source: `Race: ${character.race || 'Unknown'}`,
                    description: entry.body,
                    hasUses: false,
                });
                continue;
            }

            // Check if it's a well-known feat
            if (WELL_KNOWN_FEATS.has(titleLower)) {
                // Try to enrich from 5e.tools
                let enrichedFeat: Feature | null = null;
                try {
                    const results = await searchFeats(entry.title);
                    if (results.length > 0) {
                        const match = results.find(r => r.name.toLowerCase() === titleLower) || results[0];
                        enrichedFeat = { ...match, id: crypto.randomUUID() };
                    }
                } catch (e) { console.warn(`Failed to enrich feat: ${entry.title}`, e); }

                if (enrichedFeat) {
                    parsedFeats.push(enrichedFeat);
                } else {
                    parsedFeats.push({
                        id: crypto.randomUUID(),
                        name: entry.title,
                        source: 'Feat',
                        description: entry.body,
                        hasUses: false,
                        isFeat: true,
                    });
                }
                continue;
            }

            // Try 5e.tools feat lookup as a fallback for any unknown entry
            try {
                const featResults = await searchFeats(entry.title);
                if (featResults.length > 0 && featResults[0].name.toLowerCase() === titleLower) {
                    parsedFeats.push({ ...featResults[0], id: crypto.randomUUID() });
                    continue;
                }
            } catch { /* Silently continue */ }

            // If it doesn't match anything known, treat it as a class feature
            parsedTraits.push({
                id: crypto.randomUUID(),
                name: entry.title,
                source: `Class: ${character.className || 'Unknown'}`,
                description: entry.body,
                hasUses: false,
            });
        }
    }

    // Start building the final features arrays — will be enriched further below
    character.features = [...parsedTraits];
    character.feats = [...parsedFeats];
    character.racialTraits = [...parsedRacialTraits];

    if (unmatchedNotes) {
        character.notes = (character.notes ? character.notes + '\n\n' : '') + unmatchedNotes;
    }

    // ═══════════════════════════════════════════════════════
    // AUTOMATED RACIAL TRAIT INJECTION (from 5e.tools)
    // Only injects traits not already found by the smart splitter
    // ═══════════════════════════════════════════════════════
    if (character.race) {
        if (onProgress) onProgress(`Looking up ${character.race} racial traits...`);
        try {
            const racialData = await getRacialTraits(character.race);
            if (racialData.features.length > 0) {
                const existingNames = new Set([
                    ...(character.racialTraits || []).map(f => f.name.toLowerCase()),
                    ...(character.features || []).map(f => f.name.toLowerCase()),
                ]);
                const newTraits = racialData.features.filter(f => !existingNames.has(f.name.toLowerCase()));
                character.racialTraits = [...(character.racialTraits || []), ...newTraits];
            }
            if (racialData.speed && !character.speed) character.speed = racialData.speed;
            if (racialData.senses && !character.senses) character.senses = racialData.senses;
            if (racialData.languages && (!character.languages || character.languages === 'Common')) {
                character.languages = racialData.languages;
            }
            if (racialData.skillProficiencies && character.skills) {
                for (const skillName of racialData.skillProficiencies) {
                    const skill = character.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                    if (skill && !skill.proficient) skill.proficient = true;
                }
            }
        } catch (e) { console.warn('Failed to fetch racial traits:', e); }
    }

    // ═══════════════════════════════════════════════════════
    // AUTOMATED CLASS FEATURE INJECTION (from 5e.tools)
    // Fills in any class features not already parsed from the text
    // ═══════════════════════════════════════════════════════
    if (character.className && character.level) {
        if (onProgress) onProgress(`Looking up ${character.className} class features...`);
        try {
            const classData: any = await getClassFeatures(character.className, character.level);
            if (classData && classData.features && classData.features.length > 0) {
                const existingNames = new Set([
                    ...(character.features || []).map(f => f.name.toLowerCase()),
                    ...(character.racialTraits || []).map(f => f.name.toLowerCase()),
                    ...(character.feats || []).map(f => f.name.toLowerCase()),
                ]);
                const newFeatures = classData.features.filter((f: any) => f && f.name && !existingNames.has(f.name.toLowerCase()));
                character.features = [...(character.features || []), ...newFeatures];
            }
            if (classData && classData.savingThrows && classData.savingThrows.length > 0 && (!character.savingThrows || character.savingThrows.length === 0)) {
                character.savingThrows = classData.savingThrows as any;
            }
            if (classData.proficiencies && !character.proficiencies) {
                character.proficiencies = classData.proficiencies;
            }
        } catch (e) { console.warn('Failed to fetch class features:', e); }
    }

    if (onProgress) onProgress('Import complete!');
    return character;
}

// ─────────────────────────────────────────────────────────
// SMART TEXT SPLITTER
// Splits a Features & Traits text block into structured entries
// Detects patterns like: "Feature Name. Description text..."
// or "FEATURE NAME\nDescription text..."
// ─────────────────────────────────────────────────────────
function splitFeaturesText(text: string): Array<{ title: string; body: string }> {
    const entries: Array<{ title: string; body: string }> = [];
    if (!text || !text.trim()) return entries;

    // Normalize line endings
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Strategy 1: Split on "Title. Body" pattern (most common in 5e sheets)
    // Pattern: A line starting with a capitalized word/phrase followed by a period and space
    const titleDotPattern = /(?:^|\n)([A-Z][A-Za-z'\-\s,/]+)\.\s+/g;
    const matches: Array<{ title: string; start: number; end: number }> = [];
    let match;

    while ((match = titleDotPattern.exec(normalized)) !== null) {
        // Only if the title is reasonable length (1-60 chars)
        const title = match[1].trim();
        if (title.length >= 2 && title.length <= 60) {
            matches.push({
                title,
                start: match.index + match[0].length,
                end: 0, // Filled in next step
            });
        }
    }

    if (matches.length > 0) {
        // Fill in end positions
        for (let i = 0; i < matches.length; i++) {
            if (i + 1 < matches.length) {
                // End at the start of the next match's full match
                matches[i].end = normalized.indexOf(matches[i + 1].title, matches[i].start) - 2; // -2 for the \n before next title
            } else {
                matches[i].end = normalized.length;
            }
        }

        for (const m of matches) {
            const body = normalized.substring(m.start, Math.max(m.start, m.end)).trim();
            if (body.length > 0 || m.title.length > 2) {
                entries.push({ title: m.title, body });
            }
        }
    }

    // Strategy 2: If no "Title. Body" patterns found, try splitting on blank lines
    // and treating first line of each block as a title
    if (entries.length === 0) {
        const blocks = normalized.split(/\n\s*\n/).filter(b => b.trim().length > 0);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length >= 1) {
                const firstLine = lines[0].trim();
                // If the first line looks like a title (short, capitalized)
                if (firstLine.length <= 60 && firstLine.length >= 2 && /^[A-Z]/.test(firstLine)) {
                    entries.push({
                        title: firstLine.replace(/\.\s*$/, ''), // Strip trailing period
                        body: lines.slice(1).join('\n').trim(),
                    });
                }
            }
        }
    }

    // Strategy 3: If still nothing, try splitting on lines that are ALL CAPS
    if (entries.length === 0) {
        const lines = normalized.split('\n');
        let currentTitle = '';
        let currentBody: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length >= 2 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
                if (currentTitle) {
                    entries.push({ title: currentTitle, body: currentBody.join('\n').trim() });
                }
                // Convert from ALL CAPS to Title Case
                currentTitle = trimmed.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
                currentBody = [];
            } else if (trimmed) {
                currentBody.push(trimmed);
            }
        }
        if (currentTitle) {
            entries.push({ title: currentTitle, body: currentBody.join('\n').trim() });
        }
    }

    return entries;
}
