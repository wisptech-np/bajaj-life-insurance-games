import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';

export default function Dashboard({ income, expenses, hasInsurance }) {
    const net = income - expenses;
    const healthPercentage = Math.min(Math.max((net / (income || 1)) * 100, 0), 100);

    return (
        <div className="w-full max-w-6xl mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Net Income */}
            <div className="glass-morphism p-4 flex flex-col items-start border-emerald-500/10">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Monthly Surplus</span>
                <div className="flex items-center gap-2">
                    <TrendingUp className={net >= 0 ? "text-emerald-400" : "text-rose-400"} size={24} />
                    <span className={`text-2xl font-black ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹{(net / 1000).toLocaleString()}k
                    </span>
                </div>
            </div>

            {/* Stability Health */}
            <div className="glass-morphism p-4 md:col-span-2 border-violet-500/10 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Foundation Strength</span>
                    <span className="text-xs font-mono text-slate-400">{healthPercentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${healthPercentage}%` }}
                        className={`h-full ${healthPercentage > 50 ? 'bg-emerald-500' : healthPercentage > 20 ? 'bg-amber-500' : 'bg-rose-500'} shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
                    />
                </div>
            </div>

            {/* Coverage Status */}
            <div className={`glass-morphism p-4 flex flex-col items-start border-violet-500/20 ${hasInsurance ? 'bg-violet-600/10' : ''}`}>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Defense System</span>
                <div className="flex items-center gap-2">
                    <ShieldCheck className={hasInsurance ? "text-violet-400" : "text-slate-600"} size={24} />
                    <span className={`text-sm font-bold ${hasInsurance ? "text-violet-400" : "text-slate-600"}`}>
                        {hasInsurance ? 'Active Protection' : 'Unprotected'}
                    </span>
                </div>
            </div>
        </div>
    );
}
