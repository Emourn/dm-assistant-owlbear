import { useState, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Save, User as UserIcon, Sword, Shield, Zap, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Character, createEmptyCharacter } from '../../../types/character';
import { useCharacterStore } from '../../../store/characterStore';
import { computeDerivedStats } from '../../../engine/rulesEngine';
import { RaceStep } from './steps/RaceStep';
import { ClassStep } from './steps/ClassStep';
import { BackgroundStep } from './steps/BackgroundStep';
import { AbilityScoreStep } from './steps/AbilityScoreStep';
import { SkillsStep } from './steps/SkillsStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { SpellsStep } from './steps/SpellsStep';
import { ReviewStep } from './steps/ReviewStep';

interface Props {
    onClose: () => void;
}

export type WizardStepId =
    | 'race'
    | 'class'
    | 'background'
    | 'ability_scores'
    | 'skills'
    | 'equipment'
    | 'spells'
    | 'review';

const STEPS: { id: WizardStepId; label: string; icon: LucideIcon }[] = [
    { id: 'race', label: 'Species', icon: UserIcon },
    { id: 'class', label: 'Class', icon: Sword },
    { id: 'background', label: 'Background', icon: Sparkles },
    { id: 'ability_scores', label: 'Abilities', icon: Zap },
    { id: 'skills', label: 'Skills', icon: Sparkles },
    { id: 'equipment', label: 'Equipment', icon: Shield },
    { id: 'spells', label: 'Spells', icon: Sparkles },
    { id: 'review', label: 'Review', icon: Save },
];

