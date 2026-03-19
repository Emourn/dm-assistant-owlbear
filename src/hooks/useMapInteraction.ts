import { useState, useCallback } from 'react';
import { GridPosition, MapToken } from '../types/battleMap';
import { DrawingMode } from '../components/combat/ShapeControls';
import { calculateMovementRange } from '../engine/battleMapEngine';
import { LightLevel, WeatherEffect } from '../types/battleMap';

export function useMapInteraction() {
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');
    const [activeLightLevel, setActiveLightLevel] = useState<LightLevel>('bright');
    const [activeWeather, setActiveWeather] = useState<WeatherEffect>('none');
    const [hoverPos, setHoverPos] = useState<GridPosition | null>(null);
    const [movementOverlay, setMovementOverlay] = useState<GridPosition[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tokenId: string; combatantId?: string | null } | null>(null);

    const handleHoverChange = useCallback((pos: GridPosition | null) => {
        setHoverPos(pos);
    }, []);

    const showMovementRange = useCallback((startPos: GridPosition, speed: number, tokens: MapToken[], tokenId: string) => {
        const range = calculateMovementRange(startPos, speed, tokens, tokenId);
        setMovementOverlay(range);
    }, []);

    const clearMovementRange = useCallback(() => {
        setMovementOverlay([]);
    }, []);

    const openContextMenu = useCallback((x: number, y: number, tokenId: string, combatantId?: string | null) => {
        setContextMenu({ x, y, tokenId, combatantId });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    return {
        drawingMode,
        setDrawingMode,
        activeLightLevel,
        setActiveLightLevel,
        activeWeather,
        setActiveWeather,
        hoverPos,
        handleHoverChange,
        movementOverlay,
        showMovementRange,
        clearMovementRange,
        contextMenu,
        openContextMenu,
        closeContextMenu
    };
}
