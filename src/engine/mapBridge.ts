import { DungeonMap } from '../types/campaignNavigator';
import { BattleMapState, FreehandPath, MapShape, MapToken } from '../types/battleMap';

/**
 * Converts a DungeonMap (Navigator's map state) into a BattleMapState
 * that can be directly consumed by the Combat system's <BattleMap> component.
 * 
 * This is used in two contexts:
 * 1. Rendering the Navigator map using the same <BattleMap> component as combat.
 * 2. Transferring map state into the Combat encounter when the DM starts a fight.
 */
export function dungeonMapToBattleMapState(dungeon: DungeonMap): BattleMapState {
    const cloneToken = (token: MapToken): MapToken => ({
        ...token,
        position: { ...token.position },
        auras: token.auras ? token.auras.map(aura => ({ ...aura })) : undefined
    });

    const cloneShape = (shape: MapShape): MapShape => ({
        ...shape,
        points: shape.points.map(point => ({ ...point })),
        style: { ...shape.style }
    });

    const clonePath = (path: FreehandPath): FreehandPath => ({
        ...path,
        points: path.points.map(point => ({ ...point }))
    });

    return {
        id: dungeon.id,
        gridWidth: dungeon.gridWidth || DEFAULT_DUNGEON_GRID.gridWidth,
        gridHeight: dungeon.gridHeight || DEFAULT_DUNGEON_GRID.gridHeight,
        cellSizePx: dungeon.cellSizePx || DEFAULT_DUNGEON_GRID.cellSizePx,
        gridColor: dungeon.gridColor || DEFAULT_DUNGEON_GRID.gridColor,
        backgroundColor: '#1a1a2e',
        tokens: (dungeon.tokens || DEFAULT_DUNGEON_GRID.tokens).map(cloneToken),
        shapes: (dungeon.shapes || DEFAULT_DUNGEON_GRID.shapes).map(cloneShape),
        freehandPaths: (dungeon.freehandPaths || DEFAULT_DUNGEON_GRID.freehandPaths).map(clonePath),
        backgroundImageUrl: dungeon.imageUrl,
        backgroundOffset: dungeon.backgroundOffset ? { ...dungeon.backgroundOffset } : undefined,
        backgroundScaleX: dungeon.backgroundScaleX,
        backgroundScaleY: dungeon.backgroundScaleY,
        fogOfWar: (dungeon.fogOfWar || DEFAULT_DUNGEON_GRID.fogOfWar).map(cloneShape),
        fogOfWarFreehand: (dungeon.fogOfWarFreehand || DEFAULT_DUNGEON_GRID.fogOfWarFreehand).map(clonePath),
    };
}

/**
 * Default grid fields for initializing a new DungeonMap.
 * Useful when creating maps from scratch or migrating old data.
 */
export const DEFAULT_DUNGEON_GRID = {
    gridWidth: 20,
    gridHeight: 20,
    cellSizePx: 40,
    gridColor: 'rgba(255,255,255,0.12)',
    tokens: [],
    shapes: [],
    freehandPaths: [],
    fogOfWar: [],
    fogOfWarFreehand: [],
} as const;
