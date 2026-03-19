import { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/ToastProvider';
import { useCampaignStore } from '../store/campaignStore';
import { useCombatStore } from '../store/combatStore';
import { publishRoomStateFromStores } from './bridge';
import { RuntimeWorkbenchShell } from './runtime/RuntimeWorkbenchShell';

function AutoRoomPublisher() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const [role, setRole] = useState<'GM' | 'PLAYER' | null>(null);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let cleanup: (() => void) | undefined;
        const setup = async () => {
            setRole(await OBR.player.getRole());
            cleanup = OBR.player.onChange((player) => setRole(player.role));
        };

        void setup();
        return () => {
            cleanup?.();
        };
    }, []);

    useEffect(() => {
        if (role !== 'GM' || !OBR.isAvailable) {
            return;
        }

        const timeout = window.setTimeout(() => {
            void publishRoomStateFromStores();
        }, 400);

        return () => window.clearTimeout(timeout);
    }, [role, campaigns, activeCampaignId, activeEncounter]);

    return null;
}

export function OwlbearWorkbenchApp() {
    return (
        <ToastProvider>
            <MemoryRouter>
                <AutoRoomPublisher />
                <RuntimeWorkbenchShell />
            </MemoryRouter>
        </ToastProvider>
    );
}
