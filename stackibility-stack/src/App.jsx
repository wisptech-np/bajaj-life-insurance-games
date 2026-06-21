import React, { useState, useEffect, useCallback } from 'react';
import { incrementPlayCount } from './services/playCount';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Home, Baby, CreditCard, ShieldCheck, Wind, RefreshCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import Block from './components/Block';
import Dashboard from './components/Dashboard';

const INITIAL_LIFE_EVENTS = [
    { id: 1, name: 'Medical Emergency', impact: -20000, color: 'text-red-400' },
    { id: 2, name: 'Job Market Wind', impact: -50000, color: 'text-orange-400' },
    { id: 3, name: 'Repair Costs', impact: -15000, color: 'text-yellow-400' },
];

import bgImage from './assets/bg.png';
import badgeImage from './assets/badge.png';

export default function App() {
    const [blocks, setBlocks] = useState([]);
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [isWobbling, setIsWobbling] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showBadge, setShowBadge] = useState(false);
    const [hasInsurance, setHasInsurance] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);

    const calculateStability = useCallback(() => {
        const net = income - expenses;
        const ratio = expenses / (income || 1);

        if (net < 0 && !hasInsurance) {
            setIsCollapsed(true);
        } else if (ratio > 0.8 && !hasInsurance) {
            setIsWobbling(true);
        } else {
            setIsWobbling(false);
        }

        if (hasInsurance && net > 0) {
            setShowBadge(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#8b5cf6', '#10b981', '#fbbf24']
            });
        }
    }, [income, expenses, hasInsurance]);

    useEffect(() => {
        calculateStability();
    }, [blocks, calculateStability]);

    const addBlock = (type, value) => {
        incrementPlayCount();
        if (isCollapsed) return;

        const newBlock = {
            id: Date.now(),
            type,
            value,
            color: getBlockColor(type),
            icon: getBlockIcon(type)
        };

        setBlocks([newBlock, ...blocks]);
        if (type === 'income') setIncome(prev => prev + value);
        else if (type === 'insurance') setHasInsurance(true);
        else setExpenses(prev => prev + value);
    };

    const getBlockColor = (type) => {
        switch (type) {
            case 'income': return 'bg-emerald-500';
            case 'mortgage': return 'bg-rose-500';
            case 'childcare': return 'bg-amber-500';
            case 'debt': return 'bg-blue-500';
            case 'insurance': return 'bg-violet-600';
            default: return 'bg-slate-500';
        }
    };

    const getBlockIcon = (type) => {
        switch (type) {
            case 'income': return <Wallet size={20} />;
            case 'mortgage': return <Home size={20} />;
            case 'childcare': return <Baby size={20} />;
            case 'debt': return <CreditCard size={20} />;
            case 'insurance': return <ShieldCheck size={20} />;
            default: return null;
        }
    };

    const triggerWind = () => {
        incrementPlayCount();
        const event = INITIAL_LIFE_EVENTS[Math.floor(Math.random() * INITIAL_LIFE_EVENTS.length)];
        setCurrentEvent(event);
        setIsWobbling(true);

        setTimeout(() => {
            if (!hasInsurance) {
                setIsCollapsed(true);
            }
            setCurrentEvent(null);
        }, 2000);
    };

    const reset = () => {
        setBlocks([]);
        setIncome(0);
        setExpenses(0);
        setIsCollapsed(false);
        setIsWobbling(false);
        setHasInsurance(false);
        setShowBadge(false);
    };

    return (
        <div
            className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-10 font-sans selection:bg-violet-500/30 overflow-hidden"
            style={{
                backgroundImage: `radial-gradient(circle at center, transparent, #020617), url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <header className="mb-4 text-center z-10">
                <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 via-violet-400 to-amber-400 bg-clip-text text-transparent mb-2 drop-shadow-2xl">
                    THE STABILITY STACK
                </h1>
                <p className="text-slate-400 text-lg font-medium">Build your financial fortress. Don't let the wind blow it down.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl flex-grow">
                {/* Controls */}
                <div className="glass-morphism p-6 flex flex-col gap-4 border-emerald-500/20 shadow-xl shadow-emerald-950/20">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <RefreshCw className="text-emerald-400" /> Financial Actions
                    </h2>
                    <button onClick={() => addBlock('income', 100000)} className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group">
                        <span className="flex items-center gap-3"><Wallet className="group-hover:scale-110 transition-transform" /> Add Income</span>
                        <span className="font-mono">+₹100k</span>
                    </button>
                    <button onClick={() => addBlock('mortgage', 40000)} className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all group">
                        <span className="flex items-center gap-3"><Home className="group-hover:scale-110 transition-transform" /> Mortgage</span>
                        <span className="font-mono">-₹40k</span>
                    </button>
                    <button onClick={() => addBlock('childcare', 20000)} className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all group">
                        <span className="flex items-center gap-3"><Baby className="group-hover:scale-110 transition-transform" /> Childcare</span>
                        <span className="font-mono">-₹20k</span>
                    </button>
                    <button onClick={() => addBlock('debt', 15000)} className="flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group">
                        <span className="flex items-center gap-3"><CreditCard className="group-hover:scale-110 transition-transform" /> Other Debt</span>
                        <span className="font-mono">-₹15k</span>
                    </button>
                    <hr className="border-slate-800 my-2" />
                    <button
                        disabled={hasInsurance || isCollapsed}
                        onClick={() => addBlock('insurance', 0)}
                        className={`flex items-center justify-center gap-3 p-5 rounded-xl transition-all shadow-lg ${hasInsurance
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40 hover:-translate-y-1'
                            }`}
                    >
                        <ShieldCheck /> Add Term Insurance Base
                    </button>
                    <button onClick={triggerWind} className="mt-4 flex items-center justify-center gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all text-slate-400">
                        <Wind size={18} /> Simulate Life Event
                    </button>
                </div>

                {/* Viewport/Stack */}
                <div className="lg:col-span-2 relative min-h-[600px] glass-morphism overflow-hidden bg-slate-900/50 flex flex-col items-center justify-end p-8 border-violet-500/10">
                    <AnimatePresence>
                        {currentEvent && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-8 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-full bg-slate-800/90 border border-red-500/30 flex items-center gap-3 shadow-2xl"
                            >
                                <Wind className="animate-pulse text-red-500" />
                                <span className="font-bold text-red-400 uppercase tracking-widest">{currentEvent.name}!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`relative flex flex-col items-center gap-1 transition-all duration-500 ${isWobbling ? 'animate-wobble' : ''}`}>
                        {blocks.map((block, idx) => (
                            <Block key={block.id} {...block} isCollapsed={isCollapsed} index={idx} />
                        ))}

                        {/* Base/Foundation */}
                        <div className={`h-4 w-64 bg-slate-800 rounded-full mt-4 shadow-inner ${isCollapsed ? 'opacity-0' : 'opacity-100'}`} />
                    </div>

                    {isCollapsed && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8"
                        >
                            <div className="text-red-500 mb-4 p-4 rounded-full bg-red-500/10 border border-red-500/20">
                                <Wind size={64} />
                            </div>
                            <h2 className="text-4xl font-black text-red-500 mb-2">TOWER COLLAPSED</h2>
                            <p className="text-slate-400 text-center max-w-md mb-8">
                                Your financial obligations outweighed your income during a crisis. Without a stable foundation, the tower couldn't hold.
                            </p>
                            <button
                                onClick={reset}
                                className="px-8 py-3 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={20} /> Try Again
                            </button>
                        </motion.div>
                    )}

                    {showBadge && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute top-8 right-8 z-20 p-6 glass-morphism border-emerald-500/30 shadow-2xl shadow-emerald-950/40"
                        >
                            <div className="flex flex-col items-center">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/40 transition-all rounded-full" />
                                    <img src={badgeImage} alt="Financially Fortified" className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl animate-bounce-slow" />
                                </div>
                                <h3 className="text-emerald-400 font-black text-xl mb-1 tracking-tight mt-4">FINANCIALLY FORTIFIED</h3>
                                <p className="text-slate-400 text-xs text-center">Your stack is optimized and secured.</p>

                                <div className="mt-6 w-full p-4 rounded-xl bg-violet-600/20 border border-violet-500/30 flex flex-col gap-2">
                                    <p className="text-xs text-slate-300">Your family requires <span className="font-bold text-violet-400">₹7,50,000</span> in total support.</p>
                                    <button className="mt-2 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg transition-all shadow-lg shadow-violet-900/20">
                                        Secure this block (₹28/mo)
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <Dashboard income={income} expenses={expenses} hasInsurance={hasInsurance} />
        </div>
    );
}
