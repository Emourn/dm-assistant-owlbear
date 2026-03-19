import { useState } from 'react';
import { Play, Users, Ghost, Search, Plus, X, Trash2, Save } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { useCombatStore } from '../../store/combatStore';
import { useCampaignStore } from '../../store/campaignStore';
import { FiveEToolsModal } from '../common/FiveEToolsModal';
import { Combatant } from '../../types/combat';
import { parseMonsterSpellSlots } from '../../engine/fiveEToolsParser';
import { calculateEncounterDifficulty, CR_TO_XP, getDifficultyColor } from '../../engine/encounterDifficulty';
import { EncounterLibrary } from './EncounterLibrary';
import { generateRandomEncounter } from '../../engine/randomEncounterEngine';
import { getPrimaryMonsterTokenUrl } from '../../engine/portraitEngine';
import { Dice6, Loader2, Sparkles } from 'lucide-react';

export function CombatSetup() {
    const characters = useCharacterStore((state) => state.characters);
    const startEncounter = useCombatStore((state) => state.startEncounter);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const completeSetup = useCombatStore((state) => state.completeSetup);
    const addCombatant = useCombatStore((state) => state.addCombatant);
    const removeCombatant = useCombatStore((state) => state.removeCombatant);
    const clearCombatants = useCombatStore((state) => state.clearCombatants);
    const cancelEncounter = useCombatStore((state) => state.cancelEncounter);
    const saveEncounterTemplate = useCombatStore((state) => state.saveEncounterTemplate);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

    const [title, setTitle] = useState('');
    const [isMonsterSearchOpen, setIsMonsterSearchOpen] = useState(false);

    // Quick add ad-hoc monster state
    const [quickMonsterName, setQuickMonsterName] = useState('');
    const [quickMonsterHp, setQuickMonsterHp] = useState('');
    const [quickMonsterAc, setQuickMonsterAc] = useState('');
    const [quickMonsterCount, setQuickMonsterCount] = useState('1');
    const [quickMonsterCr, setQuickMonsterCr] = useState('');
    const [confirmingClear, setConfirmingClear] = useState(false);
    const [savedFeedback, setSavedFeedback] = useState(false);
    const [isRandomizing, setIsRandomizing] = useState(false);
    const [randomDifficulty, setRandomDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Deadly'>('Medium');
    const [showRandomOptions, setShowRandomOptions] = useState(false);

    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    // Filter characters to only those in the active campaign
    const displayCharacters = activeCampaign
        ? characters.filter(c => activeCampaign.partyIds.includes(c.id))
        : characters;

    if (!activeEncounter) {
        return (
            <div className="bg-combat min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-3 glass-panel px-12 py-6 rounded-2xl border border-gold/20 shadow-[-5px_15px_30px_rgba(0,0,0,0.8)]">
                    <h2 className="text-4xl font-cinzel font-bold text-engraved-gold tracking-[0.2em] flex items-center justify-center gap-4">
                        <Play className="text-gold w-10 h-10 drop-shadow-md" fill="currentColor" />
                        COMBAT ENCOUNTER
                    </h2>
                    <p className="text-stone-400 font-medium tracking-widest text-xs uppercase opacity-90 drop-shadow-md">Enter the field of initiative and claim your destiny.</p>
                </div>

                <div className="w-full max-w-md glass-panel p-10 space-y-8 relative overflow-hidden group border border-gold/10 rounded-2xl shadow-[-5px_15px_30px_rgba(0,0,0,0.8)]">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] ml-1 drop-shadow-md">Encounter Designation</label>
                        <input
                            type="text"
                            className="w-full bg-stone-950/80 border border-gold/20 rounded-xl px-6 py-4 text-parchment focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-stone-700 font-cinzel text-lg tracking-wide shadow-inner"
                            placeholder="e.g. THE AMBUSH AT OWL'S WATCH"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startEncounter(title || 'New Encounter', [], activeCampaignId || undefined)}
                        />
                    </div>

                    <button
                        onClick={() => startEncounter(title || 'New Encounter', [], activeCampaignId || undefined)}
                        className="w-full bg-gradient-to-b from-gold to-gold-light hover:from-gold-light hover:to-yellow-400 text-stone-950 font-black py-5 rounded-xl transition-all flex items-center justify-center gap-4 shadow-[0_10px_40px_rgba(217,119,6,0.3)] hover:shadow-[0_15px_50px_rgba(217,119,6,0.5)] hover:scale-[1.02] active:scale-95 uppercase tracking-[0.2em] text-xs border border-yellow-200/50"
                    >
                        <Plus size={18} strokeWidth={3} /> Begin Setup
                    </button>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
                        <p className="text-[9px] text-stone-600 text-center uppercase tracking-[0.3em] font-medium italic">You will summon combatants in the next sanctum.</p>
                    </div>
                </div>

                <div className="flex justify-center w-full mt-12 pt-8">
                    <EncounterLibrary campaignId={activeCampaignId || undefined} />
                </div>
            </div>
        );
    }

    const handleAddPlayer = (char: any) => {
        // Check if already in
        if (activeEncounter.combatants.some(c => c.sourceId === char.id)) return;

        // Check for DM overrides on AC, Initiative, Speed
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
            initiativeScore: null,
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
            exhaustion: char.exhaustion || 0,
            sourceId: char.id,
            portraitUrl: char.portraitUrl
        };

        addCombatant(combatant);
    };

    const handleAddQuickMonster = () => {
        if (!quickMonsterName) return;

        const count = parseInt(quickMonsterCount) || 1;
        const hp = parseInt(quickMonsterHp) || 10;
        const ac = parseInt(quickMonsterAc) || 10;

        for (let i = 0; i < count; i++) {
            const name = count > 1 ? `${quickMonsterName} ${String.fromCharCode(65 + i)}` : quickMonsterName;

            const combatant: Combatant = {
                id: crypto.randomUUID(),
                type: 'monster',
                name,
                ac,
                maxHp: hp,
                currentHp: hp,
                tempHp: 0,
                speed: '30 ft',
                cr: quickMonsterCr || undefined,
                initiativeMod: 0, // Quick monsters get 0 init unless rolled manually
                initiativeScore: null,
                dexterityScore: 10,
                conditions: []
            };
            addCombatant(combatant);
        }

        setQuickMonsterName('');
        setQuickMonsterHp('');
        setQuickMonsterAc('');
        setQuickMonsterCount('1');
        setQuickMonsterCr('');
    };

    const handleImportMonster = (item: any) => {
        const dexMod = Math.floor(((item.dex || 10) - 10) / 2);
        const speed = item.speed && typeof item.speed === 'string' ? item.speed :
            (item.speed ? Object.entries(item.speed).map(([k, v]: [string, any]) =>
                typeof v === 'number' ? `${k} ${v} ft` : (v?.number ? `${k} ${v.number} ft` : '')).filter(Boolean).join(', ') : '30 ft');

        // Calculate proficiency bonus from CR
        const crNum = parseFloat(item.cr) || 0;
        const profBonus = crNum < 5 ? 2 : crNum < 9 ? 3 : crNum < 13 ? 4 : crNum < 17 ? 5 : crNum < 21 ? 6 : crNum < 25 ? 7 : crNum < 29 ? 8 : 9;

        // Legendary actions
        const legendaryMax = item.legendary ? (item.legendaryActions ?? 3) : 0;

        // Saving throw proficiencies
        const saveProfs: string[] = [];
        if (item.save) {
            Object.keys(item.save).forEach(k => saveProfs.push(k));
        }

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
            initiativeScore: null,
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
            exhaustion: 0,
            portraitUrl: getPrimaryMonsterTokenUrl(item.name, item.source)
        };
        addCombatant(combatant);
        setIsMonsterSearchOpen(false);
    };

    const handleRandomEncounter = async () => {
        if (partyLevels.length === 0) return;

        setIsRandomizing(true);
        try {
            const result = await generateRandomEncounter(partyLevels, randomDifficulty);
            if (result && result.monsters) {
                result.monsters.forEach(m => handleImportMonster(m));
                setShowRandomOptions(false);
            }
        } catch (error) {
            console.error('Randomization failed:', error);
        } finally {
            setIsRandomizing(false);
        }
    };

    const handleClearEncounter = () => {
        clearCombatants();
        setConfirmingClear(false);
    };

    const playerCombatants = activeEncounter?.combatants?.filter(c => c.type === 'player') || [];
    const monsterCombatants = activeEncounter?.combatants?.filter(c => c.type === 'monster') || [];
    const partyLevels = playerCombatants.map(p => {
        const char = characters.find(c => c.id === p.sourceId);
        return char?.level || 1;
    });

    const diff = (partyLevels.length > 0 && monsterCombatants.length > 0)
        ? calculateEncounterDifficulty(partyLevels, monsterCombatants.map(m => m.cr || '0'))
        : null;

    const handleSaveTemplate = () => {
        if (!activeEncounter || monsterCombatants.length === 0) return;

        const templateTitle = activeEncounter.title || 'Untitled Encounter';

        saveEncounterTemplate({
            title: templateTitle,
            description: `Template containing ${monsterCombatants.length} monsters.`,
            enemies: monsterCombatants,
            estimatedDifficulty: diff?.difficulty,
            totalXP: diff?.totalXP,
            campaignId: activeCampaignId || undefined
        });
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2000);
    };

    const playersCount = playerCombatants.length;
    const monsterCount = monsterCombatants.length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={cancelEncounter}
                        className="mt-1 p-2.5 bg-stone-950/50 hover:bg-blood/10 text-stone-500 hover:text-blood rounded-xl transition-all border border-white/5 hover:border-blood/30 group"
                        title="Discard and Exit Setup"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-cinzel font-bold text-white tracking-tight uppercase leading-none">
                            {activeEncounter?.title || 'Encounter'}
                        </h2>
                        <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mt-2">Battlefield Summoning Setup</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-center px-6 py-3 glass-panel border-gold/20">
                        <div className="text-2xl font-black text-gold/80 leading-none">{playersCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-stone-500 mt-2">Adventurers</div>
                    </div>
                    <div className="text-center px-6 py-3 glass-panel border-blood/20">
                        <div className="text-2xl font-black text-blood leading-none">{monsterCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-stone-500 mt-2">Monsters</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: Party Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={16} className="text-gold" /> Party Members
                    </h3>

                    <div className="glass-panel p-2 space-y-1 border-white/5 overflow-hidden">
                        {displayCharacters.length === 0 ? (
                            <div className="px-8 py-12 text-center text-sm text-stone-600 italic">
                                <Users size={40} className="mx-auto mb-4 opacity-10" />
                                {activeCampaignId
                                    ? `No legends found for ${activeCampaign?.title}.`
                                    : "The vault is currently empty."}
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar px-1">
                                {!activeCampaignId && (
                                    <div className="px-3 py-2 text-[9px] text-stone-500 font-black uppercase tracking-[0.2em] opacity-60">
                                        Global Character Vault
                                    </div>
                                )}
                                {displayCharacters.map(char => {
                                    const isAdded = activeEncounter.combatants.some(c => c.sourceId === char.id);
                                    return (
                                        <div key={char.id} className={`flex items-center justify-between p-4 rounded-xl transition-all group mb-1 ${isAdded ? 'bg-gold/5 border border-gold/20' : 'hover:bg-white/5 border border-transparent hover:border-white/5'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isAdded ? 'bg-gold border-gold text-stone-950 shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                                                    <Users size={18} fill={isAdded ? "currentColor" : "none"} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-parchment font-cinzel text-sm tracking-wide">{char.name}</div>
                                                    <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">Level {char.level} {char.className}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => isAdded ? removeCombatant(activeEncounter.combatants.find(c => c.sourceId === char.id)!.id) : handleAddPlayer(char)}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAdded
                                                    ? 'bg-blood/10 text-blood hover:bg-blood hover:text-white'
                                                    : 'bg-gold/10 text-gold hover:bg-gold hover:text-stone-950'
                                                    }`}
                                            >
                                                {isAdded ? 'Remove' : '+ Summon'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Monster Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <Ghost size={16} className="text-blood" /> Enemies
                    </h3>

                    <div className="glass-panel p-6 space-y-6">
                        <button
                            onClick={() => setIsMonsterSearchOpen(true)}
                            className="w-full py-4 border border-white/5 border-dashed rounded-xl text-stone-500 hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all flex items-center justify-center gap-3 bg-stone-950/30 group tracking-widest uppercase text-[10px] font-black"
                        >
                            <Search size={16} className="group-hover:scale-110 transition-transform" />
                            Manual Archetype Lookup
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center"><span className="bg-[#1c1917]/80 px-4 text-[9px] font-black uppercase tracking-[0.3em] text-stone-600">Summoning Rituals</span></div>
                        </div>

                        {showRandomOptions ? (
                            <div className="bg-stone-950/50 p-5 border border-blood/20 rounded-xl space-y-5 animate-in zoom-in-95 duration-300">
                                <div className="space-y-3">
                                    <span className="block text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1">Manifestation Intensity</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Easy', 'Medium', 'Hard', 'Deadly'] as const).map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setRandomDifficulty(d)}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${randomDifficulty === d
                                                    ? 'bg-blood text-white border-blood-dark shadow-[0_0_15px_rgba(153,27,27,0.4)]'
                                                    : 'bg-stone-900/50 text-stone-500 border-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleRandomEncounter}
                                        disabled={isRandomizing || playersCount === 0}
                                        className="flex-1 bg-blood hover:bg-red-700 disabled:opacity-30 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(153,27,27,0.3)]"
                                    >
                                        {isRandomizing ? <Loader2 className="animate-spin" size={16} /> : <Dice6 size={16} />}
                                        Inscribe Encounter
                                    </button>
                                    <button
                                        onClick={() => setShowRandomOptions(false)}
                                        className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        Abort
                                    </button>
                                </div>
                                {playersCount === 0 && (
                                    <p className="text-[10px] text-blood text-center uppercase font-black tracking-widest">A party is required for synchronization.</p>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowRandomOptions(true)}
                                className="w-full py-4 border border-blood/20 bg-blood/5 rounded-xl text-blood hover:bg-blood hover:text-white transition-all flex items-center justify-center gap-3 group uppercase tracking-[0.2em] text-[10px] font-black"
                            >
                                <Sparkles size={16} className="group-hover:rotate-12 transition-transform text-blood" />
                                Random Manifestation
                                <Dice6 size={16} className="opacity-30" />
                            </button>
                        )}

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center"><span className="bg-[#1c1917]/80 px-4 text-[9px] font-black uppercase tracking-[0.3em] text-stone-600">Quick Summon</span></div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-4 space-y-1.5">
                                    <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1">Subject Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-parchment focus:outline-none focus:border-blood/50 transition-all font-cinzel"
                                        value={quickMonsterName}
                                        onChange={e => setQuickMonsterName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddQuickMonster()}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 text-center block">CR</label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-950/50 border border-white/5 rounded-xl px-2 py-2.5 text-xs text-parchment focus:outline-none focus:border-blood/50 text-center font-mono"
                                        value={quickMonsterCr}
                                        onChange={e => setQuickMonsterCr(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddQuickMonster()}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 text-center block">AC</label>
                                    <input
                                        type="number"
                                        className="w-full bg-stone-950/50 border border-white/5 rounded-xl px-2 py-2.5 text-xs text-parchment focus:outline-none focus:border-blood/50 text-center font-mono"
                                        value={quickMonsterAc}
                                        onChange={e => setQuickMonsterAc(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddQuickMonster()}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 text-center block">HP</label>
                                    <input
                                        type="number"
                                        className="w-full bg-stone-950/50 border border-white/5 rounded-xl px-2 py-2.5 text-xs text-parchment focus:outline-none focus:border-blood/50 text-center font-mono"
                                        value={quickMonsterHp}
                                        onChange={e => setQuickMonsterHp(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddQuickMonster()}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1 text-center block">QTY</label>
                                    <input
                                        type="number"
                                        className="w-full bg-stone-950/50 border border-white/5 rounded-xl px-2 py-2.5 text-xs text-parchment focus:outline-none focus:border-blood/50 text-center font-mono"
                                        value={quickMonsterCount}
                                        onChange={e => setQuickMonsterCount(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddQuickMonster()}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddQuickMonster}
                                disabled={!quickMonsterName}
                                className="w-full bg-stone-950/50 hover:bg-blood/5 border border-white/5 hover:border-blood/20 disabled:opacity-20 text-stone-300 font-black py-3 rounded-xl flex items-center justify-center transition-all uppercase tracking-widest text-[10px] hover:text-blood"
                            >
                                <Plus size={16} className="mr-2" /> Manifest Soul
                            </button>
                        </div>
                    </div>

                    {/* Added Monsters List */}
                    {activeEncounter.combatants.filter(c => c.type === 'monster').length > 0 && (
                        <div className="glass-panel p-2 space-y-1 border-white/5">
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                                {activeEncounter.combatants.filter(c => c.type === 'monster').map(m => (
                                    <div className="flex items-center justify-between p-3 hover:bg-blood/5 rounded-xl group transition-all border border-transparent hover:border-blood/10 mb-1">
                                        <div className="flex items-center gap-3">
                                            {m.portraitUrl ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-blood/50 shadow-[0_0_10px_rgba(153,27,27,0.3)] bg-stone-900 flex-shrink-0 relative">
                                                    <img src={m.portraitUrl} alt={m.name} className="w-full h-full object-cover scale-[1.15]" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                                    <div className="hidden absolute inset-0 flex items-center justify-center text-blood text-xs font-black font-cinzel">{m.name.charAt(0)}</div>
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-stone-950 rounded-full flex items-center justify-center text-blood text-xs font-black font-cinzel border border-blood/20 shadow-[inset_0_0_10px_rgba(153,27,27,0.2)] flex-shrink-0">
                                                    {m.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-bold text-parchment font-cinzel tracking-wide">{m.name}</div>
                                                    {m.cr && <span className="text-[8px] font-black bg-stone-950/50 text-blood px-1.5 py-0.5 rounded border border-blood/20 uppercase tracking-tighter">CR {m.cr}</span>}
                                                </div>
                                                <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">
                                                    AC {m.ac} | HP {m.maxHp}
                                                    {m.cr && ` | ${CR_TO_XP[m.cr] || 0} XP`}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeCombatant(m.id)}
                                            className="text-stone-700 hover:text-blood p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-blood/10 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <FiveEToolsModal
                isOpen={isMonsterSearchOpen}
                onClose={() => setIsMonsterSearchOpen(false)}
                onImport={(item) => handleImportMonster(item)}
                initialCategory="Monsters"
            />

            {/* Proceed to Initiative Footer */}
            <div className="pt-8 mt-12 border-t border-white/5 space-y-8 pb-12">
                {diff && (
                    <div className="glass-panel p-6 flex flex-col lg:flex-row items-center justify-between gap-8 border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-4">
                                <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Encounter Complexity</h4>
                                <span className={`text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border shadow-lg ${getDifficultyColor(diff.difficulty)}`}>
                                    {diff.difficulty}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest block">Raw Sacrifice</span>
                                    <span className="text-sm font-mono text-stone-300 font-bold tracking-tighter">{diff.totalXP.toLocaleString()} XP</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest block">Adjusted Essence</span>
                                    <span className="text-sm font-mono text-gold-light font-bold tracking-tighter">{diff.adjustedXP.toLocaleString()} XP <span className="text-[10px] opacity-60">(×{diff.multiplier})</span></span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest block">Daily Budget</span>
                                    <span className="text-sm font-mono text-stone-400 font-bold tracking-tighter">{diff.dailyBudget.toLocaleString()} XP</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {(['easy', 'medium', 'hard', 'deadly'] as const).map(level => {
                                const isCurrent = diff.difficulty.toLowerCase() === level;
                                const colors: Record<string, string> = {
                                    easy: 'border-green-500/30 text-green-500 bg-green-500/5',
                                    medium: 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5',
                                    hard: 'border-orange-500/30 text-orange-500 bg-orange-500/5',
                                    deadly: 'border-blood/30 text-blood bg-blood/5'
                                };
                                return (
                                    <div key={level} className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-500 ${isCurrent ? `${colors[level]} shadow-[0_0_20px_rgba(0,0,0,0.3)] scale-110 z-10 font-bold border-stone-500/50` : 'border-white/5 bg-stone-900/40 text-stone-700 opacity-40 scale-90'}`}>
                                        <span className="text-[8px] uppercase font-black tracking-widest mb-1">{level}</span>
                                        <span className="text-[10px] font-mono">{diff.thresholds[level].toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-4 items-center">
                        {confirmingClear ? (
                            <div className="flex items-center gap-3 glass-panel border-blood/30 px-4 py-2 animate-in slide-in-from-left-4 duration-300">
                                <span className="text-[10px] font-black text-blood uppercase tracking-widest">Wipe setup?</span>
                                <button
                                    type="button"
                                    onClick={handleClearEncounter}
                                    className="text-[10px] font-black text-white px-3 py-1.5 rounded-lg bg-blood hover:bg-red-700 transition-all uppercase tracking-widest shadow-lg"
                                >
                                    Confirm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingClear(false)}
                                    className="text-[10px] font-black text-stone-500 hover:text-white px-3 py-1.5 transition-all uppercase tracking-widest"
                                >
                                    Abort
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmingClear(true)}
                                disabled={activeEncounter.combatants.length === 0}
                                className="text-stone-600 hover:text-blood disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all px-6 py-3 border border-transparent hover:border-blood/20 rounded-xl"
                            >
                                <X size={16} /> Discard All
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveTemplate}
                            disabled={monsterCombatants.length === 0}
                            className={`text-stone-500 hover:text-gold disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all px-6 py-3 glass-panel border-white/5 ${savedFeedback ? 'text-gold-light' : ''}`}
                        >
                            <Save size={16} /> {savedFeedback ? '✓ Inscribed' : 'Save Archetype'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={completeSetup}
                        disabled={activeEncounter.combatants.length === 0}
                        className="bg-gold hover:bg-gold-light disabled:bg-stone-900 disabled:text-stone-700 disabled:border-white/5 text-stone-950 font-black px-12 py-5 rounded-2xl text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(217,119,6,0.3)] hover:shadow-[0_20px_50px_rgba(217,119,6,0.4)] hover:scale-[1.02] active:scale-95 border border-gold-light/30"
                    >
                        PROCEED TO INITIATIVE <Play size={20} fill="currentColor" className="text-stone-950/80" />
                    </button>
                </div>
            </div>
        </div>
    );
}
