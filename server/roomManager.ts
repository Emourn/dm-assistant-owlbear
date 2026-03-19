/**
 * Room/Session Manager
 * 
 * Manages multiplayer rooms. A room is created by the DM and joined by players
 * using a short room code (e.g., "GOBLIN").
 */

export interface PlayerInfo {
    socketId: string;
    name: string;
    characterId: string | null;  // Assigned by DM
    role: 'dm' | 'player';
    joinedAt: number;
    canEditSheet: boolean;       // DM controls this
}

export interface Room {
    code: string;
    dmSocketId: string;
    players: Map<string, PlayerInfo>;    // socketId → PlayerInfo
    createdAt: number;
    lastActivity: number;
}

// Word lists for generating memorable room codes
const ADJECTIVES = [
    'BRAVE', 'DARK', 'IRON', 'WILD', 'SHADOW', 'STORM', 'FROST', 'FIRE',
    'GRIM', 'BLOOD', 'STONE', 'NIGHT', 'RUNE', 'FELL', 'DREAD', 'LOST',
    'DIRE', 'PALE', 'DEAD', 'GOLD', 'GREY', 'BLACK', 'RED', 'SILVER'
];

const NOUNS = [
    'GOBLIN', 'DRAGON', 'KNIGHT', 'TOWER', 'CASTLE', 'SWORD', 'SHIELD', 'CRYPT',
    'DEMON', 'SPIDER', 'WOLF', 'RAVEN', 'SKULL', 'THRONE', 'FLAME', 'TOMB',
    'ORC', 'WITCH', 'GIANT', 'BEAST', 'HYDRA', 'LICH', 'WIGHT', 'TROLL'
];

