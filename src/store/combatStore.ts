import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Encounter, Combatant, CombatLogEntry, SavedEncounter, CombatAction } from '../types/combat';
import { DungeonMap } from '../types/campaignNavigator';
import { dungeonMapToBattleMapState } from '../engine/mapBridge';
import { BattleMapState, GridPosition, MapToken } from '../types/battleMap';
import { createBasicTurnState, getNextCombatant, rollMissingInitiatives, sortCombatantsByInitiative } from '../engine/combatEngine';
import { gridDistance3DFt } from '../engine/gridEngine';
import { useCharacterStore } from './characterStore';
import { CR_TO_XP } from '../engine/encounterDifficulty';
import { getArmorClass, getInitiative, getEffectiveAbilityScore } from '../engine/statCalculations';

interface CombatStore {
    activeEncounter: Encounter | null;
    history: Encounter[];
    savedEncounters: SavedEncounter[];
    manualRollsEnabled: boolean;
    pastStates: Encounter[]; // Undo stack
    selectedCombatantId: string | null;
    wizardAction: {
        action: CombatAction;
        actor: Combatant;
        initialTargets?: Combatant[];
    } | null;

    // Save/Load Encounters
    saveEncounterTemplate: (template: Omit<SavedEncounter, 'id' | 'createdAt'>) => void;
    deleteSavedEncounter: (id: string) => void;
    loadSavedEncounter: (id: string, customTitle?: string) => void;

    // Setup
    startEncounter: (title: string, combatants: Combatant[], campaignId?: string) => void;
    completeSetup: () => void;
    setBattleMap: (state: BattleMapState) => void;
    initializeEncounterFromNavigator: (map: DungeonMap) => void;
    updateBattleMap: (updates: Partial<BattleMapState>) => void;
    updateToken: (tokenId: string, updates: Partial<MapToken>) => void;
    completeMapSetup: () => void;
    skipMapSetup: () => void;
    resizeGrid: (side: 'top' | 'bottom' | 'left' | 'right', delta: number) => void;
    endEncounter: () => void;
    addCombatant: (combatant: Combatant) => void;
    removeCombatant: (id: string) => void;
    clearCombatants: () => void;
    cancelEncounter: () => void;

    // Settings
    toggleManualRolls: () => void;

    // Core flow
    rollAllInitiative: () => void;
    setInitiative: (id: string, score: number) => void;
    beginCombat: () => void;
    nextTurn: () => void;

    // Actions & State
    updateCombatant: (id: string, updates: Partial<Combatant>) => void;
    damageCombatant: (id: string, amount: number, damageType?: string, isMagical?: boolean) => void;
    healCombatant: (id: string, amount: number) => void;
    applyGroupHealthChange: (ids: string[], amount: number, isDamage: boolean, damageType?: string, isMagical?: boolean) => void;
    consumeAction: (flags?: { isLeveledSpell?: boolean; isHasteAction?: boolean }) => void;
    consumeBonusAction: (flags?: { isLeveledSpell?: boolean }) => void;
    consumeReaction: () => void;
    restoreAction: (id: string) => void;
    useLegendaryAction: (id: string) => void;
    toggleCombatantResource: (id: string, resource: 'action' | 'bonus' | 'reaction' | 'legendary' | 'castLeveled' | 'castBonus' | 'usedHaste') => void;
    useSpellSlot: (id: string, level: number) => void;
    setConcentration: (id: string, spell: { spellId: string; name: string } | null) => void;
    setReadiedAction: (id: string, action: { description: string; trigger: string } | null) => void;
    refreshPlayerStats: () => void;

    // Logging & Undo
    addLog: (entry: Omit<CombatLogEntry, 'id' | 'timestamp' | 'round'>) => void;
    undo: () => void;

    // Targeting
    setSelectedCombatant: (id: string | null) => void;
    setWizardAction: (action: { action: CombatAction; actor: Combatant; initialTargets?: Combatant[] } | null) => void;
}

const DEFAULT_PLAYER_AC = 10;
const DEFAULT_PLAYER_HP = 10;
const DEFAULT_NPC_AC = 11;
const DEFAULT_NPC_HP = 12;
const DEFAULT_MONSTER_AC = 12;
const DEFAULT_MONSTER_HP = 20;

function getCombatantTypeFromTokenFaction(faction: MapToken['faction']): Combatant['type'] {
    if (faction === 'player') return 'player';
    if (faction === 'enemy') return 'monster';
    return 'npc';
}

function getTokenFactionFromCombatantType(type: Combatant['type']): MapToken['faction'] {
    if (type === 'player') return 'player';
    if (type === 'monster') return 'enemy';
    return 'ally';
}

function getBaseStatsForType(type: Combatant['type']) {
    if (type === 'player') return { ac: DEFAULT_PLAYER_AC, hp: DEFAULT_PLAYER_HP };
    if (type === 'monster') return { ac: DEFAULT_MONSTER_AC, hp: DEFAULT_MONSTER_HP };
    return { ac: DEFAULT_NPC_AC, hp: DEFAULT_NPC_HP };
}

function clampTokenPosition(
    position: GridPosition,
    size: number,
    gridWidth: number,
    gridHeight: number
): GridPosition {
    return {
        col: Math.max(0, Math.min(position.col, Math.max(0, gridWidth - size))),
        row: Math.max(0, Math.min(position.row, Math.max(0, gridHeight - size)))
    };
}