export function CharacterCreatorWizard({ onClose }: Props) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [draft, setDraft] = useState<Character>(createEmptyCharacter());
    const addCharacter = useCharacterStore(state => state.addCharacter);

    const currentStep = STEPS[currentStepIndex];

    // Compute derived stats for the preview panel
    const derived = useMemo(() => computeDerivedStats(draft), [draft]);

    const handleUpdateDraft = useCallback((updates: Partial<Character>) => {
        setDraft(prev => ({ ...prev, ...updates }));
    }, []);

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            // Logic to skip steps (e.g. skip spells for non-casters)
            let nextIndex = currentStepIndex + 1;

            // Skip spells if character has no spellcasting ability
            if (STEPS[nextIndex].id === 'spells' && (!draft.spellcastingAbility || draft.spellcastingAbility === 'none')) {
                nextIndex++;
            }

            setCurrentStepIndex(nextIndex);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            let prevIndex = currentStepIndex - 1;

            // Skip spells if character has no spellcasting ability
            if (STEPS[prevIndex].id === 'spells' && (!draft.spellcastingAbility || draft.spellcastingAbility === 'none')) {
                prevIndex--;
            }

            setCurrentStepIndex(Math.max(0, prevIndex));
        }
    };

    const handleSave = () => {
        addCharacter({
            ...draft,
            id: crypto.randomUUID()
        });
        onClose();
    };

    const renderStep = () => {
        switch (currentStep.id) {
            case 'race': return <RaceStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'class': return <ClassStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'background': return <BackgroundStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'ability_scores': return <AbilityScoreStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'skills': return <SkillsStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'equipment': return <EquipmentStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'spells': return <SpellsStep draft={draft} onUpdate={handleUpdateDraft} />;
            case 'review': return <ReviewStep draft={draft} derived={derived} onSave={handleSave} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col font-lato text-parchment animate-in fade-in duration-300">
            {/* Top Navigation Bar */}
            <header className="h-16 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h1 className="font-cinzel text-xl font-bold tracking-widest text-gold drop-shadow-sm">
                        CHARACTER CREATOR
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = i === currentStepIndex;
                        const isCompleted = i < currentStepIndex;

                        // Check if step should be hidden (spells for non-casters)
                        if (s.id === 'spells' && (!draft.spellcastingAbility || draft.spellcastingAbility === 'none')) {
                            return null;
                        }

                        return (
                            <div key={s.id} className="flex items-center">
                                <div
                                    className={`flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-gold' : isCompleted ? 'text-blood' : 'text-stone-600'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isActive ? 'border-gold bg-gold/10' : isCompleted ? 'border-blood bg-blood/5' : 'border-stone-800 bg-stone-900'
                                        }`}>
                                        <Icon size={14} />
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-tighter hidden lg:block">{s.label}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`h-px w-4 bg-stone-800 ${isCompleted ? 'bg-blood/30' : ''}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden">
                {/* Step Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-3xl mx-auto space-y-8 pb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-cinzel font-bold text-parchment">{currentStep.label}</h2>
                            <p className="text-stone-400">Step {currentStepIndex + 1} of {STEPS.length}</p>
                        </div>

                        {renderStep()}

                        {/* Internal Navigation (Bottom of step) */}
                        <div className="pt-8 border-t border-stone-800/50 flex justify-between items-center">
                            <button
                                onClick={handleBack}
                                disabled={currentStepIndex === 0}
                                className="px-6 py-2 flex items-center gap-2 text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
                            >
                                <ChevronLeft size={20} />
                                BACK
                            </button>

                            {currentStep.id !== 'review' && (
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3 bg-blood text-white rounded-lg font-cinzel font-bold tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-blood/10 flex items-center gap-2 group"
                                >
                                    NEXT STEP
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Preview Sidebar */}
                <aside className="w-80 border-l border-stone-800 bg-stone-900/30 overflow-y-auto hidden xl:block custom-scrollbar">
                    <div className="p-6 space-y-8">
                        <div className="text-center space-y-2">
                            <div className="w-24 h-24 mx-auto bg-stone-800 border-2 border-stone-700 rounded-full flex items-center justify-center overflow-hidden">
                                {draft.portraitUrl ? (
                                    <img src={draft.portraitUrl} alt="Portrait" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={48} className="text-stone-700" />
                                )}
                            </div>
                            <h3 className="font-cinzel text-xl font-bold text-parchment truncate px-2">
                                {draft.name || 'Unnamed Hero'}
                            </h3>
                            <p className="text-xs text-gold font-bold tracking-widest uppercase truncate">
                                Level 1 {draft.race} {draft.className}
                            </p>
                        </div>

                        {/* Core Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-lg text-center">
                                <div className="text-[10px] text-stone-500 font-bold uppercase mb-1">Armor Class</div>
                                <div className="text-2xl font-cinzel font-bold text-white">{derived.armorClass}</div>
                            </div>
                            <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-lg text-center">
                                <div className="text-[10px] text-stone-500 font-bold uppercase mb-1">Initiative</div>
                                <div className="text-2xl font-cinzel font-bold text-white">
                                    {derived.initiativeBonus >= 0 ? `+${derived.initiativeBonus}` : derived.initiativeBonus}
                                </div>
                            </div>
                            <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-lg text-center">
                                <div className="text-[10px] text-stone-500 font-bold uppercase mb-1">Hit Points</div>
                                <div className="text-2xl font-cinzel font-bold text-white">{draft.maxHp}</div>
                            </div>
                            <div className="bg-stone-900/50 border border-stone-800 p-3 rounded-lg text-center">
                                <div className="text-[10px] text-stone-500 font-bold uppercase mb-1">Proficiency</div>
                                <div className="text-2xl font-cinzel font-bold text-white">+{derived.proficiencyBonus}</div>
                            </div>
                        </div>

                        {/* Ability Scores */}
                        <div className="space-y-2">
                            <h4 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest border-b border-stone-800 pb-1">Ability Scores</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(draft.abilityScores).map(([stat, val]) => {
                                    const mod = Math.floor((val - 10) / 2);
                                    return (
                                        <div key={stat} className="flex flex-col items-center bg-stone-950/40 p-1.5 rounded border border-stone-800/50">
                                            <span className="text-[10px] uppercase font-bold text-stone-600">{stat}</span>
                                            <span className="text-sm font-bold text-parchment">{val}</span>
                                            <span className="text-[10px] text-gold font-bold">{mod >= 0 ? `+${mod}` : mod}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Proficiencies Summary */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest border-b border-stone-800 pb-1">Professions</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {draft.skills.filter(s => s.proficient).map(s => (
                                        <span key={s.name} className="bg-blood/10 border border-blood/20 text-blood-light text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                            {s.name}
                                        </span>
                                    ))}
                                    {draft.skills.filter(s => s.proficient).length === 0 && (
                                        <span className="text-[10px] text-stone-600 italic">None selected yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
