import { describe, expect, it } from 'vitest';
import { buildSessionPresentation } from './sessionPresentation';

const baseNavigator = {
    activeNarrativeId: 'narrative-1',
    currentSceneId: 'scene-1',
    activeFloorId: 'floor-1',
    narratives: [
        {
            id: 'narrative-1',
            currentSceneId: 'scene-1',
            chapters: [
                {
                    id: 'chapter-1',
                    scenes: [
                        {
                            id: 'scene-1',
                            title: 'Grand Foyer',
                            subtitle: 'A quiet threshold',
                            mapFloorId: 'floor-1',
                            encounter: { description: 'Animated armor ambush' },
                        },
                    ],
                },
            ],
        },
    ],
    dungeonMaps: [
        {
            id: 'map-1',
            name: 'Death House Ground Floor',
            floorId: 'floor-1',
            floorLabel: 'Ground Floor',
            floorOrder: 0,
            chapterIds: ['chapter-1'],
            rooms: [],
            connections: [],
            width: 100,
            height: 100,
            gridWidth: 20,
            gridHeight: 20,
            cellSizePx: 40,
            gridColor: '#fff',
            tokens: [],
            shapes: [],
            freehandPaths: [],
            fogOfWar: [],
            fogOfWarFreehand: [],
        },
    ],
};

describe('buildSessionPresentation', () => {
    it('prefers a live combat encounter over navigator exploration', () => {
        const result = buildSessionPresentation({
            navigator: baseNavigator,
            combat: {
                isActive: true,
                title: 'Ghoul Attack',
                battleMap: {
                    id: 'combat-map',
                    gridWidth: 10,
                    gridHeight: 10,
                    cellSizePx: 40,
                    gridColor: '#fff',
                    backgroundColor: '#000',
                    tokens: [],
                    shapes: [],
                    freehandPaths: [],
                    fogOfWar: [],
                    fogOfWarFreehand: [],
                },
            },
        });

        expect(result.presentation.mode).toBe('combat');
        expect(result.presentation.mapId).toBe('combat-map');
        expect(result.presentation.encounterTitle).toBe('Ghoul Attack');
    });

    it('uses the navigator map automatically when combat is not active', () => {
        const result = buildSessionPresentation({
            navigator: baseNavigator,
            combat: { isActive: false, battleMap: null },
        });

        expect(result.presentation.mode).toBe('navigator');
        expect(result.presentation.mapId).toBe('map-1');
        expect(result.presentation.sceneTitle).toBe('Grand Foyer');
        expect(result.presentation.floorLabel).toBe('Ground Floor');
        expect(result.map?.id).toBe('map-1');
    });

    it('supports temporary blackout without losing scene context', () => {
        const result = buildSessionPresentation({
            navigator: baseNavigator,
            blackout: true,
        });

        expect(result.presentation.mode).toBe('blackout');
        expect(result.presentation.sceneTitle).toBe('Grand Foyer');
        expect(result.map).toBeNull();
    });
});
