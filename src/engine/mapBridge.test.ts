import { describe, expect, it } from 'vitest';
import { DEFAULT_DUNGEON_GRID, dungeonMapToBattleMapState } from './mapBridge';
import { DungeonMap } from '../types/campaignNavigator';

describe('mapBridge', () => {
    it('deep-clones tactical map arrays so navigator and combat do not share references', () => {
        const source: DungeonMap = {
            id: 'map-1',
            name: 'Floor 1',
            floorId: 'f1',
            floorLabel: 'Ground Floor',
            floorOrder: 0,
            width: 100,
            height: 100,
            chapterIds: [],
            rooms: [],
            connections: [],
            gridWidth: 20,
            gridHeight: 20,
            cellSizePx: 40,
            gridColor: 'rgba(255,255,255,0.15)',
            imageUrl: 'https://example.com/map.png',
            backgroundOffset: { x: 10, y: -5 },
            backgroundScaleX: 1.1,
            backgroundScaleY: 0.9,
            tokens: [{
                id: 'tok-1',
                combatantId: 'pc-1',
                name: 'Ari',
                faction: 'player',
                position: { col: 2, row: 3 },
                size: 1,
                elevation: 5,
                auras: [{ id: 'aura-1', name: 'Bless', radiusFt: 10, color: '#3b82f6', opacity: 0.25 }]
            }],
            shapes: [{
                id: 'shape-1',
                type: 'rectangle',
                points: [{ col: 1, row: 1 }, { col: 3, row: 3 }],
                style: { stroke: '#fff', strokeWidth: 2, fill: 'rgba(0,0,0,0.2)', dashed: false }
            }],
            freehandPaths: [{
                id: 'path-1',
                points: [{ x: 5, y: 6 }, { x: 8, y: 11 }],
                color: '#ef4444',
                width: 2
            }],
            fogOfWar: [{
                id: 'fog-1',
                type: 'rectangle',
                points: [{ col: 5, row: 5 }, { col: 8, row: 8 }],
                style: { stroke: '#000', strokeWidth: 0, fill: '#000', dashed: false }
            }],
            fogOfWarFreehand: [{
                id: 'fog-free-1',
                points: [{ x: 12, y: 14 }, { x: 16, y: 19 }],
                color: '#000',
                width: 14
            }]
        };

        const battleMap = dungeonMapToBattleMapState(source);

        battleMap.tokens[0].position.col = 99;
        battleMap.shapes[0].points[0].col = 88;
        battleMap.freehandPaths[0].points[0].x = 77;
        battleMap.fogOfWar[0].points[0].col = 66;
        battleMap.fogOfWarFreehand[0].points[0].x = 55;
        battleMap.backgroundOffset!.x = 44;

        expect(source.tokens[0].position.col).toBe(2);
        expect(source.shapes[0].points[0].col).toBe(1);
        expect(source.freehandPaths[0].points[0].x).toBe(5);
        expect(source.fogOfWar[0].points[0].col).toBe(5);
        expect(source.fogOfWarFreehand[0].points[0].x).toBe(12);
        expect(source.backgroundOffset?.x).toBe(10);
    });

    it('applies safe defaults for legacy/partial dungeon maps', () => {
        const legacyMap = {
            id: 'legacy',
            name: 'Legacy',
            floorId: 'legacy-floor',
            floorLabel: 'Legacy Floor',
            floorOrder: 0,
            width: 100,
            height: 100,
            rooms: [],
            connections: [],
            gridWidth: 0,
            gridHeight: 0,
            cellSizePx: 0,
            gridColor: '',
            tokens: undefined,
            shapes: undefined,
            freehandPaths: undefined,
            fogOfWar: undefined,
            fogOfWarFreehand: undefined,
        } as unknown as DungeonMap;

        const battleMap = dungeonMapToBattleMapState(legacyMap);

        expect(battleMap.gridWidth).toBe(DEFAULT_DUNGEON_GRID.gridWidth);
        expect(battleMap.gridHeight).toBe(DEFAULT_DUNGEON_GRID.gridHeight);
        expect(battleMap.cellSizePx).toBe(DEFAULT_DUNGEON_GRID.cellSizePx);
        expect(battleMap.gridColor).toBe(DEFAULT_DUNGEON_GRID.gridColor);
        expect(battleMap.tokens).toEqual([]);
        expect(battleMap.shapes).toEqual([]);
        expect(battleMap.freehandPaths).toEqual([]);
        expect(battleMap.fogOfWar).toEqual([]);
        expect(battleMap.fogOfWarFreehand).toEqual([]);
    });
});
