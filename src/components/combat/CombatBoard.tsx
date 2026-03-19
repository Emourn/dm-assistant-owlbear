import { useState, useEffect } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { InitiativeTracker } from './InitiativeTracker';
import { MultiTargetModal } from './MultiTargetModal';
import { CombatLog } from './CombatLog';
import { DiceRoller } from './DiceRoller';
import { PortraitRibbon } from './PortraitRibbon';
import { AddCombatantModal } from './AddCombatantModal';
import { ActionWizard, ActionWizardResult } from './ActionWizard';
import { BattleMap } from './BattleMap';
import { ConditionTooltip } from './ConditionTooltip';
import { useCombatTargeting } from '../../hooks/useCombatTargeting';
import { useMapInteraction } from '../../hooks/useMapInteraction';
import { Combatant, CombatAction } from '../../types/combat';
import { parseSpeed } from '../../engine/combatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { MapToken } from '../../types/battleMap';
import {
    Map as MapIcon, Swords, X, Play, SkipForward, Undo2, UserPlus, Zap, ShieldAlert
} from 'lucide-react';
import { CombatSidebar } from './CombatSidebar';
import { TurnEconomyHUD } from './TurnEconomyHUD';
import { DraggablePanel } from '../common/DraggablePanel';
import { QuickHPOverlay } from './QuickHPOverlay';
import { MonsterStatBlock } from './MonsterStatBlock';
import { CombatSummary } from './CombatSummary';
import { ConfirmationModal } from '../common/ConfirmationModal';
import conditions from '../../data/dnd5e/conditions.json';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../multiplayer/sessionStore';


