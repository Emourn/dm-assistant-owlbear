/**
 * Session Store — Multiplayer Session Management
 * 
 * Zustand store that manages the multiplayer session state.
 * Handles creating/joining rooms, tracking connection status,
 * and managing chat messages.
 * 
 * This store does NOT use the persist middleware — session state
 * is ephemeral and tied to the current connection.
 */

import { create } from 'zustand';
import { socketClient } from './socketClient';
import type { PlayerInfo, ChatMessage, FilteredStateBundle } from './types';
import { useCombatStore } from '../store/combatStore';
import { useCharacterStore } from '../store/characterStore';
import { useNavigatorStore } from '../store/navigatorStore';
import type {
    SessionState,
    SessionRole,
    RoomInfo,
    ConnectionStatus,
} from './types';
// Note: setApplyingServerState is imported lazily to avoid a circular dep at module load time.
// We call it dynamically inside _onStateSync.

// Shared store-refs setter — set by syncMiddleware so we can update DM stores
// when the server broadcasts back player-triggered state changes.
type StoreSetters = {
    setCharacters: (chars: any[]) => void;
    setCombat: (combat: any) => void;
    setNavigator: (navigator: any) => void;
} | null;
let _dmStoreSetters: StoreSetters = null;
export function setDMStoreSetters(setters: StoreSetters): void {
    _dmStoreSetters = setters;
}

interface SessionActions {
    /** Start a multiplayer session as the DM */
    createSession: () => Promise<{ success: boolean; code?: string; error?: string }>;

    /** Join an existing session as a player */
    joinSession: (code: string, playerName: string) => Promise<{ success: boolean; error?: string }>;

    /** Leave the current session */
    leaveSession: () => void;

    /** Send a chat message */
    sendChatMessage: (text: string, options?: { isWhisper?: boolean; recipientId?: string }) => void;

    /** Send a dice roll */
    sendDiceRoll: (text: string, result: string) => void;

    /** DM: assign a character to a player */
    assignCharacter: (playerSocketId: string, characterId: string) => Promise<boolean>;

    /** DM: toggle a player's sheet editing permission */
    togglePlayerEdit: (playerSocketId: string, canEdit: boolean) => Promise<boolean>;

    /** DM: kick a player */
    kickPlayer: (playerSocketId: string) => Promise<boolean>;

    /** DM: push current game state to the server */
    pushState: (state: { characters?: any[]; combat?: any; navigator?: any }) => void;

    /** Internal: update connection status */
    _setConnectionStatus: (status: ConnectionStatus) => void;

    /** Internal: update room info */
    _setRoomInfo: (room: RoomInfo | null) => void;

    /** Internal: set chat messages */
    _setChatMessages: (messages: ChatMessage[]) => void;

    /** Internal: handle state sync from server (player mode) */
    _onStateSync: (state: FilteredStateBundle) => void;

    /** Get current session info */
    getSessionInfo: () => { role: SessionRole | null; roomCode: string | null; isMultiplayer: boolean };
}

const INITIAL_STATE: SessionState = {
    isMultiplayer: false,
    connectionStatus: 'disconnected',
    role: null,
    socketId: null,
    room: null,
    player: null,
    error: null,
    chatMessages: [],
    mapData: null,
    presentation: null,
};

// Callbacks for when we receive state from server (player mode)
// These are set by the sync middleware to update the Zustand stores
type StateSyncCallback = (state: FilteredStateBundle) => void;
let onStateSyncCallback: StateSyncCallback | null = null;

export function setStateSyncCallback(callback: StateSyncCallback | null): void {
    onStateSyncCallback = callback;
}

function patchTokenCollection<T extends { tokens?: any[] }>(
    source: T | null | undefined,
    tokenId: string,
    newPosition: { col: number; row: number },
) {
    if (!source?.tokens?.length) return source;

    let didChange = false;
    const nextTokens = source.tokens.map((token: any) => {
        if (token.id !== tokenId) return token;
        didChange = true;
        return { ...token, position: newPosition };
    });

    if (!didChange) return source;
    return {
        ...source,
        tokens: nextTokens,
    };
}

