import { GridPosition, MapToken } from '../types/battleMap';

/**
 * Calculates the distance in feet between two grid positions, optionally accounting for elevation.
 * Uses the simplified D&D 5e rule: 1 square = 5 feet.
 * Diagonals (including 3D diagonals) are also 5 feet.
 */
export function gridDistanceFt(a: GridPosition, b: GridPosition, elevationA: number = 0, elevationB: number = 0): number {
    const colDiff = Math.abs(a.col - b.col);
    const rowDiff = Math.abs(a.row - b.row);
    const elevDiff = Math.abs((elevationA - elevationB) / 5);

    // 5e rule: max of all dimensions
    return Math.max(colDiff, rowDiff, elevDiff) * 5;
}

/**
 * Calculates 3D distance in feet. Alias for convenience.
 */
export function gridDistance3DFt(a: GridPosition, b: GridPosition, elevationA: number, elevationB: number): number {
    return gridDistanceFt(a, b, elevationA, elevationB);
}

/**
 * Converts a pixel coordinate to a grid position.
 */
export function snapToGrid(pixelX: number, pixelY: number, cellSize: number): GridPosition {
    return {
        col: Math.floor(pixelX / cellSize),
        row: Math.floor(pixelY / cellSize)
    };
}

/**
 * Converts a grid position to pixel coordinates (center of the cell).
 */
export function gridToPixel(gridPos: GridPosition, cellSize: number): { x: number; y: number } {
    return {
        x: gridPos.col * cellSize + cellSize / 2,
        y: gridPos.row * cellSize + cellSize / 2
    };
}

/**
 * Checks if a target position is within a certain range of an origin.
 */
export function isInRange(origin: GridPosition, target: GridPosition, rangeFt: number): boolean {
    return gridDistanceFt(origin, target) <= rangeFt;
}

/**
 * Returns all grid cells within a circle/radius from a center point.
 */
export function getCellsInRadius(center: GridPosition, radiusFt: number): GridPosition[] {
    const cells: GridPosition[] = [];
    const radiusSquares = Math.floor(radiusFt / 5);

    for (let col = center.col - radiusSquares; col <= center.col + radiusSquares; col++) {
        for (let row = center.row - radiusSquares; row <= center.row + radiusSquares; row++) {
            const pos = { col, row };
            if (gridDistanceFt(center, pos) <= radiusFt) {
                cells.push(pos);
            }
        }
    }
    return cells;
}

/**
 * Returns all grid cells in a cone emanating from an origin.
 * Simplified grid cone: basically a triangle of cells.
 */
export function getCellsInCone(origin: GridPosition, target: GridPosition, lengthFt: number): GridPosition[] {
    const cells: GridPosition[] = [];
    const lengthSquares = Math.floor(lengthFt / 5);

    // Calculate angle from origin to target
    const angle = Math.atan2(target.row - origin.row, target.col - origin.col);

    // Sample cells in a bounding box and check angle/distance
    for (let col = origin.col - lengthSquares; col <= origin.col + lengthSquares; col++) {
        for (let row = origin.row - lengthSquares; row <= origin.row + lengthSquares; row++) {
            const pos = { col, row };
            const dist = gridDistanceFt(origin, pos);
            if (dist > 0 && dist <= lengthFt) {
                const posAngle = Math.atan2(row - origin.row, col - origin.col);
                let diff = Math.abs(posAngle - angle);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;

                // 5e cones are 53.13 degrees wide total (half angle is atan(0.5))
                if (diff <= Math.atan(0.5)) {
                    cells.push(pos);
                }
            }
        }
    }
    return cells;
}

/**
 * Returns all cells in a line from origin to target.
 */
export function getCellsInLine(origin: GridPosition, target: GridPosition, lengthFt: number, widthFt: number = 5): GridPosition[] {
    const cells: GridPosition[] = [];
    const lengthSquares = Math.floor(lengthFt / 5);
    const widthSquares = Math.max(1, Math.round(widthFt / 5));
    const widthRadius = Math.floor(widthSquares / 2);

    // Simple Bresenham-like line with width padding
    const dx = target.col - origin.col;
    const dy = target.row - origin.row;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), lengthSquares);

    if (steps === 0) return [origin];

    const xInc = dx / steps;
    const yInc = dy / steps;

    for (let i = 0; i <= steps; i++) {
        const col = Math.round(origin.col + xInc * i);
        const row = Math.round(origin.row + yInc * i);
        const pos = { col, row };

        if (gridDistanceFt(origin, pos) <= lengthFt) {
            for (let dc = -widthRadius; dc <= widthRadius; dc++) {
                for (let dr = -widthRadius; dr <= widthRadius; dr++) {
                    cells.push({ col: col + dc, row: row + dr });
                }
            }
        }
    }

    // Deduplicate cells
    return Array.from(new Set(cells.map(c => `${c.col},${c.row}`)))
        .map(s => {
            const [col, row] = s.split(',').map(Number);
            return { col, row };
        });
}

