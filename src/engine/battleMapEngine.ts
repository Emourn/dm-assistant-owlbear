import { Combatant } from '../types/combat';
import { MapToken, GridPosition } from '../types/battleMap';
import { getReachableCells } from './gridEngine';

/**
 * Converts a list of combatants into MapTokens for the grid.
 * Preserves existing positions if they exist.
 */
export function syncCombatantsToTokens(
    combatants: Combatant[],
    existingTokens: MapToken[] = []
): MapToken[] {
    return combatants.map(c => {
        // Find existing token to preserve position
        const existing = existingTokens.find(t => t.combatantId === c.id);

        // Default position if new (scattered at origin for now)
        const defaultPos: GridPosition = existing?.position || { col: 0, row: 0 };

        return {
            id: existing?.id || crypto.randomUUID(),
            combatantId: c.id,
            name: c.name,
            position: defaultPos,
            size: c.tokenSize || 1, // Medium = 1
            color: existing?.color || (c.type === 'player' ? '#3b82f6' : '#ef4444'),
            faction: c.type === 'player' ? 'player' : 'enemy',
            elevation: c.elevation || 0,
            auras: existing?.auras,
            showHealthBar: existing?.showHealthBar ?? true,
            showNameLabel: existing?.showNameLabel ?? true
        };
    });
}

/**
 * Calculates all reachable grid positions for a token based on its speed.
 */
export function calculateMovementRange(
    start: GridPosition,
    speedFt: number,
    tokens: MapToken[],
    actingTokenId: string
): GridPosition[] {
    // In D&D 5e:
    // 1. You can move through a nonhostile creature's space.
    // 2. You can move through a hostile creature's space only if the creature is at least two sizes larger or smaller than you.
    // 3. Another creature's space is difficult terrain for you. (Simplified for now)

    const actingToken = tokens.find(t => t.id === actingTokenId);
    if (!actingToken) return [];

    const otherTokens = tokens.filter(t => t.id !== actingTokenId);

    // For simplicity in this first pass:
    // - Other tokens are "blockers" if they are enemies.
    // - Friends can be passed through.

    const obstacles = otherTokens
        .filter(t => t.faction !== actingToken.faction)
        .map(t => t.position);

    return getReachableCells(start, speedFt, obstacles);
}
