import { Character } from '../../../types/character';
import { useState } from 'react';
import { FiveEToolsModal, Category } from '../../common/FiveEToolsModal';
import { ChoiceWizardModal } from '../../common/ChoiceWizardModal';
import { buildRaceWizard, buildClassWizard, buildBackgroundWizard, ImportWizardData } from '../../../engine/importWizardBuilder';
import { is2024Source } from '../../../engine/fiveEToolsParser';
import { detectFixedProficiencies, resolveAllChoices } from '../../../engine/rulesChoiceEngine';
import { DMOverridePanel } from './DMOverridePanel';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
}

export function CoreTab({ data, onChange }: Props) {
    const [searchCategory, setSearchCategory] = useState<Category | null>(null);
    const [wizardData, setWizardData] = useState<ImportWizardData | null>(null);
    const [pendingLangs, setPendingLangs] = useState<string>('');
    const [pendingSkills, setPendingSkills] = useState<{ name: string, proficient: boolean }[]>([]);

    const calculatePendingProficiencies = (item: any, category: Category) => {
        const langs = data.languages ? data.languages.split(',').map(l => l.trim()).filter(Boolean) : [];
        const skills = [...data.skills];

        if (category === 'Races' || category === 'Backgrounds') {
            // Fixed Languages
            if (item.languageProficiencies && item.languageProficiencies.length > 0) {
                const lp = item.languageProficiencies[0];
                Object.keys(lp).forEach(langKey => {
                    if (lp[langKey] === true) {
                        const langName = langKey.charAt(0).toUpperCase() + langKey.slice(1);
                        if (!langs.includes(langName)) langs.push(langName);
                    }
                });
            }

            // Fixed Skills
            if (item.skillProficiencies && item.skillProficiencies.length > 0) {
                item.skillProficiencies.forEach((sp: any) => {
                    const fixed = Object.keys(sp).filter(k => sp[k] === true);
                    fixed.forEach(s => {
                        const index = skills.findIndex(sk => sk.name.toLowerCase() === s.toLowerCase());
                        if (index >= 0) skills[index] = { ...skills[index], proficient: true };
                    });
                });
            }

            // FALLBACK Scanning (Captures Common and other text-only proficiencies)
            const is2024 = is2024Source(item.source);
            const { languages, skills: detectedSkills } = detectFixedProficiencies(item, is2024);
            languages.forEach(l => {
                if (!langs.includes(l)) langs.push(l);
            });
            detectedSkills.forEach(s => {
                const index = skills.findIndex(sk => sk.name.toLowerCase() === s.toLowerCase());
                if (index >= 0) skills[index] = { ...skills[index], proficient: true };
            });
        }

        setPendingLangs(langs.join(', '));
        setPendingSkills(skills);
    };

    const handleImport = (item: any, category: Category) => {
        calculatePendingProficiencies(item, category);
        if (category === 'Races') {
            setWizardData(buildRaceWizard(item));
        } else if (category === 'Classes') {
            setWizardData(buildClassWizard(item));
        } else if (category === 'Backgrounds') {
            setWizardData(buildBackgroundWizard(item));
        } else if (category === 'Subclasses') {
            // Subclass doesn't strictly need a wizard for now, just apply it
            onChange('subclass', item.name);
            onChange('importedData', { ...data.importedData, subclass: item });
            setSearchCategory(null);
        }
    };

    const handleWizardComplete = async (selections: Record<string, any[]>) => {
        if (!wizardData) return;

        const { type, originalData } = wizardData;

        // Use the rulesChoiceEngine to resolve all choices and character updates
        const updatedChar = await resolveAllChoices(data, selections, originalData, type as any);

        // Batch update character fields that changed
        Object.keys(updatedChar).forEach(key => {
            const k = key as keyof Character;
            if (JSON.stringify(data[k]) !== JSON.stringify(updatedChar[k])) {
                onChange(k, updatedChar[k]);
            }
        });

        // Special handling for header fields
        const newImportedData = { ...data.importedData };
        if (type === 'class') {
            newImportedData.class = originalData;
            onChange('className', originalData.name);
            if (originalData.hd) onChange('hitDice', `1d${originalData.hd.faces}`);
            if (originalData.spellcastingAbility) onChange('spellcastingAbility', originalData.spellcastingAbility);
            if (originalData.savesRaw && Array.isArray(originalData.savesRaw)) {
                onChange('savingThrows', originalData.savesRaw.map((s: string) => s.toLowerCase()));
            }
        } else if (type === 'race') {
            newImportedData.race = originalData;
        } else if (type === 'background') {
            newImportedData.background = originalData;
        }
        onChange('importedData', newImportedData);

        setWizardData(null);
        setSearchCategory(null);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
            <div className="space-y-1">
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Alignment</label>
                <input type="text" value={data.alignment} onChange={e => onChange('alignment', e.target.value)} className="w-full bg-transparent border-b border-stone-700/50 hover:border-stone-500 px-1 py-1 text-parchment focus:border-gold outline-none transition-colors" placeholder="Neutral Good" />
            </div>

            <div className="space-y-1 lg:col-span-2">
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Player Name</label>
                <input type="text" value={data.playerName} onChange={e => onChange('playerName', e.target.value)} className="w-full bg-transparent border-b border-stone-700/50 hover:border-stone-500 px-1 py-1 text-parchment focus:border-gold outline-none transition-colors" placeholder="Your Name" />
            </div>

            <div className="col-span-full pt-4 space-y-4">
                <DMOverridePanel data={data} onChange={onChange} />
            </div>

            <div className="col-span-full pt-4 space-y-4">
                <h3 className="text-gold font-cinzel text-xl border-b border-stone-700/50 pb-2 mb-4 drop-shadow-sm">Personality & Flavor</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 relative group">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider absolute -top-2 left-2 bg-stone-900/90 px-1 z-10 transition-colors group-focus-within:text-gold">Personality Traits</label>
                        <textarea value={data.personalityTraits || ''} onChange={e => onChange('personalityTraits', e.target.value)} className="w-full h-24 bg-stone-900/30 border border-stone-700/50 hover:border-stone-500 rounded-md px-3 py-3 text-parchment text-sm resize-none focus:border-gold outline-none transition-colors shadow-inner" />
                    </div>
                    <div className="space-y-1 relative group">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider absolute -top-2 left-2 bg-stone-900/90 px-1 z-10 transition-colors group-focus-within:text-gold">Ideals</label>
                        <textarea value={data.ideals || ''} onChange={e => onChange('ideals', e.target.value)} className="w-full h-24 bg-stone-900/30 border border-stone-700/50 hover:border-stone-500 rounded-md px-3 py-3 text-parchment text-sm resize-none focus:border-gold outline-none transition-colors shadow-inner" />
                    </div>
                    <div className="space-y-1 relative group">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider absolute -top-2 left-2 bg-stone-900/90 px-1 z-10 transition-colors group-focus-within:text-gold">Bonds</label>
                        <textarea value={data.bonds || ''} onChange={e => onChange('bonds', e.target.value)} className="w-full h-24 bg-stone-900/30 border border-stone-700/50 hover:border-stone-500 rounded-md px-3 py-3 text-parchment text-sm resize-none focus:border-gold outline-none transition-colors shadow-inner" />
                    </div>
                    <div className="space-y-1 relative group">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-wider absolute -top-2 left-2 bg-stone-900/90 px-1 z-10 transition-colors group-focus-within:text-gold">Flaws</label>
                        <textarea value={data.flaws || ''} onChange={e => onChange('flaws', e.target.value)} className="w-full h-24 bg-stone-900/30 border border-stone-700/50 hover:border-stone-500 rounded-md px-3 py-3 text-parchment text-sm resize-none focus:border-gold outline-none transition-colors shadow-inner" />
                    </div>
                </div>
            </div>

            <FiveEToolsModal
                isOpen={searchCategory !== null}
                onClose={() => setSearchCategory(null)}
                initialCategory={searchCategory || 'Classes'}
                fixedCategory={true}
                classNameForSubclass={data.className}
                onImport={handleImport}
            />

            {wizardData && (
                <ChoiceWizardModal
                    title={wizardData.title}
                    steps={wizardData.steps}
                    characterLanguages={pendingLangs}
                    characterSkills={pendingSkills as any}
                    onComplete={handleWizardComplete}
                    onCancel={() => setWizardData(null)}
                />
            )}
        </div>
    );
}
