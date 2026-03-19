import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Character, Item } from '../types/character';
import type { ClassEntry, LevelUpChoices } from '../types/rules';
import { applyShortRest, applyLongRest, RestResult } from '../engine/restEngine';
import { useCampaignStore } from './campaignStore';
import {
    XP_THRESHOLDS,
    getProficiencyBonus
} from '../engine/statCalculations';
import { finalizeCharacterSync } from '../engine/characterAutomation';
import {
    getAverageHPGain,
    getHitDie,
    getMulticlassSpellSlots,
    validateMulticlassPrereqs,
    getTotalCharacterLevel,
    buildSpellSlotsForClass,
    getClassSpellcastingAbility,
    calculateMaxHP,
} from '../engine/rulesEngine';

interface CharacterState {
    characters: Character[];
    addCharacter: (character: Character) => void;
    updateCharacter: (id: string, updates: Partial<Character>) => void;
    deleteCharacter: (id: string) => void;
    getCharacter: (id: string) => Character | undefined;
    importCharacters: (characters: Character[]) => void;
    shortRest: (id: string, hitDiceToSpend: number) => RestResult | undefined;
    longRest: (id: string) => RestResult | undefined;
    shortRestParty: (ids: string[], hitDiceMap: Record<string, number>) => void;
    longRestParty: (ids: string[]) => void;
    addExperience: (id: string, amount: number) => void;
    /** Level up the primary class. Pass RulesEngine choices for ASI, feats, spells. */
    levelUpCharacter: (id: string, choices?: LevelUpChoices) => void;
    /** Add a new class to a multiclassed character. Validates prerequisites. */
    addMulticlass: (id: string, newClassName: string) => { success: boolean; reason?: string };
    consumeItem: (characterId: string, itemId: string) => void;
    addItem: (characterId: string, item: Omit<Item, 'id'>) => void;
}

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [],

            addCharacter: (character) => {
                const finalized = finalizeCharacterSync(character);
                set((state) => ({ characters: [...state.characters, finalized] }));

                // Auto-assign to active campaign
                const activeCampaignId = useCampaignStore.getState().activeCampaignId;
                if (activeCampaignId) {
                    useCampaignStore.getState().addCharacterToCampaign(activeCampaignId, finalized.id);
                }
            },

            updateCharacter: (id, updates) => {
                set((state) => ({
                    characters: state.characters.map((char) => {
                        if (char.id !== id) return char;
                        return finalizeCharacterSync({ ...char, ...updates });
                    })
                }));
            },

            deleteCharacter: (id) =>
                set((state) => {
                    // Clean up campaign associations
                    const campaigns = useCampaignStore.getState().campaigns;
                    campaigns.forEach(c => {
                        if (c.partyIds.includes(id)) {
                            useCampaignStore.getState().removeCharacterFromCampaign(c.id, id);
                        }
                    });

                    return {
                        characters: state.characters.filter((char) => char.id !== id)
                    };
                }),

            getCharacter: (id) => get().characters.find((char) => char.id === id),

            importCharacters: (newCharacters) => {
                const finalizedCharacters = newCharacters.map((character) => finalizeCharacterSync(character));
                set((state) => {
                    // Merge logic: avoid duplicate IDs, simple replace or append
                    const existingIds = new Set(state.characters.map((c) => c.id));
                    const filteredNew = finalizedCharacters.filter((c) => !existingIds.has(c.id));
                    return { characters: [...state.characters, ...filteredNew] };
                });

                // Auto-assign all new characters to active campaign
                const activeCampaignId = useCampaignStore.getState().activeCampaignId;
                if (activeCampaignId) {
                    finalizedCharacters.forEach(char => {
                        useCampaignStore.getState().addCharacterToCampaign(activeCampaignId, char.id);
                    });
                }
            },

            shortRest: (id, hitDiceToSpend) => {
                const char = get().getCharacter(id);
                if (!char) return undefined;
                const result = applyShortRest(char, hitDiceToSpend);
                get().updateCharacter(id, result.updatedCharacter);
                return result;
            },

            longRest: (id) => {
                const char = get().getCharacter(id);
                if (!char) return undefined;
                const result = applyLongRest(char);
                get().updateCharacter(id, result.updatedCharacter);
                return result;
            },

            shortRestParty: (ids, hitDiceMap) =>
                set((state) => ({
                    characters: state.characters.map((char) => {
                        if (!ids.includes(char.id)) return char;
                        const spend = hitDiceMap[char.id] || 0;
                        return applyShortRest(char, spend).updatedCharacter;
                    })
                })),

            longRestParty: (ids) =>
                set((state) => ({
                    characters: state.characters.map((char) =>
                        ids.includes(char.id) ? applyLongRest(char).updatedCharacter : char
                    )
                })),

            addExperience: (id, amount) => {
                const char = get().getCharacter(id);
                if (!char) return;

                const newXp = char.experience + amount;

                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.id === id ? { ...c, experience: newXp } : c
                    )
                }));

                // Auto level up if threshold reached (check for multi-level jumps)
                let currentLevel = char.level;
                const currentXp = newXp;
                while (currentLevel < 20 && currentXp >= (XP_THRESHOLDS[currentLevel] || Infinity)) {
                    get().levelUpCharacter(id);
                    currentLevel++;
                }
            },

            levelUpCharacter: (id, choices) => {
                const char = get().getCharacter(id);
                if (!char) return;

                const totalLevel = getTotalCharacterLevel(char);
                if (totalLevel >= 20) return;

                const newLevel = char.level + 1;

                // Proficiency bonus based on total character level
                const tempChar = { ...char, level: newLevel };
                const newProf = getProficiencyBonus(tempChar);

                // HP gain: use provided value from LevelUpWizard, or fall back to average
                const conMod = Math.floor(((char.abilityScores?.con || 10) - 10) / 2);
                const hpGain = choices?.hpGain ?? getAverageHPGain(char.className, conMod);

                // Hit dice string update (e.g. "5d10")
                const dieSize = getHitDie(char.className);

                // Rebuild spell slots based on new level
                const newSpellSlots = buildSpellSlotsForClass(
                    char.className,
                    newLevel,
                    char.subclass || undefined
                );
                // Preserve current slot usage — only increase maximums
                const mergedSlots = newSpellSlots.map((newSlot, idx) => {
                    const existing = char.spellSlots[idx] ?? { current: 0, max: 0 };
                    return {
                        max: newSlot.max,
                        current: Math.min(existing.current + (newSlot.max - existing.max), newSlot.max)
                    };
                });

                // ASI: apply ability score increases from choices
                const updatedAbilityScores = { ...char.abilityScores };
                if (choices?.abilityScoreIncreases) {
                    for (const [stat, bonus] of Object.entries(choices.abilityScoreIncreases)) {
                        const key = stat as keyof typeof updatedAbilityScores;
                        updatedAbilityScores[key] = Math.min(20, (updatedAbilityScores[key] ?? 10) + (bonus ?? 0));
                    }
                }

                // Apply new feat (if chosen instead of ASI)
                const newFeats = char.feats ? [...char.feats] : [];
                if (choices?.feat) {
                    newFeats.push(choices.feat);
                }

                // Apply new spells
                const newSpells = char.spells ? [...char.spells] : [];
                if (choices?.newSpells) {
                    const existingIds = new Set(newSpells.map(s => s.id));
                    for (const spell of choices.newSpells) {
                        if (!existingIds.has(spell.id)) newSpells.push(spell);
                    }
                }

                // Update the classes array if multiclassing
                let updatedClasses = char.classes ? [...char.classes] : undefined;
                if (updatedClasses) {
                    updatedClasses = updatedClasses.map(c =>
                        c.className.toLowerCase() === char.className.toLowerCase()
                            ? { ...c, level: newLevel }
                            : c
                    );
                }

                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.id === id ? {
                            ...c,
                            level: newLevel,
                            proficiencyBonus: newProf,
                            maxHp: calculateMaxHP({ ...c, level: newLevel, abilityScores: updatedAbilityScores, feats: newFeats, classes: updatedClasses }),
                            currentHp: c.currentHp + hpGain,
                            hitDice: `${newLevel}d${dieSize}`,
                            abilityScores: updatedAbilityScores,
                            spellSlots: mergedSlots,
                            feats: newFeats,
                            spells: newSpells,
                            classes: updatedClasses,
                        } : c
                    )
                }));
            },

            addMulticlass: (id, newClassName) => {
                const char = get().getCharacter(id);
                if (!char) return { success: false, reason: 'Character not found' };

                const existingClasses: ClassEntry[] = char.classes ?? [{
                    className: char.className,
                    subclass: char.subclass,
                    level: char.level,
                    hitDice: getHitDie(char.className),
                    spellcastingAbility: getClassSpellcastingAbility(char.className, char.subclass || undefined),
                    spellcasterType: 'none', // Will be resolved by rulesEngine
                }];

                const validation = validateMulticlassPrereqs(
                    char.abilityScores,
                    newClassName,
                    existingClasses
                );

                if (!validation.valid) {
                    return { success: false, reason: validation.reason };
                }

                const dieSize = getHitDie(newClassName);
                const spellAbility = getClassSpellcastingAbility(newClassName);

                const newClassEntry: ClassEntry = {
                    className: newClassName,
                    subclass: '',
                    level: 1,
                    hitDice: dieSize,
                    spellcastingAbility: spellAbility,
                    spellcasterType: 'none',
                };

                const updatedClasses = [...existingClasses, newClassEntry];

                // Recalculate spell slots with multiclass table
                const multiclassSlots = getMulticlassSpellSlots(updatedClasses);

                // HP gain for the first level in the new class (average method)
                const conMod = Math.floor(((char.abilityScores?.con || 10) - 10) / 2);
                const hpGain = getAverageHPGain(newClassName, conMod);

                set((state) => ({
                    characters: state.characters.map((c) =>
                        c.id === id ? {
                            ...c,
                            classes: updatedClasses,
                            maxHp: c.maxHp + hpGain,
                            currentHp: c.currentHp + hpGain,
                            spellSlots: multiclassSlots,
                        } : c
                    )
                }));

                return { success: true };
            },

            consumeItem: (characterId, itemId) => {
                set((state) => ({
                    characters: state.characters.map((char) => {
                        if (char.id !== characterId) return char;

                        return {
                            ...char,
                            inventory: char.inventory.map((item) => {
                                if (item.id !== itemId) return item;

                                const newQuantity = Math.max(0, item.quantity - 1);
                                return { ...item, quantity: newQuantity };
                            })
                        };
                    })
                }));
            },

            addItem: (characterId, itemData) => {
                set((state) => ({
                    characters: state.characters.map((char) => {
                        if (char.id !== characterId) return char;

                        // Try stacking first
                        const existing = char.inventory.find(i => i.name === itemData.name && i.type === itemData.type);
                        if (existing) {
                            return {
                                ...char,
                                inventory: char.inventory.map(i =>
                                    i.id === existing.id
                                        ? { ...i, quantity: i.quantity + itemData.quantity }
                                        : i
                                )
                            };
                        }

                        // New item
                        const newItem: Item = { ...itemData, id: crypto.randomUUID() } as Item;
                        return {
                            ...char,
                            inventory: [...char.inventory, newItem]
                        };
                    })
                }));
            }
        }),
        {
            name: 'dm-assistant-characters', // unique name for localStorage key
            onRehydrateStorage: () => (state) => {
                // Sanitize corrupted numeric fields on load
                if (!state) return;
                state.characters = state.characters.map(char => {
                    const sanitize = (val: any, fallback: number, max?: number) => {
                        const n = Number(val);
                        if (isNaN(n)) return fallback;
                        if (max !== undefined && n > max) return max;
                        return n;
                    };

                    const clampStat = (val: any) => {
                        const n = Number(val);
                        if (isNaN(n) || n > 30 || n < 1) return 10;
                        return n;
                    };

                    // Sanitize speed: strip duplicate "ft", cap numeric portion
                    let speed = char.speed || '30 ft';
                    if (typeof speed === 'string') {
                        // Fix "3025 ft ft" → extract first number and normalize
                        const speedNum = parseInt(speed.replace(/[^0-9]/g, ''));
                        if (speedNum > 120) speed = '30 ft';
                        else speed = speed.replace(/\s*(ft\.?\s*)+/gi, ' ft').trim();
                    }

                    // Ensure spellSlots always has exactly 10 entries (indices 0-9)
                    let spellSlots = char.spellSlots || [];
                    if (spellSlots.length < 10) {
                        spellSlots = [...spellSlots, ...Array(10 - spellSlots.length).fill({ max: 0, current: 0 })];
                    }
                    spellSlots = spellSlots.slice(0, 10);

                    const sanitizedBase = {
                        ...char,
                        maxHp: sanitize(char.maxHp, 10, 999),
                        currentHp: sanitize(char.currentHp, 10, 999),
                        tempHp: sanitize(char.tempHp, 0, 999),
                        ac: sanitize(char.ac, 10, 30),
                        level: sanitize(char.level, 1, 20),
                        experience: sanitize(char.experience, 0),
                        proficiencyBonus: sanitize(char.proficiencyBonus, 2, 10),
                        speed,
                        spellSlots,
                        racialTraits: char.racialTraits || [],
                        feats: char.feats || [],
                        abilityScores: char.abilityScores ? {
                            str: clampStat(char.abilityScores.str),
                            dex: clampStat(char.abilityScores.dex),
                            con: clampStat(char.abilityScores.con),
                            int: clampStat(char.abilityScores.int),
                            wis: clampStat(char.abilityScores.wis),
                            cha: clampStat(char.abilityScores.cha),
                        } : char.abilityScores,
                        masteredWeapons: char.masteredWeapons || [],
                    };

                    // Final pass: recalculate derived stats from sanitized base stats
                    return finalizeCharacterSync(sanitizedBase);
                });
            }
        }
    )
);
