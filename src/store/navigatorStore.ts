import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NavigatorState, SourceDocument, NarrativeScene, LinkedEntity, DungeonMap } from '../types/campaignNavigator';
import { MapToken } from '../types/battleMap';
import { indexedDbStorage } from './indexedDbAdapter';
import { DEATH_HOUSE_NARRATIVE, ALL_CAMPAIGN_MAPS } from '../data/deathHouseNarrative';
import { DEFAULT_DUNGEON_GRID } from '../engine/mapBridge';

interface NavigatorActions {
    // Basic navigation
    setActiveNarrative: (id: string | null) => void;
    navigateToScene: (sceneId: string) => void;
    goBack: () => void;

    // PDF Handling (WIP)
    addSourceDocument: (doc: SourceDocument) => void;
    setProcessing: (isProcessing: boolean, progress: string) => void;

    // Entity Enrichment
    cacheEntity: (key: string, entity: LinkedEntity) => void;

    // Map Interactions
    setPartyRoom: (roomId: string | null) => void;
    revealRoom: (mapId: string, roomId: string) => void;
    setActiveFloor: (floorId: string) => void;

    // Map Setup Editor
    updateMapImage: (mapId: string, imageUrl?: string) => void;
    updateRoomPosition: (mapId: string, roomId: string, pos: { x: number, y: number, width: number, height: number }) => void;

    // Tactical Grid Actions
    updateDungeonMapGrid: (mapId: string, updates: Partial<Pick<DungeonMap, 'gridWidth' | 'gridHeight' | 'cellSizePx' | 'gridColor'>>) => void;
    updateDungeonMapToken: (mapId: string, tokenId: string, updates: Partial<MapToken>) => void;
    addDungeonMapToken: (mapId: string, token: MapToken) => void;
    removeDungeonMapToken: (mapId: string, tokenId: string) => void;
    updateDungeonMapBattleState: (mapId: string, updates: Partial<Pick<DungeonMap, 'shapes' | 'freehandPaths' | 'fogOfWar' | 'fogOfWarFreehand' | 'backgroundOffset' | 'backgroundScaleX' | 'backgroundScaleY' | 'imageUrl' | 'tokens'>>) => void;

    // Reset/Debug
    loadMockData: () => void;
    updateNarrationBlock: (sceneId: string, blockId: string, updates: Partial<import('../types/campaignNavigator').NarrationBlock>) => void;
    addNarrationBlock: (sceneId: string, block: import('../types/campaignNavigator').NarrationBlock, afterBlockId?: string) => void;
    removeNarrationBlock: (sceneId: string, blockId: string) => void;
}

const buildStarterState = () => {
    const starterNarrative = DEATH_HOUSE_NARRATIVE;
    const starterMaps = ALL_CAMPAIGN_MAPS;
    const starterSceneId = starterNarrative.currentSceneId
        || starterNarrative.chapters[0]?.scenes[0]?.id
        || null;

    return {
        narratives: [starterNarrative],
        dungeonMaps: starterMaps,
        activeNarrativeId: starterNarrative.id,
        currentSceneId: starterSceneId,
        partyRoomId: null,
        sceneHistory: [],
        activeFloorId: starterMaps[0]?.floorId ?? null,
    };
};

