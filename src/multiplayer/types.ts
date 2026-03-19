import type { SessionPresentation } from '../engine/sessionPresentation';

/**
 * Multiplayer Type Definitions
 * 
 * Shared types used by the client-side multiplayer modules.
 */

/** Roles in a multiplayer session */
export type SessionRole = 'dm' | 'player';

/** Information about a connected player */
export interface PlayerInfo {
    socketId: string;
    name: string;
    characterId: string | null;
    role: SessionRole;
    joinedAt: number;
    canEditSheet: boolean;
    isOnline: boolean;
}

/** Serialized room info received from the server */
export interface RoomInfo {
    code: string;
    players: PlayerInfo[];
    createdAt: number;
}

/** The filtered state bundle that players receive from the server */
export interface FilteredStateBundle {
    characters: any[];
    combat: any;
    map: any;
    chat: ChatMessage[];
    navigator?: any;
    presentation?: SessionPresentation;
}

/** A chat message or dice roll */
export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: SessionRole;
    text: string;
    isRoll: boolean;
    rollResult?: string;
    isWhisper: boolean;
    recipientId?: string;
    timestamp: number;
}

/** Connection states for the socket */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** The full session state managed by SessionContext */
export interface SessionState {
    /** Whether we're in multiplayer mode at all */
    isMultiplayer: boolean;
    /** Current connection status */
    connectionStatus: ConnectionStatus;
    /** Our role in the session */
    role: SessionRole | null;
    /** Our socket ID */
    socketId: string | null;
    /** Current room info */
    room: RoomInfo | null;
    /** Our player info */
    player: PlayerInfo | null;
    /** Last error message */
    error: string | null;
    /** Chat messages */
    chatMessages: ChatMessage[];
    /** The active map pushed by the DM (null if no map is live) */
    mapData: any | null;
    /** High-level summary of what the table is currently seeing */
    presentation: SessionPresentation | null;
}
