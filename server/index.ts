/**
 * DM Assistant — Multiplayer Server
 * 
 * Express + Socket.io server that enables real-time multiplayer
 * for the DM Assistant. The DM's PC runs this server; players
 * connect through a browser.
 * 
 * Usage:
 *   npm run server        (server only)
 *   npm run multiplayer   (server + Vite dev server)
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

/** Returns all non-loopback IPv4 addresses on this machine (LAN + Hamachi). */
function getLanIps(): string[] {
    const results: string[] = [];
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
        for (const net of iface ?? []) {
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
}

import { roomManager } from './roomManager.js';
import { saveState, loadState, initDataDir } from './stateManager.js';
import { buildFilteredState, filterChat } from './playerFilter.js';
import { buildSessionPresentation, getNavigatorActiveMap } from '../src/engine/sessionPresentation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ───────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
const DIST_PATH = join(__dirname, '..', 'dist');

// ─── Express Setup ───────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Network info endpoint — lets the frontend show LAN join URLs
app.get('/api/network-info', (_req, res) => {
    res.json({ lanIps: getLanIps(), port: PORT });
});

// Serve built React app in production
if (existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    
    // SPA fallback: serve index.html for any non-API route
    app.get('{*path}', (_req, res) => {
        res.sendFile(join(DIST_PATH, 'index.html'));
    });
}

// ─── HTTP + Socket.io Setup ──────────────────────────────────
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: true,  // Allow any origin — needed for Cloudflare Tunnel + LAN IPs
        methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 10e6, // 10MB — large enough for map images
    pingTimeout: 60000,
    pingInterval: 25000,
});

// ─── In-Memory Game State Per Room ───────────────────────────
interface RoomGameState {
    characters: any[];
    combat: any;
    navigator: any | null;
    chat: any[];
    /** Independently-pushed map (can be from Navigator or Combat). */
    activeMap: any | null;
    broadcastBlackout: boolean;
}

const roomStates = new Map<string, RoomGameState>();

function getOrCreateRoomState(roomCode: string): RoomGameState {
    if (roomStates.has(roomCode)) {
        return roomStates.get(roomCode)!;
    }

    // Try loading from disk
    const characters = loadState<any[]>(roomCode, 'characters') ?? [];
    const combat = loadState<any>(roomCode, 'combat') ?? null;
    const navigator = loadState<any>(roomCode, 'navigator') ?? null;
    const chat = loadState<any[]>(roomCode, 'chat') ?? [];

    const state: RoomGameState = {
        characters,
        combat,
        navigator,
        chat,
        activeMap: null,
        broadcastBlackout: false,
    };
    roomStates.set(roomCode, state);
    return state;
}

function broadcastToPlayers(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const state = getOrCreateRoomState(roomCode);
    const players = roomManager.getPlayers(roomCode);

    for (const player of players) {
        const filtered = buildFilteredState(
            { characters: state.characters, combat: state.combat, navigator: state.navigator, chat: state.chat },
            player,
            state.activeMap,
            state.broadcastBlackout,
        );
        io.to(player.socketId).emit('state:sync', filtered);
    }
}

/**
 * Send the full (unfiltered) state to the DM so their view stays live.
 * Called whenever players make changes that should update the DM's map/tokens.
 */
function broadcastToDM(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const state = getOrCreateRoomState(roomCode);
    const { map, presentation } = buildSessionPresentation({
        combat: state.combat,
        navigator: state.navigator,
        legacyMap: state.activeMap,
        blackout: state.broadcastBlackout,
    });

    // DM gets the full state — no filtering needed
    const dmState = {
        characters: state.characters,
        combat: state.combat,
        navigator: state.navigator,
        map,
        chat: state.chat,
        presentation,
    };
    io.to(room.dmSocketId).emit('state:sync', dmState);
}

function broadcastRoomInfo(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const serialized = roomManager.serializeRoom(room);

    // Send to everyone in the room
    for (const [socketId] of room.players) {
        io.to(socketId).emit('room:info', serialized);
    }
}

function broadcastTokenMoved(
    roomCode: string,
    data: { tokenId: string; newPosition: { col: number; row: number }; movedBy: string; mapId?: string },
): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    io.to(room.dmSocketId).emit('token:moved', data);
    for (const player of roomManager.getPlayers(roomCode)) {
        io.to(player.socketId).emit('token:moved', data);
    }
}

