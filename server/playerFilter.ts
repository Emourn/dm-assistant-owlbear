/**
 * Player Filter
 * 
 * Filters game state before sending it to a specific player.
 * Players should only see:
 *   - Their own character sheet
 *   - Public combat info (HP, AC, position of all combatants — but no hidden DM notes)
 *   - The map with fog of war applied
 *   - Chat messages addressed to them or public
 *
 * Players should NOT see:
 *   - Other players' character sheets
 *   - DM notes, navigator state, campaign management
 *   - Monster statblock internals (STR/DEX/etc unless revealed)
 *   - Full fog of war data (they only see revealed areas)
 */

import type { PlayerInfo } from './roomManager.js';
import { buildSessionPresentation } from '../src/engine/sessionPresentation.js';

/**
 * Data shapes — these match the Zustand store structures on the client.
 * We use `any` here because the server doesn't import client types;
 * it treats state as opaque JSON and only filters specific fields.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FilteredStateBundle {
    characters: any;
    combat: any;
    map: any;
    chat: any;
    navigator?: any;
    presentation?: any;
}

/**
 * Filter character data for a specific player.
 * They only see the character assigned to them via characterId.
 */
export function filterCharacters(allCharacters: any[], player: PlayerInfo): any[] {
    if (!player.characterId) return [];

    const myChar = allCharacters.find((c: any) => c.id === player.characterId);
    return myChar ? [myChar] : [];
}

/**
 * Filter combat/encounter data for a player.
 * They see:
 *   - All combatants' names, HP, AC, conditions, position, initiative (public info)
 *   - The current turn, round number
 *   - Combat log (public entries)
 * They don't see:
 *   - Monster ability scores, spellcasting ability, internal statblock data
 *   - DM-only log entries
 *   - Hidden combatants (unless the DM has revealed them)
 */
export function filterCombat(encounter: any, player: PlayerInfo): any {
    if (!encounter) return null;

    const filteredCombatants = (encounter.combatants || []).map((c: any) => {
        // Public info for all combatants
        const publicData: any = {
            id: c.id,
            sourceId: c.sourceId,
            type: c.type,
            name: c.name,
            portraitUrl: c.portraitUrl,
            ac: c.ac,
            maxHp: c.maxHp,
            currentHp: c.currentHp,
            tempHp: c.tempHp,
            conditions: c.conditions,
            isDead: c.isDead,
            initiativeScore: c.initiativeScore,
            gridPosition: c.gridPosition,
            tokenSize: c.tokenSize,
            elevation: c.elevation,
            isConcentrating: c.isConcentrating,
            concentratingOn: c.concentratingOn,
            deathSaves: c.type === 'player' ? c.deathSaves : undefined,
            speed: c.speed,
        };

        // If it's this player's character, include full data
        if (c.sourceId === player.characterId || c.id === player.characterId) {
            return {
                ...publicData,
                abilityScores: c.abilityScores,
                spellSlots: c.spellSlots,
                hasAction: c.hasAction,
                hasBonusAction: c.hasBonusAction,
                hasReaction: c.hasReaction,
                spellcastingAbility: c.spellcastingAbility,
                spellSaveDc: c.spellSaveDc,
                spellAttackMod: c.spellAttackMod,
                proficiencyBonus: c.proficiencyBonus,
                savingThrowProficiencies: c.savingThrowProficiencies,
                resistances: c.resistances,
                immunities: c.immunities,
                vulnerabilities: c.vulnerabilities,
                exhaustion: c.exhaustion,
            };
        }

        return publicData;
    });

    const filteredLog = (encounter.log || []).filter((entry: any) => {
        // Hide DM-only entries
        if (entry.dmOnly) return false;
        return true;
    });

    return {
        id: encounter.id,
        title: encounter.title,
        isActive: encounter.isActive,
        round: encounter.round,
        activeCombatantId: encounter.activeCombatantId,
        combatants: filteredCombatants,
        log: filteredLog,
        turnState: encounter.turnState,
    };
}

import { computePlayerVision } from '../src/engine/visionEngine.js';

/**
 * Filter map/battle state for a player.
 * Apply fog of war: the player sees only the revealed/visible portions.
 * Tokens are only visible if they fall within the player's computed vision.
 */
