import { useState } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { HeroCard } from '../components/camp/HeroCard';
import { ShortRestModal } from '../components/camp/ShortRestModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Character } from '../types/character';
import { Tent, Moon, Heart, Map } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { Link } from 'react-router-dom';
export function Camp() {
    const { characters, shortRest, longRest, longRestParty } = useCharacterStore();
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    // Filter characters to only those in the active campaign
    const displayCharacters = activeCampaign
        ? characters.filter(c => activeCampaign.partyIds.includes(c.id))
        : [];

    const [shortRestChar, setShortRestChar] = useState<Character | null>(null);
    const [longRestChar, setLongRestChar] = useState<Character | null>(null);
    const [longRestAllConfirm, setLongRestAllConfirm] = useState(false);

    const handleShortRest = (char: Character, hitsToSpend: number) => {
        shortRest(char.id, hitsToSpend);
    };

    const handleLongRest = (char: Character) => {
        longRest(char.id);
    };

    // Party aggregate stats
    const totalCurrentHp = displayCharacters.reduce((sum, c) => sum + c.currentHp, 0);
    const totalMaxHp = displayCharacters.reduce((sum, c) => sum + c.maxHp, 0);
    const avgLevel = displayCharacters.length > 0 ? (displayCharacters.reduce((sum, c) => sum + c.level, 0) / displayCharacters.length).toFixed(1) : '0';
    const partyHpPercent = totalMaxHp > 0 ? Math.round((totalCurrentHp / totalMaxHp) * 100) : 100;

    return (
        <div className="bg-camp min-h-[calc(100vh-4rem)] p-6 md:p-8 animate-in fade-in">
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-xl border border-gold/20 shadow-[-5px_15px_30px_rgba(0,0,0,0.8)]">
                    <div className="space-y-1">
                        <h1 className="font-cinzel text-3xl text-engraved-gold flex items-center gap-3">
                            <Tent size={32} className="drop-shadow-md" /> Party Camp
                        </h1>
                        <p className="text-stone-400">
                            {activeCampaign ? `Camp for ${activeCampaign.title}` : 'Your party at a glance'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setLongRestAllConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-parchment border border-stone-600 rounded transition-colors"
                        >
                            <Moon size={16} />
                            Long Rest All
                        </button>
                    </div>
                </header>

                <div className="ornate-divider" />

                {!activeCampaignId ? (
                    <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-lg">
                        <Map size={56} className="mx-auto text-stone-700 mb-4" />
                        <p className="text-stone-500 text-lg">No Active Campaign</p>
                        <p className="text-stone-600 text-sm mt-1 mb-6">Select a campaign to manage the party's rests.</p>
                        <Link to="/campaigns" className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-gold font-bold rounded border border-stone-600 transition-colors shadow-sm">
                            Go to Campaigns
                        </Link>
                    </div>
                ) : displayCharacters.length === 0 ? (
                    <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-lg">
                        <Tent size={56} className="mx-auto text-stone-700 mb-4" />
                        <p className="text-stone-500 text-lg">No adventurers in your party yet.</p>
                        <p className="text-stone-600 text-sm mt-1">Assign characters to this campaign from the Campaign Dashboard.</p>
                    </div>
                ) : (
                    <>
                        {/* Hero Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {displayCharacters.map(char => (
                                <HeroCard
                                    key={char.id}
                                    character={char}
                                    onShortRest={() => setShortRestChar(char)}
                                    onLongRest={() => setLongRestChar(char)}
                                />
                            ))}
                        </div>

                        {/* Party Summary Bar */}
                        <div className="glass-panel rounded-lg p-5 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Heart size={16} className={partyHpPercent > 50 ? 'text-green-500' : partyHpPercent > 20 ? 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-blood drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]'} />
                                    <span className="text-sm text-stone-400">Party HP:</span>
                                    <span className="text-sm text-parchment font-bold">{totalCurrentHp} / {totalMaxHp}</span>
                                    <span className={`text-xs font-bold ${partyHpPercent > 50 ? 'text-green-500' : partyHpPercent > 20 ? 'text-yellow-500' : 'text-blood'}`}>({partyHpPercent}%)</span>
                                </div>
                                <div className="w-px h-4 bg-stone-700" />
                                <div className="text-sm text-stone-400">
                                    Avg Level: <span className="text-parchment font-bold">{avgLevel}</span>
                                </div>
                                <div className="w-px h-4 bg-stone-700" />
                                <div className="text-sm text-stone-400">
                                    Members: <span className="text-parchment font-bold">{displayCharacters.length}</span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="h-2 w-48 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                                    <div
                                        className={`h-full transition-all duration-500 ${partyHpPercent > 50 ? 'bg-green-600' : partyHpPercent > 20 ? 'bg-yellow-500' : 'bg-blood'}`}
                                        style={{ width: `${partyHpPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>

            <ShortRestModal
                isOpen={!!shortRestChar}
                onClose={() => setShortRestChar(null)}
                character={shortRestChar}
                onConfirm={(spend) => {
                    if (shortRestChar) handleShortRest(shortRestChar, spend);
                }}
            />

            <ConfirmModal
                isOpen={!!longRestChar}
                onClose={() => setLongRestChar(null)}
                title={`Confirm Long Rest: ${longRestChar?.name}`}
                message={`Are you sure you want to take a Long Rest for ${longRestChar?.name}? This will restore all hit points, spell slots, and reset long/short rest features.`}
                onConfirm={() => {
                    if (longRestChar) handleLongRest(longRestChar);
                }}
                confirmText="Long Rest"
            />

            <ConfirmModal
                isOpen={longRestAllConfirm}
                onClose={() => setLongRestAllConfirm(false)}
                title="Confirm Party Long Rest"
                message="Are you sure you want to take a Long Rest for ALL characters? This will restore all hit points, spell slots, and reset long/short rest features for the entire party."
                onConfirm={() => {
                    longRestParty(displayCharacters.map(c => c.id));
                    setLongRestAllConfirm(false);
                }}
                confirmText="Rest Party"
            />
        </div>
    );
}
