import { GridPosition, MapToken, BattleMapState, LightLevel, WeatherEffect, VisionZone, TokenVision, VisionResult } from '../types/battleMap';
import { gridDistanceFt } from './gridEngine';

export const DEFAULT_TOKEN_VISION: TokenVision = {
    sightRadiusFt: 120,    // Normal human-ish outdoors
    darkvisionFt: 0,
    blindsightFt: 0,
    tremorsenseFt: 0,
    truesightFt: 0,
    devilsSight: false
};

/**
 * Checks if a specific cell falls within a Vision Zone.
 * If multiple zones overlap, the last one defined takes precedence (painter's algorithm).
 */
export function getZoneAtCell(
    cell: GridPosition,
    zones: VisionZone[] | undefined,
    defaultLight: LightLevel = 'bright',
    defaultWeather: WeatherEffect = 'none',
    cellSizePx: number = 40
): { lightLevel: LightLevel; weatherEffect: WeatherEffect } {
    let lightLevel = defaultLight;
    let weatherEffect = defaultWeather;

    if (!zones || zones.length === 0) {
        return { lightLevel, weatherEffect };
    }

    // Convert cell to center pixel for intersection tests
    const px = cell.col * cellSizePx + (cellSizePx / 2);
    const py = cell.row * cellSizePx + (cellSizePx / 2);

    for (const zone of zones) {
        let isInside = false;

        if (zone.type === 'rectangle' && zone.widthFt !== undefined && zone.heightFt !== undefined) {
            const zx = zone.position.col * cellSizePx;
            const zy = zone.position.row * cellSizePx;
            const zw = (zone.widthFt / 5) * cellSizePx;
            const zh = (zone.heightFt / 5) * cellSizePx;

            isInside = px >= zx && px <= zx + zw && py >= zy && py <= zy + zh;
        } else if (zone.type === 'circle' && zone.radiusFt !== undefined) {
            const cx = zone.position.col * cellSizePx + (cellSizePx / 2);
            const cy = zone.position.row * cellSizePx + (cellSizePx / 2);
            const rPx = (zone.radiusFt / 5) * cellSizePx;

            const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
            isInside = distSq <= rPx * rPx;
        }

        if (isInside) {
            if (zone.lightLevel) lightLevel = zone.lightLevel;
            if (zone.weatherEffect) weatherEffect = zone.weatherEffect;
        }
    }

    return { lightLevel, weatherEffect };
}

/**
 * D&D 2024 limits on vision due to weather precipitation (obscurement).
 */
function getWeatherVisionLimitFt(weather: WeatherEffect): number {
    switch (weather) {
        case 'heavy-rain': return 30; // Heavy obscurement beyond this
        case 'fog': return 30;
        case 'mist': return 60;
        case 'blizzard': return 15;
        case 'sandstorm': return 15;
        case 'rain': return 120; // Light obscurement, usually doesn't strictly cap distance but gives disadvantage
        case 'none':
        default: return Infinity;
    }
}

/**
 * Calculates a token's effective sight radius at their CURRENT position,
 * given the environmental light and weather, considering their special senses.
 * 
 * NOTE: D&D vision is actually line-of-sight from the viewer to the target.
 * We simplify slightly by determining maximum possible range first, then raycasting.
 * A creature standing in darkness with no darkvision sees 0ft, even if there's a light 30ft away.
 * (Actually, if there's a light 30ft away, the creature can see things *in the light*, but not the dark between them.
 * Our raycaster handles this nuance by checking the target cell's light level as well).
 */
export function getEffectiveSightRadius(
    vision: TokenVision,
    ambientLight: LightLevel,
    ambientWeather: WeatherEffect
): number {
    let maxSight = vision.sightRadiusFt;

    // Highest special sense range
    const maxSpecialSense = Math.max(
        vision.truesightFt,
        vision.blindsightFt,
        vision.tremorsenseFt
    );

    // Weather hard-caps normal vision (but often not blindsight/tremorsense)
    const weatherCap = getWeatherVisionLimitFt(ambientWeather);
    let effectiveSight = Math.min(maxSight, weatherCap);

    // Light level restrictions
    if (ambientLight === 'magical-darkness') {
        if (!vision.devilsSight && vision.truesightFt === 0 && vision.blindsightFt === 0) {
            effectiveSight = 0; // Completely blind without special senses
        }
    } else if (ambientLight === 'darkness') {
        if (vision.darkvisionFt === 0 && maxSpecialSense === 0) {
            effectiveSight = 0; // Blind in normal darkness without darkvision
        } else if (vision.darkvisionFt > 0) {
            effectiveSight = Math.min(effectiveSight, Math.max(vision.darkvisionFt, weatherCap));
        }
    }

    // Special senses can pierce weather/light reductions up to their range
    return Math.max(effectiveSight, maxSpecialSense);
}

