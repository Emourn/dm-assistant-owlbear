import { Users, Swords, Tent, Heart, Star, BookOpen, Map, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCharacterStore } from '../store/characterStore';
import { useCombatStore } from '../store/combatStore';
import { useCampaignStore } from '../store/campaignStore';
import { useNavigatorStore } from '../store/navigatorStore';

export function Dashboard() {
    const allCharacters = useCharacterStore((state) => state.characters);
    const history = useCombatStore((state) => state.history);

    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    const narratives = useNavigatorStore((state) => state.narratives);
    const activeNarrativeId = useNavigatorStore((state) => state.activeNarrativeId);
    const currentSceneId = useNavigatorStore((state) => state.currentSceneId);

    const activeNarrative = narratives.find(n => n.id === activeNarrativeId);
    let currentSceneName = '';
    let progress = 0;

    if (activeNarrative) {
        const totalScenes = activeNarrative.chapters.reduce((sum, ch) => sum + ch.scenes.length, 0);
        progress = Math.round((activeNarrative.visitedSceneIds.length / totalScenes) * 100);

        if (currentSceneId) {
            for (const chapter of activeNarrative.chapters) {
                const found = chapter.scenes.find(s => s.id === currentSceneId);
                if (found) {
                    currentSceneName = found.title;
                    break;
                }
            }
        }
    }

    // Determine which characters to summarize (Active Campaign Party vs All)
    const displayCharacters = activeCampaign
        ? allCharacters.filter(c => activeCampaign.partyIds.includes(c.id))
        : allCharacters;

    // Aggregate stats
    const totalCurrentHp = displayCharacters.reduce((sum, c) => sum + c.currentHp, 0);
    const totalMaxHp = displayCharacters.reduce((sum, c) => sum + c.maxHp, 0);
    const avgLevel = displayCharacters.length > 0
        ? (displayCharacters.reduce((sum, c) => sum + c.level, 0) / displayCharacters.length).toFixed(1)
        : '0';
    const partyHpPercent = totalMaxHp > 0 ? Math.round((totalCurrentHp / totalMaxHp) * 100) : 100;

    // Filter history to only current campaign if set
    const displayHistory = activeCampaign
        ? history.filter(h => h.campaignId === activeCampaignId)
        : history;

    // Most recent combat
    const lastCombat = displayHistory.length > 0 ? displayHistory[displayHistory.length - 1] : null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-6 md:p-8">
            <header className="space-y-4">
                <h1 className="text-4xl font-cinzel font-bold text-engraved-gold drop-shadow-md flex items-center gap-3">
                    <Sparkles className="text-gold" size={32} /> Welcome, Loremaster
                </h1>
                {activeCampaign ? (
                    <p className="text-stone-400 text-lg">
                        Currently running: <Link to={`/campaigns/${activeCampaign.id}`} className="text-gold hover:text-gold-light hover:underline font-cinzel font-bold">{activeCampaign.title}</Link>
                    </p>
                ) : campaigns.length > 0 ? (
                    <p className="text-stone-400 text-lg">
                        You have no active campaign selected. <Link to="/campaigns" className="text-gold hover:text-gold-light hover:underline font-bold">Select one here.</Link>
                    </p>
                ) : (
                    <p className="text-parchment-muted text-lg italic">
                        The archives are empty. Your legend begins with a single click.
                    </p>
                )}
            </header>

            {/* Empty State Onboarding */}
            {allCharacters.length === 0 && campaigns.length === 0 && (
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-8 text-center space-y-4 animate-in zoom-in duration-700">
                    <div className="inline-flex p-4 bg-gold/10 rounded-full text-gold mb-2">
                        <Sparkles size={40} />
                    </div>
                    <h2 className="text-2xl font-cinzel font-bold text-parchment">Start Your Adventure</h2>
                    <p className="text-stone-400 max-w-lg mx-auto leading-relaxed">
                        Welcome to the DM Assistant! To begin your first session, we recommend creating a few <span className="text-gold font-bold">Characters</span> first, then grouping them into a <span className="text-gold font-bold">Campaign</span>.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Link to="/characters" className="px-6 py-2 bg-gold text-stone-950 font-bold rounded hover:bg-gold/80 transition-all flex items-center gap-2">
                            <Users size={18} /> Create Heroes
                        </Link>
                        <Link to="/campaigns" className="px-6 py-2 bg-stone-800 border border-stone-700 text-gold font-bold rounded hover:bg-stone-700 transition-all">
                            New Campaign
                        </Link>
                    </div>
                </div>
            )}

            {/* Active Campaign Continuation */}
            {activeCampaign && (
                <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-gold/30 rounded-xl p-6 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute -top-10 -right-10 p-4 opacity-10 pointer-events-none transform rotate-12">
                        <BookOpen size={180} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl font-cinzel font-bold text-parchment mb-2">Resume Journey: {activeCampaign.title}</h2>
                            {activeNarrative ? (
                                <div className="mt-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Current Scene:</span>
                                        <span className="text-sm text-gold">{currentSceneName || activeNarrative.title}</span>
                                    </div>
                                    <div className="w-full bg-stone-900 rounded-full h-1.5 mt-2 border border-stone-700/50">
                                        <div className="bg-gold h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-[10px] text-stone-500 mt-1 text-right">{progress}% Complete</p>
                                </div>
                            ) : (
                                <p className="text-stone-400 max-w-xl text-sm leading-relaxed mt-2">
                                    Lead your party into the unknown. The immersive Narrative Engine handles the story, automation, and combat integration so you can focus on being a great Game Master.
                                </p>
                            )}
                        </div>
                        <Link to="/navigator" className="shrink-0 px-8 py-3 bg-gold text-stone-950 font-cinzel font-bold tracking-wider rounded hover:bg-gold-light transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_25px_rgba(217,119,6,0.5)] flex items-center gap-2">
                            <BookOpen size={18} /> Launch Navigator
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/campaigns" className="group bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 hover:border-gold/50 rounded-lg p-6 transition-all shadow-md hover:shadow-lg hover:shadow-gold/5 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-4 bg-obsidian-dark rounded-full group-hover:scale-110 transition-transform">
                        <Map size={28} className="text-green-500 group-hover:text-gold transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-cinzel font-bold text-lg text-parchment">Campaigns</h3>
                    </div>
                </Link>

                <Link to="/characters" className="group bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 hover:border-gold/50 rounded-lg p-6 transition-all shadow-md hover:shadow-lg hover:shadow-gold/5 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-4 bg-obsidian-dark rounded-full group-hover:scale-110 transition-transform">
                        <Users size={28} className="text-blue-400 group-hover:text-gold transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-cinzel font-bold text-lg text-parchment">Characters</h3>
                    </div>
                </Link>

                <Link to="/combat" className="group bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 hover:border-gold/50 rounded-lg p-6 transition-all shadow-md hover:shadow-lg hover:shadow-gold/5 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-4 bg-obsidian-dark rounded-full group-hover:scale-110 transition-transform">
                        <Swords size={28} className="text-red-500 group-hover:text-gold transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-cinzel font-bold text-lg text-parchment">Combat</h3>
                    </div>
                </Link>

                <Link to="/camp" className="group bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 hover:border-gold/50 rounded-lg p-6 transition-all shadow-md hover:shadow-lg hover:shadow-gold/5 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-4 bg-obsidian-dark rounded-full group-hover:scale-110 transition-transform">
                        <Tent size={28} className="text-yellow-600 group-hover:text-gold transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-cinzel font-bold text-lg text-parchment">Camp (Rests)</h3>
                    </div>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-800/60 border border-stone-700/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-cinzel font-bold text-parchment">{displayCharacters.length}</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider">{activeCampaign ? 'Party Members' : 'Total Heroes'}</div>
                    </div>
                </div>

                <div className="bg-stone-800/60 border border-stone-700/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 bg-gold/10 rounded-lg">
                        <Star size={20} className="text-gold" />
                    </div>
                    <div>
                        <div className="text-2xl font-cinzel font-bold text-parchment">{avgLevel}</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider">Avg Level</div>
                    </div>
                </div>

                <div className="bg-stone-800/60 border border-stone-700/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 bg-blood/10 rounded-lg">
                        <Heart size={20} className="text-blood" />
                    </div>
                    <div>
                        <div className="text-2xl font-cinzel font-bold text-parchment">
                            {totalCurrentHp}<span className="text-sm text-stone-500">/{totalMaxHp}</span>
                        </div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider">Party HP ({partyHpPercent}%)</div>
                    </div>
                </div>

                <div className="bg-stone-800/60 border border-stone-700/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 bg-arcane/10 rounded-lg">
                        <Swords size={20} className="text-arcane" />
                    </div>
                    <div>
                        <div className="text-2xl font-cinzel font-bold text-parchment">{displayHistory.length}</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider">Battles Won</div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Combat + Campaign Notes Link */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Combat */}
                <div className="bg-obsidian border border-stone-700/50 rounded-lg p-6 shadow-md">
                    <div className="flex items-center gap-2 text-blood mb-4">
                        <Swords size={18} />
                        <h3 className="font-cinzel font-bold text-lg text-parchment">Last Encounter</h3>
                    </div>
                    {lastCombat ? (
                        <div className="flex justify-between items-end mt-4">
                            <div className="space-y-1">
                                <div className="text-xl font-cinzel text-parchment drop-shadow-sm">{lastCombat?.title || 'Unknown Encounter'}</div>
                                <div className="text-sm text-stone-400">
                                    Round {lastCombat?.round || 0} • {lastCombat?.combatants?.length || 0} Combatants
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-parchment-muted italic border-l-2 border-stone-700 pl-3">
                            No battles have been fought yet. Steel your resolve — the first encounter awaits.
                        </p>
                    )}
                </div>

                {/* Session Notes Link */}
                <div className="bg-obsidian border border-stone-700/50 rounded-lg p-6 shadow-md flex flex-col justify-center items-center text-center">
                    <div className="p-4 bg-stone-800/50 rounded-full mb-4">
                        <BookOpen size={32} className="text-gold" />
                    </div>
                    <h3 className="font-cinzel font-bold text-xl text-parchment mb-2">Session Notes</h3>
                    <p className="text-sm text-stone-400 mb-6 max-w-sm">
                        Session notes have been moved to individual Campaign Dashboards to better organize your adventures.
                    </p>
                    {activeCampaign ? (
                        <Link to={`/campaigns/${activeCampaign.id}`} className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-gold font-bold rounded border border-stone-600 transition-colors shadow-sm">
                            View {activeCampaign.title} Notes
                        </Link>
                    ) : (
                        <Link to="/campaigns" className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded border border-stone-600 transition-colors shadow-sm">
                            Manage Campaigns
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