function updateTokenInMap(map: any, tokenId: string, newPosition: { col: number; row: number }): boolean {
    if (!map?.tokens) return false;

    const tokenIndex = map.tokens.findIndex((token: any) => token.id === tokenId);
    if (tokenIndex === -1) return false;

    map.tokens[tokenIndex] = {
        ...map.tokens[tokenIndex],
        position: newPosition,
    };
    return true;
}

function updateTokenInNavigatorState(
    navigator: any,
    mapId: string,
    tokenId: string,
    newPosition: { col: number; row: number },
): any {
    if (!navigator?.dungeonMaps) return navigator;

    const mapIndex = navigator.dungeonMaps.findIndex((map: any) => map.id === mapId);
    if (mapIndex === -1) return navigator;

    const nextMaps = [...navigator.dungeonMaps];
    nextMaps[mapIndex] = {
        ...nextMaps[mapIndex],
        tokens: (nextMaps[mapIndex].tokens ?? []).map((token: any) =>
            token.id === tokenId
                ? { ...token, position: newPosition }
                : token
        ),
    };

    return {
        ...navigator,
        dungeonMaps: nextMaps,
    };
}

// ─── Socket.io Event Handlers ────────────────────────────────
io.on('connection', (socket: Socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);

    // Prevent uncaught errors from crashing the server
    socket.on('error', (err) => {
        console.error(`[Server] Socket error for ${socket.id}:`, err.message);
    });

    // ── Room Management ──────────────────────────────────────

    /**
     * DM creates a new room.
     * Response: { success, code, room }
     */
    socket.on('room:create', (callback: (res: any) => void) => {
        const { code, room } = roomManager.createRoom(socket.id);
        getOrCreateRoomState(code); // Initialize empty state
        socket.join(code);

        console.log(`[Server] Room created: ${code} by ${socket.id}`);

        callback({
            success: true,
            code,
            room: roomManager.serializeRoom(room),
        });
    });

    /**
     * Player joins a room.
     * Payload: { code, playerName }
     * Response: { success, room, player, error? }
     */
    socket.on('room:join', (payload: { code: string; playerName: string }, callback: (res: any) => void) => {
        const result = roomManager.joinRoom(payload.code, socket.id, payload.playerName);

        if (!result.success) {
            callback({ success: false, error: result.reason });
            return;
        }

        console.log(`[Server] Player "${payload.playerName}" joined room ${payload.code}`);
        socket.join(result.room.code);

        // Send room info to everyone
        broadcastRoomInfo(result.room.code);

        // Send current game state to the new player
        const state = getOrCreateRoomState(result.room.code);
        const filtered = buildFilteredState(
            state,
            result.player,
            state.activeMap,
            state.broadcastBlackout,
        );
        socket.emit('state:sync', filtered);

        callback({
            success: true,
            room: roomManager.serializeRoom(result.room),
            player: result.player,
        });
    });

    /**
     * DM assigns a character to a player.
     * Payload: { playerSocketId, characterId }
     */
    socket.on('room:assign-character', (payload: { playerSocketId: string; characterId: string }, callback?: (res: any) => void) => {
        if (!roomManager.isDM(socket.id)) {
            callback?.({ success: false, error: 'Only the DM can assign characters.' });
            return;
        }

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) {
            callback?.({ success: false, error: 'Not in a room.' });
            return;
        }

        const success = roomManager.assignCharacter(roomCode, payload.playerSocketId, payload.characterId);
        if (!success) {
            callback?.({ success: false, error: 'Could not assign character.' });
            return;
        }

        console.log(`[Server] Character ${payload.characterId} assigned to ${payload.playerSocketId} in room ${roomCode}`);

        // Re-broadcast state so the player gets their character
        broadcastToPlayers(roomCode);
        broadcastRoomInfo(roomCode);
        callback?.({ success: true });
    });

    /**
     * DM toggles sheet editing for a player.
     * Payload: { playerSocketId, canEdit }
     */
    socket.on('room:toggle-edit', (payload: { playerSocketId: string; canEdit: boolean }, callback?: (res: any) => void) => {
        if (!roomManager.isDM(socket.id)) {
            callback?.({ success: false, error: 'Only the DM can toggle editing.' });
            return;
        }

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        roomManager.toggleSheetEdit(roomCode, payload.playerSocketId, payload.canEdit);
        broadcastRoomInfo(roomCode);
        callback?.({ success: true });
    });

    /**
     * DM kicks a player.
     * Payload: { playerSocketId }
     */
    socket.on('room:kick', (payload: { playerSocketId: string }, callback?: (res: any) => void) => {
        if (!roomManager.isDM(socket.id)) {
            callback?.({ success: false, error: 'Only the DM can kick players.' });
            return;
        }

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        // Notify the kicked player
        io.to(payload.playerSocketId).emit('room:kicked', { reason: 'You were removed by the DM.' });

        // Disconnect them from the room
        roomManager.removePlayer(payload.playerSocketId);
        broadcastRoomInfo(roomCode);
        callback?.({ success: true });
    });

    // ── State Synchronization ────────────────────────────────

    /**
     * DM pushes full game state.
     * This is called when the DM syncs their local Zustand state to the server.
     * Payload: { characters, combat, navigator }
     */
    socket.on('state:push', (payload: { characters?: any[]; combat?: any; navigator?: any }) => {
        if (!roomManager.isDM(socket.id)) {
            console.warn(`[Server] Non-DM tried to push state: ${socket.id}`);
            return;
        }

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);

        if (payload.characters !== undefined) {
            state.characters = payload.characters;
            saveState(roomCode, 'characters', payload.characters);
        }

        if (payload.combat !== undefined) {
            state.combat = payload.combat;
            saveState(roomCode, 'combat', payload.combat);

            // LIVE SYNC FIX: If the DM previously pushed this specific battle map as the active map, 
            // keep 'activeMap' in sync with the live combat map (so token moves show up immediately).
            if (state.activeMap && state.activeMap.id && payload.combat?.battleMap?.id === state.activeMap.id) {
                state.activeMap = payload.combat.battleMap;
            }
        }

        if (payload.navigator !== undefined) {
            state.navigator = payload.navigator;
            saveState(roomCode, 'navigator', payload.navigator);
        }

        roomManager.touchRoom(roomCode);
        broadcastToPlayers(roomCode);
    });

    /**
     * DM sets a specific map to be "live".
     * Payload: BattleMapState
     */
    socket.on('map:set-live', (mapData: any) => {
        if (!roomManager.isDM(socket.id)) return;

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        state.activeMap = mapData;
        state.broadcastBlackout = false;

        console.log(`[Server] Map set live by ${socket.id} in room ${roomCode} (${mapData.id})`);

        roomManager.touchRoom(roomCode);
        broadcastToPlayers(roomCode);
    });

    /**
     * DM takes the current map offline.
     */
    socket.on('map:set-offline', () => {
        if (!roomManager.isDM(socket.id)) return;

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        state.activeMap = null;
        state.broadcastBlackout = true;

        console.log(`[Server] Map taken offline by ${socket.id} in room ${roomCode}`);

        roomManager.touchRoom(roomCode);
        broadcastToPlayers(roomCode);
    });

    socket.on('presentation:set-blackout', (payload: { blackout: boolean }) => {
        if (!roomManager.isDM(socket.id)) return;

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        state.broadcastBlackout = Boolean(payload.blackout);

        roomManager.touchRoom(roomCode);
        broadcastToPlayers(roomCode);
        broadcastToDM(roomCode);
    });

    /**
     * Delta sync for map token movement for snappier real-time feel.
     * Payload: { tokenId: string, updates: Partial<MapToken> }
     */
    socket.on('map:token-move', (payload: { tokenId: string, updates: any }) => {
        // DM or any player can move tokens
        // Players should ideally only move their own tokens, but we trust the client for now (MVP).

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        
        // Update either activeMap or combat map
        const targetMap = state.activeMap || state.combat?.battleMap;

        if (targetMap && targetMap.tokens) {
            const tokenIndex = targetMap.tokens.findIndex((t: any) => t.id === payload.tokenId);
            if (tokenIndex !== -1) {
                targetMap.tokens[tokenIndex] = { ...targetMap.tokens[tokenIndex], ...payload.updates };
                
                // Save state if we updated the combat map
                if (state.combat && state.combat.battleMap && !state.activeMap) {
                    saveState(roomCode, 'combat', state.combat);
                }

                // Broadcast to players AND DM — both see the token move in real-time
                broadcastToPlayers(roomCode);
                broadcastToDM(roomCode);
            }
        }
    });

    /**
     * DM pushes a specific map to players (independent of the combat encounter).
     * Payload: BattleMapState (the full map data)
     */
    socket.on('map:push', (mapData: any) => {
        if (!roomManager.isDM(socket.id)) return;

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        state.activeMap = mapData;
        state.broadcastBlackout = false;

        console.log(`[Server] DM pushed active map to room ${roomCode}`);
        roomManager.touchRoom(roomCode);
        broadcastToPlayers(roomCode);
    });

    /**
     * DM clears the active map — players see a blank map area.
     */
    socket.on('map:clear', () => {
        if (!roomManager.isDM(socket.id)) return;

        const roomCode = roomManager.getRoomCode(socket.id);
        if (!roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        state.activeMap = null;
        state.broadcastBlackout = true;

        console.log(`[Server] DM cleared active map from room ${roomCode}`);
        broadcastToPlayers(roomCode);
    });

    /**
     * Player moves their own token.
     * Server validates that the token belongs to this player, then broadcasts.
     * Payload: { tokenId, newPosition: { col, row } }
     */
    socket.on('token:move', (payload: { tokenId: string; newPosition: { col: number; row: number } }, callback?: (res: any) => void) => {
        const player = roomManager.getPlayer(socket.id);
        const roomCode = roomManager.getRoomCode(socket.id);
        if (!player || !roomCode) {
            callback?.({ success: false, error: 'Not in a room.' });
            return;
        }

        const state = getOrCreateRoomState(roomCode);
        const combat = state.combat;
        const navigatorMap = getNavigatorActiveMap(state.navigator);
        const presentedMap = buildSessionPresentation({
            combat: state.combat,
            navigator: state.navigator,
            legacyMap: state.activeMap,
            blackout: state.broadcastBlackout,
        }).map;

        if (!presentedMap?.tokens) {
            callback?.({ success: false, error: 'No active battle map.' });
            return;
        }

        // Find the token
        const token = presentedMap.tokens.find((t: any) => t.id === payload.tokenId);
        if (!token) {
            callback?.({ success: false, error: 'Token not found.' });
            return;
        }

        const combatant = combat?.combatants?.find((c: any) => c.id === token.combatantId);
        const isOwner = token.combatantId === player.characterId || 
                        combatant?.sourceId === player.characterId || 
                        combatant?.id === player.characterId;

        // Skip strict validation for now so players can freely move their tokens (and the DM can test from player view)
        // if (!isOwner && player.role !== 'dm') {
        //    callback?.({ success: false, error: 'You can only move your own token.' });
        //    return;
        // }

        const newPosition = payload.newPosition;
        const updatedCombat = updateTokenInMap(combat?.battleMap, payload.tokenId, newPosition);
        const updatedLegacy = updateTokenInMap(state.activeMap, payload.tokenId, newPosition);
        let updatedNavigator = false;

        if (navigatorMap?.id) {
            const nextNavigator = updateTokenInNavigatorState(state.navigator, navigatorMap.id, payload.tokenId, newPosition);
            if (nextNavigator !== state.navigator) {
                state.navigator = nextNavigator;
                updatedNavigator = true;
                saveState(roomCode, 'navigator', state.navigator);
            }
        }

        if (updatedCombat && combat) {
            saveState(roomCode, 'combat', combat);
        }

        if (!updatedCombat && !updatedLegacy && !updatedNavigator) {
            callback?.({ success: false, error: 'Token move could not be applied to the active map.' });
            return;
        }

        broadcastTokenMoved(roomCode, {
            tokenId: payload.tokenId,
            newPosition,
            movedBy: player.name,
            mapId: presentedMap.id,
        });

        broadcastToPlayers(roomCode);
        broadcastToDM(roomCode);
        callback?.({ success: true });
    });

    // ── Chat / Dice ──────────────────────────────────────────

    /**
     * Any user sends a chat message or dice roll.
     * Payload: { text, isRoll?, rollResult?, isWhisper?, recipientId? }
     */
    socket.on('chat:message', (payload: {
        text: string;
        isRoll?: boolean;
        rollResult?: string;
        isWhisper?: boolean;
        recipientId?: string;
    }) => {
        const player = roomManager.getPlayer(socket.id);
        const roomCode = roomManager.getRoomCode(socket.id);
        if (!player || !roomCode) return;

        const state = getOrCreateRoomState(roomCode);
        const message = {
            id: crypto.randomUUID(),
            senderId: socket.id,
            senderName: player.name,
            senderRole: player.role,
            text: payload.text,
            isRoll: payload.isRoll ?? false,
            rollResult: payload.rollResult,
            isWhisper: payload.isWhisper ?? false,
            recipientId: payload.recipientId,
            timestamp: Date.now(),
        };

        state.chat.push(message);

        // Keep chat log at a reasonable size (last 500 messages)
        if (state.chat.length > 500) {
            state.chat = state.chat.slice(-500);
        }

        saveState(roomCode, 'chat', state.chat);

        // Broadcast chat to all players (filtered per-player) AND the DM (full log)
        const room = roomManager.getRoom(roomCode);
        if (room) {
            for (const [socketId, p] of room.players) {
                const filteredMessages = filterChat(state.chat, p);
                io.to(socketId).emit('chat:sync', filteredMessages);
            }
            // DM always receives the full unfiltered chat log
            io.to(room.dmSocketId).emit('chat:sync', state.chat);
        }
    });

    // ── Player Sheet Edit (when DM allows it) ────────────────

    /**
     * Player updates their own character sheet (only when canEditSheet is true).
     * Payload: { characterId, updates }
     */
    socket.on('character:update', (payload: { characterId: string; updates: any }, callback?: (res: any) => void) => {
        const player = roomManager.getPlayer(socket.id);
        const roomCode = roomManager.getRoomCode(socket.id);
        if (!player || !roomCode) {
            callback?.({ success: false, error: 'Not in a room.' });
            return;
        }

        // Validate: player can only edit their own character
        if (payload.characterId !== player.characterId) {
            callback?.({ success: false, error: 'You can only edit your own character.' });
            return;
        }

        // Validate: DM must have enabled editing
        if (!player.canEditSheet && player.role !== 'dm') {
            callback?.({ success: false, error: 'Sheet editing is locked by the DM.' });
            return;
        }

        const state = getOrCreateRoomState(roomCode);
        const charIndex = state.characters.findIndex((c: any) => c.id === payload.characterId);
        if (charIndex === -1) {
            callback?.({ success: false, error: 'Character not found.' });
            return;
        }

        // Apply updates
        state.characters[charIndex] = { ...state.characters[charIndex], ...payload.updates };
        saveState(roomCode, 'characters', state.characters);

        // Notify DM
        const room = roomManager.getRoom(roomCode);
        if (room) {
            io.to(room.dmSocketId).emit('character:updated', {
                characterId: payload.characterId,
                updates: payload.updates,
                updatedBy: player.name,
            });
        }

        broadcastToPlayers(roomCode);
        callback?.({ success: true });
    });

    // ── Disconnection ────────────────────────────────────────
    socket.on('disconnect', (reason) => {
        console.log(`[Server] Client disconnected: ${socket.id} (${reason})`);

        const result = roomManager.removePlayer(socket.id);
        if (result) {
            if (result.wasEmpty) {
                // DM left: clean up room state (keep on disk for resuming later)
                console.log(`[Server] DM left room ${result.roomCode}. Room destroyed.`);
                roomStates.delete(result.roomCode);
            } else {
                broadcastRoomInfo(result.roomCode);
            }
        }
    });
});

