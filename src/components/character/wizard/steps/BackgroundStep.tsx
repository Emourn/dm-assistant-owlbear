import { useState } from 'react';
import { Character } from '../../../../types/character';
import { Search, Sparkles, Check } from 'lucide-react';
import { FiveEToolsModal } from '../../../common/FiveEToolsModal';
import { ChoiceWizardModal } from '../../../common/ChoiceWizardModal';
import { buildBackgroundWizard } from '../../../../engine/importWizardBuilder';
import { resolveAllChoices } from '../../../../engine/rulesChoiceEngine';
import { automateCharacter } from '../../../../engine/characterAutomation';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

export function BackgroundStep({ draft, onUpdate }: Props) {
    const [isSearching, setIsSearching] = useState(false);
    const [wizardData, setWizardData] = useState<any>(null);

    const handleSelectBackground = (bg: any) => {
        setWizardData(buildBackgroundWizard(bg));
        setIsSearching(false);
    };

    const handleWizardComplete = async (selections: Record<string, any[]>) => {
        const bg = wizardData.originalData;

        // Use the centralized resolver to apply all traits and choices
        const updatedCharacter = await resolveAllChoices(draft, selections, bg, 'background');
        const automatedCharacter = await automateCharacter({
            ...updatedCharacter,
            background: bg.name
        });

        onUpdate({
            ...automatedCharacter,
            background: bg.name
        });

        setWizardData(null);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center mx-auto border-2 border-stone-700">
                    <Sparkles size={40} className="text-stone-500" />
                </div>

                {draft.background ? (
                    <div className="space-y-2">
                        <h3 className="text-2xl font-cinzel font-bold text-gold">{draft.background}</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            Your history as a {draft.background} provides you with skills and specialized knowledge.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="text-stone-500 hover:text-gold text-xs font-bold uppercase tracking-widest transition-colors mt-4"
                        >
                            Change Background
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xl font-cinzel font-bold text-parchment">CHOOSE YOUR HISTORY</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            What did you do before you became an adventurer? Your background defines your previous life.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="bg-gold text-stone-950 px-8 py-3 rounded-lg font-cinzel font-bold tracking-widest hover:bg-gold-light transition-all shadow-lg flex items-center gap-2 mx-auto"
                        >
                            <Search size={18} />
                            BROWSE BACKGROUNDS
                        </button>
                    </div>
                )}
            </div>

            {/* Background Details Preview */}
            {draft.background && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Acquired Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {draft.skills.filter(s => s.proficient).map(s => (
                                <span key={s.name} className="bg-stone-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-stone-300">
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Languages</span>
                        </div>
                        <p className="text-parchment text-sm">{draft.languages || 'Standard only'}</p>
                    </div>
                </div>
            )}

            <FiveEToolsModal
                isOpen={isSearching}
                onClose={() => setIsSearching(false)}
                initialCategory="Backgrounds"
                fixedCategory={true}
                onImport={(item) => handleSelectBackground(item)}
            />

            {wizardData && (
                <ChoiceWizardModal
                    title={wizardData.title}
                    steps={wizardData.steps}
                    characterLanguages={draft.languages}
                    characterSkills={draft.skills}
                    onComplete={handleWizardComplete}
                    onCancel={() => setWizardData(null)}
                />
            )}
        </div>
    );
}