export const useSessionStore = create<SessionState & SessionActions>()((set, get) => ({
    ...INITIAL_STATE,

    createSession: async () => {
        try {
            const socket = socketClient.connect();

            // Wait for connection
            await new Promise<void>((resolve, reject) => {
                if (socket.connected) {
                    resolve();
                    return;
                }
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                socket.once('connect', () => { clearTimeout(timeout); resolve(); });
                socket.once('connect_error', (err) => { clearTimeout(timeout); reject(err); });
            });

            // Create room
            const response = await socketClient.emitAsync<{
                success: boolean;
                code?: string;
                room?: RoomInfo;
                error?: string;
            }>('room:create');

            if (!response.success) {
                set({ error: response.error || 'Failed to create session.' });
                return { success: false, error: response.error };
            }

            // Set up event listeners
            setupSocketListeners();

            set({
                isMultiplayer: true,
                connectionStatus: 'connected',
                role: 'dm',
                socketId: socketClient.socketId,
                room: response.room ?? null,
                player: null,
                error: null,
            });

            return { success: true, code: response.code };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error connecting to server.';
            set({ error: errorMsg, connectionStatus: 'error' });
            return { success: false, error: errorMsg };
        }
    },

    joinSession: async (code: string, playerName: string) => {
        try {
            const socket = socketClient.connect();

            // Wait for connection
            await new Promise<void>((resolve, reject) => {
                if (socket.connected) {
                    resolve();
                    return;
                }
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                socket.once('connect', () => { clearTimeout(timeout); resolve(); });
                socket.once('connect_error', (err) => { clearTimeout(timeout); reject(err); });
            });

            // Join room
            const response = await socketClient.emitAsync<{
                success: boolean;
                room?: RoomInfo;
                player?: PlayerInfo;
                error?: string;
            }>('room:join', { code, playerName });

            if (!response.success) {
                set({ error: response.error || 'Failed to join session.' });
                return { success: false, error: response.error };
            }

            // Set up event listeners
            setupSocketListeners();

            set({
                isMultiplayer: true,
                connectionStatus: 'connected',
                role: 'player',
                socketId: socketClient.socketId,
                room: response.room ?? null,
                player: response.player ?? null,
                error: null,
            });

            return { success: true };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error joining session.';
            set({ error: errorMsg, connectionStatus: 'error' });
            return { success: false, error: errorMsg };
        }
    },

    leaveSession: () => {
        socketClient.disconnect();
        set(INITIAL_STATE);
    },

    sendChatMessage: (text, options) => {
        socketClient.emit('chat:message', {
            text,
            isWhisper: options?.isWhisper ?? false,
            recipientId: options?.recipientId,
        });
    },

    sendDiceRoll: (text, result) => {
        socketClient.emit('chat:message', {
            text,
            isRoll: true,
            rollResult: result,
        });
    },

    assignCharacter: async (playerSocketId, characterId) => {
        try {
            const response = await socketClient.emitAsync<{ success: boolean; error?: string }>(
                'room:assign-character',
                { playerSocketId, characterId }
            );
            return response.success;
        } catch {
            return false;
        }
    },

    togglePlayerEdit: async (playerSocketId, canEdit) => {
        try {
            const response = await socketClient.emitAsync<{ success: boolean; error?: string }>(
                'room:toggle-edit',
                { playerSocketId, canEdit }
            );
            return response.success;
        } catch {
            return false;
        }
    },

    kickPlayer: async (playerSocketId) => {
        try {
            const response = await socketClient.emitAsync<{ success: boolean; error?: string }>(
                'room:kick',
                { playerSocketId }
            );
            return response.success;
        } catch {
            return false;
        }
    },

    pushState: (state) => {
        if (get().role !== 'dm') return;
        socketClient.emit('state:push', state);
    },

    _setConnectionStatus: (status) => set({ connectionStatus: status }),
    _setRoomInfo: (room) => set((state) => {
        if (!room) return { room: null, player: null };
        const myself = room.players.find((p) => p.socketId === state.socketId);
        return { room, player: myself ?? state.player };
    }),
    _setChatMessages: (messages) => set({ chatMessages: messages }),

    _onStateSync: (filteredState) => {
        set({
            mapData: filteredState.map || null,
            presentation: filteredState.presentation ?? null,
        });

        // For players: apply server state via the registered callback
        if (onStateSyncCallback) {
            onStateSyncCallback(filteredState);
            return;
        }

        // For the DM: the server now also sends state:sync when players make changes
        // (e.g., moving a token). Apply those changes back into the DM's Zustand stores
        // so the DM's map view updates without any manual action.
        const role = get().role;
        if (role === 'dm' && _dmStoreSetters) {
            // Suppress the DM sync subscription so these server-origin changes
            // are not pushed straight back to the server (feedback-loop prevention).
            import('./syncMiddleware').then(({ setApplyingServerState }) => {
                setApplyingServerState(true);
                try {
                    if (filteredState.characters !== undefined && _dmStoreSetters) {
                        _dmStoreSetters.setCharacters(filteredState.characters);
                    }
                    if (filteredState.combat !== undefined && _dmStoreSetters) {
                        _dmStoreSetters.setCombat(filteredState.combat);
                    }
                    if (filteredState.navigator !== undefined && _dmStoreSetters) {
                        _dmStoreSetters.setNavigator(filteredState.navigator);
                    }
                } finally {
                    setApplyingServerState(false);
                }
            });
        }
    },

    getSessionInfo: () => {
        const state = get();
        return {
            role: state.role,
            roomCode: state.room?.code ?? null,
            isMultiplayer: state.isMultiplayer,
        };
    },
}));

