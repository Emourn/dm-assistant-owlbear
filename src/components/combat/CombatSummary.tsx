import React, { useMemo } from 'react';
import { Encounter } from '../../types/combat';
import { Swords, Clock, TrendingUp, Skull } from 'lucide-react';

interface CombatSummaryProps {
    encounter: Encounter;
    onClose: () => void;
}

export const CombatSummary: React.FC<CombatSummaryProps> = ({ encounter, onClose }) => {

    // Process the combat log to generate stats
    const stats = useMemo(() => {
        const data: Record<string, { damageDealt: number, damageTaken: number, kills: number, healsDelivered: number, name: string, type: 'player' | 'monster' | 'npc' }> = {};

        // Initialize records for all combatants
        encounter.combatants.forEach(c => {
            data[c.id] = {
                name: c.name,
                type: c.type,
                damageDealt: 0,
                damageTaken: 0,
                kills: 0,
                healsDelivered: 0
            };
        });

        // Parse log for stats
        encounter.log.forEach(entry => {
            if (entry.type === 'damage') {
                const parts = entry.message.split(' taking ');
                if (parts.length === 2) {
                    const dmgAmountMatch = parts[1].match(/(\d+)/);
                    if (dmgAmountMatch && entry.combatantId) {
                        const amount = parseInt(dmgAmountMatch[1], 10);

                        // The entry combatantId is the TARGET who took damage
                        if (data[entry.combatantId]) {
                            data[entry.combatantId].damageTaken += amount;
                        }

                        // Try to find the SOURCE (who dealt it) via details
                        // This logic relies on the ActionWizard setting details.sourceId 
                        // If not available, we can't perfectly attribute damage.
                        if (entry.details?.sourceId && data[entry.details.sourceId]) {
                            data[entry.details.sourceId].damageDealt += amount;
                        }
                    }
                }
            } else if (entry.type === 'heal') {
                const parts = entry.message.split(' for ');
                if (parts.length === 2) {
                    const healAmountMatch = parts[1].match(/(\d+)/);
                    if (healAmountMatch && entry.combatantId) {
                        const amount = parseInt(healAmountMatch[1], 10);

                        // Let's assume the person who healed was the target (self-heal) or we capture it via details
                        if (entry.details?.sourceId && data[entry.details.sourceId]) {
                            data[entry.details.sourceId].healsDelivered += amount;
                        } else if (data[entry.combatantId]) {
                            // Fallback: if we don't know who did it, assume self.
                            // Actually, tracking who gave the heal requires sourceId. 
                        }
                    }
                }
            } else if (entry.type === 'status' && entry.message.includes('died')) {
                if (entry.combatantId && entry.details?.sourceId && data[entry.details.sourceId]) {
                    data[entry.details.sourceId].kills += 1;
                }
            }
        });

        return Object.values(data);

    }, [encounter]);

    const durationStr = useMemo(() => {
        if (!encounter.combatStartTime) return 'Unknown';
        const ms = Date.now() - encounter.combatStartTime;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
    }, [encounter.combatStartTime]);

    // Calculate total XP (assuming all monsters are dead/defeated)
    // Actually, `endEncounter` calculates this and potentially saves it, but we can do a quick check here.
    const earnableXp = useMemo(() => {
        return encounter.combatants
            .filter(c => c.type === 'monster' && c.isDead)
            // We don't have direct XP values on combatants, so skip this or calculate from CR if needed
            // For now we just show what we have.
            .length * 50; // Placeholder until we plumb real XP
    }, [encounter]);

    // Find MVP (Highest Damage)
    const mvp = useMemo(() => {
        let maxDamage = -1;
        let mvpName = 'None';
        stats.forEach(s => {
            if (s.type === 'player' && s.damageDealt > maxDamage) {
                maxDamage = s.damageDealt;
                mvpName = s.name;
            }
        });
        return { name: mvpName, damage: maxDamage };
    }, [stats]);


    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-[#f0e6d2] border-4 border-[#8b0000] w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden text-stone-900">

                {/* Header */}
                <div className="bg-[#8b0000] text-parchment p-6 text-center border-b-4 border-[#5a0000]">
                    <Swords className="mx-auto mb-2 opacity-80" size={32} />
                    <h2 className="text-4xl font-cinzel font-bold tracking-wider uppercase">Victory!</h2>
                    <p className="text-[#f0e6d2]/80 font-serif italic">{encounter.title} Concluded</p>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* Top Stats Strip */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#e6dcc8] p-4 rounded-md border border-[#c8bba4] text-center shadow-inner">
                            <Clock className="mx-auto mb-1 text-[#8b0000]" size={20} />
                            <div className="text-sm uppercase font-bold text-stone-600 mb-1">Duration</div>
                            <div className="text-2xl font-serif font-bold">{durationStr}</div>
                            <div className="text-xs text-stone-500">{encounter.round} Rounds</div>
                        </div>
                        <div className="bg-[#e6dcc8] p-4 rounded-md border border-[#c8bba4] text-center shadow-inner">
                            <Skull className="mx-auto mb-1 text-[#8b0000]" size={20} />
                            <div className="text-sm uppercase font-bold text-stone-600 mb-1">Enemies Defeated</div>
                            <div className="text-2xl font-serif font-bold">
                                {encounter.combatants.filter(c => c.type === 'monster' && c.isDead).length}
                            </div>
                        </div>
                        <div className="bg-[#e6dcc8] p-4 rounded-md border border-[#c8bba4] text-center shadow-inner">
                            <TrendingUp className="mx-auto mb-1 text-[#8b0000]" size={20} />
                            <div className="text-sm uppercase font-bold text-stone-600 mb-1">M.V.P.</div>
                            <div className="text-xl font-serif font-bold truncate px-2">{mvp.name}</div>
                            <div className="text-xs text-stone-500">{mvp.damage > 0 ? `${mvp.damage} Dmg Dealt` : ''}</div>
                        </div>
                        <div className="bg-[#e6dcc8] p-4 rounded-md border border-[#c8bba4] text-center shadow-inner flex flex-col justify-center">
                            <div className="text-sm uppercase font-bold text-stone-600 mb-1">Est. Party Exp</div>
                            <div className="text-3xl font-serif font-bold text-[#8b0000]">{earnableXp}</div>
                            <div className="text-xs text-stone-500">Total XP</div>
                        </div>
                    </div>

                    <h3 className="text-xl font-cinzel font-bold text-[#8b0000] border-b-2 border-[#8b0000] mb-4 pb-1">Combatant Performance</h3>

                    <div className="space-y-3">
                        {stats.sort((a, b) => b.damageDealt - a.damageDealt).map(s => (
                            <div key={s.name} className={`flex items-center p-3 rounded border ${s.type === 'player' ? 'bg-[#dce6dc] border-[#a4c8a4]' : 'bg-[#e6dcdc] border-[#c8a4a4]'}`}>
                                <div className="w-48 font-bold font-serif text-lg truncate pr-4">
                                    {s.name}
                                </div>

                                <div className="flex-1 grid grid-cols-4 gap-4 text-center text-sm">
                                    <div>
                                        <div className="text-stone-500 text-xs uppercase mb-1">Dmg Dealt</div>
                                        <div className="font-bold text-[#8b0000]">{s.damageDealt}</div>
                                    </div>
                                    <div>
                                        <div className="text-stone-500 text-xs uppercase mb-1">Dmg Taken</div>
                                        <div className="font-bold">{s.damageTaken}</div>
                                    </div>
                                    <div>
                                        <div className="text-stone-500 text-xs uppercase mb-1">Healed</div>
                                        <div className="font-bold text-green-700">{s.healsDelivered}</div>
                                    </div>
                                    <div>
                                        <div className="text-stone-500 text-xs uppercase mb-1">Kills</div>
                                        <div className="font-bold">{s.kills}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="bg-[#e6dcc8] p-4 border-t-2 border-[#c8bba4] flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-[#8b0000] hover:bg-[#a00000] text-white font-bold rounded shadow-md transition-colors font-cinzel tracking-wider text-xl"
                    >
                        Return to Campaign
                    </button>
                </div>
            </div>
        </div>
    );
};