export function CombatBoard() {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const beginCombat = useCombatStore((state) => state.beginCombat);
    const nextTurn = useCombatStore((state) => state.nextTurn);
    const undo = useCombatStore((state) => state.undo);
    const pastStates = useCombatStore((state) => state.pastStates);
    const damageCombatant = useCombatStore((state) => state.damageCombatant);
    const healCombatant = useCombatStore((state) => state.healCombatant);
    const rollAllInitiative = useCombatStore((state) => state.rollAllInitiative);
    const setConcentration = useCombatStore((state) => state.setConcentration);
    const manualRollsEnabled = useCombatStore((state) => state.manualRollsEnabled);
    const toggleManualRolls = useCombatStore((state) => state.toggleManualRolls);
    const refreshPlayerStats = useCombatStore((state) => state.refreshPlayerStats);
    const selectedCombatantId = useCombatStore((state) => state.selectedCombatantId);
    const setSelectedCombatant = useCombatStore((state) => state.setSelectedCombatant);
    const updateToken = useCombatStore((state) => state.updateToken);
    const updateBattleMap = useCombatStore((state) => state.updateBattleMap);
    const setWizardAction = useCombatStore((state) => state.setWizardAction);
    const wizardAction = useCombatStore((state) => state.wizardAction);
    const addLog = useCombatStore((state) => state.addLog);
    const updateCombatant = useCombatStore((state) => state.updateCombatant);
    const resizeGrid = useCombatStore((state) => state.resizeGrid);
    const endEncounter = useCombatStore((state) => state.endEncounter);
    const navigate = useNavigate();
    const { isMultiplayer, role, mapData: liveSessionMap, presentation } = useSessionStore();

    const combatants = activeEncounter?.combatants ?? [];
    const battleMap = activeEncounter?.battleMap && isMultiplayer && role === 'dm' && presentation?.mode === 'combat' && liveSessionMap?.id === activeEncounter.battleMap.id
        ? {
            ...activeEncounter.battleMap,
            ...liveSessionMap,
            tokens: liveSessionMap.tokens ?? activeEncounter.battleMap.tokens,
        }
        : activeEncounter?.battleMap ?? null;
    const isActive = activeEncounter?.isActive ?? false;
    const activeCombatantId = activeEncounter?.activeCombatantId ?? null;
    const activeCombatant = combatants.find((c: Combatant) => c.id === activeCombatantId) || null;

    const {
        targetingMode,
        handleActionSelect,
        handleTargetSelect,
        clearTargeting
    } = useCombatTargeting({
        activeEncounter,
        activeCombatant,
        setWizardAction
    });

    const {
        drawingMode,
        setDrawingMode,
        movementOverlay,
        showMovementRange,
        clearMovementRange,
        contextMenu,
        openContextMenu,
        closeContextMenu,
        activeLightLevel,
        activeWeather
    } = useMapInteraction();

    const [showDiceRoller, setShowDiceRoller] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showEndTurnConfirm, setShowEndTurnConfirm] = useState(false);
    const [showEndSummary, setShowEndSummary] = useState(false);
    const [showMultiTarget, setShowMultiTarget] = useState(false);
    const [showAddCombatant, setShowAddCombatant] = useState(false);
    const [hoveredAction, setHoveredAction] = useState<CombatAction | null>(null);
    const [isLogExpanded, setIsLogExpanded] = useState(false);
    const [isReadyActionFormOpen, setIsReadyActionFormOpen] = useState(false);
    const [hoveredCondition, setHoveredCondition] = useState<{ name: string, x: number, y: number } | null>(null);
    const [statBlockTarget, setStatBlockTarget] = useState<Combatant | null>(null);

    // Auto-refresh player stats from characterStore when combat board loads
    useEffect(() => {
        refreshPlayerStats();
    }, [refreshPlayerStats]);

    // ═══ KEYBOARD SHORTCUTS ═══
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Block shortcuts when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            // Block shortcuts when any modal is open
            const modalOpen = showEndConfirm || showEndSummary || showMultiTarget
                || showAddCombatant || isReadyActionFormOpen || !!statBlockTarget || !!wizardAction;

            const key = e.key.toLowerCase();

            // Escape always works — closes targeting first, then modals
            if (key === 'escape') {
                e.preventDefault();
                if (targetingMode) { clearTargeting(); return; }
                if (showDiceRoller) { setShowDiceRoller(false); return; }
                return;
            }

            // All other shortcuts blocked during modals or pre-combat
            if (modalOpen || !isActive) return;

            switch (key) {
                case 'n': // Next Turn
                    e.preventDefault();
                    nextTurn();
                    break;
                case 'u': // Undo
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        if (pastStates.length > 0) undo();
                    }
                    break;
                case 'd': // Dice Roller toggle
                    e.preventDefault();
                    setShowDiceRoller(prev => !prev);
                    break;
                case 'h': // Quick HP focus
                    // Prevent default to avoid typing 'h' in the input 
                    e.preventDefault();
                    document.getElementById('floating-hp-amt')?.focus();
                    break;
                case 'l': // Combat Log toggle
                    e.preventDefault();
                    setIsLogExpanded(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        isActive, targetingMode, clearTargeting, showDiceRoller, showEndConfirm,
        showEndSummary, showMultiTarget, showAddCombatant, isReadyActionFormOpen,
        statBlockTarget, wizardAction, pastStates, undo, nextTurn
    ]);

    const selectedCombatant = combatants.find((c: Combatant) => c.id === selectedCombatantId) || activeCombatant || null;

    // --- Target Selection Sync ---
    useEffect(() => {
        if (targetingMode) {
            setDrawingMode('select');
        }
    }, [targetingMode, setDrawingMode]);

    if (!activeEncounter || combatants.length === 0) return null;
    const handleReadyActionConfirm = () => {
        const descEl = document.getElementById('ready-desc-board') as HTMLInputElement;
        const triggerEl = document.getElementById('ready-trigger-board') as HTMLInputElement;
        if (!descEl || !triggerEl || !descEl.value || !triggerEl.value || !activeCombatant) return;

        if (activeEncounter?.turnState.hasAction) useCombatStore.getState().consumeAction();
        useCombatStore.getState().setReadiedAction(activeCombatant.id, { description: descEl.value, trigger: triggerEl.value });
        setIsReadyActionFormOpen(false);
    };

    const handleEndTurnShortcut = () => {
        if (!isActive || !activeCombatant) return;

        // Safety: If it's a player's turn, or they haven't used actions, confirm before ending
        // hasAction: true means AVAILABLE. So !hasAction means USED.
        const hasUsedMainAction = !activeEncounter.turnState.hasAction;
        const hasUsedBonusAction = !activeEncounter.turnState.hasBonusAction;
        const needsConfirmation = activeCombatant.type === 'player' || (!hasUsedMainAction && !hasUsedBonusAction);

        if (needsConfirmation) {
            setShowEndTurnConfirm(true);
        } else {
            nextTurn();
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-combat">

            {/* ═══ LAYER 0: MAP FOUNDATION ═══ */}
            <div className="absolute inset-0">
                {battleMap ? (
                    <BattleMap
                        mapState={battleMap}
                        tokens={battleMap.tokens}
                        combatants={activeEncounter.combatants}
                        activeCombatantId={activeCombatantId}
                        selectedTokenId={battleMap.tokens.find((t: MapToken) => t.combatantId === selectedCombatantId)?.id}
                        drawingMode={drawingMode}
                        onDrawingModeChange={setDrawingMode}
                        onEndTurn={handleEndTurnShortcut}
                        onResizeGrid={resizeGrid}
                        onTokenClick={(id) => {
                            const token = battleMap.tokens.find((t: MapToken) => t.id === id);
                            if (token) {
                                setSelectedCombatant(token.combatantId);
                                const combatant = activeEncounter.combatants.find(c => c.id === token.combatantId);
                                if (combatant && activeCombatantId === combatant.id) {
                                    showMovementRange(token.position, parseSpeed(combatant.speed), battleMap.tokens, token.id);
                                }
                            }
                        }}
                        onTokenMove={(id, pos) => {
                            updateToken(id, { position: pos });
                            clearMovementRange();
                        }}
                        onTokenUpdate={(id, updates) => updateToken(id, updates)}
                        onShapeAdd={(shape) => updateBattleMap({
                            shapes: [...(battleMap.shapes || []), shape]
                        })}
                        onFreehandPathAdd={(path) => updateBattleMap({
                            freehandPaths: [...(battleMap.freehandPaths || []), path]
                        })}
                        onFogOfWarAdd={(shape) => updateBattleMap({
                            fogOfWar: [...(battleMap.fogOfWar || []), shape]
                        })}
                        onFogOfWarFreehandAdd={(path) => updateBattleMap({
                            fogOfWarFreehand: [...(battleMap.fogOfWarFreehand || []), path]
                        })}
                        onVisionZoneAdd={(zone) => updateBattleMap({
                            visionZones: [...(battleMap.visionZones || []), zone]
                        })}
                        activeVisionLightLevel={activeLightLevel}
                        activeVisionWeather={activeWeather}
                        movementRemaining={activeEncounter.turnState.movementRemaining}
                        activeCombatantConditions={activeCombatant?.conditions.map(c => c.name)}
                        movementMax={parseSpeed(activeCombatant?.speed)}
                        movementOverlay={movementOverlay}
                        targeting={targetingMode}
                        onTargetSelect={(targetIds) => {
                            if (targetIds) handleTargetSelect(targetIds);
                        }}
                        onTokenRemove={(id) => {
                            updateToken(id, { position: { col: -1, row: -1 } });
                        }}
                        onMarkDead={(combatantId) => {
                            const combatant = activeEncounter?.combatants.find(c => c.id === combatantId);
                            if (combatant) {
                                updateCombatant(combatantId, {
                                    currentHp: 0,
                                    isDead: true,
                                    conditions: [
                                        ...(combatant.conditions || []),
                                        {
                                            id: crypto.randomUUID(),
                                            name: 'Dead',
                                            description: 'Zero hit points.',
                                            icon: 'Skull'
                                        }
                                    ]
                                });
                            }
                        }}
                        onRevive={(combatantId) => {
                            const combatant = activeEncounter?.combatants.find(c => c.id === combatantId);
                            if (combatant && (combatant.isDead || combatant.currentHp === 0)) {
                                updateCombatant(combatantId, {
                                    currentHp: 1,
                                    isDead: false,
                                    conditions: (combatant.conditions || []).filter(c => c.name !== 'Dead')
                                });
                            }
                        }}
                        onViewStatBlock={(combatantId) => {
                            const combatant = activeEncounter?.combatants.find(c => c.id === combatantId);
                            if (combatant) {
                                setStatBlockTarget(combatant);
                            }
                        }}
                        onApplyCondition={(combatantId, conditionName) => {
                            const combatant = activeEncounter?.combatants.find(c => c.id === combatantId);
                            if (combatant) {
                                const condId = conditionName.toLowerCase();
                                const hasCondition = combatant.conditions?.some(c => c.id === condId);
                                let updatedConditions = combatant.conditions || [];

                                if (hasCondition) {
                                    updatedConditions = updatedConditions.filter(c => c.id !== condId);
                                } else {
                                    // Pull rich data if available
                                    const richData = conditions.find(c => c.name.toLowerCase() === conditionName.toLowerCase());

                                    updatedConditions = [
                                        ...updatedConditions,
                                        {
                                            id: condId,
                                            name: richData?.name || (conditionName.charAt(0).toUpperCase() + conditionName.slice(1)),
                                            icon: richData?.icon,
                                            description: richData?.description || `Applied via Map UI`
                                        }
                                    ];
                                }
                                updateCombatant(combatantId, { conditions: updatedConditions });
                            }
                        }}
                        onActionClick={(combatantId, action) => {
                            const actor = activeEncounter.combatants.find(c => c.id === combatantId);
                            if (actor) handleActionSelect(action, actor);
                        }}
                        onConditionHover={(name, e) => setHoveredCondition({ name, x: e.clientX, y: e.clientY })}
                        onConditionLeave={() => setHoveredCondition(null)}
                        hoveredAction={hoveredAction}
                        contextMenu={contextMenu}
                        onContextMenuOpen={openContextMenu}
                        onContextMenuClose={closeContextMenu}
                        className="w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center bg-stone-900/50">
                        <MapIcon size={64} className="text-stone-700 mb-4 opacity-30" />
                        <h3 className="text-2xl font-cinzel font-bold text-stone-500">Theater of the Mind</h3>
                        <p className="text-stone-600 max-w-sm mt-2 font-cinzel italic">"The mind's eye sees what the grid cannot hold."</p>
                    </div>
                )}
            </div>

            {/* ═══ LAYER 10: HEADER BAR ═══ */}
            <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ zIndex: 10 }}>
                <div className="pointer-events-auto bg-gradient-to-b from-stone-950/95 via-stone-950/80 to-transparent px-4 pt-3 pb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-cinzel font-bold text-gold leading-tight">{activeEncounter.title}</h2>
                            {!isActive ? (
                                <p className="text-xs text-stone-400">Roll initiative to begin.</p>
                            ) : (
                                <p className="text-xs text-stone-400">Round {activeEncounter.round} — {activeCombatant?.name}'s Turn</p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {!isActive ? (
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={rollAllInitiative}
                                        className="bg-stone-800/90 hover:bg-stone-700 text-stone-300 font-bold px-3 py-1.5 rounded text-xs transition-colors"
                                    >
                                        Roll Initiatives
                                    </button>
                                    <button
                                        onClick={beginCombat}
                                        disabled={combatants.some(c => c.initiativeScore === null)}
                                        className="bg-green-600/90 hover:bg-green-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold px-4 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
                                    >
                                        <Play size={13} fill="currentColor" /> Start
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Combat Tools Group */}
                                    <div className="flex items-center bg-stone-900/40 border border-stone-800 rounded px-1 gap-1">
                                        <button
                                            onClick={toggleManualRolls}
                                            className={`p-1.5 rounded transition-colors ${manualRollsEnabled ? 'text-gold bg-gold/5' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'}`}
                                            title={manualRollsEnabled ? 'Manual Rolls On' : 'Auto-Roll (Click to toggle)'}
                                        >
                                            <span className="text-[10px]">✍️</span>
                                        </button>
                                        <div className="w-px h-3 bg-stone-800" />
                                        <button
                                            onClick={() => setShowDiceRoller(!showDiceRoller)}
                                            className={`p-1.5 rounded transition-colors ${showDiceRoller ? 'text-gold bg-gold/5' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'} relative group`}
                                            title="Dice Roller (D)"
                                        >
                                            <span className="text-[10px]">🎲</span>
                                            <span className="absolute -bottom-1 -right-1 text-[8px] font-mono text-stone-500 font-bold bg-stone-900 px-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">D</span>
                                        </button>
                                    </div>

                                    {/* Management Group */}
                                    <div className="flex items-center gap-1 mx-2 pl-2 border-l border-stone-800">
                                        <button
                                            onClick={() => setShowAddCombatant(true)}
                                            className="h-9 px-4 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-gold hover:border-gold/50 transition-all flex items-center gap-2 group shadow-lg"
                                            title="Add a new character or monster to the encounter"
                                        >
                                            <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Add</span>
                                        </button>

                                        <button
                                            onClick={() => setIsReadyActionFormOpen(true)}
                                            disabled={!activeEncounter.turnState.hasAction}
                                            className="h-9 px-4 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-arcane hover:border-arcane/50 transition-all flex items-center gap-2 group shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Ready an Action (consumes Action for the current turn)"
                                        >
                                            <Zap size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Ready</span>
                                        </button>

                                        <button
                                            onClick={() => setShowEndConfirm(true)}
                                            className="h-9 px-4 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-blood hover:border-blood/50 transition-all flex items-center gap-2 group shadow-lg"
                                            title="Finish the battle and save results"
                                        >
                                            <X size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">End Combat</span>
                                        </button>
                                    </div>

                                    {/* Primary Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={undo}
                                            disabled={pastStates.length === 0}
                                            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-black/20"
                                            title="Undo Last Action (U)"
                                        >
                                            <Undo2 size={13} /> Undo
                                        </button>

                                        <button
                                            onClick={handleEndTurnShortcut}
                                            className="bg-gold hover:bg-gold-light text-stone-950 font-bold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-lg shadow-gold/10 transition-all hover:scale-105 relative group"
                                            title="Next Turn (N)"
                                        >
                                            Next <SkipForward size={13} fill="currentColor" />
                                            <span className="absolute -top-1 -right-1 text-[8px] font-mono bg-stone-950 text-gold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 -translate-y-1/2 border border-gold/30">N</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Initiative Ribbon */}
                    <div className="mt-2">
                        {isActive ? (
                            <PortraitRibbon
                                onConditionHover={(name, e) => setHoveredCondition({ name, x: e.clientX, y: e.clientY })}
                                onConditionLeave={() => setHoveredCondition(null)}
                            />
                        ) : (
                            <InitiativeTracker
                                onConditionHover={(name, e) => setHoveredCondition({ name, x: e.clientX, y: e.clientY })}
                                onConditionLeave={() => setHoveredCondition(null)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ LAYER 20: FLOATING HUDs (Alt+Draggable) ═══ */}

            {/* Turn Economy HUD (Bottom-Left) */}
            {isActive && (
                <DraggablePanel className="absolute bottom-14 left-4 glass-panel" zIndex={40} label="Economy">
                    <TurnEconomyHUD
                        hasAction={activeEncounter.turnState.hasAction}
                        hasBonusAction={activeEncounter.turnState.hasBonusAction}
                        hasReaction={activeEncounter.turnState.hasReaction}
                        extraActions={activeEncounter.turnState.extraActions}
                        hasHasteAction={activeEncounter.turnState.hasHasteAction}
                        movementRemaining={activeEncounter.turnState.movementRemaining}
                        movementTotal={parseSpeed(activeCombatant?.speed)}
                    />
                </DraggablePanel>
            )}

            {/* Quick HP Overlay (Bottom-Right) */}
            {selectedCombatant && (
                <DraggablePanel className="absolute bottom-14 right-[360px] glass-panel" zIndex={40} label="HP">
                    <QuickHPOverlay
                        target={selectedCombatant}
                        activeCombatantId={activeCombatantId || ''}
                        damageCombatant={damageCombatant}
                        healCombatant={healCombatant}
                        setShowMultiTarget={setShowMultiTarget}
                        clearTarget={() => setSelectedCombatant(null)}
                    />
                </DraggablePanel>
            )}

            {/* ═══ LAYER 30: DOCKED PANELS ═══ */}

            {/* Collapsible Sidebar (Right) */}
            {activeCombatant && isActive && !activeCombatant.isLair && (
                <CombatSidebar
                    combatant={activeCombatant}
                    selectedCombatant={selectedCombatant}
                    onActionClick={handleActionSelect}
                    onActionHover={setHoveredAction}
                    setSelectedCombatant={setSelectedCombatant}
                    setConcentration={setConcentration}
                    onConditionHover={(name, e) => setHoveredCondition({ name, x: e.clientX, y: e.clientY })}
                    onConditionLeave={() => setHoveredCondition(null)}
                />
            )}

            {/* Combat Log (Drawer) */}
            <CombatLog
                variant="drawer"
                isExpanded={isLogExpanded}
                onToggle={setIsLogExpanded}
            />

            {/* ═══ LAYER 40: OVERLAYS ═══ */}

            {/* Targeting Indicator */}
            {targetingMode && (
                <div className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-auto" style={{ zIndex: 40 }}>
                    <div className="bg-gold text-stone-950 px-5 py-1.5 rounded-full font-bold shadow-2xl flex items-center gap-2 text-sm animate-bounce border-2 border-stone-950">
                        <Swords size={15} />
                        Targeting: {targetingMode.action.name}
                        <button
                            onClick={clearTargeting}
                            className="ml-2 bg-stone-950/20 hover:bg-stone-950/40 rounded-full p-0.5 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Dice Roller */}
            {showDiceRoller && (
                <DraggablePanel className="absolute top-24 right-[360px] w-72 glass-panel" zIndex={40} label="Dice">
                    <DiceRoller />
                </DraggablePanel>
            )}

            {/* Lair Action Overlay */}
            {activeCombatant && isActive && activeCombatant.isLair && (
                <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-12 text-center pointer-events-auto" style={{ zIndex: 45 }}>
                    <div className="bg-stone-900 border-2 border-gold/30 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.1)] p-12 max-w-xl">
                        <div className="w-24 h-24 bg-stone-950 border border-gold/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[inset_0_0_15px_rgba(255,215,0,0.2)]">
                            <Swords size={48} className="text-gold" />
                        </div>
                        <h2 className="text-5xl font-cinzel font-bold text-gold mb-4 tracking-tighter uppercase">Lair Action</h2>
                        <p className="text-lg text-stone-300 font-cinzel mb-10 leading-relaxed italic opacity-80">The very environment rebels against our heroes...</p>
                        <button
                            onClick={nextTurn}
                            className="bg-gold hover:bg-yellow-400 text-stone-950 font-bold px-10 py-4 rounded-xl text-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.3)] flex items-center justify-center gap-3 mx-auto"
                        >
                            Resolve Lair Action <SkipForward size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Ready Action Setup Modal */}
            {isReadyActionFormOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-arcane/20 p-6 border-b border-arcane/30 flex items-center gap-4 relative">
                            <div className="w-12 h-12 rounded-xl bg-arcane/20 flex items-center justify-center text-arcane shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="text-arcane font-black text-lg tracking-widest uppercase">Ready Action</h3>
                                <p className="text-stone-400 text-xs font-medium">Prepare an action for a specific trigger.</p>
                            </div>
                            <button
                                onClick={() => setIsReadyActionFormOpen(false)}
                                className="absolute right-6 top-6 text-stone-500 hover:text-parchment transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                        <Swords size={12} className="text-arcane" />
                                        Action Description
                                    </label>
                                    <input
                                        id="ready-desc-board"
                                        autoFocus
                                        type="text"
                                        placeholder="e.g. Shoot my bow at the first enemy..."
                                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-parchment focus:border-arcane focus:ring-1 focus:ring-arcane outline-none transition-all placeholder:text-stone-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                        <Play size={12} className="text-arcane" />
                                        Trigger Condition
                                    </label>
                                    <input
                                        id="ready-trigger-board"
                                        type="text"
                                        placeholder="e.g. Enemy walks through the door"
                                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-parchment focus:border-arcane focus:ring-1 focus:ring-arcane outline-none transition-all placeholder:text-stone-600"
                                    />
                                </div>
                            </div>

                            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 flex items-start gap-3">
                                <ShieldAlert size={18} className="text-gold flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-stone-500 leading-relaxed italic">
                                    Readied actions <span className="text-arcane font-bold">consume your Action</span> for the current turn. You must use your <span className="text-gold font-bold">Reaction</span> to trigger it when the condition is met.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-stone-900/30 border-t border-stone-800 flex justify-end gap-3">
                            <button
                                onClick={() => setIsReadyActionFormOpen(false)}
                                className="px-6 py-2.5 bg-stone-900 text-stone-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-stone-800 border border-stone-800 transition-all hover:text-parchment"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReadyActionConfirm}
                                className="px-6 py-2.5 bg-arcane/20 text-arcane rounded-xl text-xs font-black uppercase tracking-widest border border-arcane/50 hover:bg-arcane/40 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                            >
                                Confirm & Ready
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Encounter confirmation */}
            {showEndConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-cinzel font-bold text-blood mb-2">End Encounter?</h3>
                        <p className="text-stone-400 mb-6">Are you sure you want to end this combat? It will be archived to history and cannot be resumed.</p>
                        <div className="flex justify-end gap-3 flex-wrap">
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded transition-colors font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndConfirm(false);
                                    setShowEndSummary(true);
                                }}
                                className="px-4 py-2 bg-blood text-white rounded hover:bg-red-600 transition-colors font-bold"
                            >
                                End Combat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Target Modal */}
            {showMultiTarget && (
                <MultiTargetModal onClose={() => setShowMultiTarget(false)} />
            )}
            {/* Add Combatant Modal */}
            {showAddCombatant && (
                <AddCombatantModal onClose={() => setShowAddCombatant(false)} />
            )}

            {/* Global Condition Tooltip */}
            {hoveredCondition && (
                <ConditionTooltip
                    conditionName={hoveredCondition.name}
                    x={hoveredCondition.x}
                    y={hoveredCondition.y}
                />
            )}

            {/* Centralized Action Wizard */}
            {wizardAction && (
                <ActionWizard
                    isOpen={true}
                    onClose={() => setWizardAction(null)}
                    action={wizardAction.action}
                    actor={wizardAction.actor}
                    allCombatants={combatants}
                    initialTargets={wizardAction.initialTargets}
                    onConfirm={(results: ActionWizardResult) => {
                        const { action, actor } = wizardAction;

                        // 0. Handle Special Actions
                        if (action.actionType === 'saving-throw') {
                            const rollResult = results.rollResult;
                            const ability = action.saveAbility?.toUpperCase() || '';
                            const dc = action.saveDc || 0;
                            if (rollResult === null) {
                                addLog({
                                    message: `${actor.name} rolls ${ability} Save: no roll recorded`,
                                    type: 'roll',
                                    combatantId: actor.id
                                });
                                setWizardAction(null);
                                return;
                            }
                            const isFail = dc > 0 ? (rollResult < dc) : false;

                            addLog({
                                message: `${actor.name} rolls ${ability} Save: ${rollResult}${dc > 0 ? ` vs DC ${dc} (${isFail ? 'FAIL' : 'SUCCESS'})` : ''}`,
                                type: 'roll',
                                combatantId: actor.id
                            });

                            setWizardAction(null);
                            return;
                        }

                        if (action.actionType === 'death-save' || action.id === 'death-save') {
                            const rollResult = results.rollResult || 10;
                            let newSuccesses = actor.deathSaves?.successes || 0;
                            let newFailures = actor.deathSaves?.failures || 0;
                            let wakesUp = false;

                            if (rollResult >= 20) {
                                wakesUp = true;
                            } else if (rollResult <= 1) {
                                newFailures += 2;
                            } else if (rollResult >= 10) {
                                newSuccesses += 1;
                            } else {
                                newFailures += 1;
                            }

                            const msg = `Death Save: ${rollResult}${rollResult >= 20 ? ' (Nat 20! 1 HP restored)' : rollResult <= 1 ? ' (Nat 1! 2 Failures)' : ''} — S:${newSuccesses} F:${newFailures}`;

                            addLog({
                                message: `${actor.name} rolls ${msg}`,
                                type: 'roll',
                                combatantId: actor.id
                            });

                            if (wakesUp) {
                                healCombatant(actor.id, 1);
                            } else {
                                updateCombatant(actor.id, { deathSaves: { successes: newSuccesses, failures: newFailures } });
                                if (newFailures >= 3) {
                                    updateCombatant(actor.id, {
                                        isDead: true,
                                        deathSaves: { successes: newSuccesses, failures: newFailures },
                                        conditions: [
                                            ...(actor.conditions || []),
                                            { id: crypto.randomUUID(), name: 'Dead', description: '3 failed death saves.', icon: 'Skull' }
                                        ]
                                    });
                                    addLog({ message: `💀 ${actor.name} has died! (3 failed death saves)`, type: 'system', combatantId: actor.id });
                                } else if (newSuccesses >= 3) {
                                    updateCombatant(actor.id, {
                                        deathSaves: { successes: newSuccesses, failures: newFailures },
                                        conditions: [
                                            ...(actor.conditions || []),
                                            { id: crypto.randomUUID(), name: 'Stable', description: 'Stabilized at 0 HP. Unconscious but not dying.', icon: 'Heart' }
                                        ]
                                    });
                                    addLog({ message: `${actor.name} has stabilized. (3 successful death saves)`, type: 'system', combatantId: actor.id });
                                }
                            }
                            setWizardAction(null);
                            return;
                        }

                        // Apply Effects Logic
                        addLog({
                            message: `${actor.name} uses ${action.name}${results.rollResult !== null ? ` — Result: ${results.rollResult}${results.isCrit ? ' (CRIT!)' : results.isFumble ? ' (FUMBLE!)' : ''}` : ''}`,
                            type: results.rollResult !== null ? 'roll' : 'action',
                            combatantId: actor.id
                        });

                        // 1. Consume Action Economy
                        const castLevel = results.castLevel || action.spellLevel || 0;
                        const isLeveledSpell = castLevel > 0;
                        const isHasteAction = !!action.isHasteAction;

                        if (action.economy === 'action') {
                            useCombatStore.getState().consumeAction({ isLeveledSpell, isHasteAction });
                        } else if (action.economy === 'bonus') {
                            useCombatStore.getState().consumeBonusAction({ isLeveledSpell });
                        } else if (action.economy === 'reaction') {
                            useCombatStore.getState().consumeReaction();
                        }

                        // 2. Spell Slots
                        if (isLeveledSpell) {
                            useCombatStore.getState().useSpellSlot(actor.id, castLevel);
                        }

                        // 3. Concentration
                        if (results.applyConcentration || action.requiresConcentration) {
                            const shouldConcentrate = results.applyConcentration !== undefined ? results.applyConcentration : action.requiresConcentration;
                            if (shouldConcentrate) {
                                setConcentration(actor.id, { spellId: action.id, name: action.name });
                            }
                        }

                        // 4. Group Resolution (Damage/Conditions)
                        if (results.selectedTargets.length > 0) {
                            // Deduplicate targets if necessary
                            const uniqueTargets = results.selectedTargets.filter((t, index, self) =>
                                self.findIndex(x => x.id === t.id) === index
                            );

                            uniqueTargets.forEach((target) => {
                                // A. Multi-instance (Magic Missile, etc)
                                const isMultiInstance = action.name.toLowerCase().includes('magic missile') ||
                                    action.name.toLowerCase().includes('scorching ray');

                                if (isMultiInstance && results.multiTargetResults) {
                                    const instances = results.multiTargetResults.filter((r) => r.targetId === target.id);
                                    const totalInstanceDmg = instances.reduce((sum: number, r) => sum + (r.damage || 0), 0);

                                    if (totalInstanceDmg > 0 || instances.length > 0) {
                                        damageCombatant(target.id, totalInstanceDmg, action.damageType);
                                        addLog({
                                            message: `  → ${target.name} takes ${totalInstanceDmg} ${action.damageType || ''} damage from ${instances.length} items`,
                                            type: 'damage',
                                            combatantId: target.id
                                        });
                                    }
                                } else if (results.damageResult !== null) {
                                    // A. Standard Damage Application
                                    const baseDmg = results.damageResult;
                                    const count = results.selectedTargets.filter((st) => st.id === target.id).length;
                                    const saved = results.targetDetails?.[target.id]?.saved || false;

                                    let multiplier = 1.0;
                                    let modSuffix = "";

                                    if (saved) {
                                        multiplier *= 0.5;
                                        modSuffix += " (Saved)";
                                    }

                                    // Check resistances from target
                                    const tObj = combatants.find(c => c.id === target.id);
                                    if (tObj) {
                                        const type = (action.damageType || '').toLowerCase();
                                        if (tObj.immunities?.some(i => i.toLowerCase() === type)) {
                                            multiplier = 0;
                                            modSuffix += " (Immune)";
                                        } else if (tObj.resistances?.some(r => r.toLowerCase() === type)) {
                                            multiplier *= 0.5;
                                            modSuffix += " (Resistant)";
                                        } else if (tObj.vulnerabilities?.some(v => v.toLowerCase() === type)) {
                                            multiplier *= 2;
                                            modSuffix += " (Vulnerable)";
                                        }
                                    }

                                    const targetDmg = Math.floor(baseDmg * count * multiplier);

                                    if (targetDmg > 0 || multiplier === 0) {
                                        damageCombatant(target.id, targetDmg, action.damageType);
                                        addLog({
                                            message: `  → ${target.name}${count > 1 ? ` (x${count})` : ''} takes ${targetDmg} ${action.damageType || ''} damage${modSuffix}`,
                                            type: 'damage',
                                            combatantId: target.id
                                        });
                                    }
                                }

                                // B. Condition Application
                                const targetConditions = results.targetDetails?.[target.id]?.conditions || results.selectedConditions || [];
                                if (targetConditions.length > 0) {
                                    targetConditions.forEach((cond) => {
                                        const c = combatants.find(x => x.id === target.id);
                                        const existingConditions = c?.conditions || [];

                                        if (!existingConditions.some(ex => ex.id === cond.id)) {
                                            updateCombatant(target.id, {
                                                conditions: [...existingConditions, {
                                                    id: cond.id,
                                                    name: cond.name,
                                                    icon: cond.icon,
                                                    description: `Applied by ${actor.name} via ${action.name}`
                                                }]
                                            });
                                            addLog({
                                                message: `  → ${target.name} is now ${cond.name}`,
                                                type: 'system',
                                                combatantId: target.id
                                            });
                                        }
                                    });
                                }
                            });
                        }

                        // 5. Handle Item Consumption (Synchronize Inventory)
                        if (action.id.startsWith('item-') && actor.type === 'player' && actor.sourceId) {
                            useCharacterStore.getState().consumeItem(actor.sourceId, action.id.replace('item-', ''));
                        }

                        // 6. Handle Action Surge (Restore an action)
                        if (action.id === 'fighter-action-surge') {
                            useCombatStore.getState().restoreAction(actor.id);
                        }

                        setWizardAction(null);
                    }}
                />
            )}


            {/* Monster Stat Block Popup */}
            {statBlockTarget && (
                <MonsterStatBlock
                    combatant={statBlockTarget}
                    onClose={() => setStatBlockTarget(null)}
                />
            )}

            {/* Post-Combat Summary Modal */}
            {showEndSummary && (
                <CombatSummary
                    encounter={activeEncounter}
                    onClose={() => {
                        setShowEndSummary(false);
                        endEncounter();
                        if (activeEncounter.campaignId) {
                            navigate('/navigator');
                        } else {
                            navigate('/combat/setup');
                        }
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={showEndTurnConfirm}
                title="End Turn Early?"
                message={`${activeCombatant?.name} still has actions remaining. Are you sure you want to end their turn?`}
                confirmText="End Turn"
                onConfirm={() => {
                    nextTurn();
                    setShowEndTurnConfirm(false);
                }}
                onCancel={() => setShowEndTurnConfirm(false)}
            />
        </div>
    );
}
