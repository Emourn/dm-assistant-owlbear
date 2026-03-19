import { useState } from 'react';
import { Play, Trash2, Calendar, Skull } from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { getDifficultyColor } from '../../engine/encounterDifficulty';

export function EncounterLibrary({ campaignId }: { campaignId?: string }) {
    const savedEncounters = useCombatStore((state) => state.savedEncounters);
    const loadSavedEncounter = useCombatStore((state) => state.loadSavedEncounter);
    const deleteSavedEncounter = useCombatStore((state) => state.deleteSavedEncounter);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const displayEncounters = campaignId
        ? savedEncounters?.filter(e => e.campaignId === campaignId) || []
        : savedEncounters || [];

    if (!displayEncounters || displayEncounters.length === 0) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-12 space-y-4 animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-cinzel font-bold text-gold flex items-center gap-2 border-b border-stone-800 pb-2">
                <Calendar size={20} /> Saved Encounters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...displayEncounters].sort((a, b) => b.createdAt - a.createdAt).map(enc => (
                    <div key={enc.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex flex-col justify-between hover:border-stone-700 transition-colors">
                        <div>
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <h4 className="font-bold text-parchment font-cinzel min-h-[48px] line-clamp-2 leading-tight">{enc.title}</h4>
                                {enc.estimatedDifficulty && (
                                    <span className={`text-[9px] uppercase mt-1 tracking-widest px-1.5 py-0.5 rounded border ${getDifficultyColor(enc.estimatedDifficulty)}`}>
                                        {enc.estimatedDifficulty}
                                    </span>
                                )}
                            </div>
                            {enc.description && <p className="text-xs text-stone-400 mb-3 line-clamp-2">{enc.description}</p>}

                            <div className="flex gap-2 text-xs text-stone-500 mb-4 bg-stone-950/50 p-2 rounded">
                                <span className="flex items-center gap-1"><Skull size={12} className="text-blood" /> {enc.enemies.length} Enemies</span>
                                {enc.totalXP ? <span>• {enc.totalXP.toLocaleString()} XP</span> : null}
                            </div>
                        </div>

                        <div className="flex gap-2 mt-auto pt-4 border-t border-stone-800">
                            <button
                                type="button"
                                onClick={() => loadSavedEncounter(enc.id)}
                                className="flex-1 bg-stone-800 hover:bg-gold text-stone-300 hover:text-stone-950 text-sm font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                            >
                                <Play size={14} fill="currentColor" /> Load
                            </button>
                            {confirmDeleteId === enc.id ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { deleteSavedEncounter(enc.id); setConfirmDeleteId(null); }}
                                        className="px-2 py-1 text-xs font-bold text-red-400 bg-red-900/30 rounded hover:bg-red-900/50 transition-colors"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 text-xs text-stone-400 hover:text-parchment transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(enc.id)}
                                    className="px-3 bg-stone-800 hover:bg-red-900/40 text-stone-500 hover:text-red-500 rounded transition-colors"
                                    title="Delete Template"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