class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private socketToRoom: Map<string, string> = new Map();  // socketId → roomCode

    /**
     * Generate a unique, memorable room code like "DARK-GOBLIN"
     */
    private generateCode(): string {
        const maxAttempts = 100;
        for (let i = 0; i < maxAttempts; i++) {
            const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
            const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
            const code = `${adj}-${noun}`;
            if (!this.rooms.has(code)) return code;
        }
        // Fallback: append random digits
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        return `${adj}-${noun}-${Math.floor(Math.random() * 99)}`;
    }

    /**
     * Create a new room. Only the DM calls this.
     */
    createRoom(dmSocketId: string): { code: string; room: Room } {
        // Clean up any existing room this DM is in
        const existingCode = this.socketToRoom.get(dmSocketId);
        if (existingCode) {
            this.destroyRoom(existingCode);
        }

        const code = this.generateCode();
        const now = Date.now();

        const dmInfo: PlayerInfo = {
            socketId: dmSocketId,
            name: 'Dungeon Master',
            characterId: null,
            role: 'dm',
            joinedAt: now,
            canEditSheet: true
        };

        const room: Room = {
            code,
            dmSocketId,
            players: new Map([[dmSocketId, dmInfo]]),
            createdAt: now,
            lastActivity: now
        };

        this.rooms.set(code, room);
        this.socketToRoom.set(dmSocketId, code);

        return { code, room };
    }

    /**
     * Join an existing room as a player.
     */
    joinRoom(code: string, socketId: string, playerName: string): 
        { success: true; room: Room; player: PlayerInfo } | 
        { success: false; reason: string } {
        
        const upperCode = code.toUpperCase().trim();
        const room = this.rooms.get(upperCode);

        if (!room) {
            return { success: false, reason: `Room "${upperCode}" not found. Check the code and try again.` };
        }

        // Check for duplicate socket
        if (room.players.has(socketId)) {
            const existing = room.players.get(socketId)!;
            return { success: true, room, player: existing };
        }

        const player: PlayerInfo = {
            socketId,
            name: playerName || `Player ${room.players.size}`,
            characterId: null,
            role: 'player',
            joinedAt: Date.now(),
            canEditSheet: false
        };

        room.players.set(socketId, player);
        room.lastActivity = Date.now();
        this.socketToRoom.set(socketId, upperCode);

        return { success: true, room, player };
    }

    /**
     * Get a room by its code.
     */
    getRoom(code: string): Room | null {
        return this.rooms.get(code.toUpperCase().trim()) ?? null;
    }

    /**
     * Get the room a socket is in.
     */
    getRoomBySocket(socketId: string): Room | null {
        const code = this.socketToRoom.get(socketId);
        if (!code) return null;
        return this.rooms.get(code) ?? null;
    }

    /**
     * Get the room code a socket is in.
     */
    getRoomCode(socketId: string): string | null {
        return this.socketToRoom.get(socketId) ?? null;
    }

    /**
     * Get a player's info by their socket ID.
     */
    getPlayer(socketId: string): PlayerInfo | null {
        const room = this.getRoomBySocket(socketId);
        if (!room) return null;
        return room.players.get(socketId) ?? null;
    }

    /**
     * Check if a socket belongs to the DM of its room.
     */
    isDM(socketId: string): boolean {
        const room = this.getRoomBySocket(socketId);
        if (!room) return false;
        return room.dmSocketId === socketId;
    }

    /**
     * Assign a character to a player. Only DM should call this.
     */
    assignCharacter(roomCode: string, playerSocketId: string, characterId: string): boolean {
        const room = this.getRoom(roomCode);
        if (!room) return false;
        const player = room.players.get(playerSocketId);
        if (!player || player.role === 'dm') return false;

        player.characterId = characterId;
        room.lastActivity = Date.now();
        return true;
    }

    /**
     * Toggle a player's ability to edit their sheet.
     */
    toggleSheetEdit(roomCode: string, playerSocketId: string, canEdit: boolean): boolean {
        const room = this.getRoom(roomCode);
        if (!room) return false;
        const player = room.players.get(playerSocketId);
        if (!player || player.role === 'dm') return false;

        player.canEditSheet = canEdit;
        return true;
    }

    /**
     * Remove a player from a room (kick or disconnect).
     */
    removePlayer(socketId: string): { roomCode: string; wasEmpty: boolean } | null {
        const code = this.socketToRoom.get(socketId);
        if (!code) return null;

        const room = this.rooms.get(code);
        if (!room) {
            this.socketToRoom.delete(socketId);
            return null;
        }

        room.players.delete(socketId);
        this.socketToRoom.delete(socketId);

        // If the DM left, destroy the room
        if (room.dmSocketId === socketId) {
            this.destroyRoom(code);
            return { roomCode: code, wasEmpty: true };
        }

        return { roomCode: code, wasEmpty: room.players.size === 0 };
    }

    /**
     * Destroy a room entirely.
     */
    destroyRoom(code: string): void {
        const room = this.rooms.get(code);
        if (!room) return;

        // Clean up all socket mappings
        for (const socketId of room.players.keys()) {
            this.socketToRoom.delete(socketId);
        }

        this.rooms.delete(code);
    }

    /**
     * Touch room activity timestamp.
     */
    touchRoom(code: string): void {
        const room = this.rooms.get(code);
        if (room) room.lastActivity = Date.now();
    }

    /**
     * Get all non-DM players in a room.
     */
    getPlayers(roomCode: string): PlayerInfo[] {
        const room = this.getRoom(roomCode);
        if (!room) return [];
        return Array.from(room.players.values()).filter(p => p.role === 'player');
    }

    /**
     * Serialize room info for client consumption (no Map objects).
     */
    serializeRoom(room: Room): {
        code: string;
        players: (PlayerInfo & { isOnline: boolean })[];
        createdAt: number;
    } {
        return {
            code: room.code,
            players: Array.from(room.players.values()).map(p => ({
                ...p,
                isOnline: true  // All players currently in the Map are connected
            })),
            createdAt: room.createdAt
        };
    }

    /**
     * Clean up stale rooms (no activity for 12 hours).
     */
    cleanupStaleRooms(): number {
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const now = Date.now();
        let cleaned = 0;

        for (const [code, room] of this.rooms.entries()) {
            if (now - room.lastActivity > TWELVE_HOURS) {
                this.destroyRoom(code);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// Singleton
export const roomManager = new RoomManager();
