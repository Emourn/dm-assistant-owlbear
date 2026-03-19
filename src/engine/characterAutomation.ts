import { Character, Feature, Item, Resource, Spell, createEmptyCharacter } from '../types/character';
import { calculateMaxHP, getClassSpellcastingAbility, buildSpellSlotsForClass } from './rulesEngine';
import {
    getArmorClass,
    getInitiative,
    getPassiveScore,
    getProficiencyBonus,
    getSpellAttackMod,
    getSpellSaveDc
} from './statCalculations';
import {
    extractActionsFromFeature,
    extractItemsFromFeature,
    fetchFeat,
    getBackgroundFeatures,
    getClassFeatures,
    getRacialTraits,
    getSubclassFeatures
} from './fiveEToolsParser';
import { resolveValue } from './mechanicsEngine';
import { normalizeCharacterProvenance } from './sourceMetadata';

export interface CharacterAutomationOptions {
    sourceFileName?: string;
    applyCompendiumAutomation?: boolean;
}

function normalizeNamedValue(value: string | undefined): string {
    return (value || '').split('|')[0].trim();
}

function isGenericImportedName(name: string | undefined, playerName: string | undefined): boolean {
    if (!name) return true;
    const normalized = name.trim().toLowerCase();
    if (!normalized) return true;
    if (normalized === 'character') return true;
    if (normalized.endsWith("'s character")) return true;
    if (playerName && normalized === `${playerName.trim().toLowerCase()}'s character`) return true;
    return false;
}

function getFileStem(fileName: string | undefined): string | undefined {
    if (!fileName) return undefined;
    const cleaned = fileName.replace(/^.*[\\/]/, '');
    const stem = cleaned.replace(/\.[^.]+$/, '').trim();
    return stem || undefined;
}

