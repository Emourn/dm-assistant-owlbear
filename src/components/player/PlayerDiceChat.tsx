/**
 * Player Dice & Chat Panel
 * 
 * Shared dice rolling + chat log visible to all connected users.
 * Players can:
 *   - Roll any die (d4, d6, d8, d10, d12, d20, d100)
 *   - Type custom rolls (e.g., "2d6+3")
 *   - Send chat messages
 * 
 * DM whispers show only to the DM and the recipient.
 */

import { useState, useRef, useEffect } from 'react';
import { Dice1, Send, MessageCircle } from 'lucide-react';
import { useSessionStore } from '../../multiplayer/sessionStore';
import type { ChatMessage } from '../../multiplayer/types';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;

function rollDice(sides: number, count: number = 1): { total: number; rolls: number[] } {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return { total: rolls.reduce((a, b) => a + b, 0), rolls };
}

function parseCustomRoll(input: string): { total: number; description: string } | null {
    // Match patterns like "2d6+3", "1d20", "4d8-2", "d6"
    const match = input.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;

    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || '0', 10);

    if (count < 1 || count > 100 || sides < 1 || sides > 1000) return null;

    const { total, rolls } = rollDice(sides, count);
    const modifiedTotal = total + modifier;
    const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
    const rollsStr = rolls.length <= 10 ? ` [${rolls.join(', ')}]` : '';

    return {
        total: modifiedTotal,
        description: `${count}d${sides}${modStr}${rollsStr} = **${modifiedTotal}**`,
    };
}

function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PlayerDiceChat() {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'chat' | 'dice'>('dice');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { chatMessages, sendChatMessage, sendDiceRoll } = useSessionStore();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleQuickRoll = (sides: number) => {
        const { total, rolls } = rollDice(sides);
        const rollStr = rolls.length <= 10 ? ` [${rolls.join(', ')}]` : '';
        const description = `1d${sides}${rollStr} = **${total}**`;
        sendDiceRoll(`🎲 Rolled 1d${sides}`, description);
    };

    const handleSendMessage = () => {
        const text = message.trim();
        if (!text) return;

        // Check if it's a dice command
        const rollResult = parseCustomRoll(text);
        if (rollResult) {
            sendDiceRoll(`🎲 Rolled ${text}`, rollResult.description);
        } else {
            sendChatMessage(text);
        }

        setMessage('');
    };

    const renderMessage = (msg: ChatMessage) => {
        const isDM = msg.senderRole === 'dm';
        const isRoll = msg.isRoll;
        const isWhisper = msg.isWhisper;

        return (
            <div
                key={msg.id}
                className={`px-3 py-2 rounded-lg text-sm ${
                    isWhisper
                        ? 'bg-purple-900/30 border border-purple-700/30'
                        : isRoll
                        ? 'bg-amber-900/20 border border-amber-700/20'
                        : isDM
                        ? 'bg-stone-800/80'
                        : 'bg-stone-800/40'
                }`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-xs ${isDM ? 'text-amber-400' : 'text-blue-400'}`}>
                        {msg.senderName}
                    </span>
                    {isWhisper && (
                        <span className="text-purple-400 text-[10px] uppercase tracking-wider">whisper</span>
                    )}
                    <span className="text-stone-600 text-[10px] ml-auto">
                        {formatTimestamp(msg.timestamp)}
                    </span>
                </div>
                <div className="text-stone-300">
                    {isRoll && msg.rollResult ? (
                        <div>
                            <span className="text-stone-400">{msg.text}</span>
                            <div className="text-amber-300 font-mono mt-1"
                                 dangerouslySetInnerHTML={{ 
                                     __html: msg.rollResult.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-200 text-lg">$1</strong>') 
                                 }}
                            />
                        </div>
                    ) : (
                        msg.text
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-stone-900/50 border border-stone-700/50 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-stone-700/50">
                <button
                    onClick={() => setActiveTab('dice')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'dice'
                            ? 'text-amber-300 border-b-2 border-amber-400 bg-stone-800/50'
                            : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                    <Dice1 className="w-4 h-4" />
                    Dice
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'chat'
                            ? 'text-blue-300 border-b-2 border-blue-400 bg-stone-800/50'
                            : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                    {chatMessages.length > 0 && (
                        <span className="bg-blue-600/40 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                            {chatMessages.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Dice Quick Roll Buttons */}
            {activeTab === 'dice' && (
                <div className="p-3 border-b border-stone-700/30">
                    <div className="grid grid-cols-4 gap-2">
                        {DICE_TYPES.map((sides) => (
                            <button
                                key={sides}
                                onClick={() => handleQuickRoll(sides)}
                                className="bg-stone-800 hover:bg-stone-700 border border-stone-600/50
                                           text-stone-200 rounded-lg py-2.5 text-sm font-mono
                                           transition-all hover:scale-105 hover:border-amber-500/50
                                           active:scale-95"
                            >
                                d{sides}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                // Roll 2d20 (advantage)
                                const { rolls } = rollDice(20, 2);
                                const max = Math.max(...rolls);
                                sendDiceRoll(
                                    '🎲 Rolled 2d20 (Advantage)',
                                    `[${rolls.join(', ')}] → **${max}**`
                                );
                            }}
                            className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-600/30
                                       text-emerald-300 rounded-lg py-2.5 text-xs font-medium
                                       transition-all hover:scale-105 active:scale-95"
                        >
                            ADV
                        </button>
                    </div>
                </div>
            )}

            {/* Messages / Roll Log */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-stone-600 text-sm">
                        {activeTab === 'dice' ? 'Roll some dice! 🎲' : 'No messages yet...'}
                    </div>
                ) : (
                    <>
                        {chatMessages
                            .filter((msg) => activeTab === 'chat' || msg.isRoll)
                            .map(renderMessage)}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-stone-700/30">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={activeTab === 'dice' ? 'Type a roll (e.g., 2d6+3)...' : 'Type a message...'}
                        className="flex-1 bg-stone-800 border border-stone-600/50 rounded-lg px-3 py-2
                                   text-stone-200 text-sm placeholder-stone-500
                                   focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 
                                   text-white rounded-lg px-3 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                {activeTab === 'dice' && (
                    <p className="text-stone-600 text-[10px] mt-1.5">
                        Supports: 2d6+3, d20, 4d8-2, etc.
                    </p>
                )}
            </div>
        </div>
    );
}