/**
 * Checks if a specific target cell is visible to a viewer,
 * considering the target cell's light/weather and the viewer's senses.
 */
function isTargetCellVisible(
    viewerVision: TokenVision,
    targetLight: LightLevel,
    targetWeather: WeatherEffect,
    distanceFt: number
): boolean {
    const isWithinSpecialSense = 
        distanceFt <= viewerVision.blindsightFt ||
        distanceFt <= viewerVision.tremorsenseFt ||
        distanceFt <= viewerVision.truesightFt;

    if (isWithinSpecialSense) return true;

    // Normal vision is restricted by target's weather
    const weatherCap = getWeatherVisionLimitFt(targetWeather);
    if (distanceFt > weatherCap) return false;

    if (targetLight === 'magical-darkness') {
        return viewerVision.devilsSight;
    }

    if (targetLight === 'darkness') {
        return distanceFt <= viewerVision.darkvisionFt;
    }

    // Dim or Bright light
    return distanceFt <= viewerVision.sightRadiusFt;
}

/**
 * Casts a ray from start to end to check for blocking terrain/shapes.
 * Uses Bresenham's line algorithm.
 */
function castRay(
    start: GridPosition,
    end: GridPosition,
    blockingCells: Set<string>
): boolean {
    let x0 = start.col;
    let y0 = start.row;
    const x1 = end.col;
    const y1 = end.row;

    // Don't check the starting cell itself
    if (x0 === x1 && y0 === y1) return true;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        // We reached the target without hitting a blocker
        if (x0 === x1 && y0 === y1) return true;

        // Skip checking the start cell
        if (!(x0 === start.col && y0 === start.row)) {
            const cellKey = `${x0},${y0}`;
            if (blockingCells.has(cellKey)) {
                return false; // Hit a wall
            }
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

/**
 * Computes all visible cells for a given token based on D&D 2024 rules.
 * Does a flood-fill/raycast outward up to their maximum possible sight radius.
 */
export function computePlayerVision(
    token: MapToken,
    mapState: BattleMapState
): VisionResult {
    const visibleCells = new Set<string>();
    const visibleTokenIds = new Set<string>();

    const vision = token.vision || DEFAULT_TOKEN_VISION;
    const origin = token.position;

    // 1. Determine environment at viewer's position
    const viewerEnv = getZoneAtCell(
        origin,
        mapState.visionZones,
        mapState.defaultLightLevel,
        mapState.defaultWeather,
        mapState.cellSizePx
    );

    // 2. Determine max theoretical radius (to avoid checking the whole map)
    const maxSight = getEffectiveSightRadius(vision, viewerEnv.lightLevel, viewerEnv.weatherEffect);
    
    // If blind, they only "see" their own space
    if (maxSight <= 0) {
        visibleCells.add(`${origin.col},${origin.row}`);
        visibleTokenIds.add(token.id);
        return { visibleCells: Array.from(visibleCells), visibleTokenIds: Array.from(visibleTokenIds) };
    }

    // 3. Pre-compute blocking cells from map shapes (walls)
    // Note: in early versions, we used thick shapes or Fog of War with black fill as blockers.
    const blockingCells = new Set<string>();
    if (mapState.fogOfWar) {
        for (const shape of mapState.fogOfWar) {
            if (shape.style.fill === 'black' && shape.type === 'rectangle' && shape.points.length >= 2) {
                const x1 = Math.min(shape.points[0].col, shape.points[1].col);
                const x2 = Math.max(shape.points[0].col, shape.points[1].col);
                const y1 = Math.min(shape.points[0].row, shape.points[1].row);
                const y2 = Math.max(shape.points[0].row, shape.points[1].row);
                
                // Add all cells covered by the blocking rectangle
                for (let r = y1; r <= y2; r++) {
                    for (let c = x1; c <= x2; c++) {
                        blockingCells.add(`${c},${r}`);
                    }
                }
            } else if (shape.style.fill === 'black' && shape.type === 'circle' && shape.points.length >= 2) {
                 // Circle blocking logic (simplified bounding box for now, could be improved)
                 const cx = shape.points[0].col;
                 const cy = shape.points[0].row;
                 const px = shape.points[1].col;
                 const py = shape.points[1].row;
                 const radius = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
                 
                 for (let r = Math.floor(cy - radius); r <= Math.ceil(cy + radius); r++) {
                     for (let c = Math.floor(cx - radius); c <= Math.ceil(cx + radius); c++) {
                         if (Math.pow(c - cx, 2) + Math.pow(r - cy, 2) <= radius * radius) {
                             blockingCells.add(`${c},${r}`);
                         }
                     }
                 }
            }
        }
    }

    if (mapState.shapes) {
        for (const shape of mapState.shapes) {
            if (shape.isBlockingLoS && shape.points.length >= 2) {
                if (shape.type === 'rectangle') {
                    const x1 = Math.min(shape.points[0].col, shape.points[1].col);
                    const x2 = Math.max(shape.points[0].col, shape.points[1].col);
                    const y1 = Math.min(shape.points[0].row, shape.points[1].row);
                    const y2 = Math.max(shape.points[0].row, shape.points[1].row);
                    for (let r = y1; r <= y2; r++) {
                        for (let c = x1; c <= x2; c++) {
                            blockingCells.add(`${c},${r}`);
                        }
                    }
                } else if (shape.type === 'circle') {
                    const cx = shape.points[0].col;
                    const cy = shape.points[0].row;
                    const px = shape.points[1].col;
                    const py = shape.points[1].row;
                    const radius = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
                    for (let r = Math.floor(cy - radius); r <= Math.ceil(cy + radius); r++) {
                        for (let c = Math.floor(cx - radius); c <= Math.ceil(cx + radius); c++) {
                            if (Math.pow(c - cx, 2) + Math.pow(r - cy, 2) <= radius * radius) {
                                blockingCells.add(`${c},${r}`);
                            }
                        }
                    }
                } else if (shape.type === 'line') {
                    let x0 = shape.points[0].col;
                    let y0 = shape.points[0].row;
                    const x1 = shape.points[1].col;
                    const y1 = shape.points[1].row;
                    const dx = Math.abs(x1 - x0);
                    const dy = Math.abs(y1 - y0);
                    const sx = (x0 < x1) ? 1 : -1;
                    const sy = (y0 < y1) ? 1 : -1;
                    let err = dx - dy;

                    while (true) {
                        blockingCells.add(`${x0},${y0}`);
                        if (x0 === x1 && y0 === y1) break;
                        const e2 = 2 * err;
                        if (e2 > -dy) { err -= dy; x0 += sx; }
                        if (e2 < dx) { err += dx; y0 += sy; }
                    }
                }
            }
        }
    }

    // 4. Raycast to every cell within maxSight radius
    const radiusSquares = Math.ceil(maxSight / 5);
    
    // Always see own cell
    visibleCells.add(`${origin.col},${origin.row}`);
    visibleTokenIds.add(token.id);

    for (let r = origin.row - radiusSquares; r <= origin.row + radiusSquares; r++) {
        for (let c = origin.col - radiusSquares; c <= origin.col + radiusSquares; c++) {
            // Keep within map bounds
            if (c < 0 || r < 0 || c >= mapState.gridWidth || r >= mapState.gridHeight) continue;

            const targetPos = { col: c, row: r };
            const distFt = gridDistanceFt(origin, targetPos);

            if (distFt > maxSight) continue;

            // Target cell environment
            const targetEnv = getZoneAtCell(
                targetPos,
                mapState.visionZones,
                mapState.defaultLightLevel,
                mapState.defaultWeather,
                mapState.cellSizePx
            );

            // Check if player's senses can see into target cell
            if (isTargetCellVisible(vision, targetEnv.lightLevel, targetEnv.weatherEffect, distFt)) {
                // Check physical line of sight
                if (castRay(origin, targetPos, blockingCells)) {
                    visibleCells.add(`${c},${r}`);
                }
            }
        }
    }

    // 5. Determine which tokens are visible
    if (mapState.tokens) {
        for (const t of mapState.tokens) {
            // Treat multi-space tokens as visible if ANY of their occupied cells are visible
            // For simplicity in this logic, we check their root position and a simple box
            const size = Math.max(1, t.size || 1);
            let isVisible = false;

            for (let sr = 0; sr < size; sr++) {
                for (let sc = 0; sc < size; sc++) {
                    if (visibleCells.has(`${t.position.col + sc},${t.position.row + sr}`)) {
                        isVisible = true;
                        break;
                    }
                }
                if (isVisible) break;
            }

            if (isVisible) {
                visibleTokenIds.add(t.id);
            }
        }
    }

    return {
        visibleCells: Array.from(visibleCells),
        visibleTokenIds: Array.from(visibleTokenIds)
    };
}