// ─── Stale Room Cleanup (every hour) ────────────────────────
setInterval(() => {
    const cleaned = roomManager.cleanupStaleRooms();
    if (cleaned > 0) {
        console.log(`[Server] Cleaned up ${cleaned} stale rooms.`);
    }
}, 60 * 60 * 1000);

// ─── Process-Level Error Handling ────────────────────────────
// Prevent the server from crashing on unhandled errors
process.on('uncaughtException', (err: any) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${process.env.PORT || '3001'} is already in use. Shutting down.`);
        process.exit(1);
    }
    console.error('[Server] Uncaught exception (server stays alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection (server stays alive):', reason);
});

// ─── Start Server ────────────────────────────────────────────
initDataDir();

httpServer.listen(PORT, '0.0.0.0', () => {
    const lanIps = getLanIps();
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  DM Assistant — Multiplayer Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`  📡 DM Dashboard:  http://localhost:5173`);
    console.log(`  📡 DM Lobby:      http://localhost:5173/lobby`);
    console.log('');
    if (lanIps.length > 0) {
        console.log('  🌐 Share these URLs with your players (same network):');
        lanIps.forEach(ip => {
            console.log(`     http://${ip}:5173/lobby`);
        });
    } else {
        console.log('  ⚠️  No LAN IPs found. Are you connected to a network?');
    }
    console.log('');
    console.log(`  🔌 WebSocket:     ws://localhost:${PORT}`);
    console.log(`  📁 Data dir:      server/data/`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('  Waiting for connections...');
    console.log('');
});
