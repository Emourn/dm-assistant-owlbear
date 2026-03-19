import { useState } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useCharacterStore } from '../../store/characterStore';
import { X, Plus, UserPlus, Search, Ghost, Users, Shield } from 'lucide-react';
import { Combatant } from '../../types/combat';
import { FiveEToolsModal } from '../common/FiveEToolsModal';
import { parseMonsterSpellSlots } from '../../engine/fiveEToolsParser';

interface AddCombatantModalProps {
    onClose: () => void;
}

export function AddCombatantModal({ onClose }: AddCombatantModalProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const addCombatant = useCombatStore((state) => state.addCombatant);
    const addLog = useCombatStore((state) => state.addLog);
    const characters = useCharacterStore((state) => state.characters);

    const [activeTab, setActiveTab] = useState<'manual' | 'players' | 'monsters'>('manual');
    const [isMonsterSearchOpen, setIsMonsterSearchOpen] = useState(false);

    // Manual tab state
    const [initiative, setInitiative] = useState('');
    const [name, setName] = useState('');

    // Import state
    const [importInitiative, setImportInitiative] = useState<{ [key: string]: string }>({});

    if (!activeEncounter) return null;

    const handleAddCustom = () => {
        if (!name || !initiative) return;

        const newCombatant: Combatant = {
            id: crypto.randomUUID(),
            name,
            type: 'npc',
            ac: 10,
            maxHp: 10,
            currentHp: 10,
            tempHp: 0,
            initiativeScore: parseInt(initiative),
            initiativeMod: 0,
            dexterityScore: 10,
            conditions: [],
            speed: '30 ft',
            isJoinedMidRound: true // New mid-combat additions wait for next round
        };

        addCombatant(newCombatant);
        addLog({
            message: `[System] ${name} joined the combat (Initiative ${initiative}).`,
            type: 'system'
        });
        onClose();
    };

    const handleAddPlayer = (char: any) => {
        const initRoll = importInitiative[char.id] || '10';

        const getVal = (field: string, fallback: any) => {
            const ov = char.customOverrides?.overrides?.find((o: any) => o.field === field && o.isActive);
            return ov ? ov.value : char[field] ?? fallback;
        };

        const combatant: Combatant = {
            id: crypto.randomUUID(),
            type: 'player',
            name: char.name,
            ac: Number(getVal('ac', 10)),
            maxHp: Number(char.maxHp) || 10,
            currentHp: Number(char.currentHp) || 10,
            tempHp: Number(char.tempHp) || 0,
            speed: getVal('speed', '30 ft'),
            initiativeMod: Number(getVal('initiativeMod', 0)),
            initiativeScore: parseInt(initRoll) || 10,
            dexterityScore: Number(char.abilityScores?.dex) || 10,
            conditions: [...char.conditions],
            abilityScores: char.abilityScores ? {
                str: Number(char.abilityScores.str) || 10,
                dex: Number(char.abilityScores.dex) || 10,
                con: Number(char.abilityScores.con) || 10,
                int: Number(char.abilityScores.int) || 10,
                wis: Number(char.abilityScores.wis) || 10,
                cha: Number(char.abilityScores.cha) || 10,
            } : undefined,
            savingThrowProficiencies: char.savingThrows,
            proficiencyBonus: Number(char.proficiencyBonus) || 2,
            spellcastingAbility: char.spellcastingAbility,
            spellSaveDc: Number(char.spellSaveDc) || 0,
            spellAttackMod: Number(char.spellAttackMod) || 0,
            spellSlots: char.spellSlots ? [...char.spellSlots] : undefined,
            isConcentrating: false,
            sourceId: char.id,
            isJoinedMidRound: true
        };

        addCombatant(combatant);
        addLog({
            message: `[System] ${char.name} (Player) joined the combat.`,
            type: 'system'
        });
        onClose();
    };

    const handleImportMonster = (item: any) => {
        const initRoll = importInitiative['next_monster'] || importInitiative[item.name] || '10';

        const dexMod = Math.floor(((item.dex || 10) - 10) / 2);
        const speed = item.speed && typeof item.speed === 'string' ? item.speed :
            (item.speed ? Object.entries(item.speed).map(([k, v]: [string, any]) =>
                typeof v === 'number' ? `${k} ${v} ft` : (v?.number ? `${k} ${v.number} ft` : '')).filter(Boolean).join(', ') : '30 ft');

        const crNum = parseFloat(item.cr) || 0;
        const profBonus = crNum < 5 ? 2 : crNum < 9 ? 3 : crNum < 13 ? 4 : crNum < 17 ? 5 : crNum < 21 ? 6 : crNum < 25 ? 7 : crNum < 29 ? 8 : 9;
        const legendaryMax = item.legendary ? (item.legendaryActions ?? 3) : 0;

        const saveProfs: string[] = [];
        if (item.save) Object.keys(item.save).forEach(k => saveProfs.push(k));

        const combatant: Combatant = {
            id: crypto.randomUUID(),
            type: 'monster',
            name: item.name,
            ac: item.ac || 10,
            maxHp: item.hp || 10,
            currentHp: item.hp || 10,
            tempHp: 0,
            speed,
            initiativeMod: dexMod,
            initiativeScore: parseInt(initRoll) || 10,
            dexterityScore: item.dex || 10,
            abilityScores: {
                str: item.str || 10, dex: item.dex || 10, con: item.con || 10,
                int: item.int || 10, wis: item.wis || 10, cha: item.cha || 10
            },
            proficiencyBonus: profBonus,
            savingThrowProficiencies: saveProfs,
            legendaryActionsMax: legendaryMax,
            legendaryActionsRemaining: legendaryMax,
            conditions: [],
            monsterData: item,
            cr: item.cr ? (typeof item.cr === 'string' ? item.cr : item.cr.cr) : undefined,
            resistances: item.resistances,
            immunities: item.immunities,
            vulnerabilities: item.vulnerabilities,
            conditionImmunities: item.conditionImmunities,
            damageNotes: item.damageNotes,
            spellSlots: item.spellcasting ? parseMonsterSpellSlots(item.spellcasting) : undefined,
            isConcentrating: false,
            isJoinedMidRound: true
        };

        addCombatant(combatant);
        addLog({
            message: `[System] ${item.name} (Monster) joined the combat.`,
            type: 'system'
        });
        setIsMonsterSearchOpen(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
                    <div className="flex items-center gap-2">
                        <UserPlus className="text-gold" size={20} />
                        <h2 className="text-xl font-cinzel font-bold text-parchment">Add Combatant</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-parchment transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-0 flex flex-col h-[400px]">
                    {/* Tab Navigation */}
                    <div className="flex bg-stone-950/30 border-b border-stone-800">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'manual' ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
                        >
                            <Plus size={14} className="inline mr-2" /> Manual
                        </button>
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'players' ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
                        >
                            <Users size={14} className="inline mr-2" /> Players
                        </button>
                        <button
                            onClick={() => setActiveTab('monsters')}
                            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'monsters' ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
                        >
                            <Ghost size={14} className="inline mr-2" /> Monsters
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'manual' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest pl-1">Name</label>
                                        <input
                                            type="text"
                                            placeholder="E.g. Reinforcement"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest pl-1">Initiative</label>
                                        <input
                                            type="number"
                                            placeholder="Roll result"
                                            value={initiative}
                                            onChange={(e) => setInitiative(e.target.value)}
                                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={!name || !initiative}
                                    onClick={handleAddCustom}
                                    className={`
                                        w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-4
                                        ${(!name || !initiative)
                                            ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                                            : 'bg-gold hover:bg-gold-bright text-stone-950 shadow-lg shadow-gold/10 hover:scale-[1.02]'}
                                    `}
                                >
                                    <Plus size={18} />
                                    Inject Custom NPC
                                </button>
                            </div>
                        )}

                        {activeTab === 'players' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                {characters.map(char => {
                                    const isAlreadyIn = activeEncounter.combatants.some(c => c.sourceId === char.id);
                                    return (
                                        <div key={char.id} className="flex items-center justify-between p-3 bg-stone-950/50 border border-stone-800/50 rounded-lg hover:border-stone-700 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center border border-indigo-500/20">
                                                    <Shield size={14} className="text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-parchment font-cinzel">{char.name}</div>
                                                    <div className="text-[10px] text-stone-500 uppercase tracking-widest">Level {char.level} {char.className}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Init"
                                                    value={importInitiative[char.id] || ''}
                                                    onChange={(e) => setImportInitiative({ ...importInitiative, [char.id]: e.target.value })}
                                                    className="w-12 bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-[10px] text-center text-gold focus:outline-none focus:border-gold"
                                                />
                                                <button
                                                    disabled={isAlreadyIn}
                                                    onClick={() => handleAddPlayer(char)}
                                                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${isAlreadyIn ? 'bg-stone-800 text-stone-600' : 'bg-arcane/20 text-arcane hover:bg-arcane hover:text-stone-950'}`}
                                                >
                                                    {isAlreadyIn ? 'In Encounter' : '+ Import'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {characters.length === 0 && (
                                    <div className="text-center py-8 text-stone-600">No characters found in vault.</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'monsters' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 text-center py-4">
                                <div className="p-8 border-2 border-dashed border-stone-800 rounded-xl bg-stone-950/50">
                                    <Ghost size={40} className="mx-auto text-stone-700 mb-4" />
                                    <h3 className="text-parchment font-bold mb-2">Import from Bestiary</h3>
                                    <p className="text-stone-500 text-xs mb-6">Search thousands of monsters from 5e.tools libraries.</p>
                                    <div className="flex flex-col items-center gap-2 mx-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                            <label className="text-[10px] text-stone-500 font-bold uppercase">Initiative for Import:</label>
                                            <input
                                                type="number"
                                                value={importInitiative['next_monster'] || '10'}
                                                onChange={(e) => setImportInitiative({ ...importInitiative, next_monster: e.target.value })}
                                                className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-gold focus:outline-none focus:border-gold"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Reset the specific name-based init if we want to use the global one as a fallback
                                                setIsMonsterSearchOpen(true);
                                            }}
                                            className="bg-stone-800 hover:bg-stone-700 text-gold font-bold px-6 py-3 rounded-lg border border-stone-700 transition-all flex items-center gap-2"
                                        >
                                            <Search size={18} /> Open Monster Lookup
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-stone-950/50 border-t border-stone-800">
                    <p className="text-[10px] text-stone-500 text-center italic">
                        New combatants will act starting next round and are marked as 'WAIT'.
                    </p>
                </div>

                <FiveEToolsModal
                    isOpen={isMonsterSearchOpen}
                    onClose={() => setIsMonsterSearchOpen(false)}
                    onImport={(item) => handleImportMonster(item)}
                    initialCategory="Monsters"
                />
            </div>
        </div>
    );
}
