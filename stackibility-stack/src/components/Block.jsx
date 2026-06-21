import React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function Block({ type, value, color, icon, isCollapsed, index }) {
    const isIncome = type === 'income';
    const isInsurance = type === 'insurance';

    // Custom widths for different block types
    const getWidth = () => {
        if (isInsurance) return 'w-80';
        if (isIncome) return 'w-64';
        return 'w-48';
    };

    const getHeight = () => {
        if (isInsurance) return 'h-10';
        return 'h-14';
    };

    return (
        <motion.div
            initial={{ x: isIncome ? -100 : 100, opacity: 0, scale: 0.8 }}
            animate={{
                x: isCollapsed ? (Math.random() - 0.5) * 500 : 0,
                y: isCollapsed ? 800 : 0,
                opacity: 1,
                scale: 1,
                rotate: isCollapsed ? (Math.random() - 0.5) * 180 : 0
            }}
            transition={{
                type: 'spring',
                stiffness: 100,
                damping: 10,
                y: { duration: isCollapsed ? 1 : 0.4 }
            }}
            className={`
        ${getWidth()} ${getHeight()} 
        ${color} 
        rounded-xl flex items-center justify-center gap-3 
        text-white font-bold shadow-lg
        border-b-4 border-black/20
        relative overflow-hidden
        group cursor-grab active:cursor-grabbing
      `}
            style={{ zIndex: 100 - index }}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
            <span className="lg:scale-125 group-hover:scale-150 transition-transform">
                {icon}
            </span>
            <span className="uppercase tracking-tighter text-sm">
                {isInsurance ? 'Stabilizer Base' : type}
            </span>

            {!isInsurance && value > 0 && (
                <span className="absolute top-1 right-2 text-[10px] opacity-60 font-mono">
                    {isIncome ? '+' : '-'}₹{(value / 1000).toFixed(0)}k
                </span>
            )}
        </motion.div>
    );
}
