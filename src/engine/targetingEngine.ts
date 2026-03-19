import { CombatAction } from '../types/combat';
import { GridPosition, TargetingOverlay, MapToken } from '../types/battleMap';
import {
    getCellsInRadius,
    getCellsInCone,
    getCellsInLine,
    getCellsInCube,
    getCreatureOccupiedCells
} from './gridEngine';

export interface ActionRangeInfo {
    rangeFt: number;
    aoeType?: TargetingOverlay['type'];
    aoeRadiusFt?: number;
}

export function parseActionRange(action: CombatAction): ActionRangeInfo {
    const rangeStr = action.range || "";
    const info: ActionRangeInfo = { rangeFt: 5 }; // Default melee

    const lowerRange = rangeStr.toLowerCase();
    const lowerDesc = (action.description || "").toLowerCase();

    // 1. EXTRACT BASE RANGE
    // Handle "Touch" or "Self"
    if (lowerRange.includes('touch')) {
        info.rangeFt = 5; // Touch effectively targets adjacent in grid combat
    } else if (lowerRange.includes('self')) {
        info.rangeFt = 0;
    } else {
        // Extract standard numerical range (e.g. "150 ft", "60/120 ft")
        const rangeMatch = lowerRange.match(/(\d+)\s*ft/);
        if (rangeMatch) {
            info.rangeFt = parseInt(rangeMatch[1], 10);
        }
    }

    // 2. EXTRACT AREA OF EFFECT (Shape & Size)
    // We search both the range string (e.g. "Self (60-foot cone)") and the description
    const searchString = `${lowerRange} ||| ${lowerDesc}`;

    // Regex library for 5e phrasing patterns 
    // We use capture groups to grab the numerical size.

    const patterns = [
        // SPHERES / RADIUS (e.g. "20-foot-radius sphere", "sphere with a 20-foot radius", "radius of 20 feet")
        { type: 'circle' as const, regex: /(?:(\d+)[-\s]+foot[\s-]+radius[\s-]+sphere)|(?:sphere[\s\w]+(\d+)[-\s]+foot[\s-]+radius)|(?:radius[\s\w]+(\d+)[-\s]+(?:feet|ft))/i },
        { type: 'circle' as const, regex: /(?:(\d+)[-\s]+ft[\s.]*radius)|(?:(\d+)[-\s]+foot[\s.]*radius)/i },

        // CONES (e.g. "60-foot cone", "cone of cold 60 feet long")
        { type: 'cone' as const, regex: /(?:(\d+)[-\s]+foot[\s-]+cone)|(?:(\d+)[-\s]+ft[\s.]*cone)/i },
        { type: 'cone' as const, regex: /(?:cone[\s\w]+(\d+)[-\s]+feet)/i },

        // CUBES (e.g. "15-foot cube", "cube that is 15 feet on each side")
        { type: 'cube' as const, regex: /(?:(\d+)[-\s]+foot[\s-]+cube)|(?:(\d+)[-\s]+ft[\s.]*cube)/i },
        { type: 'cube' as const, regex: /(?:cube[\s\w]+(\d+)[-\s]+feet)/i },

        // LINES (e.g. "line 100 feet long and 5 feet wide", "100-foot line")
        { type: 'line' as const, regex: /(?:line\s+(\d+)\s+feet\s+long)/i },
        { type: 'line' as const, regex: /(?:(\d+)[-\s]+foot[\s-]+line)|(?:(\d+)[-\s]+ft[\s.]*line)/i },

        // CYLINDERS (Treat visually as circles on a 2D map)
        { type: 'circle' as const, regex: /(?:(\d+)[-\s]+foot[\s-]+radius[\s\w,-]+cylinder)/i }
    ];

    // Evaluate patterns. First match wins (descriptions usually put the AoE text early).
    for (const pattern of patterns) {
        const match = searchString.match(pattern.regex);
        if (match) {
            info.aoeType = pattern.type;
            // The numerical size will be in one of the capture groups depending on which alternation matched
            const sizeStr = match[1] || match[2] || match[3];
            if (sizeStr) {
                info.aoeRadiusFt = parseInt(sizeStr, 10);
            }
            break; // Stop after first positive identification
        }
    }

    // 3. SPECIAL RULES & OVERRIDES

    // If spell is Self, and it has an AoE size but NO extracted range yet, ensure range is 0 
    // Example: "Self (15-foot cone)". The regex found the cone, now set the origin to self.
    if (lowerRange.includes('self')) {
        if (!info.aoeRadiusFt) {
            // Some odd spells just say "Self" but the target *is* the caster in a radius (like a buff).
            // We usually don't need a radius for that, it's just a single target (Self).
            info.rangeFt = 0;
        } else {
            // "Self (15-foot cone)" -> range 0, length/radius 15.
            info.rangeFt = 0;
        }
    }

    return info;
}

/**
 * Builds a targeting overlay based on current mouse position or target token.
 */
export function buildTargetingOverlay(
    action: CombatAction,
    casterPos: GridPosition,
    targetPos: GridPosition,
    allTokens: MapToken[]
): TargetingOverlay {
    const info = parseActionRange(action);

    const overlay: TargetingOverlay = {
        type: info.aoeType || 'circle',
        originPosition: casterPos,
        targetPosition: targetPos,
        rangeFt: info.rangeFt,
        radiusFt: info.aoeRadiusFt || 0,
        affectedCells: [],
        affectedCombatantIds: [],
        damageType: action.damageType
    };

    // Calculate affected cells based on type
    if (info.aoeType === 'circle') {
        // If range is 0 (Self), center is caster. Otherwise center is target pos.
        const center = info.rangeFt === 0 ? casterPos : targetPos;
        overlay.affectedCells = getCellsInRadius(center, info.aoeRadiusFt || 0);
    } else if (info.aoeType === 'cone') {
        overlay.affectedCells = getCellsInCone(casterPos, targetPos, info.aoeRadiusFt || 0);
    } else if (info.aoeType === 'line') {
        overlay.affectedCells = getCellsInLine(casterPos, targetPos, info.aoeRadiusFt || 100);
    } else if (info.aoeType === 'cube') {
        if (info.rangeFt === 0) {
            overlay.affectedCells = getCellsInCube(targetPos, info.aoeRadiusFt || 0, casterPos);
        } else {
            overlay.affectedCells = getCellsInCube(targetPos, info.aoeRadiusFt || 0);
        }
    } else {
        // Single target - the cell clicked
        overlay.affectedCells = [targetPos];
    }

    // Identify tokens inside the area (handling Large+ sizes)
    const cellSet = new Set(overlay.affectedCells.map(c => `${c.col},${c.row}`));
    overlay.affectedCombatantIds = allTokens
        .filter(t => {
            const occupied = getCreatureOccupiedCells(t);
            return occupied.some(c => cellSet.has(`${c.col},${c.row}`));
        })
        .map(t => t.combatantId);

    return overlay;
}

