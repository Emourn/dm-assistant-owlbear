import { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { HashRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
    BookOpen,
    Home,
    Link2,
    Moon,
    ScrollText,
    Swords,
    Users,
} from 'lucide-react';
import { ToastProvider } from '../components/common/ToastProvider';
import { Camp } from '../pages/Camp';
import { CampaignDetail } from '../pages/CampaignDetail';
import { Campaigns } from '../pages/Campaigns';
import { Characters } from '../pages/Characters';
import { useCampaignStore } from '../store/campaignStore';
import { useCharacterStore } from '../store/characterStore';
import { useCombatStore } from '../store/combatStore';
import { OwlbearCombatRoute } from './OwlbearCombatRoute';
import { OwlbearOverviewPage } from './OwlbearOverviewPage';
import { OwlbearRoomPage } from './OwlbearRoomPage';
import { publishRoomStateFromStores } from './bridge';

const navItems = [
    { to: '/', label: 'Overview', icon: Home },
    { to: '/campaigns', label: 'Campaigns', icon: ScrollText },
    { to: '/characters', label: 'Characters', icon: Users },
    { to: '/combat', label: 'Combat', icon: Swords },
    { to: '/camp', label: 'Rest', icon: Moon },
    { to: '/room', label: 'Owlbear', icon: Link2 },
] as const;

function AutoRoomPublisher() {
    const characters = useCharacterStore((state) => state.characters);
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
    }, [role, characters, campaigns, activeCampaignId, activeEncounter]);

    return null;
}

function WorkbenchShell() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId);

    return (
        <div className="flex h-screen overflow-hidden bg-obsidian text-parchment">
            <aside className="relative flex w-72 flex-col border-r border-stone-800 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_26%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))]">
                <div className="border-b border-stone-800 px-6 py-6">
                    <div className="flex items-center gap-3 text-gold">
                        <div className="rounded-xl border border-gold/20 bg-gold/10 p-2">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <div className="font-cinzel text-2xl font-bold">DM Assistant</div>
                            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-stone-500">Owlbear Workbench</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 px-4 py-6">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                                    isActive
                                        ? 'border border-gold/30 bg-gold/10 text-gold'
                                        : 'border border-transparent text-stone-400 hover:border-stone-800 hover:bg-stone-900/70 hover:text-stone-100'
                                }`
                            }
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-stone-800 px-5 py-4 text-xs text-stone-500">
                    Maps stay in Owlbear Rodeo. DM Assistant handles sheets, campaign state, rest automation, and combat logic around them.
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-b border-stone-800 bg-stone-950/90 px-6 py-4 backdrop-blur">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-500">Active campaign</div>
                            <div className="mt-1 font-cinzel text-2xl font-bold text-parchment">
                                {activeCampaign ? activeCampaign.title : 'No campaign selected'}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/room"
                                className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold"
                            >
                                Owlbear Room Sync
                            </Link>
                            <Link
                                to="/combat"
                                className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400"
                            >
                                Combat Bridge
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto bg-desk">
                    <Routes>
                        <Route path="/" element={<OwlbearOverviewPage />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/campaigns/:id" element={<CampaignDetail />} />
                        <Route path="/characters" element={<Characters />} />
                        <Route path="/combat" element={<OwlbearCombatRoute />} />
                        <Route path="/combat/setup" element={<OwlbearCombatRoute />} />
                        <Route path="/camp" element={<Camp />} />
                        <Route path="/room" element={<OwlbearRoomPage />} />
                        <Route path="/navigator" element={<Navigate to="/room" replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export function OwlbearWorkbenchApp() {
    return (
        <HashRouter>
            <ToastProvider>
                <AutoRoomPublisher />
                <WorkbenchShell />
            </ToastProvider>
        </HashRouter>
    );
}
