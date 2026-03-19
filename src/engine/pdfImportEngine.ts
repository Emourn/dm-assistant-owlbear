import type { Character, Feature, Item, Spell } from '../types/character';
import type { ImportProvenance } from '../types/source';
import { searchFeats, searchItems, searchSpells } from './fiveEToolsParser';
import { automateCharacter, CharacterAutomationOptions } from './characterAutomation';

export interface PdfImportOptions extends CharacterAutomationOptions {
    enrichExternalData?: boolean;
}

const FIELD_ALIASES: Record<string, string[]> = {
    name: ['CharacterName', 'Character Name', 'Name'],
    playerName: ['PLAYER NAME', 'Player Name', 'PlayerName'],
    classLevel: ['CLASS  LEVEL', 'Class and Level', 'ClassLevel'],
    race: ['RACE', 'Race', 'Species'],
    background: ['BACKGROUND', 'Background'],
    alignment: ['ALIGNMENT', 'Alignment'],
    ac: ['AC', 'Armor Class'],
    maxHp: ['MaxHP', 'HPMax', 'Max HP'],
    currentHp: ['CurrentHP', 'HPCurrent', 'Current HP'],
    tempHp: ['TempHP', 'HPTemp', 'Temp HP'],
    speed: ['Speed', 'SPEED'],
    hitDice: ['Total', 'Hit Dice', 'HDTotal'],
    initiative: ['Init', 'Initiative'],
    profBonus: ['ProfBonus', 'Proficiency Bonus'],
    experience: ['EXPERIENCE POINTS', 'Experience Points', 'XP'],
    passivePerception: ['Passive1', 'Passive Perception'],
    passiveInvestigation: ['Passive2', 'Passive Investigation'],
    passiveInsight: ['Passive3', 'Passive Insight'],
    senses: ['AdditionalSenses', 'Senses'],
    spellAbility: ['spellCastingAbility0', 'SpellcastingAbility', 'Spellcasting Ability'],
    spellDc: ['spellSaveDC0', 'Spell Save DC', 'SpellSaveDC'],
    spellAtkMod: ['spellAtkBonus0', 'spellSaveHit0', 'Spell Attack Mod', 'SpellAtkMod'],
    profsLangs: ['ProficienciesLang', 'Proficiencies and Languages'],
    defenses: ['Defenses'],
    personality: ['PersonalityTraits', 'Personality Traits'],
    ideals: ['Ideals'],
    bonds: ['Bonds'],
    flaws: ['Flaws'],
    backstory: ['Backstory'],
    additionalNotes1: ['AdditionalNotes1'],
    additionalNotes2: ['AdditionalNotes2'],
    alliesOrganizations: ['AlliesOrganizations'],
    cp: ['CP'],
    sp: ['SP'],
    ep: ['EP'],
    gp: ['GP'],
    pp: ['PP'],
    str: ['STR'],
    dex: ['DEX'],
    con: ['CON'],
    int: ['INT'],
    wis: ['WIS'],
    cha: ['CHA'],
    strSaveProf: ['StrProf'],
    dexSaveProf: ['DexProf'],
    conSaveProf: ['ConProf'],
    intSaveProf: ['IntProf'],
    wisSaveProf: ['WisProf'],
    chaSaveProf: ['ChaProf']
};

const SKILL_FIELDS: Array<{
    name: string;
    stat: keyof Character['abilityScores'];
    profFields: string[];
}> = [
    { name: 'Acrobatics', stat: 'dex', profFields: ['AcrobaticsProf'] },
    { name: 'Animal Handling', stat: 'wis', profFields: ['AnimalHandlingProf', 'AnimalProf'] },
    { name: 'Arcana', stat: 'int', profFields: ['ArcanaProf'] },
    { name: 'Athletics', stat: 'str', profFields: ['AthleticsProf'] },
    { name: 'Deception', stat: 'cha', profFields: ['DeceptionProf'] },
    { name: 'History', stat: 'int', profFields: ['HistoryProf'] },
    { name: 'Insight', stat: 'wis', profFields: ['InsightProf'] },
    { name: 'Intimidation', stat: 'cha', profFields: ['IntimidationProf'] },
    { name: 'Investigation', stat: 'int', profFields: ['InvestigationProf'] },
    { name: 'Medicine', stat: 'wis', profFields: ['MedicineProf'] },
    { name: 'Nature', stat: 'int', profFields: ['NatureProf'] },
    { name: 'Perception', stat: 'wis', profFields: ['PerceptionProf'] },
    { name: 'Performance', stat: 'cha', profFields: ['PerformanceProf'] },
    { name: 'Persuasion', stat: 'cha', profFields: ['PersuasionProf'] },
    { name: 'Religion', stat: 'int', profFields: ['ReligionProf'] },
    { name: 'Sleight of Hand', stat: 'dex', profFields: ['SleightOfHandProf', 'SleightofHandProf'] },
    { name: 'Stealth', stat: 'dex', profFields: ['StealthProf'] },
    { name: 'Survival', stat: 'wis', profFields: ['SurvivalProf'] }
];

