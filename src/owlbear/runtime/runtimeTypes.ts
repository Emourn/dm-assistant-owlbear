import type { Item, Player } from '@owlbear-rodeo/sdk';
import type { Character } from '../../types/character';
import { getLinkedCharacterData, type OwlbearRoomState } from '../shared';

export type WorkspacePanel = 'none' | 'roster' | 'combat' | 'sync' | 'camp' | 'notes' | 'campaigns';

export type EditorState =
    | {
        characterId?: string | null;
        initialData?: Partial<Character>;
    }
    | null;

export interface SelectedTokenContext {
    item: Item;
    linkedCharacter: ReturnType<typeof getLinkedCharacterData>;
}

export interface RuntimeWorkbenchState {
    roomState: OwlbearRoomState | null;
    players: Player[];
    selectedItems: Item[];
    selectedCharacterId: string;
    activePanel: WorkspacePanel;
    editorState: EditorState;
    isImporting: boolean;
    isBusy: boolean;
}

export function getPanelLabel(panel: WorkspacePanel): string {
    switch (panel) {
        case 'roster':
            return 'Sheet Roster';
        case 'combat':
            return 'Combat Tools';
        case 'sync':
            return 'Token Linking & Sync';
        case 'camp':
            return 'Camp Workflow';
        case 'notes':
            return 'Navigator & Notes';
        case 'campaigns':
            return 'Campaign Workspace';
        case 'none':
        default:
            return '';
    }
}
