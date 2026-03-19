/**
 * PlayerMapView — Live battle map for players
 *
 * Renders the map pushed by the DM. Players can:
 *   - Pan by dragging empty space
 *   - Zoom via scroll
 *   - Drag ONLY their own token (highlighted in gold)
 *
 * Token moves are sent to the server which validates and broadcasts back.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Move, ZoomIn, ZoomOut } from 'lucide-react';
import { useSessionStore } from '../../multiplayer/sessionStore';
import { useCombatStore } from '../../store/combatStore';
import { socketClient } from '../../multiplayer/socketClient';
import { BattleMapCanvas } from '../combat/BattleMapCanvas';
import { Token } from '../combat/Token';

import { BattleMapState, MapToken } from '../../types/battleMap';

interface Props {
    mapData: BattleMapState | null;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.15;

export function PlayerMapView({ mapData }: Props) {
    const bgImgRef = useRef<HTMLImageElement | null>(null);
    const bgImgUrlRef = useRef<string | null>(null);

    // Viewport state
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    // Pan state
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });

    // Token drag state
    const draggingToken = useRef<{ tokenId: string; startCol: number; startRow: number } | null>(null);
    const [dragTokenGridPos, setDragTokenGridPos] = useState<{ col: number; row: number } | null>(null);
    const [, setHoveredTokenId] = useState<string | null>(null);
    const { player, presentation } = useSessionStore() as any;
    const combat = useCombatStore((state: any) => state);
    const myCharacterId = player?.characterId ?? null;

    const containerRef = useRef<HTMLDivElement>(null);

    // ── Resize observer ──────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const obs = new ResizeObserver(() => {
            // Can be used if we need to force rerender on resize
        });
        obs.observe(container);
        return () => obs.disconnect();
    }, []);

    // ── Grid helpers ─────────────────────────────────────────
    const getClampedPos = (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        const transformedX = (relX - panOffset.x) / zoom;
        const transformedY = (relY - panOffset.y) / zoom;
        return { x: transformedX, y: transformedY };
    };



    // ── Interaction Handlers ──────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, token?: any) => {
        if (!mapData) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        
        const isMiddleClick = e.button === 1;
        const isRightClick = e.button === 2;

        panStart.current = { x: e.clientX, y: e.clientY };

        const combatant = token ? combat?.combatants?.find((c: any) => c.id === token.combatantId) : null;
        const isMe = token && (token.combatantId === myCharacterId || combatant?.sourceId === myCharacterId || combatant?.id === myCharacterId);

        if (isMe && !isMiddleClick && !isRightClick) {
            // Start dragging player's token
            draggingToken.current = { tokenId: token.id, startCol: token.position.col, startRow: token.position.row };
            setDragTokenGridPos(token.position);
            e.stopPropagation();
        } else {
            // Start panning map background
            setIsPanning(true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (draggingToken.current && mapData) {
            // True VTT drag: token natively snaps to grid cells under the cursor
            const pos = getClampedPos(e.clientX, e.clientY);
            
            // Calculate which grid cell the mouse is currently hovering over
            // We use Math.floor so the pointer aligns with the top-left of the cell.
            // A half-cell offset is cleanly handled by the Token component's center flex styling.
            const hoverCol = Math.floor(pos.x / mapData.cellSizePx);
            const hoverRow = Math.floor(pos.y / mapData.cellSizePx);

            setDragTokenGridPos({ col: hoverCol, row: hoverRow });
        } else if (isPanning) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setPanOffset({
                x: panOffset.x + dx,
                y: panOffset.y + dy,
            });
            panStart.current = { x: e.clientX, y: e.clientY }; // Update panStart for continuous panning
        }
    };

    const handlePointerUp = () => {
        if (draggingToken.current && dragTokenGridPos && mapData) {
            const { tokenId, startCol, startRow } = draggingToken.current;
            const previousPosition = { col: startCol, row: startRow };
            const nextPosition = dragTokenGridPos;

            useSessionStore.setState((state) => ({
                mapData: state.mapData
                    ? {
                        ...state.mapData,
                        tokens: (state.mapData.tokens ?? []).map((token: MapToken) =>
                            token.id === tokenId
                                ? { ...token, position: nextPosition }
                                : token
                        ),
                    }
                    : state.mapData,
            }));

            socketClient.emitAsync('token:move', { tokenId, newPosition: nextPosition }).catch(() => {
                useSessionStore.setState((state) => ({
                    mapData: state.mapData
                        ? {
                            ...state.mapData,
                            tokens: (state.mapData.tokens ?? []).map((token: MapToken) =>
                                token.id === tokenId
                                    ? { ...token, position: previousPosition }
                                    : token
                            ),
                        }
                        : state.mapData,
                }));
            });
        }

        setIsPanning(false);
        draggingToken.current = null;
        setDragTokenGridPos(null);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
        
        const zoomRatio = newZoom / zoom;
        const newPanX = mouseX - zoomRatio * (mouseX - panOffset.x);
        const newPanY = mouseY - zoomRatio * (mouseY - panOffset.y);

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
    };

    const changeZoom = (dir: 1 | -1) => {
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + dir * ZOOM_STEP));
        setZoom(newZoom);
    };

    // ── Preload background image ─────────────────────────────
    useEffect(() => {
        const url = mapData?.backgroundImageUrl;
        if (!url || url === bgImgUrlRef.current) return;

        bgImgUrlRef.current = url;
        const img = new Image();
        img.src = url;
        img.onload = () => { bgImgRef.current = img; };
    }, [mapData?.backgroundImageUrl]);

    if (!mapData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-600 bg-stone-950 h-full select-none">
                <Move className="w-10 h-10 mb-3 text-stone-700" />
                <p className="text-sm font-medium">
                    {presentation?.mode === 'blackout' ? 'Player display hidden' : 'No map active'}
                </p>
                <p className="text-xs text-stone-700 mt-1">
                    {presentation?.mode === 'blackout'
                        ? 'The DM will bring the table view back when the scene is ready'
                        : 'Waiting for the next scene from the DM'}
                </p>
            </div>
        );
    }

    const mapWidth = mapData.gridWidth * mapData.cellSizePx;
    const mapHeight = mapData.gridHeight * mapData.cellSizePx;

    return (
        <div 
            ref={containerRef}
            className="relative flex-1 h-full overflow-hidden bg-stone-950 select-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => handlePointerDown(e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
        >
            <div
                className="relative origin-top-left"
                style={{
                    width: Math.max(1, mapWidth),
                    height: Math.max(1, mapHeight),
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                }}
            >
                {/* 1. Underlying Canvas (Grid, Background, Terrain shapes) */}
                <BattleMapCanvas
                    mapState={mapData}
                    width={containerRef.current?.clientWidth ?? mapWidth}
                    height={containerRef.current?.clientHeight ?? mapHeight}
                    isPlayerView={true}
                />

                {/* 2. Tokens Layer (DOM Elements overhead) */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {(mapData.tokens || []).map((token: MapToken) => {
                        const isDraggingObj = draggingToken.current?.tokenId === token.id;
                        const pos = isDraggingObj && dragTokenGridPos ? dragTokenGridPos : token.position;

                        // Find combatant from the combat state (filtered for public view)
                        const combatant = combat?.combatants?.find((c: any) => c.id === token.combatantId);

                        let dragStyle: React.CSSProperties = {};
                        if (isDraggingObj) {
                            dragStyle = {
                                zIndex: 100, // Force to top layer natively
                                opacity: 0.9,
                                // Let the component naturally calculate left/top based on the updated dragTokenGridPos
                            };
                        }

                        // Create a ghost outline where the token currently actually is while dragging
                        const isMe = token.combatantId === myCharacterId || combatant?.sourceId === myCharacterId;

                        return (
                            <React.Fragment key={token.id}>
                                {isDraggingObj && (
                                    <div
                                        className="absolute opacity-30 pointer-events-none transition-all duration-150 border-2 border-dashed border-white/50 rounded-full"
                                        style={{
                                            left: `${pos.col * mapData.cellSizePx}px`,
                                            top: `${pos.row * mapData.cellSizePx}px`,
                                            width: `${token.size * mapData.cellSizePx}px`,
                                            height: `${token.size * mapData.cellSizePx}px`,
                                            zIndex: 10
                                        }}
                                    />
                                )}
                                <div className="pointer-events-auto">
                                    <Token
                                        token={{...token, position: pos}}
                                        combatant={combatant}
                                        cellSize={mapData.cellSizePx}
                                        isActive={isMe} // Highlight my own token
                                        isDragging={isDraggingObj}
                                        style={dragStyle}
                                        onPointerDown={(e) => handlePointerDown(e, token)}
                                        onMouseEnter={() => !isPanning && setHoveredTokenId(token.id)}
                                        onMouseLeave={() => setHoveredTokenId(null)}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-50">
                <button
                    onClick={() => changeZoom(1)}
                    className="p-1.5 bg-stone-800/80 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-stone-200 transition-colors shadow"
                    title="Zoom in"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="text-xs text-stone-600 text-center font-mono px-1 bg-stone-900/40 rounded py-0.5">
                    {Math.round(zoom * 100)}%
                </div>
                <button
                    onClick={() => changeZoom(-1)}
                    className="p-1.5 bg-stone-800/80 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-stone-200 transition-colors shadow"
                    title="Zoom out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
            </div>

            {/* Hint overlay */}
            <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur border border-stone-800 text-[11px] font-medium text-stone-400 rounded-lg px-3 py-1.5 shadow z-50">
                <span className="text-gold mr-1.5">★</span> Your token: Drag to move
            </div>
        </div>
    );
}
