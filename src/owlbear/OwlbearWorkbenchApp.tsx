import { useEffect, useMemo, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
    BookOpen,
    Crosshair,
    Link2,
    Moon,
    RadioTower,
    ScrollText,
    Sparkles,
    Swords,
    Users,
} from 'lucide-react';
import { ToastProvider } from '../components/common/ToastProvider';
import { Camp } from '../pages/Camp';
import { CampaignNavigator } from '../pages/CampaignNavigator';
import { Campaigns } from '../pages/Campaigns';
import { Characters } from '../pages/Characters';
import { useCampaignStore } from '../store/campaignStore';
import { useCombatStore } from '../store/combatStore';
import { OwlbearCombatRoute } from './OwlbearCombatRoute';
import { OwlbearOverviewPage } from './OwlbearOverviewPage';
import { OwlbearRoomPage } from './OwlbearRoomPage';
import { importCurrentSelectionIntoCombat, publishRoomStateFromStores } from './bridge';

const navItems = [
    { to: '/', label: 'Overview', icon: Sparkles },
    { to: '/campaigns', label: 'Campaigns', icon: ScrollText },
    { to: '/characters', label: 'Characters', icon: Users },
    { to: '/navigator', label: 'Navigator', icon: BookOpen },
    { to: '/combat', label: 'Combat', icon: Swords },
    { to: '/camp', label: 'Camp', icon: Moon },
    { to: '/room', label: 'Sync', icon: Link2 },
] as const;

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

function QuickActions() {
    const [isBusy, setIsBusy] = useState(false);

    const handleImportSelection = async () => {
        setIsBusy(true);
        try {
            const count = await importCurrentSelectionIntoCombat('workbench');
            if (count === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }

            await OBR.notification.show(`Imported ${count} token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handlePublish = async () => {
        setIsBusy(true);
        try {
            await publishRoomStateFromStores();
            await OBR.notification.show('Published DM Assistant room state.', 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                onClick={handleImportSelection}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-stone-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
                <Crosshair size={14} />
                Import Selection
            </button>
            <button
                type="button"
                onClick={handlePublish}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
            >
                <RadioTower size={14} />
                Publish
            </button>
        </div>
    );
}

function CompactWorkbenchShell() {
    const location = useLocation();
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);

    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId);
    const activeNavLabel = useMemo(
        () => navItems.find((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)))?.label ?? 'Overview',
        [location.pathname],
    );

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))] text-parchment">
            <header className="border-b border-stone-800 bg-stone-950/90 px-4 py-4 backdrop-blur">
                <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-gold">
                                <Sparkles size={12} />
                                Map-Preserving DM Panel
                            </div>
                            <h1 className="mt-3 font-cinzel text-2xl font-bold text-parchment">DM Assistant</h1>
                            <p className="mt-1 text-sm leading-relaxed text-stone-400">
                                Stay on the Owlbear map while you manage sheets, rests, notes, combat flow, and token links.
                            </p>
                        </div>
                        <QuickActions />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                        <StatusPill label="Panel" value={activeNavLabel} />
                        <StatusPill label="Campaign" value={activeCampaign?.title ?? 'No active campaign'} />
                        <StatusPill label="Encounter" value={activeEncounter?.title ?? 'No active encounter'} />
                    </div>
                </div>
            </header>

            <nav className="border-b border-stone-800 bg-stone-950/70 px-3 py-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors ${
                                    isActive
                                        ? 'border-gold/30 bg-gold/10 text-gold'
                                        : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:border-stone-700 hover:text-stone-100'
                                }`
                            }
                        >
                            <item.icon size={14} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(28,25,23,0.2),rgba(9,9,11,0.55))] p-3">
                <Routes>
                    <Route path="/" element={<OwlbearOverviewPage />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/characters" element={<Characters />} />
                    <Route path="/navigator" element={<CampaignNavigator />} />
                    <Route path="/combat" element={<OwlbearCombatRoute />} />
                    <Route path="/combat/setup" element={<OwlbearCombatRoute />} />
                    <Route path="/camp" element={<Camp />} />
                    <Route path="/room" element={<OwlbearRoomPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

function StatusPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/75 px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">{label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-stone-100">{value}</div>
        </div>
    );
}

export function OwlbearWorkbenchApp() {
    return (
        <HashRouter>
            <ToastProvider>
                <AutoRoomPublisher />
                <CompactWorkbenchShell />
            </ToastProvider>
        </HashRouter>
    );
}