function tokenBoxesOverlap(a: MapToken, b: MapToken): boolean {
    const aSize = Math.max(1, a.size || 1);
    const bSize = Math.max(1, b.size || 1);

    const aLeft = a.position.col;
    const aRight = a.position.col + aSize;
    const aTop = a.position.row;
    const aBottom = a.position.row + aSize;

    const bLeft = b.position.col;
    const bRight = b.position.col + bSize;
    const bTop = b.position.row;
    const bBottom = b.position.row + bSize;

    return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

function isPlacementFree(candidate: MapToken, existingTokens: MapToken[]): boolean {
    return !existingTokens.some(token => tokenBoxesOverlap(candidate, token));
}

function findFirstOpenPosition(
    existingTokens: MapToken[],
    size: number,
    gridWidth: number,
    gridHeight: number
): GridPosition {
    const boundedSize = Math.max(1, size);
    const maxCol = Math.max(0, gridWidth - boundedSize);
    const maxRow = Math.max(0, gridHeight - boundedSize);

    for (let row = 0; row <= maxRow; row += 1) {
        for (let col = 0; col <= maxCol; col += 1) {
            const candidate: MapToken = {
                id: '__probe__',
                combatantId: '__probe__',
                name: '__probe__',
                faction: 'neutral',
                position: { col, row },
                size: boundedSize,
                elevation: 0
            };
            if (isPlacementFree(candidate, existingTokens)) {
                return { col, row };
            }
        }
    }

    return { col: 0, row: 0 };
}

function normalizeCombatantId(baseId: string, used: Set<string>): string {
    const id = baseId || crypto.randomUUID();
    if (!used.has(id)) {
        used.add(id);
        return id;
    }

    let suffix = 2;
    while (used.has(`${id}-${suffix}`)) {
        suffix += 1;
    }

    const uniqueId = `${id}-${suffix}`;
    used.add(uniqueId);
    return uniqueId;
}

function buildCombatantFromNavigatorToken(
    token: MapToken,
    tokenCombatantId: string,
    sourceCombatantId: string,
    character?: ReturnType<typeof useCharacterStore.getState>['characters'][number]
): Combatant {
    const type = getCombatantTypeFromTokenFaction(token.faction);
    const defaults = getBaseStatsForType(type);
    const name = token.name || character?.name || `Unit ${tokenCombatantId.slice(0, 6)}`;
    const tokenSize = Math.max(1, token.size || 1);
    const tokenElevation = token.elevation ?? 0;

    if (character && type === 'player') {
        return {
            id: tokenCombatantId,
            sourceId: character.id,
            type: 'player',
            name: character.name || name,
            portraitUrl: character.portraitUrl,
            ac: character.ac || defaults.ac,
            maxHp: character.maxHp || defaults.hp,
            currentHp: character.currentHp || character.maxHp || defaults.hp,
            tempHp: character.tempHp || 0,
            speed: character.speed || '30 ft',
            initiativeMod: character.initiativeMod || 0,
            initiativeScore: null,
            dexterityScore: character.abilityScores?.dex || 10,
            abilityScores: character.abilityScores ? { ...character.abilityScores } : undefined,
            savingThrowProficiencies: character.savingThrows ? [...character.savingThrows] : undefined,
            proficiencyBonus: character.proficiencyBonus || 2,
            spellcastingAbility: character.spellcastingAbility,
            spellSaveDc: character.spellSaveDc || 0,
            spellAttackMod: character.spellAttackMod || 0,
            spellSlots: character.spellSlots ? character.spellSlots.map(slot => ({ ...slot })) : undefined,
            conditions: character.conditions ? [...character.conditions] : [],
            deathSaves: character.deathSaves ? { ...character.deathSaves } : undefined,
            exhaustion: character.exhaustion || 0,
            resistances: character.resistances ? [...character.resistances] : undefined,
            immunities: character.immunities ? [...character.immunities] : undefined,
            vulnerabilities: character.vulnerabilities ? [...character.vulnerabilities] : undefined,
            conditionImmunities: character.conditionImmunities ? [...character.conditionImmunities] : undefined,
            damageNotes: character.damageNotes,
            gridPosition: { ...token.position },
            tokenSize,
            elevation: tokenElevation,
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true
        };
    }

    return {
        id: tokenCombatantId,
        sourceId: sourceCombatantId,
        type,
        name,
        ac: defaults.ac,
        maxHp: defaults.hp,
        currentHp: defaults.hp,
        tempHp: 0,
        speed: '30 ft',
        initiativeMod: 0,
        initiativeScore: null,
        dexterityScore: 10,
        conditions: [],
        gridPosition: { ...token.position },
        tokenSize,
        elevation: tokenElevation,
        hasAction: true,
        hasBonusAction: true,
        hasReaction: true
    };
}

function buildTokenForCombatant(combatant: Combatant, mapState: BattleMapState): MapToken {
    const tokenSize = Math.max(1, combatant.tokenSize || 1);
    const preferred = combatant.gridPosition
        ? clampTokenPosition(combatant.gridPosition, tokenSize, mapState.gridWidth, mapState.gridHeight)
        : findFirstOpenPosition(mapState.tokens, tokenSize, mapState.gridWidth, mapState.gridHeight);

    const probe: MapToken = {
        id: crypto.randomUUID(),
        combatantId: combatant.id,
        name: combatant.name,
        faction: getTokenFactionFromCombatantType(combatant.type),
        position: preferred,
        size: tokenSize,
        elevation: combatant.elevation ?? 0
    };

    const finalPosition = isPlacementFree(probe, mapState.tokens)
        ? preferred
        : findFirstOpenPosition(mapState.tokens, tokenSize, mapState.gridWidth, mapState.gridHeight);

    return {
        ...probe,
        position: finalPosition,
        color: combatant.type === 'player' ? '#3b82f6' : combatant.type === 'monster' ? '#ef4444' : '#22c55e',
        showHealthBar: true,
        showNameLabel: true
    };
}

export const useCombatStore = create<CombatStore>()(
    persist(
        (set, get) => ({
            activeEncounter: null,
            history: [],
            savedEncounters: [],
            manualRollsEnabled: false,
            pastStates: [],
            selectedCombatantId: null,
            wizardAction: null,

            toggleManualRolls: () => set(state => ({ manualRollsEnabled: !state.manualRollsEnabled })),

            saveEncounterTemplate: (template) => set(state => ({
                savedEncounters: [
                    ...(state.savedEncounters || []),
                    { ...template, id: crypto.randomUUID(), createdAt: Date.now() }
                ]
            })),

            deleteSavedEncounter: (id) => set(state => ({
                savedEncounters: (state.savedEncounters || []).filter(e => e.id !== id)
            })),

            loadSavedEncounter: (id, customTitle) => set(state => {
                const enc = (state.savedEncounters || []).find(e => e.id === id);
                if (!enc) return state;

                // Create deeply cloned new combatants for the active encounter
                const newCombatants = enc.enemies.map(c => ({
                    ...c,
                    id: crypto.randomUUID(),
                    currentHp: c.maxHp, // Full health
                    tempHp: 0,
                    initiativeScore: null,
                    conditions: []
                }));

                const newEncounter: Encounter = {
                    id: crypto.randomUUID(),
                    title: customTitle || enc.title,
                    isActive: false,
                    isSetupComplete: false,
                    round: 0,
                    campaignId: enc.campaignId,
                    combatants: newCombatants, // Only loads monsters
                    activeCombatantId: null,
                    turnState: createBasicTurnState(undefined),
                    log: [
                        { id: crypto.randomUUID(), timestamp: Date.now(), round: 0, message: `Loaded encounter template "${enc.title}".`, type: 'system' }
                    ]
                };

                return { activeEncounter: newEncounter };
            }),

            startEncounter: (title, combatants, campaignId) => {
                const newEncounter: Encounter = {
                    id: crypto.randomUUID(),
                    title,
                    isActive: false, // Wait for beginCombat
                    isSetupComplete: false, // Setup phase
                    round: 0,
                    campaignId,
                    combatants,
                    activeCombatantId: null,
                    turnState: createBasicTurnState(undefined),
                    log: [
                        { id: crypto.randomUUID(), timestamp: Date.now(), round: 0, message: `Encounter "${title}" created.`, type: 'system' }
                    ]
                };
                set({ activeEncounter: newEncounter });
            },

            completeSetup: () => set((state) => {
                if (!state.activeEncounter) return state;
                return {
                    activeEncounter: { ...state.activeEncounter, isSetupComplete: true }
                };
            }),

            setBattleMap: (mapState) => set((state) => {
                if (!state.activeEncounter) return state;
                return {
                    activeEncounter: { ...state.activeEncounter, battleMap: mapState }
                };
            }),

            initializeEncounterFromNavigator: (mapData) => {
                const charStore = useCharacterStore.getState();
                const rawBattleMap = dungeonMapToBattleMapState(mapData);
                const usedCombatantIds = new Set<string>();

                const normalizedTokens: MapToken[] = rawBattleMap.tokens.map((token) => {
                    const sourceCombatantId = token.combatantId || token.id || crypto.randomUUID();
                    const normalizedCombatantId = normalizeCombatantId(sourceCombatantId, usedCombatantIds);

                    return {
                        ...token,
                        id: token.id || crypto.randomUUID(),
                        combatantId: normalizedCombatantId,
                        position: { ...token.position },
                        size: Math.max(1, token.size || 1),
                        elevation: token.elevation ?? 0,
                        auras: token.auras ? token.auras.map(aura => ({ ...aura })) : undefined
                    };
                });

                const bridgeCombatants: Combatant[] = normalizedTokens.map((token, index) => {
                    const sourceCombatantId = rawBattleMap.tokens[index]?.combatantId || token.combatantId;
                    const character = charStore.characters.find(c => c.id === sourceCombatantId);
                    return buildCombatantFromNavigatorToken(token, token.combatantId, sourceCombatantId, character);
                });

                const battleMap: BattleMapState = {
                    ...rawBattleMap,
                    tokens: normalizedTokens
                };

                const newEncounter: Encounter = {
                    id: crypto.randomUUID(),
                    title: `Tactical Combat - ${mapData.name}`,
                    isActive: false,
                    isSetupComplete: true, // Players and map are ready, proceed to map adjustments
                    mapSetupComplete: false,
                    round: 0,
                    combatants: bridgeCombatants,
                    activeCombatantId: null,
                    battleMap: battleMap,
                    turnState: createBasicTurnState(undefined),
                    log: [
                        { id: crypto.randomUUID(), timestamp: Date.now(), round: 0, message: `Tactical engagement initiated from ${mapData.name}.`, type: 'system' }
                    ]
                };

                set({ activeEncounter: newEncounter });
            },

            updateBattleMap: (updates) => set((state) => {
                if (!state.activeEncounter || !state.activeEncounter.battleMap) return state;
                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        battleMap: { ...state.activeEncounter.battleMap, ...updates }
                    }
                };
            }),

            updateToken: (tokenId, updates) => set((state) => {
                if (!state.activeEncounter || !state.activeEncounter.battleMap) return state;

                const token = state.activeEncounter.battleMap.tokens.find(t => t.id === tokenId);
                if (!token) return state;

                let movementUpdate = {};

                // If moving a token that belongs to the active combatant during combat
                if (state.activeEncounter.isActive && token.combatantId === state.activeEncounter.activeCombatantId) {
                    const newPos = updates.position || token.position;
                    const newElev = updates.elevation !== undefined ? updates.elevation : token.elevation;

                    const dist = Math.round(gridDistance3DFt(token.position, newPos, token.elevation, newElev));

                    if (dist > 0) {
                        const activeCombatant = state.activeEncounter.combatants.find(c => c.id === token.combatantId);

                        // Conditions that reduce speed to 0
                        const zeroSpeedConditions = ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
                        const hasZeroSpeed = activeCombatant?.conditions?.some(c => zeroSpeedConditions.includes(c.name)) || false;

                        if (dist > (state.activeEncounter.turnState.movementRemaining || 0) || hasZeroSpeed) {
                            // Prevent movement if not enough movement remains or special condition applies
                            return state;
                        }

                        movementUpdate = {
                            turnState: {
                                ...state.activeEncounter.turnState,
                                movementRemaining: Math.max(0, (state.activeEncounter.turnState.movementRemaining || 0) - dist),
                                movementUsedFt: (state.activeEncounter.turnState.movementUsedFt || 0) + dist
                            }
                        };

                        // Opportunity Attack Warning
                        // Check if moving out of 5ft range of any enemy (assuming not disengaged, but we don't track Disengage yet
                        // so we just warn the DM to check)
                        if (token.faction) {
                            const enemyFactions = token.faction === 'player' || token.faction === 'ally' ? ['enemy'] : ['player', 'ally'];
                            const enemies = state.activeEncounter.battleMap.tokens.filter(t => enemyFactions.includes(t.faction));

                            const wasAdjacent = enemies.filter(e => gridDistance3DFt(token.position, e.position, token.elevation, e.elevation) <= 5);
                            const isAdjacent = enemies.filter(e => gridDistance3DFt(newPos, e.position, newElev, e.elevation) <= 5);

                            // If was adjacent to an enemy, and now isn't, and the enemy isn't dead/unconscious
                            const movedAwayFrom = wasAdjacent.filter(wa =>
                                !isAdjacent.find(ia => ia.id === wa.id) &&
                                !state.activeEncounter?.combatants.find(c => c.id === wa.combatantId)?.isDead &&
                                !(state.activeEncounter?.combatants.find(c => c.id === wa.combatantId)?.conditions.some(c => c.name === 'Unconscious'))
                            );

                            if (movedAwayFrom.length > 0) {
                                const enemyNames = movedAwayFrom.map(e => e.name).join(', ');
                                const combatLogEntry: CombatLogEntry = {
                                    id: crypto.randomUUID(),
                                    timestamp: Date.now(),
                                    round: state.activeEncounter.round,
                                    message: `⚔️ **Opportunity Attack Warning:** ${token.name} moved out of melee range of ${enemyNames}!`,
                                    type: 'system',
                                    combatantId: token.combatantId
                                };

                                // We need to add this to the logs. We can do it in the final return.
                                movementUpdate = {
                                    ...movementUpdate,
                                    log: [...state.activeEncounter.log, combatLogEntry]
                                };
                            }
                        }
                    }
                }

                const tokens = state.activeEncounter.battleMap.tokens.map(t =>
                    t.id === tokenId ? { ...t, ...updates } : t
                );

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        ...movementUpdate,
                        battleMap: { ...state.activeEncounter.battleMap, tokens }
                    }
                };
            }),

            completeMapSetup: () => set((state) => {
                if (!state.activeEncounter) return state;
                return {
                    activeEncounter: { ...state.activeEncounter, mapSetupComplete: true }
                };
            }),

            skipMapSetup: () => set((state) => {
                if (!state.activeEncounter) return state;
                return {
                    activeEncounter: { ...state.activeEncounter, mapSetupComplete: true, battleMap: undefined }
                };
            }),

            resizeGrid: (side, delta) => set((state) => {
                if (!state.activeEncounter || !state.activeEncounter.battleMap) return state;
                const map = state.activeEncounter.battleMap;

                const isHorizontal = side === 'left' || side === 'right';
                const newWidth = isHorizontal ? Math.max(5, map.gridWidth + delta) : map.gridWidth;
                const newHeight = !isHorizontal ? Math.max(5, map.gridHeight + delta) : map.gridHeight;

                const appliedDelta = isHorizontal ? (newWidth - map.gridWidth) : (newHeight - map.gridHeight);
                const colShift = side === 'left' ? appliedDelta : 0;
                const rowShift = side === 'top' ? appliedDelta : 0;

                // Shift tokens
                const updatedTokens = map.tokens.map(token => ({
                    ...token,
                    position: {
                        col: Math.max(0, Math.min(token.position.col + colShift, newWidth - (token.size || 1))),
                        row: Math.max(0, Math.min(token.position.row + rowShift, newHeight - (token.size || 1)))
                    }
                }));

                // Shift shapes
                const updatedShapes = map.shapes.map(shape => ({
                    ...shape,
                    points: shape.points.map(p => ({
                        col: p.col + colShift,
                        row: p.row + rowShift
                    }))
                }));

                // Shift freehand paths (pixels)
                const pxColShift = colShift * map.cellSizePx;
                const pxRowShift = rowShift * map.cellSizePx;
                const updatedPaths = map.freehandPaths.map(path => ({
                    ...path,
                    points: path.points.map(p => ({
                        x: p.x + pxColShift,
                        y: p.y + pxRowShift
                    }))
                }));

                // Fog of War
                const updatedFoW = map.fogOfWar.map(s => ({
                    ...s,
                    points: s.points.map(p => ({ col: p.col + colShift, row: p.row + rowShift }))
                }));
                const updatedFoWFree = map.fogOfWarFreehand.map(path => ({
                    ...path,
                    points: path.points.map(p => ({ x: p.x + pxColShift, y: p.y + pxRowShift }))
                }));

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        battleMap: {
                            ...map,
                            gridWidth: newWidth,
                            gridHeight: newHeight,
                            tokens: updatedTokens,
                            shapes: updatedShapes,
                            freehandPaths: updatedPaths,
                            fogOfWar: updatedFoW,
                            fogOfWarFreehand: updatedFoWFree
                        }
                    }
                };
            }),

            applyGroupHealthChange: (ids: string[], amount: number, isDamage: boolean, damageType?: string, isMagical: boolean = false) => set((state) => {
                if (!state.activeEncounter) return state;
                const enc = state.activeEncounter;
                const pastStates = [...(state.pastStates || []), enc].slice(-10);
                const newLogs: CombatLogEntry[] = [];
                const extraLogs: CombatLogEntry[] = [];

                const updatedCombatants = enc.combatants.map(c => {
                    if (!ids.includes(c.id)) return c;

                    if (!isDamage) {
                        // Healing logic
                        const newHp = Math.min(c.maxHp, c.currentHp + amount);
                        const actualHeal = newHp - c.currentHp;
                        newLogs.push({
                            id: crypto.randomUUID(), round: enc.round, timestamp: Date.now(),
                            message: `${c.name} healed for ${actualHeal} HP.`, type: 'heal', combatantId: c.id
                        });
                        return { ...c, currentHp: newHp, isDead: false };
                    }

                    // Damage logic (simplified but consistent with damageCombatant)
                    let finalAmount = amount;
                    let modification = '';
                    if (damageType) {
                        const t = damageType.toLowerCase();
                        if (c.immunities?.some(i => i.toLowerCase() === t)) { finalAmount = 0; modification = ' (Immune)'; }
                        else if (c.resistances?.some(r => r.toLowerCase() === t)) {
                            const isPhys = ['bludgeoning', 'piercing', 'slashing'].includes(t);
                            const nonMag = c.damageNotes?.toLowerCase().includes('nonmagical');
                            if (!(isPhys && nonMag && isMagical)) {
                                finalAmount = Math.floor(finalAmount / 2);
                                modification = ' (Resisted)';
                            }
                        }
                        else if (c.vulnerabilities?.some(v => v.toLowerCase() === t)) { finalAmount = finalAmount * 2; modification = ' (Vulnerable)'; }
                    }

                    let rem = finalAmount;
                    let nTemp = c.tempHp;
                    let nHp = c.currentHp;
                    if (nTemp > 0) {
                        if (nTemp >= rem) { nTemp -= rem; rem = 0; }
                        else { rem -= nTemp; nTemp = 0; }
                    }
                    nHp = Math.max(0, nHp - rem);
                    const isNowDead = nHp === 0;

                    newLogs.push({
                        id: crypto.randomUUID(), round: enc.round, timestamp: Date.now(),
                        message: `${c.name} took ${finalAmount}${damageType ? ` ${damageType}` : ''} damage${modification}.${isNowDead ? ' They are dying/dead!' : ''}`,
                        type: 'damage', combatantId: c.id
                    });

                    // Concentration handling
                    if (c.isConcentrating && finalAmount > 0) {
                        if (isNowDead) {
                            // Auto-drop concentration at 0 HP
                            extraLogs.push({
                                id: crypto.randomUUID(), round: enc.round, timestamp: Date.now(),
                                message: `💥 ${c.name} dropped to 0 HP — Concentration broken!`,
                                type: 'status', combatantId: c.id
                            });
                            return { ...c, currentHp: nHp, tempHp: nTemp, isDead: c.type === 'monster' && isNowDead, isConcentrating: false, concentratingOn: undefined };
                        } else {
                            const dc = Math.max(10, Math.floor(finalAmount / 2));
                            extraLogs.push({
                                id: crypto.randomUUID(), round: enc.round, timestamp: Date.now(),
                                message: `⚠️ CONCENTRATION: ${c.name} must make a DC ${dc} CON Save!`,
                                type: 'system', combatantId: c.id
                            });
                        }
                    }

                    // Death save reminder for players at 0 HP
                    if (isNowDead && c.type === 'player') {
                        extraLogs.push({
                            id: crypto.randomUUID(), round: enc.round, timestamp: Date.now() + 1,
                            message: `💀 ${c.name} is at 0 HP! They will need to make Death Saving Throws.`,
                            type: 'status', combatantId: c.id
                        });
                    }

                    return { ...c, currentHp: nHp, tempHp: nTemp, isDead: c.type === 'monster' && isNowDead };
                });

                return {
                    pastStates,
                    activeEncounter: { ...enc, combatants: updatedCombatants, log: [...enc.log, ...newLogs, ...extraLogs] }
                };
            }),

            endEncounter: () => {
                const { activeEncounter, history } = get();
                if (!activeEncounter) return;

                const charStore = useCharacterStore.getState();

                // Calculate XP Reward
                const defeatedMonsters = activeEncounter.combatants.filter(c => c.type === 'monster' && c.currentHp <= 0);
                const totalXp = defeatedMonsters.reduce((sum, m) => sum + (CR_TO_XP[m.cr || '0'] || 0), 0);
                const players = activeEncounter.combatants.filter(c => c.type === 'player');
                const xpPerPlayer = players.length > 0 ? Math.floor(totalXp / players.length) : 0;

                // Sync player stats and award XP
                activeEncounter.combatants.forEach(c => {
                    if (c.type === 'player' && c.sourceId) {
                        charStore.updateCharacter(c.sourceId, {
                            currentHp: c.currentHp,
                            tempHp: c.tempHp,
                            spellSlots: c.spellSlots,
                            deathSaves: c.deathSaves,
                            conditions: c.conditions,
                            exhaustion: c.exhaustion,
                        });

                        if (xpPerPlayer > 0) {
                            charStore.addExperience(c.sourceId, xpPerPlayer);
                        }
                    }
                });

                const finished = { ...activeEncounter, isActive: false };
                const xpMsg = xpPerPlayer > 0 ? ` Each player gained ${xpPerPlayer} XP.` : "";
                finished.log.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    round: finished.round,
                    message: `Combat ended. Character stats synchronized.${xpMsg}`,
                    type: 'system'
                });

                set({
                    history: [...history, finished],
                    activeEncounter: null,
                    pastStates: [],
                    selectedCombatantId: null
                });
            },

            addCombatant: (combatant) => set((state) => {
                if (!state.activeEncounter) return state;

                let newCombatant = { ...combatant };
                if (state.activeEncounter.isActive) {
                    newCombatant = {
                        ...newCombatant,
                        isJoinedMidRound: true,
                        hasActedThisRound: true // Prevent immediate turn if they roll high
                    };
                }

                const updatedCombatants = sortCombatantsByInitiative([
                    ...state.activeEncounter.combatants,
                    newCombatant
                ]);

                const hasBattleMap = !!state.activeEncounter.battleMap;
                const tokenAlreadyExists = state.activeEncounter.battleMap?.tokens.some(t => t.combatantId === newCombatant.id) || false;
                const updatedBattleMap = hasBattleMap && !tokenAlreadyExists
                    ? {
                        ...state.activeEncounter.battleMap!,
                        tokens: [
                            ...state.activeEncounter.battleMap!.tokens,
                            buildTokenForCombatant(newCombatant, state.activeEncounter.battleMap!)
                        ]
                    }
                    : state.activeEncounter.battleMap;

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updatedCombatants,
                        battleMap: updatedBattleMap
                    }
                };
            }),

            removeCombatant: (id) => set((state) => {
                if (!state.activeEncounter) return state;

                const updatedBattleMap = state.activeEncounter.battleMap
                    ? {
                        ...state.activeEncounter.battleMap,
                        tokens: state.activeEncounter.battleMap.tokens.filter(token => token.combatantId !== id)
                    }
                    : state.activeEncounter.battleMap;

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.filter(c => c.id !== id),
                        battleMap: updatedBattleMap
                    }
                };
            }),

            clearCombatants: () => set((state) => {
                if (!state.activeEncounter) return state;

                const updatedBattleMap = state.activeEncounter.battleMap
                    ? { ...state.activeEncounter.battleMap, tokens: [] }
                    : state.activeEncounter.battleMap;

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: [],
                        battleMap: updatedBattleMap
                    }
                };
            }),

            cancelEncounter: () => set({ activeEncounter: null, pastStates: [], selectedCombatantId: null }),

            rollAllInitiative: () => set((state) => {
                if (!state.activeEncounter) return state;

                const { updatedCombatants, logs } = rollMissingInitiatives(state.activeEncounter.combatants);
                const sorted = sortCombatantsByInitiative(updatedCombatants);

                // Assign current round to new logs
                const roundLogs = logs.map(l => ({ ...l, round: state.activeEncounter!.round }));

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: sorted,
                        log: [...state.activeEncounter.log, ...roundLogs]
                    }
                };
            }),

            setInitiative: (id, score) => set((state) => {
                if (!state.activeEncounter) return state;

                const updated = state.activeEncounter.combatants.map(c =>
                    c.id === id ? { ...c, initiativeScore: score } : c
                );

                const sorted = sortCombatantsByInitiative(updated);
                const name = updated.find(c => c.id === id)?.name || 'Unknown';

                const logEntry: CombatLogEntry = {
                    id: crypto.randomUUID(),
                    round: state.activeEncounter.round,
                    timestamp: Date.now(),
                    message: `${name} initiative set to ${score}.`,
                    type: 'system',
                    combatantId: id
                };

                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: sorted,
                        log: [...state.activeEncounter.log, logEntry]
                    }
                };
            }),

            beginCombat: () => {
                set((state) => {
                    if (!state.activeEncounter || state.activeEncounter.combatants.length === 0) return state;

                    const firstCombatant = state.activeEncounter.combatants[0];
                    const firstId = firstCombatant.id;

                    const initialLogs = [
                        ...state.activeEncounter.log,
                        { id: crypto.randomUUID(), timestamp: Date.now(), round: 1, message: 'Combat started! Round 1 begins.', type: 'system' },
                        { id: crypto.randomUUID(), timestamp: Date.now(), round: 1, message: `${firstCombatant.name}'s turn.`, type: 'system', combatantId: firstId }
                    ] as CombatLogEntry[];

                    if (firstCombatant.isSurprised) {
                        initialLogs.push({ id: crypto.randomUUID(), timestamp: Date.now(), round: 1, message: `${firstCombatant.name}'s turn is skipped because they are surprised!`, type: 'system', combatantId: firstId });
                    }

                    return {
                        activeEncounter: {
                            ...state.activeEncounter,
                            isActive: true,
                            round: 1,
                            activeCombatantId: firstId,
                            combatants: state.activeEncounter.combatants.map(c =>
                                c.id === firstId
                                    ? { ...c, hasAction: !c.isSurprised, hasBonusAction: !c.isSurprised, hasReaction: !c.isSurprised }
                                    : { ...c, hasAction: true, hasBonusAction: true, hasReaction: true }
                            ),
                            turnState: createBasicTurnState(firstCombatant),
                            log: initialLogs
                        }
                    };
                });

                // If first combatant is surprised, we immediately end their turn so they skip it.
                // The nextTurn function will handle clearing their condition and moving to the next combatant.
                const state = get();
                if (state.activeEncounter?.combatants[0]?.isSurprised) {
                    state.nextTurn();
                }
            },

            nextTurn: () => set((state) => {
                if (!state.activeEncounter || !state.activeEncounter.isActive) return state;

                const enc = state.activeEncounter;

                const logs = [...enc.log];
                let currentCombatants = [...enc.combatants];

                // End of current turn: Condition decrement & Surprise removal
                if (enc.activeCombatantId) {
                    currentCombatants = currentCombatants.map(c => {
                        if (c.id === enc.activeCombatantId) {
                            const newlyRemoved: string[] = [];
                            const updatedConditions = c.conditions.map(cond => {
                                if (cond.duration !== undefined) {
                                    const newDuration = cond.duration - 1;
                                    if (newDuration <= 0) newlyRemoved.push(cond.name);
                                    return { ...cond, duration: newDuration };
                                }
                                return cond;
                            }).filter(cond => cond.duration === undefined || cond.duration > 0);

                            newlyRemoved.forEach(condName => {
                                logs.push({
                                    id: crypto.randomUUID(), timestamp: Date.now(), round: enc.round,
                                    message: `${c.name} is no longer ${condName}.`, type: 'status', combatantId: c.id
                                });
                            });

                            let isSurprised = c.isSurprised;
                            if (isSurprised) {
                                isSurprised = false;
                                logs.push({
                                    id: crypto.randomUUID(), timestamp: Date.now(), round: enc.round,
                                    message: `${c.name} is no longer Surprised.`, type: 'system', combatantId: c.id
                                });
                            }

                            return { ...c, conditions: updatedConditions, isSurprised };
                        }
                        return c;
                    });
                }

                const aliveCombatants = currentCombatants.filter(c => !c.isDead);
                let nextId = getNextCombatant(currentCombatants, enc.activeCombatantId);

                let currentAliveIndex = aliveCombatants.findIndex(c => c.id === enc.activeCombatantId);
                let nextAliveIndex = aliveCombatants.findIndex(c => c.id === nextId);

                let currentRound = enc.round;
                let updatedCombatants = currentCombatants;

                const advanceRoundIfNeeded = () => {
                    if (nextAliveIndex <= currentAliveIndex && nextId !== null) {
                        currentRound++;
                        logs.push({
                            id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                            message: `Round ${currentRound} begins.`, type: 'system'
                        });

                        // Turn reset logic handled below
                    }
                };

                advanceRoundIfNeeded();

                let nextCombatant = updatedCombatants.find(c => c.id === nextId);

                // Skip surprised turns automatically
                while (nextCombatant?.isSurprised) {
                    const skipId = nextCombatant.id;
                    logs.push({
                        id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                        message: `${nextCombatant.name}'s turn is skipped because they are surprised!`, type: 'system', combatantId: skipId
                    });

                    // Clear surprise
                    updatedCombatants = updatedCombatants.map(c => {
                        if (c.id === skipId) {
                            logs.push({
                                id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                                message: `${c.name} is no longer Surprised.`, type: 'system', combatantId: c.id
                            });
                            return { ...c, isSurprised: false };
                        }
                        return c;
                    });

                    // Move to next
                    currentAliveIndex = nextAliveIndex;
                    nextId = getNextCombatant(updatedCombatants, skipId);
                    nextAliveIndex = aliveCombatants.findIndex(c => c.id === nextId);

                    advanceRoundIfNeeded();
                    nextCombatant = updatedCombatants.find(c => c.id === nextId);

                    // Break if we somehow looped all the way back to the start and everyone was surprised
                    if (nextId === skipId) break;
                }

                // Turn Start Refresh: Action Economy & Legendary Actions (PHB/MM rules)
                updatedCombatants = updatedCombatants.map(c => {
                    if (c.id === nextId) {
                        const legendaryUpdate = c.legendaryActionsMax !== undefined
                            ? { legendaryActionsRemaining: c.legendaryActionsMax }
                            : {};

                        const noActionConds = ['incapacitated', 'paralyzed', 'stunned', 'unconscious'];
                        const cannotAct = c.conditions?.some(cond => noActionConds.includes(cond.name.toLowerCase())) || false;

                        return {
                            ...c,
                            hasAction: !cannotAct,
                            hasBonusAction: !cannotAct,
                            hasReaction: !cannotAct,
                            ...legendaryUpdate
                        };
                    }
                    return c;
                });

                const nextName = nextCombatant?.name || 'Unknown';
                logs.push({
                    id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                    message: `${nextName}'s turn.`, type: 'system', combatantId: nextId as string
                });

                // Smart DM Reminders
                if (nextCombatant && nextCombatant.type === 'monster' && nextCombatant.monsterData) {
                    const m = nextCombatant.monsterData;

                    // 1. Recharge abilities
                    const checkRecharges = (abilities: any[]) => {
                        if (!abilities) return;
                        abilities.forEach(a => {
                            // 5e.tools typically puts 'Recharge X-Y' in the name or entries
                            const nameStr = a.name?.toLowerCase() || '';
                            if (nameStr.includes('(recharge')) {
                                const match = a.name.match(/\(Recharge (\d)(-\d)?\)/i);
                                const target = match ? match[1] : '6';
                                logs.push({
                                    id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                                    message: `🔄 **Recharge Reminder:** Roll a d6 to see if ${nextName}'s *${a.name.replace(/\s*\(Recharge.*?\)/i, '')}* recharges (recharges on ${target}-6).`,
                                    type: 'system', combatantId: nextId as string
                                });
                            }
                        });
                    };
                    checkRecharges(m.action);
                    checkRecharges(m.trait);

                    // 2. Legendary Resistance
                    if (nextCombatant.legendaryActionsMax && nextCombatant.legendaryActionsMax > 0 && nextCombatant.legendaryActionsRemaining !== undefined) {
                        // Wait, Legendary Resistances are different from Actions! Let's check traits.
                        // We don't track legendary resistances internally on the combatant object right now, except as a standard trait.
                    }
                    if (m.trait) {
                        const legRes = m.trait.find((t: any) => t.name?.toLowerCase().includes('legendary resistance'));
                        if (legRes) {
                            logs.push({
                                id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                                message: `🛡️ **Reminder:** ${nextName} has ${legRes.name}. Don't forget they can choose to succeed on failed saves!`,
                                type: 'system', combatantId: nextId as string
                            });
                        }

                        // 3. Regeneration
                        const regen = m.trait.find((t: any) => t.name?.toLowerCase().includes('regeneration'));
                        if (regen && nextCombatant.currentHp > 0 && nextCombatant.currentHp < nextCombatant.maxHp) {
                            logs.push({
                                id: crypto.randomUUID(), timestamp: Date.now(), round: currentRound,
                                message: `💚 **Regeneration:** ${nextName} regenerates HP at the start of its turn.`,
                                type: 'system', combatantId: nextId as string
                            });
                        }
                    }
                }

                // Fix #5: Auto-prompt death save for players at 0 HP
                if (nextCombatant && nextCombatant.type === 'player' && nextCombatant.currentHp === 0 && !nextCombatant.isDead) {
                    logs.push({
                        id: crypto.randomUUID(), timestamp: Date.now() + 1, round: currentRound,
                        message: `💀 ${nextName} is at 0 HP! They must make a Death Saving Throw (roll 1d20: 10+ = success, 9- = failure, nat 20 = stabilize with 1 HP, nat 1 = 2 failures).`,
                        type: 'status', combatantId: nextId as string
                    });
                }


                const isNewRound = currentRound > enc.round;
                const finalCombatants = isNewRound && updatedCombatants
                    ? updatedCombatants.map(c => ({
                        ...c,
                        isJoinedMidRound: false,
                        hasActedThisRound: false
                    }))
                    : updatedCombatants;

                return {
                    activeEncounter: {
                        ...enc,
                        round: currentRound,
                        activeCombatantId: nextId,
                        combatants: finalCombatants,
                        turnState: createBasicTurnState(nextCombatant),
                        log: logs
                    }
                };
            }),

            setSelectedCombatant: (id) => set(state => {
                if (!id) return { selectedCombatantId: null };
                const combatant = state.activeEncounter?.combatants.find(c => c.id === id);
                if (combatant?.isLair) return state; // Prevent selecting Lair Actions as targets
                return {
                    selectedCombatantId: state.selectedCombatantId === id ? null : id
                };
            }),

            setWizardAction: (wizardAction) => set({ wizardAction }),

            undo: () => set((state) => {
                if (state.pastStates.length === 0) return state;
                const previous = state.pastStates[state.pastStates.length - 1];
                const newPast = state.pastStates.slice(0, -1);
                return {
                    activeEncounter: previous,
                    pastStates: newPast
                };
            }),

            updateCombatant: (id, updates) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const extraLogs: CombatLogEntry[] = [];

                const updatedCombatants = state.activeEncounter.combatants.map(c => {
                    if (c.id !== id) return c;

                    const finalUpdates = { ...updates };

                    // Fix #2: Condition Immunity gate — filter out immune conditions
                    if (finalUpdates.conditions && c.conditionImmunities && c.conditionImmunities.length > 0) {
                        const immuneSet = new Set(c.conditionImmunities.map(ci => ci.toLowerCase()));
                        const filtered = finalUpdates.conditions.filter(cond => {
                            const isImmune = immuneSet.has(cond.name.toLowerCase());
                            if (isImmune) {
                                extraLogs.push({
                                    id: crypto.randomUUID(),
                                    round: state.activeEncounter!.round,
                                    timestamp: Date.now(),
                                    message: `🛡️ ${c.name} is immune to ${cond.name}!`,
                                    type: 'status',
                                    combatantId: c.id
                                });
                            }
                            return !isImmune;
                        });
                        finalUpdates.conditions = filtered;
                    }

                    // Fix #6: Temp HP non-stacking — use higher value (D&D 5e PHB p.198)
                    if (finalUpdates.tempHp !== undefined) {
                        finalUpdates.tempHp = Math.max(finalUpdates.tempHp, c.tempHp);
                    }

                    return { ...c, ...finalUpdates };
                });

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updatedCombatants,
                        log: extraLogs.length > 0
                            ? [...state.activeEncounter.log, ...extraLogs]
                            : state.activeEncounter.log
                    }
                };
            }),

            damageCombatant: (id, amount, damageType, isMagical = false) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                let logEntry: CombatLogEntry | null = null;
                const updated = state.activeEncounter.combatants.map(c => {
                    if (c.id !== id) return c;

                    let finalAmount = amount;
                    let modification = '';

                    if (damageType) {
                        const typeLower = damageType.toLowerCase();

                        // 1. Immunity
                        if (c.immunities?.some(i => i.toLowerCase() === typeLower)) {
                            finalAmount = 0;
                            modification = ' (Immune)';
                        }
                        // 2. Resistance (only if not immune)
                        else if (c.resistances?.some(r => r.toLowerCase() === typeLower)) {
                            // Check for non-magical physical resistance caveats
                            const isPhysical = ['bludgeoning', 'piercing', 'slashing'].includes(typeLower);
                            const hasNonMagicalCaveat = c.damageNotes?.toLowerCase().includes('nonmagical') || c.damageNotes?.toLowerCase().includes('from nonmagical');

                            if (isPhysical && hasNonMagicalCaveat && isMagical) {
                                // Magical bypasses non-magical resistance
                            } else {
                                finalAmount = Math.floor(finalAmount / 2);
                                modification = ' (Resisted)';
                            }
                        }
                        // 3. Vulnerability
                        else if (c.vulnerabilities?.some(v => v.toLowerCase() === typeLower)) {
                            finalAmount = finalAmount * 2;
                            modification = ' (Vulnerable)';
                        }
                    }

                    let remainingDamage = finalAmount;
                    let newTemp = c.tempHp;
                    let newHp = c.currentHp;

                    if (newTemp > 0) {
                        if (newTemp >= remainingDamage) {
                            newTemp -= remainingDamage;
                            remainingDamage = 0;
                        } else {
                            remainingDamage -= newTemp;
                            newTemp = 0;
                        }
                    }

                    newHp = Math.max(0, newHp - remainingDamage);
                    const overflowDamage = remainingDamage - c.currentHp; // How much damage past 0
                    const isDead = newHp === 0;

                    // PHB Massive Damage Rule: If overflow damage >= maxHp, instant death
                    const isInstantDeath = c.type === 'player' && isDead && overflowDamage >= c.maxHp;
                    // Monsters always die at 0 HP; players enter death saves (unless massive damage)
                    const shouldMarkDead = isDead && (c.type === 'monster' || isInstantDeath);

                    const typeStr = damageType ? ` ${damageType}` : '';
                    const isManual = id !== state.activeEncounter?.activeCombatantId;
                    const deathSuffix = isInstantDeath ? ' 💀 INSTANT DEATH (massive damage)!' : isDead ? ' They are dying/dead!' : '';
                    logEntry = {
                        id: crypto.randomUUID(),
                        round: state.activeEncounter!.round,
                        timestamp: Date.now(),
                        message: `${isManual ? '[Manual] ' : ''}${c.name} took ${finalAmount}${typeStr} damage${modification}.${deathSuffix}`,
                        type: 'damage',
                        combatantId: id
                    };

                    // Add Concentration Check reminder
                    return { ...c, currentHp: newHp, tempHp: newTemp, isDead: shouldMarkDead };
                });

                // Prepare additional logs
                const extraLogs: CombatLogEntry[] = [];
                state.activeEncounter.combatants.forEach(c => {
                    if (c.id === id && c.isConcentrating) {
                        const target = updated.find(u => u.id === id);
                        if (target) {
                            if (target.currentHp === 0) {
                                // D&D 5e: Dropping to 0 HP automatically breaks concentration — no save.
                                extraLogs.push({
                                    id: crypto.randomUUID(),
                                    round: state.activeEncounter!.round,
                                    timestamp: Date.now() + 1,
                                    message: `💥 ${c.name} dropped to 0 HP — Concentration on ${c.concentratingOn?.name || 'spell'} is broken!`,
                                    type: 'status',
                                    combatantId: id
                                });
                                // Auto-drop concentration on the combatant
                                const idx = updated.findIndex(u => u.id === id);
                                if (idx !== -1) {
                                    updated[idx] = { ...updated[idx], isConcentrating: false, concentratingOn: undefined };
                                }
                            } else if (target.currentHp < c.currentHp) {
                                const finalDamage = c.currentHp - target.currentHp;
                                if (finalDamage > 0) {
                                    const dc = Math.max(10, Math.floor(finalDamage / 2));
                                    extraLogs.push({
                                        id: crypto.randomUUID(),
                                        round: state.activeEncounter!.round,
                                        timestamp: Date.now() + 1,
                                        message: `⚠️ ${c.name} must make a DC ${dc} Concentration Check (Constitution Save)!`,
                                        type: 'status',
                                        combatantId: id
                                    });
                                }
                            }
                        }
                    }
                });

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updated,
                        log: logEntry ? [...state.activeEncounter.log, logEntry, ...extraLogs] : state.activeEncounter.log
                    }
                };
            }),

            healCombatant: (id, amount) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                let logEntry: CombatLogEntry | null = null;
                const updated = state.activeEncounter.combatants.map(c => {
                    if (c.id !== id) return c;
                    const newHp = Math.min(c.maxHp, c.currentHp + amount);
                    const actualHeal = newHp - c.currentHp;
                    const isManual = id !== state.activeEncounter?.activeCombatantId;
                    logEntry = {
                        id: crypto.randomUUID(),
                        round: state.activeEncounter!.round,
                        timestamp: Date.now(),
                        message: `${isManual ? '[Manual] ' : ''}${c.name} healed for ${actualHeal} HP.`,
                        type: 'heal',
                        combatantId: id
                    };
                    const newDeathSaves = newHp > 0 ? { successes: 0, failures: 0 } : c.deathSaves;
                    return { ...c, currentHp: newHp, isDead: newHp > 0 ? false : c.isDead, deathSaves: newDeathSaves };
                });
                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updated,
                        log: logEntry ? [...state.activeEncounter.log, logEntry] : state.activeEncounter.log
                    }
                };
            }),

            consumeAction: (flags) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const activeId = state.activeEncounter.activeCombatantId;
                const turnState = state.activeEncounter.turnState;
                const activeCombatant = state.activeEncounter.combatants.find(c => c.id === activeId);

                // Determine priorities: Haste -> Extra -> Normal
                let newHasHaste = turnState.hasHasteAction;
                let newExtra = turnState.extraActions;
                let newHasNormal = turnState.hasAction;
                let newUsedHaste = turnState.hasUsedHasteAction;
                let newCastLeveled = turnState.hasCastLeveledSpell;

                // Priority spending: Normal → Extra → Haste (last resort)
                // Haste action is restricted (single weapon attack, Dash, Disengage, Hide, Use Object)
                if (flags?.isHasteAction && newHasHaste) {
                    newHasHaste = false;
                    newUsedHaste = true;
                } else if (newHasNormal) {
                    newHasNormal = false;
                } else if (newExtra > 0) {
                    newExtra -= 1;
                } else if (newHasHaste && !flags?.isLeveledSpell) {
                    // Haste action used as fallback only
                    newHasHaste = false;
                    newUsedHaste = true;
                }

                if (flags?.isLeveledSpell) {
                    newCastLeveled = true;
                }

                // Handle Slow: Consuming Action consumes Bonus Action
                let newHasBonus = turnState.hasBonusAction;
                const isSlowed = activeCombatant?.conditions.some(c => c.name.toLowerCase() === 'slowed' || c.name.toLowerCase() === 'slow');
                if (isSlowed) newHasBonus = false;

                const updates = {
                    hasAction: newHasNormal,
                    extraActions: newExtra,
                    hasHasteAction: newHasHaste,
                    hasBonusAction: newHasBonus,
                    hasCastLeveledSpell: newCastLeveled,
                    hasCastBonusActionSpell: turnState.hasCastBonusActionSpell,
                    hasUsedHasteAction: newUsedHaste
                };

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.map(c =>
                            c.id === activeId ? { ...c, ...updates } : c
                        ),
                        turnState: { ...turnState, ...updates }
                    }
                };
            }),

            consumeBonusAction: (flags) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const activeId = state.activeEncounter.activeCombatantId;
                const turnState = state.activeEncounter.turnState;
                const activeCombatant = state.activeEncounter.combatants.find(c => c.id === activeId);

                // Handle Slow: Consuming Bonus consumes Action
                let newHasNormal = turnState.hasAction;
                const isSlowed = activeCombatant?.conditions.some(c => c.name.toLowerCase() === 'slowed' || c.name.toLowerCase() === 'slow');
                if (isSlowed) newHasNormal = false;

                let newCastLeveled = turnState.hasCastLeveledSpell;
                let newCastBonus = turnState.hasCastBonusActionSpell;
                if (flags?.isLeveledSpell) {
                    newCastLeveled = true;
                    newCastBonus = true;
                }

                const updates = {
                    hasBonusAction: false,
                    hasAction: newHasNormal,
                    hasCastLeveledSpell: newCastLeveled,
                    hasCastBonusActionSpell: newCastBonus
                };

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.map(c =>
                            c.id === activeId ? { ...c, ...updates } : c
                        ),
                        turnState: { ...turnState, ...updates }
                    }
                };
            }),

            consumeReaction: () => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const activeId = state.activeEncounter.activeCombatantId;

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.map(c =>
                            c.id === activeId ? { ...c, hasReaction: false } : c
                        ),
                        turnState: { ...state.activeEncounter.turnState, hasReaction: false }
                    }
                };
            }),

            restoreAction: (id: string) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const isCurrent = id === state.activeEncounter.activeCombatantId;

                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.map(c =>
                            c.id === id ? { ...c, extraActions: (c.extraActions || 0) + 1 } : c
                        ),
                        turnState: isCurrent ? {
                            ...state.activeEncounter.turnState,
                            extraActions: state.activeEncounter.turnState.extraActions + 1
                        } : state.activeEncounter.turnState
                    }
                };
            }),

            useLegendaryAction: (id) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                let logEntry: CombatLogEntry | null = null;
                const updated = state.activeEncounter.combatants.map(c => {
                    if (c.id !== id || c.legendaryActionsRemaining === undefined || c.legendaryActionsRemaining <= 0) return c;
                    logEntry = {
                        id: crypto.randomUUID(),
                        round: state.activeEncounter!.round,
                        timestamp: Date.now(),
                        message: `${c.name} used a Legendary Action.`,
                        type: 'action',
                        combatantId: id
                    };
                    return { ...c, legendaryActionsRemaining: c.legendaryActionsRemaining - 1 };
                });
                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updated,
                        log: logEntry ? [...state.activeEncounter.log, logEntry] : state.activeEncounter.log
                    }
                };
            }),

            toggleCombatantResource: (id, resource) => set((state) => {
                if (!state.activeEncounter) return state;
                const enc = state.activeEncounter;

                const updatedCombatants = enc.combatants.map(c => {
                    if (c.id !== id) return c;

                    switch (resource) {
                        case 'action': return { ...c, hasAction: !c.hasAction };
                        case 'bonus': return { ...c, hasBonusAction: !c.hasBonusAction };
                        case 'reaction': return { ...c, hasReaction: !c.hasReaction };
                        case 'legendary':
                            if (c.legendaryActionsRemaining !== undefined) {
                                const newVal = c.legendaryActionsRemaining > 0 ? 0 : (c.legendaryActionsMax || 3);
                                return { ...c, legendaryActionsRemaining: newVal };
                            }
                            return c;
                        default: return c;
                    }
                });

                // Sync turnState if it's the active combatant
                let updatedTurnState = enc.turnState;
                if (id === enc.activeCombatantId) {
                    const c = updatedCombatants.find(u => u.id === id);
                    if (c) {
                        updatedTurnState = {
                            ...updatedTurnState,
                            hasAction: !!c.hasAction,
                            hasBonusAction: !!c.hasBonusAction,
                            hasReaction: !!c.hasReaction
                        };
                    }
                }

                return {
                    activeEncounter: {
                        ...enc,
                        combatants: updatedCombatants,
                        turnState: updatedTurnState
                    }
                };
            }),

            useSpellSlot: (id, level) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const enc = state.activeEncounter;

                const updatedCombatants = enc.combatants.map(c => {
                    if (c.id !== id) return c;

                    // Update local combatant slots
                    const newSlots = c.spellSlots ? [...c.spellSlots] : [];
                    if (newSlots[level] && newSlots[level].current > 0) {
                        newSlots[level] = { ...newSlots[level], current: newSlots[level].current - 1 };
                    }

                    // If player, also sync to character store
                    if (c.type === 'player' && c.sourceId) {
                        const charStore = useCharacterStore.getState();
                        const char = charStore.characters.find(ch => ch.id === c.sourceId);
                        if (char && char.spellSlots[level] && char.spellSlots[level].current > 0) {
                            const playerSlots = [...char.spellSlots];
                            playerSlots[level] = { ...playerSlots[level], current: playerSlots[level].current - 1 };
                            charStore.updateCharacter(char.id, { spellSlots: playerSlots });
                        }
                    }

                    return { ...c, spellSlots: newSlots };
                });

                const combatant = enc.combatants.find(c => c.id === id);
                const name = combatant?.name || 'Unknown';
                const logEntry: CombatLogEntry = {
                    id: crypto.randomUUID(),
                    round: enc.round,
                    timestamp: Date.now(),
                    message: `${name} cast a Level ${level} spell.`,
                    type: 'action',
                    combatantId: id
                };

                return {
                    pastStates,
                    activeEncounter: {
                        ...enc,
                        combatants: updatedCombatants,
                        log: [...enc.log, logEntry]
                    }
                };
            }),

            setConcentration: (id, spell) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                let logEntry: CombatLogEntry | null = null;
                const updated = state.activeEncounter.combatants.map(c => {
                    if (c.id !== id) return c;
                    if (spell) {
                        logEntry = {
                            id: crypto.randomUUID(),
                            round: state.activeEncounter!.round,
                            timestamp: Date.now(),
                            message: `${c.name} begins concentrating on ${spell.name}.`,
                            type: 'status',
                            combatantId: id
                        };
                    } else if (c.concentratingOn) {
                        logEntry = {
                            id: crypto.randomUUID(),
                            round: state.activeEncounter!.round,
                            timestamp: Date.now(),
                            message: `${c.name} dropped concentration on ${c.concentratingOn.name}.`,
                            type: 'status',
                            combatantId: id
                        };
                    }
                    return {
                        ...c,
                        isConcentrating: !!spell,
                        concentratingOn: spell ? spell : undefined
                    };
                });
                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updated,
                        log: logEntry ? [...state.activeEncounter.log, logEntry] : state.activeEncounter.log
                    }
                };
            }),

            setReadiedAction: (id, action) => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const logEntry: CombatLogEntry | null = action
                    ? { id: crypto.randomUUID(), round: state.activeEncounter.round, timestamp: Date.now(), message: `${state.activeEncounter.combatants.find(c => c.id === id)?.name} readied an action (Trigger: ${action.trigger})`, type: 'system', combatantId: id }
                    : null;
                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: state.activeEncounter.combatants.map(c => c.id === id ? { ...c, readiedAction: action || undefined } : c),
                        log: logEntry ? [...state.activeEncounter.log, logEntry] : state.activeEncounter.log
                    }
                };
            }),

            refreshPlayerStats: () => set((state) => {
                if (!state.activeEncounter) return state;
                const pastStates = [...(state.pastStates || []), state.activeEncounter].slice(-10);
                const charStore = useCharacterStore.getState();
                const updatedCombatants = state.activeEncounter.combatants.map(c => {
                    if (c.type !== 'player' || !c.sourceId) return c;
                    const char = charStore.characters.find(ch => ch.id === c.sourceId);
                    if (!char) return c;
                    return {
                        ...c,
                        name: char.name,
                        ac: getArmorClass(char),
                        maxHp: Number(char.maxHp) || c.maxHp,
                        currentHp: Math.min(c.currentHp, Number(char.maxHp) || c.maxHp),
                        speed: char.speed || c.speed,
                        abilityScores: char.abilityScores ? {
                            str: Number(char.abilityScores.str) || 10,
                            dex: Number(char.abilityScores.dex) || 10,
                            con: Number(char.abilityScores.con) || 10,
                            int: Number(char.abilityScores.int) || 10,
                            wis: Number(char.abilityScores.wis) || 10,
                            cha: Number(char.abilityScores.cha) || 10,
                        } : c.abilityScores,
                        dexterityScore: getEffectiveAbilityScore(char, 'dex'),
                        initiativeMod: getInitiative(char),
                        proficiencyBonus: Number(char.proficiencyBonus) || c.proficiencyBonus,
                        savingThrowProficiencies: char.savingThrows || c.savingThrowProficiencies,
                        spellcastingAbility: char.spellcastingAbility || c.spellcastingAbility,
                        spellSaveDc: Number(char.spellSaveDc) || c.spellSaveDc,
                        spellAttackMod: Number(char.spellAttackMod) || c.spellAttackMod,
                        resistances: char.resistances || c.resistances,
                        immunities: char.immunities || c.immunities,
                        vulnerabilities: char.vulnerabilities || c.vulnerabilities,
                        conditionImmunities: char.conditionImmunities || c.conditionImmunities,
                        damageNotes: char.damageNotes || c.damageNotes,
                        spellSlots: char.spellSlots || c.spellSlots,
                    };
                });
                return {
                    pastStates,
                    activeEncounter: {
                        ...state.activeEncounter,
                        combatants: updatedCombatants
                    }
                };
            }),

            addLog: (entry) => set((state) => {
                if (!state.activeEncounter) return state;
                const fullEntry: CombatLogEntry = {
                    ...entry,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    round: state.activeEncounter.round
                };
                return {
                    activeEncounter: {
                        ...state.activeEncounter,
                        log: [...state.activeEncounter.log, fullEntry]
                    }
                };
            })
        }),
        {
            name: 'dm-assistant-combat',
            partialize: (state) => ({
                activeEncounter: state.activeEncounter,
                history: state.history,
                savedEncounters: state.savedEncounters
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const sanitizeCombatants = (combatants: any[]) =>
                    combatants.map(c => ({
                        ...c,
                        maxHp: Math.min(Math.max(Number(c.maxHp) || 1, 1), c.type === 'monster' ? 9999 : 999),
                        currentHp: Math.min(Math.max(Number(c.currentHp) || 0, 0), c.type === 'monster' ? 9999 : 999),
                        tempHp: Math.min(Math.max(Number(c.tempHp) || 0, 0), 999),
                        abilityScores: c.abilityScores ? {
                            str: Math.min(Math.max(Number(c.abilityScores.str) || 10, 1), 30),
                            dex: Math.min(Math.max(Number(c.abilityScores.dex) || 10, 1), 30),
                            con: Math.min(Math.max(Number(c.abilityScores.con) || 10, 1), 30),
                            int: Math.min(Math.max(Number(c.abilityScores.int) || 10, 1), 30),
                            wis: Math.min(Math.max(Number(c.abilityScores.wis) || 10, 1), 30),
                            cha: Math.min(Math.max(Number(c.abilityScores.cha) || 10, 1), 30),
                        } : c.abilityScores,
                    }));

                if (state.activeEncounter) {
                    state.activeEncounter.combatants = sanitizeCombatants(state.activeEncounter.combatants);
                }
                state.history = (state.history || []).map(enc => ({
                    ...enc,
                    combatants: sanitizeCombatants(enc.combatants)
                }));
                state.savedEncounters = state.savedEncounters || [];
            }
        }
    )
);
