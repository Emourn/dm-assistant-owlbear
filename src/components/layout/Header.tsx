import { Settings, Bell } from 'lucide-react';
import { useCampaignStore } from '../../store/campaignStore';
import { Link } from 'react-router-dom';

export function Header() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    return (
        <header className="h-16 bg-header border-b border-stone-800 flex items-center justify-between px-6 shrink-0 relative z-40 drop-shadow-md">
            <div className="absolute inset-0 bg-stone-950/40 pointer-events-none" /> {/* Darken texture */}

            <div className="flex items-center gap-6 relative z-10">
                <div className="text-sm font-cinzel text-stone-400 tracking-wider leading-none">
                    {activeCampaign ? (
                        <>Campaign: <Link to={`/campaigns/${activeCampaign.id}`} className="text-engraved-gold font-bold ml-2 hover:text-gold-light transition-colors text-lg">{activeCampaign.title}</Link></>
                    ) : (
                        <>Campaign: <Link to="/campaigns" className="text-stone-500 font-medium ml-1 hover:text-gold transition-colors italic">No Active Campaign</Link></>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 text-stone-400 relative z-10">
                <button className="p-2 hover:bg-stone-800/80 rounded-md transition-all duration-300 hover:text-gold hover-glow-gold" title="Notifications">
                    <Bell size={18} />
                </button>
                <button className="p-2 hover:bg-stone-800/80 rounded-md transition-all duration-300 hover:text-gold hover-glow-gold" title="Settings">
                    <Settings size={18} />
                </button>
            </div>
        </header>
    );
}