export const useNavigatorStore = create<NavigatorState & NavigatorActions>()(
    persist(
        (set) => ({
            // ─────────────────────────────────────────────────────────
            // STATE
            // ─────────────────────────────────────────────────────────
            sourceDocuments: [],
            ...buildStarterState(),
            isProcessing: false,
            processingProgress: '',
            enrichmentCache: {},
            

            // ─────────────────────────────────────────────────────────
            // ACTIONS
            // ─────────────────────────────────────────────────────────
            setActiveNarrative: (id) => set({ activeNarrativeId: id }),

            navigateToScene: (sceneId) => set((state) => {
                const narrative = state.narratives.find(n => n.id === state.activeNarrativeId);
                if (!narrative) return state;

                // Push current scene to history before navigating
                const newHistory = state.currentSceneId
                    ? [...state.sceneHistory, state.currentSceneId]
                    : state.sceneHistory;

                // Find the scene to determine its floor and room
                let targetScene: NarrativeScene | null = null;
                for (const ch of narrative.chapters) {
                    const found = ch.scenes.find(s => s.id === sceneId);
                    if (found) { targetScene = found; break; }
                }

                // Auto-detect floor and room from scene
                const newFloorId = targetScene?.mapFloorId ?? state.activeFloorId;
                const newPartyRoomId = targetScene?.mapRoomId ?? state.partyRoomId;
                const oldPartyRoomId = state.partyRoomId;

                // Auto-sync map room statuses
                const newDungeonMaps = state.dungeonMaps.map(m => {
                    let changed = false;
                    const newRooms = m.rooms.map(r => {
                        const room = { ...r };
                        if (r.id === oldPartyRoomId && oldPartyRoomId !== newPartyRoomId && r.status === 'current') {
                            room.status = 'explored';
                            changed = true;
                        }
                        if (newPartyRoomId && r.id === newPartyRoomId) {
                            room.isRevealed = true;
                            room.status = 'current';
                            changed = true;
                        }
                        return room;
                    });
                    return changed ? { ...m, rooms: newRooms } : m;
                });

                return {
                    currentSceneId: sceneId,
                    sceneHistory: newHistory,
                    activeFloorId: newFloorId,
                    partyRoomId: newPartyRoomId,
                    dungeonMaps: newDungeonMaps,
                    narratives: state.narratives.map(n =>
                        n.id === state.activeNarrativeId
                            ? { ...n, currentSceneId: sceneId, visitedSceneIds: [...new Set([...n.visitedSceneIds, sceneId])] }
                            : n
                    )
                };
            }),

            goBack: () => set((state) => {
                if (state.sceneHistory.length === 0) return state;

                const newHistory = [...state.sceneHistory];
                const previousSceneId = newHistory.pop()!;

                const narrative = state.narratives.find(n => n.id === state.activeNarrativeId);
                let targetScene: NarrativeScene | null = null;
                if (narrative) {
                    for (const ch of narrative.chapters) {
                        const found = ch.scenes.find(s => s.id === previousSceneId);
                        if (found) { targetScene = found; break; }
                    }
                }

                const newFloorId = targetScene?.mapFloorId ?? state.activeFloorId;
                const newPartyRoomId = targetScene?.mapRoomId ?? state.partyRoomId;
                const oldPartyRoomId = state.partyRoomId;

                // Auto-sync map room statuses
                const newDungeonMaps = state.dungeonMaps.map(m => {
                    let changed = false;
                    const newRooms = m.rooms.map(r => {
                        const room = { ...r };
                        if (r.id === oldPartyRoomId && oldPartyRoomId !== newPartyRoomId && r.status === 'current') {
                            room.status = 'explored';
                            changed = true;
                        }
                        if (newPartyRoomId && r.id === newPartyRoomId) {
                            room.isRevealed = true;
                            room.status = 'current';
                            changed = true;
                        }
                        return room;
                    });
                    return changed ? { ...m, rooms: newRooms } : m;
                });

                return {
                    currentSceneId: previousSceneId,
                    sceneHistory: newHistory,
                    activeFloorId: newFloorId,
                    partyRoomId: newPartyRoomId,
                    dungeonMaps: newDungeonMaps
                };
            }),

            addSourceDocument: (doc) => set((state) => ({
                sourceDocuments: [...state.sourceDocuments, doc]
            })),

            setProcessing: (isProcessing, progress) => set({ isProcessing, processingProgress: progress }),

            cacheEntity: (key, entity) => set((state) => ({
                enrichmentCache: { ...state.enrichmentCache, [key]: entity }
            })),

            setPartyRoom: (roomId) => set({ partyRoomId: roomId }),

            revealRoom: (mapId, roomId) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId
                        ? { ...m, rooms: m.rooms.map(r => r.id === roomId ? { ...r, isRevealed: true } : r) }
                        : m
                )
            })),

            setActiveFloor: (floorId) => set({ activeFloorId: floorId }),

            loadMockData: () => set({
                sourceDocuments: [],
                enrichmentCache: {},
                ...buildStarterState(),
            }),

            updateNarrationBlock: (sceneId, blockId, updates) => set((state) => ({
                narratives: state.narratives.map(n => ({
                    ...n,
                    chapters: n.chapters.map(ch => ({
                        ...ch,
                        scenes: ch.scenes.map(sc =>
                            sc.id === sceneId
                                ? {
                                    ...sc,
                                    narrationBlocks: sc.narrationBlocks.map(b =>
                                        b.id === blockId ? { ...b, ...(updates as any) } : b
                                    )
                                }
                                : sc
                        )
                    }))
                }))
            })),

            addNarrationBlock: (sceneId, block, afterBlockId) => set((state) => ({
                narratives: state.narratives.map(n => ({
                    ...n,
                    chapters: n.chapters.map(ch => ({
                        ...ch,
                        scenes: ch.scenes.map(sc => {
                            if (sc.id !== sceneId) return sc;
                            const blocks = [...sc.narrationBlocks];
                            if (afterBlockId) {
                                const idx = blocks.findIndex(b => b.id === afterBlockId);
                                if (idx >= 0) {
                                    blocks.splice(idx + 1, 0, block);
                                    return { ...sc, narrationBlocks: blocks };
                                }
                            }
                            return { ...sc, narrationBlocks: [...blocks, block] };
                        })
                    }))
                }))
            })),

            removeNarrationBlock: (sceneId, blockId) => set((state) => ({
                narratives: state.narratives.map(n => ({
                    ...n,
                    chapters: n.chapters.map(ch => ({
                        ...ch,
                        scenes: ch.scenes.map(sc =>
                            sc.id === sceneId
                                ? { ...sc, narrationBlocks: sc.narrationBlocks.filter(b => b.id !== blockId) }
                                : sc
                        )
                    }))
                }))
            })),

            updateMapImage: (mapId, imageUrl) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? { ...m, imageUrl } : m
                )
            })),

            updateRoomPosition: (mapId, roomId, pos) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? {
                        ...m,
                        rooms: m.rooms.map(r => r.id === roomId ? { ...r, ...pos } : r)
                    } : m
                )
            })),

            // ── Tactical Grid Actions ──

            updateDungeonMapGrid: (mapId, updates) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? { ...m, ...updates } : m
                )
            })),

            updateDungeonMapToken: (mapId, tokenId, updates) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? {
                        ...m,
                        tokens: m.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t)
                    } : m
                )
            })),

            addDungeonMapToken: (mapId, token) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? { ...m, tokens: [...m.tokens, token] } : m
                )
            })),

            removeDungeonMapToken: (mapId, tokenId) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? {
                        ...m,
                        tokens: m.tokens.filter(t => t.id !== tokenId)
                    } : m
                )
            })),

            updateDungeonMapBattleState: (mapId, updates) => set((state) => ({
                dungeonMaps: state.dungeonMaps.map(m =>
                    m.id === mapId ? { ...m, ...updates } : m
                )
            })),
        }),
        {
            name: 'dm-assistant-navigator',
            storage: createJSONStorage(() => indexedDbStorage),
            partialize: (state) => ({
                sourceDocuments: state.sourceDocuments,
                narratives: state.narratives,
                dungeonMaps: state.dungeonMaps,
                activeNarrativeId: state.activeNarrativeId,
                currentSceneId: state.currentSceneId,
                enrichmentCache: state.enrichmentCache,
                partyRoomId: state.partyRoomId,
                sceneHistory: state.sceneHistory,
                activeFloorId: state.activeFloorId,
            }),
            // Migrate stale DungeonMap data lacking tactical grid fields
            merge: (persisted: any, current: NavigatorState & NavigatorActions) => {
                const merged = { ...current, ...(persisted as object) };
                if (Array.isArray(merged.dungeonMaps)) {
                    merged.dungeonMaps = merged.dungeonMaps.map((m: any) => ({
                        ...m,
                        gridWidth: m.gridWidth || DEFAULT_DUNGEON_GRID.gridWidth,
                        gridHeight: m.gridHeight || DEFAULT_DUNGEON_GRID.gridHeight,
                        cellSizePx: m.cellSizePx || DEFAULT_DUNGEON_GRID.cellSizePx,
                        gridColor: m.gridColor || DEFAULT_DUNGEON_GRID.gridColor,
                        tokens: m.tokens || DEFAULT_DUNGEON_GRID.tokens,
                        shapes: m.shapes || DEFAULT_DUNGEON_GRID.shapes,
                        freehandPaths: m.freehandPaths || DEFAULT_DUNGEON_GRID.freehandPaths,
                        fogOfWar: m.fogOfWar || DEFAULT_DUNGEON_GRID.fogOfWar,
                        fogOfWarFreehand: m.fogOfWarFreehand || DEFAULT_DUNGEON_GRID.fogOfWarFreehand,
                    }));
                }
                return merged;
            }
        }
    )
);


