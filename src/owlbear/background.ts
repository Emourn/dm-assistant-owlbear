import OBR from '@owlbear-rodeo/sdk';
import { IMPORT_CONTEXT_MENU_ID } from './shared';
import { openWorkbench, stashPendingTokenImport } from './host';

function getContextMenuIconUrl(): string {
    return new URL('./owlbear/combat-import.svg', window.location.href).toString();
}

OBR.onReady(() => {
    void OBR.contextMenu.remove(IMPORT_CONTEXT_MENU_ID).catch(() => undefined);
    void OBR.contextMenu.create({
        id: IMPORT_CONTEXT_MENU_ID,
        icons: [
            {
                icon: getContextMenuIconUrl(),
                label: 'Import to DM Assistant',
                filter: {
                    min: 1,
                    roles: ['GM'],
                },
            },
        ],
        onClick: async (context, elementId) => {
            stashPendingTokenImport(context.items, 'context-menu');
            await openWorkbench('#/combat', elementId);
        },
    });
});
