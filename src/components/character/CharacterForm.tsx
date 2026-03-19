import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { Character, createEmptyCharacter, Item, StatBlock } from '../../types/character';
import { Action } from '../../types/actions';
import { Save, ArrowLeft, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { compressPortraitImage } from '../../engine/portraitEngine';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../common/ToastProvider';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

import { CoreTab } from './dnd5e/CoreTab';
import { StatsTab } from './dnd5e/StatsTab';
import { CombatTab } from './dnd5e/CombatTab';
import { MagicTab } from './dnd5e/MagicTab';
import { InventoryTab } from './dnd5e/InventoryTab';
import { FeaturesTab } from './dnd5e/FeaturesTab';
import { ActionsTab } from './dnd5e/ActionsTab';
import { MetadataDropdown, DropdownOption } from './MetadataDropdown';
import { FeatureChoiceModal } from './FeatureChoiceModal';
import { Category, FiveEToolsModal } from '../common/FiveEToolsModal';
import {
    getOfficialClassesList,
    getOfficialSubclassesList,
    getOfficialRacesList,
    getOfficialBackgroundsList,
    getRacialTraits,
    getClassFeatures,
    getBackgroundFeatures,
    getSubclassFeatures,
    extractActionsFromFeature,
    extractItemsFromFeature
} from '../../engine/fiveEToolsParser';
import { enrichFeaturesWithChoices } from '../../engine/rulesChoiceEngine';
import { automateCharacter, finalizeCharacterSync } from '../../engine/characterAutomation';
import { mergeCharacterProvenance } from '../../engine/sourceMetadata';

interface CharacterFormProps {
    characterId?: string | null;
    initialData?: Partial<Character>;
    onClose: () => void;
    onSaveComplete?: (characterId: string) => void;
    surface?: 'default' | 'owlbear';
    entryMode?: 'create' | 'edit' | 'import';
}

type TabKey = 'core' | 'stats' | 'combat' | 'magic' | 'inventory' | 'features' | 'actions';

const STAT_KEY_MAP: Record<string, keyof StatBlock> = {
    str: 'str',
    strength: 'str',
    dex: 'dex',
    dexterity: 'dex',
    con: 'con',
    constitution: 'con',
    int: 'int',
    intelligence: 'int',
    wis: 'wis',
    wisdom: 'wis',
    cha: 'cha',
    charisma: 'cha'
};

function normalizeStatKey(value: string | undefined | null): keyof StatBlock | null {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    return STAT_KEY_MAP[normalized] ?? null;
}

function normalizeSavingThrows(values: string[] | undefined): (keyof StatBlock)[] {
    if (!values || values.length === 0) return [];
    const mapped = values
        .map((value) => normalizeStatKey(value))
        .filter((value): value is keyof StatBlock => value !== null);
    return Array.from(new Set(mapped));
}

function normalizeSpellcastingAbility(
    value: string | undefined,
    fallback: keyof StatBlock | 'none'
): keyof StatBlock | 'none' {
    const stat = normalizeStatKey(value);
    return stat ?? fallback;
}

export function CharacterForm({
    characterId,
    initialData,
    onClose,
    onSaveComplete,
    surface = 'default',
    entryMode = characterId ? 'edit' : initialData ? 'import' : 'create',
}: CharacterFormProps) {
    const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacterStore();
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Character>(createEmptyCharacter());
    const [activeTab, setActiveTab] = useState<TabKey>('core');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [show5eTools, setShow5eTools] = useState(false);
    const [fiveEToolsCategory, setFiveEToolsCategory] = useState<Category>('Spells');
    const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);

    const [classOptions, setClassOptions] = useState<DropdownOption[]>([]);
    const [subclassOptions, setSubclassOptions] = useState<DropdownOption[]>([]);
    const [raceOptions, setRaceOptions] = useState<DropdownOption[]>([]);
    const [bgOptions, setBgOptions] = useState<DropdownOption[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            const races = await getOfficialRacesList();
            setRaceOptions(races.map(r => ({
                name: r.name,
                value: `${r.name}|${r.source}`,
                source: r.source,
                is2024: r.is2024
            })));

            const classes = await getOfficialClassesList();
            setClassOptions(classes.map(c => ({
                name: c.name,
                value: `${c.name}|${c.source}`,
                source: c.source,
                is2024: c.is2024
            })));

            const bgs = await getOfficialBackgroundsList();
            setBgOptions(bgs.map(b => ({
                name: b.name,
                value: `${b.name}|${b.source}`,
                source: b.source,
                is2024: b.is2024
            })));
        };
        fetchOptions();
    }, []);

    useEffect(() => {
        if (formData.className) {
            getOfficialSubclassesList(formData.className).then(setSubclassOptions);
        } else {
            setSubclassOptions([]);
        }
    }, [formData.className]);

    useEffect(() => {
        let isCancelled = false;
        if (characterId) {
            const existing = characters.find(c => c.id === characterId);
            if (existing) {
                // We merge with empty character to ensure any newly added schema fields
                // that didn't exist in older saves get populated with defaults
                setFormData(finalizeCharacterSync({ ...createEmptyCharacter(), ...existing }));
            }
        } else if (initialData) {
            // Apply imported PDF data / template data onto a fresh empty character
            automateCharacter({ ...createEmptyCharacter(), ...initialData }).then((automated) => {
                if (isCancelled) return;
                setFormData(automated);
                setHasUnsavedChanges(true); // Treat imports as "unsaved" so the user is coaxed to save right away
            });
        }
        return () => {
            isCancelled = true;
        };
    }, [characterId, characters, initialData]);

    const open5eToolsLibrary = (category: Category) => {
        setFiveEToolsCategory(category);
        setShow5eTools(true);
    };

    const stampFiveEToolsImport = (item: any, importedDataPatch?: Partial<NonNullable<Character['importedData']>>) => {
        setFormData((prev) => finalizeCharacterSync({
            ...prev,
            importedData: importedDataPatch ? { ...(prev.importedData || {}), ...importedDataPatch } : prev.importedData,
            provenance: mergeCharacterProvenance(prev.provenance, {
                origin: item?.isHomebrew ? 'homebrew' : '5etools',
                edition: item?.is2024 ? '2024' : '2014',
                sourceSummary: item?.source || item?.homebrewSource || '5e.tools'
            })
        }));
        setHasUnsavedChanges(true);
    };

    const handleChange = (field: keyof Character, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleTriggerReplace = (featureId: string, slotName: string) => {
        setFormData(prev => {
            const featureToDelete = prev.features.find(f => f.id === featureId);
            if (!featureToDelete) return prev;

            // Find the slot feature and reactivate it
            const updatedFeatures = prev.features.map(f => {
                if (f.name === slotName && f.choiceType) {
                    return { ...f, requiresChoice: true };
                }
                return f;
            }).filter(f => f.id !== featureId);

            // Clean up actions associated with this feature
            const updatedActions = prev.actions.filter(a => a.featureId !== featureId);

            // Clean up items (heuristic)
            const featureItems = extractItemsFromFeature(featureToDelete);
            const updatedInventory = prev.inventory.filter(i =>
                !featureItems.some(fi => fi.name === i.name)
            );

            return {
                ...prev,
                features: updatedFeatures,
                actions: updatedActions,
                inventory: updatedInventory
            };
        });

        // Open the choice wizard for the slot
        const slot = formData.features.find(f => f.name === slotName && f.choiceType);
        if (slot) {
            setActiveChoiceId(slot.id);
            addToast(`Replacing ${slotName} option...`, 'info');
        }
    };

    const handleSave = () => {
        if (characterId) {
            updateCharacter(characterId, formData);
        } else {
            addCharacter(formData);
        }
        setHasUnsavedChanges(false);
        addToast(`${formData.name || 'Hero'} saved to your roster.`, 'success');
        onSaveComplete?.(formData.id);
        onClose();
    };

    const handleRaceChange = async (newRace: string) => {
        const oldRace = formData.race;
        handleChange('race', newRace);
        if (!newRace) return;
        const data = await getRacialTraits(newRace);

        // Remove traits from the OLD race before adding the new ones
        let updatedTraits = formData.racialTraits || [];
        if (oldRace && oldRace !== newRace) {
            updatedTraits = updatedTraits.filter(t => !t.source.toLowerCase().includes(oldRace.toLowerCase()));
        }

        if (data.features.length > 0) {
            const currentNames = new Set(updatedTraits.map(f => f.name.toLowerCase()));
            const newTraits = data.features.filter(f => !currentNames.has(f.name.toLowerCase()));
            const newActions = newTraits.map(extractActionsFromFeature).filter(Boolean) as Action[];
            const newItems = newTraits.flatMap(extractItemsFromFeature).filter(Boolean) as Item[];

            setFormData(prev => {
                // Scrub old actions
                let updatedActions = prev.actions || [];
                if (oldRace && oldRace !== newRace) {
                    updatedActions = updatedActions.filter(a => !a.source.toLowerCase().includes(oldRace.toLowerCase()));
                }

                // Merge languages cleanly
                let newLangs = prev.languages || '';
                if (data.languages && !newLangs.toLowerCase().includes(data.languages.toLowerCase())) {
                    newLangs = newLangs ? `${newLangs}, ${data.languages}` : data.languages;
                }

                // Autocheck skill proficiencies if provided by race
                const updatedSkills = [...(prev.skills || [])];
                if (data.skillProficiencies) {
                    data.skillProficiencies.forEach(sp => {
                        const idx = updatedSkills.findIndex(s => s.name.toLowerCase() === sp.toLowerCase());
                        if (idx >= 0) {
                            updatedSkills[idx] = { ...updatedSkills[idx], proficient: true, source: 'Race', sourceId: newRace };
                        }
                    });
                }

                return {
                    ...prev,
                    speed: data.speed || prev.speed,
                    senses: data.senses || prev.senses,
                    darkvision: data.darkvision || prev.darkvision,
                    languages: newLangs,
                    skills: updatedSkills,
                    inventory: [...(prev.inventory || []), ...newItems.filter(ni => !(prev.inventory || []).some(ei => ei.name === ni.name))],
                    racialTraits: enrichFeaturesWithChoices([...updatedTraits, ...newTraits]),
                    actions: [...updatedActions, ...newActions]
                };
            });
            addToast(`Imported ${newRace} traits!`, 'success');
        }
    };

    const handleClassChange = async (newClass: string) => {
        const oldClass = formData.className;
        handleChange('className', newClass);
        if (!newClass) return;
        const data = await getClassFeatures(newClass, formData.level || 1);

        // Scrub old class features and subclass features (since subclass is tied to class)
        let updatedFeatures = formData.features || [];
        if (oldClass && oldClass !== newClass) {
            updatedFeatures = updatedFeatures.filter(f =>
                !f.source.toLowerCase().includes(oldClass.toLowerCase()) &&
                (!formData.subclass || !f.source.toLowerCase().includes(formData.subclass.toLowerCase()))
            );
            // Also unset subclass when changing base class
            handleChange('subclass', '');
        }

        if (data.features.length > 0) {
            const currentNames = new Set(updatedFeatures.map(f => f.name.toLowerCase()));
            const newFeatures = data.features.filter(f => !currentNames.has(f.name.toLowerCase()));
            const newActions = newFeatures.map(extractActionsFromFeature).filter(Boolean) as Action[];
            const newItems = newFeatures.flatMap(extractItemsFromFeature).filter(Boolean) as Item[]; // Added newItems calculation

            let maxHp = formData.maxHp;
            if (data.hdFaces && (!maxHp || maxHp === 10)) {
                const conMod = Math.floor(((formData.abilityScores?.con || 10) - 10) / 2);
                maxHp = data.hdFaces + conMod;
            }

            // Using functional state update to ensure we grab the scrubbed features list
            // properly if racing with the handleChange above.
            setFormData(prev => {
                const prevCleaned = (prev.features || []).filter(f =>
                    !f.source.toLowerCase().includes(oldClass?.toLowerCase() || '') &&
                    (!formData.subclass || !f.source.toLowerCase().includes(formData.subclass.toLowerCase()))
                );

                const prevActionsCleaned = (prev.actions || []).filter(a =>
                    !a.source.toLowerCase().includes(oldClass?.toLowerCase() || '') &&
                    (!formData.subclass || !a.source.toLowerCase().includes(formData.subclass.toLowerCase()))
                );

                // Merge proficiencies (armor, weapons, tools)
                let newProfs = prev.proficiencies || '';
                if (data.proficiencies && !newProfs.toLowerCase().includes(data.proficiencies.toLowerCase())) {
                    newProfs = newProfs ? `${newProfs}; ${data.proficiencies}` : data.proficiencies;
                }

                return {
                    ...prev,
                    subclass: oldClass !== newClass ? '' : prev.subclass,
                    hitDice: data.hitDice || prev.hitDice,
                    savingThrows: data.savingThrows?.length ? normalizeSavingThrows(data.savingThrows) : prev.savingThrows,
                    proficiencies: newProfs,
                    spellcastingAbility: normalizeSpellcastingAbility(data.spellcastingAbility, prev.spellcastingAbility),
                    spellSlots: data.spellSlots || prev.spellSlots,
                    resources: data.resources ? [...(prev.resources || []).filter(r => !data.resources?.find(nr => nr.name === r.name)), ...data.resources] : prev.resources,
                    maxHp,
                    currentHp: maxHp,
                    inventory: [...(prev.inventory || []), ...newItems.filter(ni => !(prev.inventory || []).some(ei => ei.name === ni.name))],
                    features: enrichFeaturesWithChoices([...prevCleaned, ...newFeatures]),
                    actions: [...prevActionsCleaned, ...newActions]
                };
            });
            addToast(`Imported ${newClass} features!`, 'success');
        }
    };

    const handleSubclassChange = async (newSubclass: string) => {
        const oldSubclass = formData.subclass;
        handleChange('subclass', newSubclass);
        if (!formData.className || !newSubclass) return;
        const data = await getSubclassFeatures(formData.className, newSubclass, formData.level || 1);

        if (data.features.length > 0) {
            setFormData(prev => {
                let prevCleaned = prev.features || [];
                if (oldSubclass && oldSubclass !== newSubclass) {
                    prevCleaned = prevCleaned.filter(f => !f.source.toLowerCase().includes(oldSubclass.toLowerCase()));
                }
                const currentNames = new Set(prevCleaned.map(f => f.name.toLowerCase()));
                const newFeatures = data.features.filter(f => !currentNames.has(f.name.toLowerCase()));
                const newActions = newFeatures.map(extractActionsFromFeature).filter(Boolean) as Action[];
                const newItems = newFeatures.flatMap(extractItemsFromFeature).filter(Boolean) as Item[];

                let prevActionsCleaned = prev.actions || [];
                if (oldSubclass && oldSubclass !== newSubclass) {
                    prevActionsCleaned = prevActionsCleaned.filter(a => !a.source.toLowerCase().includes(oldSubclass.toLowerCase()));
                }

                return {
                    ...prev,
                    inventory: [...(prev.inventory || []), ...newItems.filter(ni => !(prev.inventory || []).some(ei => ei.name === ni.name))],
                    features: enrichFeaturesWithChoices([...prevCleaned, ...newFeatures]),
                    actions: [...prevActionsCleaned, ...newActions]
                };
            });
            addToast(`Imported ${newSubclass} features!`, 'success');
        }
    };

    const handleBackgroundChange = async (newBackground: string) => {
        const oldBg = formData.background;
        handleChange('background', newBackground);
        if (!newBackground) return;
        const data = await getBackgroundFeatures(newBackground);

        if (data.features.length > 0) {
            setFormData(prev => {
                let prevCleaned = prev.features || [];
                if (oldBg && oldBg !== newBackground) {
                    prevCleaned = prevCleaned.filter(f => !f.source.toLowerCase().includes(oldBg.toLowerCase()));
                }
                const currentNames = new Set(prevCleaned.map(f => f.name.toLowerCase()));
                const newFeatures = data.features.filter(f => !currentNames.has(f.name.toLowerCase()));
                const newActions = newFeatures.map(extractActionsFromFeature).filter(Boolean) as Action[];

                let prevActionsCleaned = prev.actions || [];
                if (oldBg && oldBg !== newBackground) {
                    prevActionsCleaned = prevActionsCleaned.filter(a => !a.source.toLowerCase().includes(oldBg.toLowerCase()));
                }

                // Autocheck skill proficiencies if provided by background
                const updatedSkills = [...(prev.skills || [])];
                if (data.skillProficiencies) {
                    data.skillProficiencies.forEach(sp => {
                        const idx = updatedSkills.findIndex(s => s.name.toLowerCase() === sp.toLowerCase());
                        if (idx >= 0) {
                            updatedSkills[idx] = { ...updatedSkills[idx], proficient: true, source: 'Background', sourceId: newBackground };
                        }
                    });
                }

                // Sync Starting Equipment
                let prevInventoryCleaned = prev.inventory || [];
                if (oldBg && oldBg !== newBackground) {
                    const descMatch = `Starting equipment from ${oldBg}`;
                    prevInventoryCleaned = prevInventoryCleaned.filter(i => i.description !== descMatch);
                }

                if (data.startingEquipment) {
                    const newEq = data.startingEquipment.filter(item => !prevInventoryCleaned.some(existing => existing.name === item.name && existing.description === item.description));
                    prevInventoryCleaned = [...prevInventoryCleaned, ...newEq];
                }

                return {
                    ...prev,
                    skills: updatedSkills,
                    inventory: prevInventoryCleaned,
                    features: enrichFeaturesWithChoices([...prevCleaned, ...newFeatures]),
                    actions: [...prevActionsCleaned, ...newActions]
                };
            });
            addToast(`Imported ${newBackground} features!`, 'success');
        }
    };

    const handleLevelChange = async (newLevel: number) => {
        handleChange('level', newLevel);
        if (!formData.className) return;

        const data = await getClassFeatures(formData.className, newLevel);
        const subData = formData.subclass ? await getSubclassFeatures(formData.className, formData.subclass, newLevel) : { features: [] };

        setFormData(prev => {
            // Scrub old class and subclass features to prevent duplicates
            const prevCleaned = (prev.features || []).filter(f =>
                !f.source.toLowerCase().includes(formData.className.toLowerCase()) &&
                (!formData.subclass || !f.source.toLowerCase().includes(formData.subclass.toLowerCase()))
            );

            const prevActionsCleaned = (prev.actions || []).filter(a =>
                !a.source.toLowerCase().includes(formData.className.toLowerCase()) &&
                (!formData.subclass || !a.source.toLowerCase().includes(formData.subclass.toLowerCase()))
            );

            const newCombinedFeatures = [...data.features, ...subData.features];
            const currentNames = new Set(prevCleaned.map(f => f.name.toLowerCase()));
            const strictlyNewFeatures = newCombinedFeatures.filter(f => !currentNames.has(f.name.toLowerCase()));
            const newActions = strictlyNewFeatures.map(extractActionsFromFeature).filter(Boolean) as Action[];
            const newItems = strictlyNewFeatures.flatMap(extractItemsFromFeature).filter(Boolean) as Item[];

            let newMaxHp = prev.maxHp;
            let currentHp = prev.currentHp;
            if (data.hdFaces) {
                const conMod = Math.floor(((prev.abilityScores?.con || 10) - 10) / 2);
                const baseHp = data.hdFaces + conMod;
                const hpPerLevel = Math.floor(data.hdFaces / 2) + 1 + conMod;
                newMaxHp = baseHp + (newLevel - 1) * Math.max(1, hpPerLevel);
                currentHp = newMaxHp; // Heal to full on level up for simplicity
            }

            return {
                ...prev,
                maxHp: newMaxHp,
                currentHp,
                spellSlots: data.spellSlots || prev.spellSlots,
                resources: data.resources ? [...(prev.resources || []).filter(r => !data.resources?.find(nr => nr.name === r.name)), ...data.resources] : prev.resources,
                inventory: [...(prev.inventory || []), ...newItems.filter(ni => !(prev.inventory || []).some(ei => ei.name === ni.name))],
                features: enrichFeaturesWithChoices([...prevCleaned, ...strictlyNewFeatures]),
                actions: [...prevActionsCleaned, ...newActions]
            };
        });

        addToast(`Leveled up to ${newLevel}! Features synchronized.`, 'success');
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (characterId) {
            deleteCharacter(characterId);
            onClose();
        }
    };

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'core', label: 'Core Identity' },
        { key: 'stats', label: 'Stats & Skills' },
        { key: 'combat', label: 'Combat & Health' },
        { key: 'magic', label: 'Spellcasting' },
        { key: 'features', label: 'Features & Traits' },
        { key: 'inventory', label: 'Equipment' },
        { key: 'actions', label: 'Actions' }
    ];
    const isOwlbearSurface = surface === 'owlbear';
    const showImportBanner = isOwlbearSurface && entryMode === 'import' && !characterId;
    const headerTitle = entryMode === 'import' ? 'Review imported sheet' : characterId ? 'Edit linked sheet' : 'Create sheet';

    return (
        <div className={`max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-300 pb-20 ${isOwlbearSurface ? 'space-y-4' : 'space-y-6'}`}>

            {/* Header / Identity Block */}
            <header className={`relative sticky top-0 z-20 border-b border-stone-700/80 bg-stone-900/95 backdrop-blur-md shadow-sm ${isOwlbearSurface ? 'pb-3 pt-3' : 'pb-4 pt-4'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                {/* Left: Back Button + Portrait + Identity Ribbon */}
                <div className="flex items-start gap-4 flex-1">
                    <button
                        onClick={() => {
                            if (hasUnsavedChanges) {
                                setShowDiscardConfirm(true);
                                return;
                            }
                            onClose();
                        }}
                        className="p-2 hover:bg-stone-800 rounded-md text-stone-400 hover:text-parchment transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className={`flex items-center gap-4 ${isOwlbearSurface ? '' : 'ml-2'}`}>
                        {formData.portraitUrl ? (
                            <div className="relative group w-12 h-12 rounded-full border-2 border-gold shadow-[0_0_10px_rgba(217,119,6,0.3)]">
                                <img src={formData.portraitUrl} alt="Portrait" className="w-full h-full object-cover rounded-full" />
                                <button
                                    onClick={() => handleChange('portraitUrl', undefined)}
                                    className="absolute -top-1 -right-1 bg-blood text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-stone-900 shadow-xl"
                                    title="Remove Portrait"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-stone-700 hover:border-gold/50 text-stone-500 hover:text-gold bg-stone-950 cursor-pointer transition-all border-dashed overflow-hidden group">
                                <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            try {
                                                const base64 = await compressPortraitImage(file, 256, 0.8);
                                                handleChange('portraitUrl', base64);
                                            } catch (err) {
                                                console.error("Failed to compress portrait:", err);
                                                alert("Failed to process image. Try a different file.");
                                            }
                                        }
                                    }}
                                />
                            </label>
                        )}
                        <div className={`flex flex-col gap-1 w-full ${isOwlbearSurface ? 'max-w-none' : 'max-w-2xl'}`}>
                            {isOwlbearSurface && (
                                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                                    {headerTitle}
                                </div>
                            )}
                            {/* Name Input */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="New Hero"
                                    className={`bg-transparent border-none p-0 placeholder-stone-600 focus:ring-0 focus:outline-none w-full ${isOwlbearSurface ? 'text-2xl md:text-3xl font-semibold tracking-tight text-parchment' : 'text-3xl md:text-4xl font-cinzel font-bold text-gold'}`}
                                />
                                {hasUnsavedChanges && (
                                    <span className={`px-2 py-0.5 whitespace-nowrap border border-gold/30 ${isOwlbearSurface ? 'rounded-md bg-gold/15 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gold' : 'rounded-sm bg-gold/20 font-sans text-[10px] uppercase tracking-wider text-gold'}`}>
                                        {showImportBanner ? 'Needs Save' : 'Unsaved'}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <ProvenanceBadge
                                    origin={formData.provenance?.origin}
                                    edition={formData.provenance?.edition}
                                />
                                <span className="text-xs uppercase tracking-[0.18em] text-stone-500">
                                    {formData.provenance?.sourceSummary || 'Manual Entry'}
                                </span>
                            </div>

                            {/* Core Metadata Ribbon (Class, Level, Race, Background) */}
                            <div className={`flex flex-wrap items-center gap-y-1 text-sm text-stone-400 font-medium ${isOwlbearSurface ? 'gap-x-3' : 'gap-x-4'}`}>
                                <div className="flex items-center gap-1 group">
                                    <span className="text-stone-500 uppercase text-[10px] tracking-wider">Lvl</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.level || 1}
                                        onChange={e => handleLevelChange(parseInt(e.target.value) || 1)}
                                        className="bg-transparent border-b border-transparent hover:border-stone-600 focus:border-gold w-8 text-center text-parchment outline-none hide-arrows transition-colors"
                                    />
                                </div>
                                <span className="text-stone-700 text-xs">•</span>
                                <div className="w-36 mt-0.5">
                                    <MetadataDropdown
                                        placeholder="Species"
                                        value={formData.race || ''}
                                        onChange={handleRaceChange}
                                        options={raceOptions}
                                        onSearchClick={() => open5eToolsLibrary('Races')}
                                    />
                                </div>
                                <span className="text-stone-700 text-xs">•</span>
                                <div className="w-40 mt-0.5">
                                    <MetadataDropdown
                                        placeholder="Class"
                                        value={formData.className || ''}
                                        onChange={handleClassChange}
                                        options={classOptions}
                                        onSearchClick={() => open5eToolsLibrary('Classes')}
                                    />
                                </div>
                                <span className="text-stone-700 text-xs">•</span>
                                <div className="w-48 mt-0.5">
                                    <MetadataDropdown
                                        placeholder="Subclass"
                                        value={formData.subclass || ''}
                                        onChange={handleSubclassChange}
                                        options={subclassOptions}
                                        disabled={!formData.className}
                                        onSearchClick={() => open5eToolsLibrary('Subclasses')}
                                    />
                                </div>
                                <span className="text-stone-700 text-xs">•</span>
                                <div className="w-48 mt-0.5">
                                    <MetadataDropdown
                                        placeholder="Background"
                                        value={formData.background || ''}
                                        onChange={handleBackgroundChange}
                                        options={bgOptions}
                                        onSearchClick={() => open5eToolsLibrary('Backgrounds')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions (Delete / Save) */}
                <div className={`flex items-center gap-3 ${isOwlbearSurface ? 'w-full justify-end md:w-auto md:justify-start' : 'absolute top-4 right-0'}`}>
                    <button
                        type="button"
                        onClick={() => open5eToolsLibrary('Spells')}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isOwlbearSurface ? 'rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200' : 'rounded-md border border-indigo-400/20 bg-indigo-500/10 text-indigo-200'} hover:bg-indigo-500/20`}
                    >
                        Library
                    </button>
                    {characterId && (
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isOwlbearSurface ? 'rounded-xl border border-stone-700 bg-stone-800' : 'rounded-md border border-stone-700 bg-stone-800'} hover:bg-blood/20 text-stone-400 hover:text-blood`}
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-4 py-2 font-bold transition-all shadow-sm ${isOwlbearSurface ? 'rounded-xl' : 'rounded-md'} ${hasUnsavedChanges
                            ? 'bg-gold/90 hover:bg-gold text-stone-900 shadow-gold/20'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                            }`}
                    >
                        <Save size={16} /> {isOwlbearSurface ? 'Save Sheet' : 'Save Hero'}
                    </button>
                </div>
            </header>

            {showImportBanner && (
                <div className="rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-stone-300">
                    Imported data is loaded into a draft sheet. Save it first, then return to the Owlbear runtime panel to link it to the selected token.
                </div>
            )}

            {/* Tabs Navigation */}
            <div className={`flex flex-col gap-0 border-b-2 border-stone-800/80 bg-stone-900/30 ${isOwlbearSurface ? 'rounded-t-2xl px-2 pt-2' : 'rounded-t-xl px-2 pt-2'}`}>
                <div className="flex gap-1 overflow-x-auto custom-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap transition-all border border-b-0 ${isOwlbearSurface ? 'rounded-t-xl px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em]' : 'rounded-t-md px-5 py-2.5 font-cinzel text-sm font-bold'} ${activeTab === tab.key
                                ? `${isOwlbearSurface ? 'bg-stone-800 border-stone-700/70 text-parchment shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' : 'bg-stone-800 border-stone-700/70 text-gold shadow-[0_-2px_10px_rgba(0,0,0,0.2)]'} z-10`
                                : 'bg-transparent border-transparent text-stone-500 hover:text-stone-300 hover:bg-stone-800/30'
                                }`}
                            style={{ marginBottom: activeTab === tab.key ? '-2px' : '0' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className={`bg-stone-800/20 border border-t-0 border-stone-800/80 shadow-inner ${isOwlbearSurface ? 'min-h-[540px] rounded-b-2xl p-5' : 'min-h-[600px] rounded-b-xl p-6'}`}>
                {activeTab === 'core' && <CoreTab data={formData} onChange={handleChange} />}
                {activeTab === 'stats' && <StatsTab data={formData} onChange={handleChange} addToast={addToast} />}
                {activeTab === 'combat' && <CombatTab data={formData} onChange={handleChange} />}
                {activeTab === 'magic' && <MagicTab data={formData} onChange={handleChange} />}
                {activeTab === 'features' && (
                    <FeaturesTab
                        data={formData}
                        onChange={handleChange}
                        onTriggerChoice={setActiveChoiceId}
                        onTriggerReplace={handleTriggerReplace}
                    />
                )}
                {activeTab === 'inventory' && <InventoryTab data={formData} onChange={handleChange} />}
                {activeTab === 'actions' && <ActionsTab data={formData} onChange={handleChange} />}
            </div>

            <ConfirmationModal
                isOpen={showDiscardConfirm}
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to discard them? This cannot be undone."
                confirmText="Discard Changes"
                isDangerous={true}
                onConfirm={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                }}
                onCancel={() => setShowDiscardConfirm(false)}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Delete Hero?"
                message={`Are you sure you want to permanently delete ${formData.name || 'this character'}? This cannot be undone.`}
                confirmText="Yes, Delete"
                isDangerous={true}
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    confirmDelete();
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {show5eTools && (
                <FiveEToolsModal
                    isOpen={show5eTools}
                    onClose={() => setShow5eTools(false)}
                    initialCategory={fiveEToolsCategory}
                    classNameForSubclass={formData.className || undefined}
                    onImport={async (item, category) => {
                        setShow5eTools(false);
                        if (!item) return;

                        if (category === 'Races') {
                            await handleRaceChange(item.name);
                            stampFiveEToolsImport(item, { race: item });
                            addToast(`Imported species data from 5e.tools: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Classes') {
                            await handleClassChange(item.name);
                            stampFiveEToolsImport(item, { class: item });
                            addToast(`Imported class data from 5e.tools: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Subclasses') {
                            await handleSubclassChange(item.name);
                            stampFiveEToolsImport(item, { subclass: item });
                            addToast(`Imported subclass data from 5e.tools: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Backgrounds') {
                            await handleBackgroundChange(item.name);
                            stampFiveEToolsImport(item, { background: item });
                            addToast(`Imported background data from 5e.tools: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Spells') {
                            setFormData((prev) => finalizeCharacterSync({
                                ...prev,
                                spells: [
                                    ...(prev.spells || []).filter((spell) => spell.name.toLowerCase() !== item.name.toLowerCase()),
                                    { ...item, id: item.id || crypto.randomUUID() }
                                ],
                                provenance: mergeCharacterProvenance(prev.provenance, {
                                    origin: item?.isHomebrew ? 'homebrew' : '5etools',
                                    edition: item?.is2024 ? '2024' : '2014',
                                    sourceSummary: item?.source || item?.homebrewSource || '5e.tools'
                                })
                            }));
                            setHasUnsavedChanges(true);
                            addToast(`Spell imported: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Items') {
                            setFormData((prev) => finalizeCharacterSync({
                                ...prev,
                                inventory: [
                                    ...(prev.inventory || []).filter((entry) => entry.name.toLowerCase() !== item.name.toLowerCase()),
                                    { ...item, id: item.id || crypto.randomUUID() }
                                ],
                                provenance: mergeCharacterProvenance(prev.provenance, {
                                    origin: item?.isHomebrew ? 'homebrew' : '5etools',
                                    edition: item?.is2024 ? '2024' : '2014',
                                    sourceSummary: item?.source || item?.homebrewSource || '5e.tools'
                                })
                            }));
                            setHasUnsavedChanges(true);
                            addToast(`Item imported: ${item.name}`, 'success');
                            return;
                        }

                        if (category === 'Feats') {
                            const nextCharacter = await automateCharacter({
                                ...formData,
                                feats: [
                                    ...(formData.feats || []).filter((feat) => feat.name.toLowerCase() !== item.name.toLowerCase()),
                                    {
                                        ...item,
                                        id: item.id || crypto.randomUUID(),
                                        isFeat: true
                                    }
                                ],
                                provenance: mergeCharacterProvenance(formData.provenance, {
                                    origin: item?.isHomebrew ? 'homebrew' : '5etools',
                                    edition: item?.is2024 ? '2024' : '2014',
                                    sourceSummary: item?.source || item?.homebrewSource || '5e.tools'
                                })
                            });
                            setFormData(nextCharacter);
                            setHasUnsavedChanges(true);
                            addToast(`Feat imported: ${item.name}`, 'success');
                            return;
                        }

                        addToast(`${category} import is not wired into character sheets yet.`, 'info');
                    }}
                />
            )}

            {/* Feature Choice Wizard */}
            {(() => {
                const pendingChoice = formData.features?.find(f => f.id === activeChoiceId);
                if (!pendingChoice) return null;

                return (
                    <FeatureChoiceModal
                        isOpen={true}
                        featureTitle={pendingChoice.name}
                        choiceType={pendingChoice.choiceType || pendingChoice.name}
                        classNameContext={formData.className}
                        existingFeatures={formData.features || []}
                        characterLevel={formData.level}
                        characterFeatures={formData.features || []}
                        characterSpells={formData.spells || []}
                        characterLanguages={formData.languages}
                        characterSkills={formData.skills}
                        maxChoices={pendingChoice.count || 1}
                        onSelect={(chosenFeatures) => {
                            setFormData(prev => {
                                const updated = { ...prev };

                                chosenFeatures.forEach(chosenFeature => {
                                    // Special handling for generic types
                                    if (pendingChoice.choiceType === 'language') {
                                        const currentLangs = updated.languages ? updated.languages.split(',').map(s => s.trim()).filter(Boolean) : [];
                                        if (!currentLangs.includes(chosenFeature.name)) {
                                            currentLangs.push(chosenFeature.name);
                                            updated.languages = currentLangs.join(', ');
                                        }
                                    } else if (pendingChoice.choiceType === 'skill') {
                                        const newSkills = [...updated.skills];
                                        const skillIdx = newSkills.findIndex(s => s.name.toLowerCase() === chosenFeature.name.toLowerCase());
                                        if (skillIdx >= 0) {
                                            newSkills[skillIdx] = {
                                                ...newSkills[skillIdx],
                                                proficient: true,
                                                source: pendingChoice.name,
                                                sourceId: pendingChoice.id
                                            };
                                            updated.skills = newSkills;
                                        }
                                    }

                                    // If it was a complex feature (like a Fighting Style), add the new sub-feature
                                    if (pendingChoice.choiceType !== 'language' && pendingChoice.choiceType !== 'skill') {
                                        const finalFeature = { ...chosenFeature, source: pendingChoice.name };
                                        updated.features = [...updated.features, finalFeature];

                                        const action = extractActionsFromFeature(finalFeature);
                                        if (action) updated.actions = [...(updated.actions || []), action];

                                        const newItems = extractItemsFromFeature(finalFeature);
                                        if (newItems.length > 0) updated.inventory = [...(updated.inventory || []), ...newItems.filter(ni => !updated.inventory.some(ei => ei.name === ni.name))];
                                    }
                                });

                                // Mark the original pending feature as resolved
                                updated.features = updated.features.map(f =>
                                    f.id === pendingChoice.id ? {
                                        ...f,
                                        requiresChoice: false,
                                        description: `${f.description}\n\n*Selections: ${chosenFeatures.map(c => c.name).join(', ')}*`
                                    } : f
                                );

                                return updated;
                            });
                            addToast(`Resolved ${pendingChoice.name}: ${chosenFeatures.map(c => c.name).join(', ')}`, 'success');
                            setActiveChoiceId(null);
                        }}
                        onClose={() => setActiveChoiceId(null)}
                    />
                );
            })()}
        </div>
    );
}