function parseNum(value: string | undefined, fallback = 0): number {
    if (!value) return fallback;
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getField(fields: Record<string, string>, alias: keyof typeof FIELD_ALIASES): string | undefined {
    for (const key of FIELD_ALIASES[alias]) {
        const value = fields[key];
        if (value !== undefined && value.trim() !== '') return value;
    }
    return undefined;
}

function getFieldDirect(fields: Record<string, string>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = fields[key];
        if (value !== undefined && value.trim() !== '') return value;
    }
    return undefined;
}

function isTruthyPdfMarker(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toUpperCase();
    return normalized === 'P' || normalized === 'E' || normalized === '•' || normalized === 'X' || normalized === 'TRUE' || normalized === 'YES' || normalized === '1';
}

function isExpertisePdfMarker(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toUpperCase();
    return normalized === 'E' || normalized === 'EXPERTISE';
}

function parseClassAndLevel(classLevel: string | undefined): { className: string; level: number } | null {
    if (!classLevel) return null;
    const parts = classLevel.split(/[/,]/).map((part) => part.trim()).filter(Boolean);
    let className = '';
    let totalLevel = 0;

    for (const part of parts) {
        const match = part.match(/([a-zA-Z' -]+)\s+(\d+)/);
        if (match) {
            if (!className) className = match[1].trim();
            totalLevel += parseInt(match[2], 10);
        } else if (!className) {
            className = part;
        }
    }

    return className ? { className, level: totalLevel || 1 } : null;
}

function parseLanguages(value: string | undefined): string {
    if (!value) return 'Common';
    const match = value.split(/===\s*LANGUAGES\s*===/i);
    if (match.length > 1) {
        return match[1]
            .split(/===/)[0]
            .replace(/\s+/g, ' ')
            .trim();
    }

    const fallback = value.split(/languages?\s*:/i);
    if (fallback.length > 1) {
        return fallback[1].split(/===/)[0].replace(/\s+/g, ' ').trim();
    }

    return 'Common';
}

function parseDefenses(value: string | undefined): Pick<Character, 'resistances' | 'immunities' | 'vulnerabilities' | 'damageNotes'> {
    if (!value) {
        return { resistances: [], immunities: [], vulnerabilities: [], damageNotes: '' };
    }

    const extract = (label: string) =>
        Array.from(value.matchAll(new RegExp(`${label}\\s*-\\s*([A-Za-z ,/]+)`, 'gi')))
            .flatMap((match) => match[1].split(/[,/]/))
            .map((entry) => entry.trim().toLowerCase())
            .filter(Boolean);

    return {
        resistances: extract('Resistances?'),
        immunities: extract('Immunities?'),
        vulnerabilities: extract('Vulnerabilities?'),
        damageNotes: value
    };
}

function parseFeatureText(value: string): Array<{ title: string; body: string }> {
    const cleaned = value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/^\s*=+\s*.*?=+\s*$/gm, '')
        .replace(/^[|*•]+\s*/gm, '')
        .trim();

    if (!cleaned) return [];

    const blocks = cleaned.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    return blocks.map((block) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const firstLine = lines[0] || 'Feature';
        const [title, ...rest] = firstLine.split(/\s*[.•-]\s+/);
        return {
            title: title.trim(),
            body: [...rest, ...lines.slice(1)].join('\n').trim()
        };
    }).filter((entry) => entry.title);
}

async function enrichInventory(inventory: Item[], onProgress?: (msg: string) => void) {
    for (let index = 0; index < inventory.length; index++) {
        const item = inventory[index];
        const cleanName = item.name.replace(/^\(EX\)/i, '').trim();
        if (!cleanName) continue;

        onProgress?.(`Enriching item: ${cleanName} (${index + 1}/${inventory.length})...`);
        try {
            const results = await searchItems(cleanName);
            const match = results.find((candidate) => candidate.name.toLowerCase() === cleanName.toLowerCase()) || results[0];
            if (!match) continue;

            inventory[index] = {
                ...item,
                type: match.type || item.type,
                weight: match.weight || item.weight,
                description: match.description || item.description,
                damage: match.damage || item.damage,
                acBonus: match.acBonus || item.acBonus,
                effects: match.effects || item.effects
            };
        } catch (error) {
            console.warn(`Failed to enrich item ${cleanName}`, error);
        }
    }
}

async function enrichSpells(spells: Spell[], onProgress?: (msg: string) => void) {
    for (let index = 0; index < spells.length; index++) {
        const spell = spells[index];
        onProgress?.(`Enriching spell: ${spell.name} (${index + 1}/${spells.length})...`);
        try {
            const results = await searchSpells(spell.name);
            const match = results.find((candidate) => candidate.name.toLowerCase() === spell.name.toLowerCase()) || results[0];
            if (!match) continue;

            spells[index] = {
                ...spell,
                ...match,
                id: spell.id,
                prepared: spell.prepared
            };
        } catch (error) {
            console.warn(`Failed to enrich spell ${spell.name}`, error);
        }
    }
}

async function enrichParsedFeats(features: Feature[]) {
    const feats: Feature[] = [];
    for (const feature of features) {
        try {
            const matches = await searchFeats(feature.name);
            const match = matches.find((candidate) => candidate.name.toLowerCase() === feature.name.toLowerCase());
            if (match) {
                feats.push({ ...match, id: crypto.randomUUID() });
            }
        } catch (error) {
            console.warn(`Failed to enrich feat ${feature.name}`, error);
        }
    }
    return feats;
}

export async function mapPdfFieldsToCharacter(
    fields: Record<string, string>,
    options: PdfImportOptions = {},
    onProgress?: (msg: string) => void
): Promise<Character> {
    const provenance: ImportProvenance = {
        origin: 'dnd-beyond-pdf',
        edition: 'unknown',
        sourceSummary: options.sourceFileName ? `D&D Beyond PDF • ${options.sourceFileName}` : 'D&D Beyond PDF',
        importedAt: Date.now()
    };

    const character: Partial<Character> = {
        system: 'dnd5e',
        provenance
    };

    const name = getField(fields, 'name');
    if (name) character.name = name;
    const playerName = getField(fields, 'playerName');
    if (playerName) character.playerName = playerName;

    const classLevel = parseClassAndLevel(getField(fields, 'classLevel'));
    if (classLevel) {
        character.className = classLevel.className;
        character.level = classLevel.level;
    }

    const race = getField(fields, 'race');
    if (race) character.race = race;
    const background = getField(fields, 'background');
    if (background) character.background = background;
    const alignment = getField(fields, 'alignment');
    if (alignment) character.alignment = alignment;

    const abilityScores: Partial<Character['abilityScores']> = {};
    (['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).forEach((stat) => {
        const value = getField(fields, stat);
        if (value) abilityScores[stat] = parseNum(value, 10);
    });
    if (Object.keys(abilityScores).length > 0) {
        character.abilityScores = {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            ...abilityScores
        };
    }

    const maxHp = getField(fields, 'maxHp');
    if (maxHp) character.maxHp = parseNum(maxHp, 1);
    const currentHp = getField(fields, 'currentHp');
    if (currentHp) character.currentHp = parseNum(currentHp, character.maxHp || 0);
    const tempHp = getField(fields, 'tempHp');
    if (tempHp) character.tempHp = parseNum(tempHp, 0);
    const ac = getField(fields, 'ac');
    if (ac) character.ac = parseNum(ac, 10);
    const initiative = getField(fields, 'initiative');
    if (initiative) character.initiativeMod = parseNum(initiative, 0);
    const speed = getField(fields, 'speed');
    if (speed) character.speed = speed.replace(/\s+/g, ' ').replace(/\(Walking\)/i, '').trim();
    const hitDice = getField(fields, 'hitDice');
    if (hitDice) character.hitDice = hitDice;
    const profBonus = getField(fields, 'profBonus');
    if (profBonus) character.proficiencyBonus = parseNum(profBonus, 2);
    const experience = getField(fields, 'experience');
    if (experience) character.experience = parseNum(experience, 0);

    const saveMap: Array<[keyof Character['abilityScores'], keyof typeof FIELD_ALIASES]> = [
        ['str', 'strSaveProf'],
        ['dex', 'dexSaveProf'],
        ['con', 'conSaveProf'],
        ['int', 'intSaveProf'],
        ['wis', 'wisSaveProf'],
        ['cha', 'chaSaveProf']
    ];
    character.savingThrows = saveMap
        .filter(([, alias]) => isTruthyPdfMarker(getField(fields, alias)))
        .map(([stat]) => stat);

    const passivePerception = getField(fields, 'passivePerception');
    if (passivePerception) character.passivePerception = parseNum(passivePerception, 10);
    const passiveInvestigation = getField(fields, 'passiveInvestigation');
    if (passiveInvestigation) character.passiveInvestigation = parseNum(passiveInvestigation, 10);
    const passiveInsight = getField(fields, 'passiveInsight');
    if (passiveInsight) character.passiveInsight = parseNum(passiveInsight, 10);
    const senses = getField(fields, 'senses');
    if (senses) character.senses = senses;

    const spellAbility = getField(fields, 'spellAbility');
    if (spellAbility) {
        const normalized = spellAbility.trim().toLowerCase().slice(0, 3) as keyof Character['abilityScores'];
        character.spellcastingAbility = normalized;
    }
    const spellDc = getField(fields, 'spellDc');
    if (spellDc) character.spellSaveDc = parseNum(spellDc, 10);
    const spellAtk = getField(fields, 'spellAtkMod');
    if (spellAtk) character.spellAttackMod = parseNum(spellAtk, 0);

    const personality = getField(fields, 'personality');
    if (personality) character.personalityTraits = personality;
    const ideals = getField(fields, 'ideals');
    if (ideals) character.ideals = ideals;
    const bonds = getField(fields, 'bonds');
    if (bonds) character.bonds = bonds;
    const flaws = getField(fields, 'flaws');
    if (flaws) character.flaws = flaws;
    const backstory = [getField(fields, 'backstory'), getField(fields, 'alliesOrganizations')]
        .filter(Boolean)
        .join('\n\n');
    if (backstory) character.backstory = backstory;
    const notes = [getField(fields, 'additionalNotes1'), getField(fields, 'additionalNotes2')]
        .filter(Boolean)
        .join('\n\n');
    if (notes) character.notes = notes;

    const profsLangs = getField(fields, 'profsLangs');
    if (profsLangs) {
        character.proficiencies = profsLangs;
        character.languages = parseLanguages(profsLangs);
    }

    const defenses = parseDefenses(getField(fields, 'defenses'));
    character.resistances = defenses.resistances;
    character.immunities = defenses.immunities;
    character.vulnerabilities = defenses.vulnerabilities;
    if (defenses.damageNotes) character.damageNotes = defenses.damageNotes;

    const currencies: Character['currencies'] = {
        cp: parseNum(getField(fields, 'cp'), 0),
        sp: parseNum(getField(fields, 'sp'), 0),
        ep: parseNum(getField(fields, 'ep'), 0),
        gp: parseNum(getField(fields, 'gp'), 0),
        pp: parseNum(getField(fields, 'pp'), 0)
    };
    character.currencies = currencies;

    const inventory: Item[] = [];
    for (let index = 0; index <= 30; index++) {
        const itemName = getFieldDirect(fields, [`Eq Name${index}`]);
        if (!itemName) continue;
        inventory.push({
            id: crypto.randomUUID(),
            name: itemName.trim(),
            quantity: parseNum(getFieldDirect(fields, [`Eq Qty${index}`]), 1),
            weight: parseNum(getFieldDirect(fields, [`Eq Weight${index}`]), 0),
            isEquipped: false,
            isAttuned: false,
            description: '',
            type: 'gear'
        });
    }

    for (let index = 1; index <= 6; index++) {
        const suffixes = index === 1 ? ['', ' 1'] : [` ${index}`];
        const weaponName = suffixes
            .map((suffix) => getFieldDirect(fields, [`Wpn Name${suffix}`]))
            .find(Boolean);
        if (!weaponName || weaponName.toLowerCase().includes('unarmed strike')) continue;

        const existingIndex = inventory.findIndex((item) => item.name.toLowerCase() === weaponName.toLowerCase());
        const damage = getFieldDirect(fields, [`Wpn${index} Damage`]) || '';
        const notesValue = getFieldDirect(fields, [`Wpn Notes ${index}`]) || '';
        const attackBonus = getFieldDirect(fields, [`Wpn${index} AtkBonus`]);
        const item: Item = {
            id: crypto.randomUUID(),
            name: weaponName.trim(),
            quantity: 1,
            weight: 0,
            isEquipped: true,
            isAttuned: false,
            description: notesValue,
            type: 'weapon',
            damage: `${damage}${attackBonus ? ` (Atk: ${attackBonus})` : ''}`.trim()
        };

        if (existingIndex >= 0) {
            inventory[existingIndex] = { ...inventory[existingIndex], ...item };
        } else {
            inventory.push(item);
        }
    }

    if (options.enrichExternalData !== false && inventory.length > 0) {
        onProgress?.('Extracting inventory...');
        await enrichInventory(inventory, onProgress);
    }
    character.inventory = inventory;

    const spellSlots = Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));
    for (let level = 0; level <= 9; level++) {
        const header = getFieldDirect(fields, [`spellSlotHeader${level}`]);
        if (!header || /at will|cantrip/i.test(header)) continue;
        const match = header.match(/(\d+)\s*(?:slots?|pact)/i);
        if (!match) continue;
        const amount = parseInt(match[1], 10);
        spellSlots[level] = { current: amount, max: amount };
    }
    if (spellSlots.some((slot) => slot.max > 0)) {
        character.spellSlots = spellSlots;
    }

    const levelBoundaries: Array<{ startIndex: number; level: number }> = [];
    let spellBoundaryIndex = 0;
    for (let headerIndex = 0; headerIndex <= 9; headerIndex++) {
        const header = getFieldDirect(fields, [`spellSlotHeader${headerIndex}`, `spellHeader${headerIndex}`]);
        if (!header) continue;
        const level = /at will|cantrip/i.test(header) ? 0 : headerIndex;
        levelBoundaries.push({ startIndex: spellBoundaryIndex, level });
        for (let spellIndex = spellBoundaryIndex; spellIndex < 50; spellIndex++) {
            const name = getFieldDirect(fields, [`spellName${spellIndex}`, `SpellName${spellIndex}`]);
            if (!name) break;
            spellBoundaryIndex = spellIndex + 1;
        }
    }

    const spells: Spell[] = [];
    for (let index = 0; index < 50; index++) {
        const nameValue = getFieldDirect(fields, [`spellName${index}`, `SpellName${index}`]);
        if (!nameValue) continue;

        let spellLevel = 0;
        for (const boundary of levelBoundaries) {
            if (index >= boundary.startIndex) {
                spellLevel = boundary.level;
            }
        }

        const source = getFieldDirect(fields, [`spellSource${index}`, `SpellSource${index}`]) || '';
        const preparedValue = getFieldDirect(fields, [`spellPrepared${index}`, `Prepared${index}`]);
        const componentsValue = getFieldDirect(fields, [`spellComponents${index}`, `Components${index}`]) || '';
        spells.push({
            id: crypto.randomUUID(),
            name: nameValue.trim(),
            level: spellLevel,
            school: '',
            castingTime: getFieldDirect(fields, [`spellCastingTime${index}`]) || '',
            range: getFieldDirect(fields, [`spellRange${index}`]) || '',
            components: {
                v: /v/i.test(componentsValue),
                s: /s/i.test(componentsValue),
                m: /m/i.test(componentsValue)
            },
            duration: getFieldDirect(fields, [`spellDuration${index}`]) || '',
            concentration: /concentration/i.test(getFieldDirect(fields, [`spellDuration${index}`]) || ''),
            ritual: /\[R\]/i.test(nameValue) || /ritual/i.test(getFieldDirect(fields, [`spellNotes${index}`]) || ''),
            description: source,
            prepared: preparedValue ? preparedValue.trim().toUpperCase() !== 'O' : true,
            source
        });
    }

    if (options.enrichExternalData !== false && spells.length > 0) {
        onProgress?.('Extracting spells...');
        await enrichSpells(spells, onProgress);
    }
    character.spells = spells;

    character.skills = SKILL_FIELDS.map((skill) => {
        const marker = skill.profFields.map((field) => fields[field]).find(Boolean);
        return {
            name: skill.name,
            stat: skill.stat,
            proficient: isTruthyPdfMarker(marker),
            expertise: isExpertisePdfMarker(marker),
            bonus: 0
        };
    });

    const featureText = [
        getFieldDirect(fields, ['FeaturesTraits1']),
        getFieldDirect(fields, ['FeaturesTraits2']),
        getFieldDirect(fields, ['FeaturesTraits3'])
    ].filter(Boolean).join('\n\n');

    if (featureText) {
        const parsed = parseFeatureText(featureText);
        const possibleFeats = parsed.filter((entry) => /feat|initiate|tough|lucky|skilled|alert|healer|savage/i.test(entry.title));
        const feats = options.enrichExternalData !== false ? await enrichParsedFeats(possibleFeats.map((entry) => ({
            id: crypto.randomUUID(),
            name: entry.title,
            source: 'Feat',
            description: entry.body,
            hasUses: false,
            isFeat: true
        }))) : [];

        character.features = parsed.map((entry) => ({
            id: crypto.randomUUID(),
            name: entry.title,
            source: `Class: ${character.className || 'Imported'}`,
            description: entry.body,
            hasUses: false
        }));
        character.feats = feats;
    }

    return automateCharacter(character, {
        ...options,
        sourceFileName: options.sourceFileName,
        applyCompendiumAutomation: options.applyCompendiumAutomation
    });
}
