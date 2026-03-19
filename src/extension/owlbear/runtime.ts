import OBR, { type Item, type Player } from '@owlbear-rodeo/sdk';

export interface SelectionSummary {
    count: number;
    names: string[];
}

export interface OwlbearRuntimeSnapshot {
    ready: boolean;
    role: 'GM' | 'PLAYER' | null;
    playerId: string | null;
    roomName: string;
    playerName: string;
    players: Player[];
    selection: SelectionSummary;
}

function getItemName(item: Item): string {
    return item.name?.trim() || `Token ${item.id.slice(0, 6)}`;
}

async function safeSdkCall<T>(read: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await Promise.resolve().then(read);
    } catch {
        return fallback;
    }
}

export async function readRuntimeSnapshot(): Promise<OwlbearRuntimeSnapshot> {
    const [role, playerId, player, playersMaybe, selectedIdsMaybe] = await Promise.all([
        safeSdkCall(() => OBR.player.getRole(), null),
        safeSdkCall(() => OBR.player.getId(), null),
        safeSdkCall(() => OBR.player.getName(), 'Unknown Player'),
        safeSdkCall(() => OBR.party.getPlayers(), [] as Player[]),
        safeSdkCall(() => OBR.player.getSelection(), [] as string[]),
    ]);

    const players = Array.isArray(playersMaybe) ? playersMaybe : [];
    const selectedIds = Array.isArray(selectedIdsMaybe) ? selectedIdsMaybe : [];

    let selectedItems: Item[] = [];
    if (selectedIds.length > 0) {
        const items = await safeSdkCall(() => OBR.scene.items.getItems(selectedIds), [] as Item[]);
        selectedItems = Array.isArray(items) ? items : [];
    }

    return {
        ready: true,
        role,
        playerId,
        roomName: OBR.room.id || 'Owlbear Room',
        playerName: player || 'Unknown Player',
        players,
        selection: {
            count: selectedItems.length,
            names: selectedItems.map(getItemName),
        },
    };
}
