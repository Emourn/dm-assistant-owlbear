import OBR, { type Item, type Player } from '@owlbear-rodeo/sdk';

export interface SelectionSummary {
    count: number;
    names: string[];
}

export interface OwlbearRuntimeSnapshot {
    ready: boolean;
    role: 'GM' | 'PLAYER' | null;
    roomName: string;
    playerName: string;
    players: Player[];
    selection: SelectionSummary;
}

function getItemName(item: Item): string {
    return item.name?.trim() || `Token ${item.id.slice(0, 6)}`;
}

export async function readRuntimeSnapshot(): Promise<OwlbearRuntimeSnapshot> {
    const [role, player, players, selectionIds] = await Promise.all([
        OBR.player.getRole(),
        OBR.player.getName(),
        OBR.party.getPlayers(),
        OBR.player.getSelection(),
    ]);

    const selectedIds = selectionIds ?? [];
    const selectedItems = selectedIds.length > 0 ? await OBR.scene.items.getItems(selectedIds) : [];

    return {
        ready: true,
        role,
        roomName: OBR.room.id || 'Owlbear Room',
        playerName: player || 'Unknown Player',
        players,
        selection: {
            count: selectedItems.length,
            names: selectedItems.map(getItemName),
        },
    };
}