export function filterMap(battleMap: any, combatants: any[], player: PlayerInfo): any {
    if (!battleMap) return null;

    // By default, assume no active vision (empty map basically)
    let visibleCells: string[] = [];
    let visibleTokenIds: string[] = [];
    let filteredTokens = [];

    // If the player has a character, compute their vision
    if (player.characterId && battleMap.tokens) {
        // Find all tokens belonging to this player (usually 1, but could be multiple if they control pets)
        const myTokens = battleMap.tokens.filter((t: any) => {
            const combatant = combatants.find((c: any) => c.id === t.combatantId);
            return combatant?.sourceId === player.characterId || t.combatantId === player.characterId;
        });
        
        if (myTokens.length > 0) {
            const allVisibleCells = new Set<string>();
            const allVisibleTokenIds = new Set<string>();

            // Combine vision from all controlled tokens
            for (const token of myTokens) {
                const result = computePlayerVision(token, battleMap);
                result.visibleCells.forEach(c => allVisibleCells.add(c));
                result.visibleTokenIds.forEach(t => allVisibleTokenIds.add(t));
            }

            visibleCells = Array.from(allVisibleCells);
            visibleTokenIds = Array.from(allVisibleTokenIds);
            
            // Only send tokens that are visible
            filteredTokens = battleMap.tokens.filter((t: any) => allVisibleTokenIds.has(t.id));
        } else {
             // DM hasn't placed their token yet or they don't have one on this map.
             // We could either show them nothing, or show them everything (like they are a spectator).
             // Given D&D, if you have no token, you're blind on the map until placed.
             filteredTokens = [];
        }
    } else {
        // No character assigned, they see no tokens
        filteredTokens = [];
    }

    return {
        gridWidth: battleMap.gridWidth,
        gridHeight: battleMap.gridHeight,
        cellSizePx: battleMap.cellSizePx,
        gridColor: battleMap.gridColor,
        backgroundColor: battleMap.backgroundColor,
        tokens: filteredTokens,
        visibleCells, // NEW: Client uses this to render exact FoW mask
        defaultLightLevel: battleMap.defaultLightLevel,
        defaultWeather: battleMap.defaultWeather,
        visionZones: battleMap.visionZones,
        // Strip DM-only shapes
        shapes: (battleMap.shapes ?? []).filter((s: any) => s.visibility !== 'dm-only'),
        freehandPaths: battleMap.freehandPaths,
        backgroundImageUrl: battleMap.backgroundImageUrl,
        backgroundOffset: battleMap.backgroundOffset,
        backgroundScaleX: battleMap.backgroundScaleX,
        backgroundScaleY: battleMap.backgroundScaleY,
        fogOfWar: (battleMap.fogOfWar ?? []).filter((s: any) => s.visibility !== 'dm-only'),
        fogOfWarFreehand: battleMap.fogOfWarFreehand,
    };
}

/**
 * Filter chat messages for a player.
 * Public messages are visible to all.
 * Whispers are only visible to the sender and the recipient.
 */
export function filterChat(chatLog: any[], player: PlayerInfo): any[] {
    if (!chatLog) return [];

    return chatLog.filter((msg: any) => {
        // Public messages
        if (!msg.isWhisper) return true;

        // Whisper: visible to sender and recipient
        if (msg.recipientId === player.socketId) return true;
        if (msg.senderId === player.socketId) return true;

        return false;
    });
}

/**
 * Build a complete filtered state bundle for a specific player.
 * 
 * @param activeMap - Optional map pushed directly by DM. When present, overrides
 *                    the combat battleMap as the map shown to players.
 */
export function buildFilteredState(
    fullState: {
        characters: any[];
        combat: any;
        navigator?: any;
        chat: any[];
    },
    player: PlayerInfo,
    activeMap?: any | null,
    blackout?: boolean,
): FilteredStateBundle {
    const combat = fullState.combat;
    const { map: battleMap, presentation } = buildSessionPresentation({
        combat,
        navigator: fullState.navigator,
        legacyMap: activeMap,
        blackout,
    });
    const combatants = combat?.combatants || [];

    return {
        characters: filterCharacters(fullState.characters, player),
        combat: filterCombat(combat, player),
        map: filterMap(battleMap, combatants, player),
        chat: filterChat(fullState.chat, player),
        presentation,
    };
}
