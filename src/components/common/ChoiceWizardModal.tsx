import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export interface WizardOption {
    label: string;
    value: any;
    description?: string;
    is2024?: boolean;
}

export interface WizardStep {
    id: string;
    title: string;
    description?: string;
    options: WizardOption[];
    maxChoices: number;
    minChoices?: number; // defaults to maxChoices if undefined
    type?: 'choice' | 'text';
    textPlaceholder?: string;
}

interface Props {
    title: string;
    steps: WizardStep[];
    characterLanguages?: string;
    characterSkills?: { name: string, proficient: boolean }[];
    onComplete: (selections: Record<string, any[]>) => void;
    onCancel: () => void;
}

export function ChoiceWizardModal({
    title,
    steps,
    characterLanguages = '',
    characterSkills = [],
    onComplete,
    onCancel
}: Props) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [selections, setSelections] = useState<Record<string, any[]>>({});

    // If there are no steps, complete immediately with empty selections
    if (!steps || steps.length === 0) {
        onComplete({});
        return null;
    }

    const currentStep = steps[currentStepIndex];
    const currentSelections = selections[currentStep.id] || [];
    const isTextStep = currentStep.type === 'text';
    const minRequired = currentStep.minChoices !== undefined ? currentStep.minChoices : currentStep.maxChoices;
    const canProceed = isTextStep
        ? true // Text steps are optional
        : currentSelections.length >= minRequired && currentSelections.length <= currentStep.maxChoices;

    const handleToggleOption = (value: any) => {
        setSelections(prev => {
            const stepSelections = prev[currentStep.id] || [];
            const isSelected = stepSelections.some(v => JSON.stringify(v) === JSON.stringify(value));

            let newSelections;
            if (isSelected) {
                // Remove
                newSelections = stepSelections.filter(v => JSON.stringify(v) !== JSON.stringify(value));
            } else {
                // Add (if under max)
                if (stepSelections.length < currentStep.maxChoices) {
                    newSelections = [...stepSelections, value];
                } else if (currentStep.maxChoices === 1) {
                    // Auto-replace if it's a single choice
                    newSelections = [value];
                } else {
                    newSelections = stepSelections; // Can't add more
                }
            }
            return { ...prev, [currentStep.id]: newSelections };
        });
    };

    const handleNext = () => {
        if (canProceed) {
            if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                onComplete(selections);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-lato">
            <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
                    <div>
                        <h2 className="text-xl font-cinzel font-bold text-parchment tracking-wide">{title}</h2>
                        <p className="text-sm text-stone-400">
                            Step {currentStepIndex + 1} of {steps.length}: <span className="text-gold/80">{currentStep.title}</span>
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-parchment transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-stone-800 w-full overflow-hidden">
                    <div
                        className="h-full bg-blood transition-all duration-300 ease-out"
                        style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {currentStep.description && (
                        <p className="text-stone-300 mb-6 text-sm">{currentStep.description}</p>
                    )}

                    <div className="space-y-3">
                        {isTextStep ? (
                            <textarea
                                value={currentSelections[0] || ''}
                                onChange={(e) => setSelections(prev => ({ ...prev, [currentStep.id]: [e.target.value] }))}
                                placeholder={currentStep.textPlaceholder || 'Enter details here...'}
                                className="w-full h-32 bg-stone-900 border border-stone-700 rounded-lg p-4 text-parchment resize-none focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none transition-all placeholder:text-stone-600"
                            />
                        ) : (
                            currentStep.options
                                .filter(option => {
                                    // 1. Cross-step deduplication: Filter if already selected in a PREVIOUS step of this wizard
                                    const allPreviousSelections = Object.entries(selections)
                                        .filter(([stepId]) => stepId !== currentStep.id)
                                        .flatMap(([, vals]) => vals);

                                    if (allPreviousSelections.some(v => JSON.stringify(v) === JSON.stringify(option.value))) {
                                        return false;
                                    }

                                    // 2. Global character state filtering (existing)
                                    // Language filtering
                                    if (currentStep.title.toLowerCase().includes('language') || currentStep.id.includes('lang')) {
                                        const knownLangs = characterLanguages.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                                        if (knownLangs.includes(option.label.toLowerCase())) return false;
                                    }

                                    // Skill filtering
                                    if (currentStep.title.toLowerCase().includes('skill') || currentStep.id.includes('skill')) {
                                        const isKnown = characterSkills.some(s => s.name.toLowerCase() === option.label.toLowerCase() && s.proficient);
                                        if (isKnown) return false;
                                    }

                                    return true;
                                })
                                .map((option, idx) => {
                                    const isSelected = currentSelections.some(v => JSON.stringify(v) === JSON.stringify(option.value));
                                    const isMaxed = !isSelected && currentSelections.length >= currentStep.maxChoices;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleToggleOption(option.value)}
                                            disabled={isMaxed && currentStep.maxChoices > 1}
                                            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-start gap-4
                                        ${isSelected
                                                    ? 'bg-blood/10 border-blood shadow-[0_0_10px_rgba(139,0,0,0.2)]'
                                                    : 'bg-stone-800/30 border-stone-700 hover:border-gold hover:bg-stone-800'}
                                        ${(isMaxed && currentStep.maxChoices > 1) ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                    `}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                                        ${isSelected ? 'bg-blood border-blood' : 'border-stone-600 bg-stone-900'}
                                        ${currentStep.maxChoices === 1 ? 'rounded-full' : 'rounded'}
                                    `}>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div>
                                                <div className={`font-medium flex items-center justify-between gap-2 ${isSelected ? 'text-white' : 'text-parchment'}`}>
                                                    <div className="flex items-center gap-2">
                                                        {option.label}
                                                        {option.is2024 && (
                                                            <span className="text-[9px] bg-gold/20 text-gold-light px-1.5 py-0.5 rounded border border-gold/40 flex items-center gap-1 shadow-[0_0_8px_rgba(212,175,55,0.2)]">
                                                                2024
                                                            </span>
                                                        )}
                                                    </div>
                                                    <InfoTooltip query={option.label} />
                                                </div>
                                                {option.description && (
                                                    <div className="text-sm text-stone-400 mt-1 leading-snug max-w-[90%]">
                                                        {option.description}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-between items-center rounded-b-xl">
                    <button
                        onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentStepIndex === 0}
                        className="px-4 py-2 flex items-center gap-2 text-stone-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="flex flex-col items-center">
                        {!isTextStep && (
                            <div className="text-xs text-stone-500 font-medium mb-1.5">
                                Selected <span className={currentSelections.length === currentStep.maxChoices ? 'text-gold' : 'text-parchment'}>{currentSelections.length}</span> of {currentStep.maxChoices}
                            </div>
                        )}
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentStepIndex ? 'bg-gold shadow-[0_0_5px_rgba(250,204,21,0.5)]' : i < currentStepIndex ? 'bg-blood/70' : 'bg-stone-800 border border-stone-700'}`} />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className={`px-6 py-2 flex items-center gap-2 rounded-lg font-cinzel font-bold tracking-wide transition-all shadow-lg
                            ${canProceed
                                ? 'bg-blood text-white hover:bg-red-800 hover:shadow-blood/20'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed shadow-none'}
                        `}
                    >
                        {currentStepIndex === steps.length - 1 ? 'COMPLETE' : 'NEXT STEP'}
                        {currentStepIndex < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
