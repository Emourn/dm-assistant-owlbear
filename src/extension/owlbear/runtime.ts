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
    const [roleResult, playerResult, playersResult, selectionResult] = await Promise.allSettled([
        OBR.player.getRole(),
        OBR.player.getName(),
        OBR.party.getPlayers(),
        OBR.player.getSelection(),
    ]);

    const role = roleResult.status === 'fulfilled' ? roleResult.value : null;
    const player = playerResult.status === 'fulfilled' ? playerResult.value : 'Unknown Player';
    const players = playersResult.status === 'fulfilled' && Array.isArray(playersResult.value)
        ? playersResult.value
        : [];
    const selectedIds = selectionResult.status === 'fulfilled' && Array.isArray(selectionResult.value)
        ? selectionResult.value
        : [];

    let selectedItems: Item[] = [];
    if (selectedIds.length > 0) {
        try {
            const items = await OBR.scene.items.getItems(selectedIds);
            selectedItems = Array.isArray(items) ? items : [];
        } catch {
            selectedItems = [];
        }
    }

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