/** Set up persistent socket event listeners for room and state sync */
function setupSocketListeners(): void {
    // Connection status tracking
    socketClient.onStatusChange((status) => {
        useSessionStore.getState()._setConnectionStatus(status);
    });

    // Room info updates
    socketClient.on('room:info', (roomInfo: RoomInfo) => {
        useSessionStore.getState()._setRoomInfo(roomInfo);
    });

    // State sync (player mode — receives filtered state from server)
    socketClient.on('state:sync', (filteredState: FilteredStateBundle) => {
        useSessionStore.getState()._onStateSync(filteredState);
    });

    // Chat sync
    socketClient.on('chat:sync', (messages: ChatMessage[]) => {
        useSessionStore.getState()._setChatMessages(messages);
    });

    // Token moved by a player (DM receives this)
    socketClient.on('token:moved', (data: { tokenId: string; newPosition: any; movedBy: string; mapId?: string }) => {
        console.log(`[Session] Token moved by ${data.movedBy}:`, data.tokenId, data.newPosition);
        import('./syncMiddleware').then(({ setApplyingServerState }) => {
            setApplyingServerState(true);
            try {
                useSessionStore.setState((state) => ({
                    mapData: patchTokenCollection(state.mapData, data.tokenId, data.newPosition) ?? state.mapData,
                }));

                useCombatStore.setState((state: any) => {
                    const activeEncounter = state.activeEncounter;
                    const battleMap = activeEncounter?.battleMap;
                    const patchedBattleMap = patchTokenCollection(battleMap, data.tokenId, data.newPosition);

                    if (!activeEncounter || patchedBattleMap === battleMap) {
                        return state;
                    }

                    const movedToken = patchedBattleMap?.tokens?.find((token: any) => token.id === data.tokenId);
                    return {
                        activeEncounter: {
                            ...activeEncounter,
                            battleMap: patchedBattleMap,
                            combatants: (activeEncounter.combatants ?? []).map((combatant: any) =>
                                combatant.id === movedToken?.combatantId
                                    ? { ...combatant, gridPosition: data.newPosition }
                                    : combatant
                            ),
                        },
                    };
                });

                useNavigatorStore.setState((state: any) => {
                    let didChange = false;
                    const nextMaps = (state.dungeonMaps ?? []).map((map: any) => {
                        const shouldPatch = map.id === data.mapId || (map.tokens ?? []).some((token: any) => token.id === data.tokenId);
                        if (!shouldPatch) return map;

                        const patchedMap = patchTokenCollection(map, data.tokenId, data.newPosition);
                        if (patchedMap !== map) {
                            didChange = true;
                        }
                        return patchedMap;
                    });

                    if (!didChange) return state;
                    return { dungeonMaps: nextMaps };
                });
            } catch {
                setApplyingServerState(false);
                return;
            }

            setApplyingServerState(false);
        });
    });

    // Character updated by a player (DM receives this)
    socketClient.on('character:updated', (data: { characterId: string; updates: any; updatedBy: string }) => {
        console.log(`[Session] Character updated by ${data.updatedBy}:`, data.characterId);
        useCharacterStore.getState().updateCharacter(data.characterId, data.updates);
    });

    // Kicked from room
    socketClient.on('room:kicked', (data: { reason: string }) => {
        console.warn('[Session] Kicked from room:', data.reason);
        socketClient.disconnect();
        useSessionStore.setState({
            ...INITIAL_STATE,
            error: `You were removed: ${data.reason}`,
        });
    });
}
