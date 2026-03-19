const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'components', 'combat', 'CombatBoard.tsx');
let currStr = fs.readFileSync(targetPath, 'utf8');

const lines = currStr.split('\n');
const nullIdx = lines.findIndex(l => l.includes('if (!activeEncounter || combatants.length === 0) return null;'));
const endConfirmIdx = lines.findIndex(l => l.includes('onClick={() => setShowEndConfirm(true)}'));

if (nullIdx === -1 || endConfirmIdx === -1) {
    console.log("Could not find anchor points.");
    process.exit(1);
}

// We also need to back up exactly one line above endConfirmIdx to grab the preceding `<button`
let spliceEnd = endConfirmIdx - 1;

let preLines = lines.slice(0, nullIdx + 1);
let postLines = lines.slice(spliceEnd);

const replacement = `
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
                {activeEncounter.battleMap ? (
                    <BattleMap
                        mapState={activeEncounter.battleMap}
                        tokens={activeEncounter.battleMap.tokens}
                        combatants={activeEncounter.combatants}
                        activeCombatantId={activeCombatantId}
                        selectedTokenId={activeEncounter.battleMap.tokens.find(t => t.combatantId === selectedCombatantId)?.id}
                        drawingMode={drawingMode}
                        onDrawingModeChange={setDrawingMode}
                        onEndTurn={handleEndTurnShortcut}
                        onResizeGrid={resizeGrid}
                        onTokenClick={(id) => {
                            const token = activeEncounter.battleMap?.tokens.find(t => t.id === id);
                            if (token) {
                                setSelectedCombatant(token.combatantId);
                                const combatant = activeEncounter.combatants.find(c => c.id === token.combatantId);
                                if (combatant && activeCombatantId === combatant.id) {
                                    showMovementRange(token.position, parseSpeed(combatant.speed), activeEncounter.battleMap!.tokens, token.id);
                                }
                            }
                        }}
                        onTokenMove={(id, pos) => {
                            updateToken(id, { position: pos });
                            clearMovementRange();
                        }}
                        onTokenUpdate={(id, updates) => updateToken(id, updates)}
                        onShapeAdd={(shape) => updateBattleMap({
                            shapes: [...(activeEncounter.battleMap?.shapes || []), shape]
                        })}
                        onFreehandPathAdd={(path) => updateBattleMap({
                            freehandPaths: [...(activeEncounter.battleMap?.freehandPaths || []), path]
                        })}
                        onFogOfWarAdd={(shape) => updateBattleMap({
                            fogOfWar: [...(activeEncounter.battleMap?.fogOfWar || []), shape]
                        })}
                        onFogOfWarFreehandAdd={(path) => updateBattleMap({
                            fogOfWarFreehand: [...(activeEncounter.battleMap?.fogOfWarFreehand || []), path]
                        })}
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
                                            description: richData?.description || \`Applied via Map UI\`
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
                                            className={\`p-1.5 rounded transition-colors \${manualRollsEnabled ? 'text-gold bg-gold/5' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'}\`}
                                            title={manualRollsEnabled ? 'Manual Rolls On' : 'Auto-Roll (Click to toggle)'}
                                        >
                                            <span className="text-[10px]">✍️</span>
                                        </button>
                                        <div className="w-px h-3 bg-stone-800" />
                                        <button
                                            onClick={() => setShowDiceRoller(!showDiceRoller)}
                                            className={\`p-1.5 rounded transition-colors \${showDiceRoller ? 'text-gold bg-gold/5' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'} relative group\`}
                                            title="Dice Roller (D)"
                                        >
                                            <span className="text-[10px]">🎲</span>
                                            <span className="absolute -bottom-1 -right-1 text-[8px] font-mono text-stone-500 font-bold bg-stone-900 px-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">D</span>
                                        </button>
                                    </div>

                                    {/* Management Group */}
                                    <div className="flex items-center gap-1 mx-2 pl-2 border-l border-stone-800">
                                        <button
                                            onClick={() => {
                                                if (activeEncounter.battleMap) pushMapToPlayers(activeEncounter.battleMap);
                                            }}
                                            disabled={!activeEncounter.battleMap}
                                            className="h-9 px-4 rounded-lg bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:text-white hover:bg-blue-800/60 transition-all flex items-center gap-2 group shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Push this battle map to all connected players"
                                        >
                                            <MonitorUp size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Push Map</span>
                                        </button>
                                        <button
                                            onClick={clearPlayerMap}
                                            className="h-9 px-4 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-red-400 transition-all flex items-center gap-2 group shadow-lg"
                                            title="Clear the map from player screens"
                                        >
                                            <MonitorOff size={16} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Clear Map</span>
                                        </button>

                                        <div className="h-6 w-px bg-stone-800 mx-1"></div>

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
`;

let rebuilt = preLines.join('\n') + replacement + postLines.join('\n');
fs.writeFileSync(targetPath, rebuilt);
console.log("Rebuilt files successfully.");
