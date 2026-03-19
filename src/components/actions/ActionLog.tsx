import { ActionLogEntry } from '../../engine/actionEngine';
import { Undo2, Clock } from 'lucide-react';

interface ActionLogProps {
    logs: ActionLogEntry[];
    onUndo: (logId: string) => void;
}

export function ActionLog({ logs, onUndo }: ActionLogProps) {
    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-2 p-6 overflow-hidden border border-stone-800 rounded-lg bg-stone-900/30">
                <Clock size={24} className="opacity-50" />
                <p className="text-sm font-cinzel">No actions taken</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-stone-800 bg-stone-900/50">
                <h3 className="text-sm font-cinzel font-bold text-parchment">Action Log</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {[...logs].reverse().map((log, index) => {
                    const isLatest = index === 0; // Since we reversed it, 0 is the newest

                    return (
                        <div key={log.id} className="relative pl-4 pb-1">
                            {/* Timeline line */}
                            <div className="absolute left-0 top-2 bottom-[-1rem] w-px bg-stone-800" />
                            {/* Timeline dot */}
                            <div className={`absolute left-[-3px] top-2 w-[7px] h-[7px] rounded-full ${isLatest ? 'bg-gold shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'bg-stone-700'}`} />

                            <div className="bg-stone-800/50 border border-stone-700/50 rounded-md p-2 flex justify-between items-start">
                                <div>
                                    <div className="text-sm font-medium text-parchment">{log.actionName}</div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {log.costsDeducted.map((cost, i) => (
                                            <span key={i} className="text-[10px] bg-stone-900 text-stone-400 px-1 py-0.5 rounded border border-stone-800 font-mono">
                                                -{cost.amount} {cost.resource}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-stone-600 mt-1">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                </div>

                                {isLatest && (
                                    <button
                                        onClick={() => onUndo(log.id)}
                                        className="text-stone-500 hover:text-parchment p-1 rounded hover:bg-stone-700 transition-colors"
                                        title="Undo Action"
                                    >
                                        <Undo2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