function toTitleCase(value: string): string {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function mergeCsvStrings(existing: string, incoming: string): string {
    const values = new Map<string, string>();
    [existing, incoming]
        .flatMap((chunk) => chunk.split(','))
        .map((entry) => entry.trim())
        .filter(Boolean)
        .forEach((entry) => values.set(entry.toLowerCase(), entry));
    return Array.from(values.values()).join(', ');
}

function mergeList(existing: string[] = [], incoming: string[] = []): string[] {
    const merged = new Map<string, string>();
    [...existing, ...incoming].forEach((entry) => {
        const normalized = entry.trim().toLowerCase();
        if (!normalized) return;
        merged.set(normalized, entry);
    });
    return Array.from(merged.values());
}

function mergeFeatureCollections(existing: Feature[] = [], incoming: Feature[] = []): Feature[] {
    const merged = new Map<string, Feature>();
    [...existing, ...incoming].forEach((feature) => {
        const key = `${feature.name.trim().toLowerCase()}::${feature.source.trim().toLowerCase()}`;
        if (!merged.has(key)) {
            merged.set(key, feature);
            return;
        }

        const current = merged.get(key)!;
        merged.set(key, {
            ...current,
            ...feature,
            description: feature.description || current.description,
            effects: feature.effects || current.effects
        });
    });
    return Array.from(merged.values());
}

function mergeSpells(existing: Spell[] = [], incoming: Spell[] = []): Spell[] {
    const merged = new Map<string, Spell>();
    [...existing, ...incoming].forEach((spell) => {
        const key = spell.name.trim().toLowerCase();
        if (!merged.has(key)) {
            merged.set(key, spell);
            return;
        }

        const current = merged.get(key)!;
        merged.set(key, {
            ...current,
            ...spell,
            prepared: spell.prepared ?? current.prepared
        });
    });
    return Array.from(merged.values());
}

function mergeInventory(existing: Item[] = [], incoming: Item[] = []): Item[] {
    const merged = [...existing];

    for (const item of incoming) {
        const key = item.name.trim().toLowerCase();
        const existingIndex = merged.findIndex((candidate) =>
            candidate.name.trim().toLowerCase() === key &&
            candidate.type === item.type
        );

        if (existingIndex === -1) {
            merged.push(item);
            continue;
        }

        const current = merged[existingIndex];
        merged[existingIndex] = {
            ...current,
            ...item,
            quantity: Math.max(current.quantity || 0, item.quantity || 0),
            weight: item.weight || current.weight,
            description: item.description || current.description,
            effects: item.effects || current.effects,
            damage: item.damage || current.damage,
            acBonus: item.acBonus || current.acBonus,
            isEquipped: current.isEquipped || item.isEquipped,
            isAttuned: current.isAttuned || item.isAttuned
        };
    }

    return merged;
}

function mergeResources(existing: Resource[] = [], incoming: Resource[] = []): Resource[] {
    const merged = new Map<string, Resource>();
    [...existing, ...incoming].forEach((resource) => {
        const key = resource.name.trim().toLowerCase();
        const current = merged.get(key);
        if (!current) {
            merged.set(key, resource);
            return;
        }

        merged.set(key, {
            ...current,
            ...resource,
            current: Math.max(current.current, resource.current),
            max: Math.max(current.max, resource.max)
        });
    });
    return Array.from(merged.values());
}

function mergeActions(character: Character): Character['actions'] {
    const merged = new Map<string, Character['actions'][number]>();
    const existing = character.actions || [];

    for (const action of existing) {
        const key = `${action.name.trim().toLowerCase()}::${(action.source || '').trim().toLowerCase()}`;
        merged.set(key, action);
    }

    const sources = [...character.features, ...character.racialTraits, ...character.feats];
    for (const feature of sources) {
        const action = extractActionsFromFeature(feature);
        if (!action) continue;
        const key = `${action.name.trim().toLowerCase()}::${(action.source || '').trim().toLowerCase()}`;
        if (!merged.has(key)) {
            merged.set(key, action);
        }
    }

    return Array.from(merged.values());
}

function mergeFeatureGrantedItems(character: Character): Character['inventory'] {
    const grantedItems = [...character.features, ...character.racialTraits, ...character.feats]
        .flatMap((feature) => extractItemsFromFeature(feature))
        .filter(Boolean);
    return mergeInventory(character.inventory, grantedItems);
}

function addEffectResources(character: Character): Character['resources'] {
    const resources = [...character.resources];
    const existing = new Map(resources.map((resource) => [resource.name.trim().toLowerCase(), resource]));
    const collections = [...character.features, ...character.feats, ...character.racialTraits];

    for (const feature of collections) {
        for (const effect of feature.effects || []) {
            if (effect.type !== 'add_resource' || !effect.target) continue;
            const name = effect.target.trim();
            const max = Math.max(0, resolveValue(effect.value, character));
            const resetOn = effect.payload === 'short' || effect.payload === 'long' ? effect.payload : 'long';
            const key = name.toLowerCase();
            const current = existing.get(key);

            const next: Resource = current
                ? {
                    ...current,
                    max: Math.max(current.max, max),
                    current: Math.max(current.current, max),
                    resetOn
                }
                : {
                    id: crypto.randomUUID(),
                    name,
                    current: max,
                    max,
                    resetOn
                };

            existing.set(key, next);
        }
    }

    return Array.from(existing.values());
}

function normalizeSkillSources(skills: Character['skills']): Character['skills'] {
    return skills.map((skill) => ({
        ...skill,
        source: skill.source ? toTitleCase(skill.source) : skill.source
    }));
}

export function finalizeCharacterSync(input: Partial<Character>): Character {
    const base = createEmptyCharacter();
    const merged: Character = {
        ...base,
        ...input,
        abilityScores: { ...base.abilityScores, ...(input.abilityScores || {}) },
        currencies: { ...base.currencies, ...(input.currencies || {}) },
        deathSaves: { ...base.deathSaves, ...(input.deathSaves || {}) },
        spellSlots: input.spellSlots?.length
            ? Array.from({ length: 10 }, (_, index) => input.spellSlots?.[index] || { current: 0, max: 0 })
            : base.spellSlots,
        inventory: [...(input.inventory || [])],
        spells: [...(input.spells || [])],
        resources: [...(input.resources || [])],
        actions: [...(input.actions || [])],
        features: [...(input.features || [])],
        feats: [...(input.feats || [])],
        racialTraits: [...(input.racialTraits || [])],
        skills: normalizeSkillSources(input.skills?.length ? input.skills : base.skills),
        resistances: [...(input.resistances || [])],
        immunities: [...(input.immunities || [])],
        vulnerabilities: [...(input.vulnerabilities || [])],
        conditionImmunities: [...(input.conditionImmunities || [])],
        masteredWeapons: [...(input.masteredWeapons || [])],
        importedData: input.importedData
    };

    if (isGenericImportedName(merged.name, merged.playerName)) {
        const fallbackName = getFileStem(undefined);
        if (fallbackName) merged.name = fallbackName;
    }

    if (merged.className && merged.spellcastingAbility === 'none') {
        merged.spellcastingAbility = getClassSpellcastingAbility(normalizeNamedValue(merged.className), merged.subclass || undefined);
    }

    if (merged.spellcastingAbility !== 'none' && merged.spellSlots.every((slot) => slot.max === 0) && merged.level > 0) {
        merged.spellSlots = buildSpellSlotsForClass(normalizeNamedValue(merged.className), merged.level, merged.subclass || undefined);
    }

    const previousCurrentHp = typeof input.currentHp === 'number' ? input.currentHp : merged.currentHp;
    merged.resources = addEffectResources(merged);
    merged.inventory = mergeFeatureGrantedItems(merged);
    merged.actions = mergeActions(merged);
    merged.feats = mergeFeatureCollections([], merged.feats);
    merged.features = mergeFeatureCollections([], merged.features);
    merged.racialTraits = mergeFeatureCollections([], merged.racialTraits);
    merged.spells = mergeSpells([], merged.spells);
    merged.resistances = mergeList([], merged.resistances);
    merged.immunities = mergeList([], merged.immunities);
    merged.vulnerabilities = mergeList([], merged.vulnerabilities);
    merged.conditionImmunities = mergeList([], merged.conditionImmunities);

    merged.proficiencyBonus = getProficiencyBonus(merged);
    merged.maxHp = calculateMaxHP(merged);
    merged.currentHp = Math.max(0, Math.min(previousCurrentHp ?? merged.maxHp, merged.maxHp));
    merged.ac = getArmorClass(merged);
    merged.initiativeMod = getInitiative(merged);
    merged.passivePerception = getPassiveScore(merged, 'Perception');
    merged.passiveInvestigation = getPassiveScore(merged, 'Investigation');
    merged.passiveInsight = getPassiveScore(merged, 'Insight');
    merged.spellSaveDc = getSpellSaveDc(merged);
    merged.spellAttackMod = getSpellAttackMod(merged);
    merged.provenance = normalizeCharacterProvenance(merged);

    return merged;
}

function applySkillProficiencies(character: Character, skillNames: string[], source: string): Character['skills'] {
    return character.skills.map((skill) => {
        const isMatch = skillNames.some((name) => name.trim().toLowerCase() === skill.name.toLowerCase());
        if (!isMatch) return skill;
        return {
            ...skill,
            proficient: true,
            source,
            sourceId: source.toLowerCase().replace(/\s+/g, '-')
        };
    });
}

export async function automateCharacter(input: Partial<Character>, options: CharacterAutomationOptions = {}): Promise<Character> {
    let character = finalizeCharacterSync(input);

    const fileStem = getFileStem(options.sourceFileName);
    if (fileStem && isGenericImportedName(character.name, character.playerName)) {
        character = finalizeCharacterSync({ ...character, name: fileStem });
    }

    if (options.applyCompendiumAutomation === false) {
        return character;
    }

    const normalizedRace = normalizeNamedValue(character.race);
    if (normalizedRace) {
        const raceData = await getRacialTraits(character.race);
        character = finalizeCharacterSync({
            ...character,
            race: normalizedRace,
            speed: character.speed || raceData.speed || character.speed,
            darkvision: character.darkvision ?? raceData.darkvision,
            senses: raceData.senses ? mergeCsvStrings(character.senses, raceData.senses) : character.senses,
            languages: raceData.languages ? mergeCsvStrings(character.languages, raceData.languages) : character.languages,
            resistances: mergeList(character.resistances, raceData.resistances),
            immunities: mergeList(character.immunities, raceData.immunities),
            vulnerabilities: mergeList(character.vulnerabilities, raceData.vulnerabilities),
            racialTraits: mergeFeatureCollections(character.racialTraits, raceData.features),
            skills: raceData.skillProficiencies?.length
                ? applySkillProficiencies(character, raceData.skillProficiencies, `Species: ${normalizedRace}`)
                : character.skills
        });
    }

    const normalizedBackground = normalizeNamedValue(character.background);
    if (normalizedBackground) {
        const backgroundData = await getBackgroundFeatures(character.background);
        let features = mergeFeatureCollections(character.features, backgroundData.features);
        let feats = character.feats;

        for (const feature of backgroundData.features) {
            const feat = await fetchFeat(feature.name);
            if (!feat) continue;
            feats = mergeFeatureCollections(feats, [feat]);
            features = features.filter((existing) => existing.name.toLowerCase() !== feature.name.toLowerCase());
        }

        character = finalizeCharacterSync({
            ...character,
            background: normalizedBackground,
            features,
            feats,
            inventory: mergeInventory(character.inventory, backgroundData.startingEquipment),
            skills: backgroundData.skillProficiencies?.length
                ? applySkillProficiencies(character, backgroundData.skillProficiencies, `Background: ${normalizedBackground}`)
                : character.skills
        });
    }

    const normalizedClass = normalizeNamedValue(character.className);
    if (normalizedClass) {
        const classData = await getClassFeatures(character.className, character.level || 1);
        character = finalizeCharacterSync({
            ...character,
            className: normalizedClass,
            hitDice: classData.hitDice || character.hitDice,
            savingThrows: classData.savingThrows?.length
                ? classData.savingThrows
                    .map((value) => value.toLowerCase().slice(0, 3) as keyof Character['abilityScores'])
                : character.savingThrows,
            proficiencies: classData.proficiencies || character.proficiencies,
            spellcastingAbility: classData.spellcastingAbility
                ? (classData.spellcastingAbility.toLowerCase().slice(0, 3) as keyof Character['abilityScores'])
                : character.spellcastingAbility,
            spellSlots: classData.spellSlots?.length ? classData.spellSlots : character.spellSlots,
            resources: mergeResources(character.resources, classData.resources || []),
            features: mergeFeatureCollections(character.features, classData.features)
        });
    }

    const normalizedSubclass = normalizeNamedValue(character.subclass);
    if (normalizedClass && normalizedSubclass) {
        const subclassData = await getSubclassFeatures(normalizedClass, normalizedSubclass, character.level || 1);
        character = finalizeCharacterSync({
            ...character,
            subclass: normalizedSubclass,
            features: mergeFeatureCollections(character.features, subclassData.features)
        });
    }

    return finalizeCharacterSync(character);
}
