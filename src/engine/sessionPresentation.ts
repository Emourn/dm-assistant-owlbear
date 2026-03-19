import { dungeonMapToBattleMapState } from './mapBridge';
import type { BattleMapState } from '../types/battleMap';

export type LivePresentationMode = 'none' | 'blackout' | 'combat' | 'navigator' | 'legacy';

export interface SessionPresentation {
    mode: LivePresentationMode;
    mapId: string | null;
    mapName: string | null;
    floorId: string | null;
    floorLabel: string | null;
    sceneId: string | null;
    sceneTitle: string | null;
    sceneSubtitle: string | null;
    encounterTitle: string | null;
    combatActive: boolean;
}

interface PresentationInputs {
    combat?: any;
    navigator?: any;
    legacyMap?: any | null;
    blackout?: boolean;
}

function getActiveNarrative(navigator?: any) {
    if (!navigator?.narratives?.length) return null;
    return navigator.narratives.find((n: any) => n.id === navigator.activeNarrativeId)
        ?? navigator.narratives[0]
        ?? null;
}

function getCurrentScene(navigator?: any) {
    const narrative = getActiveNarrative(navigator);
    const sceneId = navigator?.currentSceneId ?? narrative?.currentSceneId;
    if (!narrative || !sceneId) return null;

    for (const chapter of narrative.chapters ?? []) {
        const scene = chapter.scenes?.find((candidate: any) => candidate.id === sceneId);
        if (scene) return scene;
    }

    return null;
}

export function getNavigatorActiveMap(navigator?: any) {
    if (!navigator?.dungeonMaps?.length) return null;

    const currentScene = getCurrentScene(navigator);
    const preferredFloorId = currentScene?.mapFloorId
        ?? navigator.activeFloorId
        ?? null;

    if (preferredFloorId) {
        const exact = navigator.dungeonMaps.find((map: any) => map.floorId === preferredFloorId);
        if (exact) return exact;
    }

    return navigator.dungeonMaps[0] ?? null;
}

export function buildSessionPresentation(inputs: PresentationInputs): {
    map: BattleMapState | null;
    presentation: SessionPresentation;
} {
    const combat = inputs.combat;
    const navigator = inputs.navigator;
    const legacyMap = inputs.legacyMap ?? null;
    const blackout = inputs.blackout ?? false;

    const combatIsLive = Boolean(combat?.isActive && combat?.battleMap);
    const navigatorMap = getNavigatorActiveMap(navigator);
    const navigatorScene = getCurrentScene(navigator);

    let mode: LivePresentationMode = 'none';
    let activeMap: BattleMapState | null = null;

    if (blackout) {
        mode = 'blackout';
    } else if (combatIsLive) {
        mode = 'combat';
        activeMap = combat.battleMap;
    } else if (navigatorMap) {
        mode = 'navigator';
        activeMap = dungeonMapToBattleMapState(navigatorMap);
    } else if (legacyMap) {
        mode = 'legacy';
        activeMap = legacyMap;
    }

    return {
        map: activeMap,
        presentation: {
            mode,
            mapId: activeMap?.id ?? navigatorMap?.id ?? legacyMap?.id ?? null,
            mapName: combatIsLive
                ? combat?.title ?? activeMap?.id ?? null
                : navigatorMap?.name ?? legacyMap?.name ?? null,
            floorId: navigatorMap?.floorId ?? null,
            floorLabel: navigatorMap?.floorLabel ?? null,
            sceneId: navigatorScene?.id ?? null,
            sceneTitle: navigatorScene?.title ?? null,
            sceneSubtitle: navigatorScene?.subtitle ?? null,
            encounterTitle: combatIsLive ? combat?.title ?? null : navigatorScene?.encounter?.description ?? null,
            combatActive: combatIsLive,
        }
    };
}