/**
 * Returns all cells in a square/cube based on a side length.
 * Cubes in 5e are typically placed such that their edge starts at the target point,
 * or they are centered on a point. For ease of use on a grid, we center them by default.
 * If origin is provided (e.g., for "Self" spells), the cube extends outward from the origin.
 */
export function getCellsInCube(target: GridPosition, sideFt: number, origin?: GridPosition): GridPosition[] {
    const cells: GridPosition[] = [];
    const sideSquares = Math.max(1, Math.round(sideFt / 5));

    if (origin) {
        // "Self" cubes (like Thunderwave) originate from the caster and extend outward.
        // We use the angle to determine which quadrant the cube occupies.
        const angle = Math.atan2(target.row - origin.row, target.col - origin.col);

        // Define cube start based on quadrant to snap to grid-ish directions
        let startCol = origin.col;
        let startRow = origin.row;

        if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
            // Right
            startCol = origin.col + 1; // Start in square next to caster
            startRow = origin.row - Math.floor(sideSquares / 2);
        } else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) {
            // Down
            startCol = origin.col - Math.floor(sideSquares / 2);
            startRow = origin.row + 1;
        } else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) {
            // Up
            startCol = origin.col - Math.floor(sideSquares / 2);
            startRow = origin.row - sideSquares;
        } else {
            // Left
            startCol = origin.col - sideSquares;
            startRow = origin.row - Math.floor(sideSquares / 2);
        }

        for (let col = startCol; col < startCol + sideSquares; col++) {
            for (let row = startRow; row < startRow + sideSquares; row++) {
                cells.push({ col, row });
            }
        }
    } else {
        // Ranged cubes (like Faerie Fire) center on the target intersection/square
        // A 15ft cube is 3 squares wide. 
        // If side is an odd multiple of 5 (15, 25), the radius is floor(side/10) = 1.
        const radiusSquares = Math.max(0, Math.ceil(sideFt / 10) - 1);

        for (let col = target.col - radiusSquares; col <= target.col + radiusSquares; col++) {
            for (let row = target.row - radiusSquares; row <= target.row + radiusSquares; row++) {
                cells.push({ col, row });
            }
        }
    }

    return cells;
}

/**
 * BFS flood fill to find all reachable cells within a movement limit.
 */
export function getReachableCells(
    origin: GridPosition,
    movementFt: number,
    blockingTerrainPositions: GridPosition[] = [],
    hostilePositions: GridPosition[] = []
): GridPosition[] {
    const reachable: GridPosition[] = [];
    const queue: { pos: GridPosition, cost: number }[] = [{ pos: origin, cost: 0 }];
    const visited = new Set<string>();
    const terrainSet = new Set(blockingTerrainPositions.map(p => `${p.col},${p.row}`));
    const hostileSet = new Set(hostilePositions.map(p => `${p.col},${p.row}`));

    visited.add(`${origin.col},${origin.row}`);

    while (queue.length > 0) {
        const { pos, cost } = queue.shift()!;
        reachable.push(pos);

        if (cost >= movementFt) continue;

        // Check 8 neighbors (including diagonals)
        for (let dCol = -1; dCol <= 1; dCol++) {
            for (let dRow = -1; dRow <= 1; dRow++) {
                if (dCol === 0 && dRow === 0) continue;

                const nextPos = { col: pos.col + dCol, row: pos.row + dRow };
                const key = `${nextPos.col},${nextPos.row}`;

                if (visited.has(key) || terrainSet.has(key) || hostileSet.has(key)) continue;

                const nextCost = cost + 5; // Simplified 5ft diag cost
                if (nextCost <= movementFt) {
                    visited.add(key);
                    queue.push({ pos: nextPos, cost: nextCost });
                }
            }
        }
    }

    return reachable;
}

/**
 * Returns all grid cells a creature occupies based on its size.
 */
export function getCreatureOccupiedCells(token: MapToken): GridPosition[] {
    const cells: GridPosition[] = [];
    for (let dCol = 0; dCol < token.size; dCol++) {
        for (let dRow = 0; dRow < token.size; dRow++) {
            cells.push({ col: token.position.col + dCol, row: token.position.row + dRow });
        }
    }
    return cells;
}

/**
 * Calculates movement cost between two adjacent or near-adjacent cells.
 * Basic version: 5ft per cell.
 */
export function getPathCost(from: GridPosition, to: GridPosition): number {
    return gridDistanceFt(from, to);
}
