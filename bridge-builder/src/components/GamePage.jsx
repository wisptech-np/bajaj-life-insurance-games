import React, { useEffect, useRef, useState } from 'react';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';
import { BridgeSimulation, audioSynth } from '../game/BridgeSimulation';
import { Shield, Coins, AlertTriangle, Play, Volume2, VolumeX, Hammer, Heart, RefreshCw, Info } from 'lucide-react';

const GamePage = () => {
    const { 
        coins, setCoins, 
        shield, setShield, 
        level, setLevel,
        setStatus, setScore, setMetrics,
        showToast
    } = useGameStore();

    const canvasRef = useRef(null);
    const simRef = useRef(null);
    const requestRef = useRef();

    // Editor State
    const [isMuted, setIsMuted] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    
    // Cross phase HUD state
    const [hudProgress, setHudProgress] = useState(0);
    const [hudShield, setHudShield] = useState(100);
    const [activeDisasters, setActiveDisasters] = useState([]);

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState(null); // { id: 'wood'|'life'..., cost: 5, label: '...' }
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [hoveredSegIdx, setHoveredSegIdx] = useState(null);
    const [hoveredInventoryItem, setHoveredInventoryItem] = useState(null);

    // Hazard forecasts per level
    const forecasts = {
        1: "Sunny Valley: Gentle breeze. Basic planks and emergency ropes recommended.",
        2: "Rainy Valley: Heavy storm & medical emergency. Side support health cover is key.",
        3: "Flood Canyon: Rising rivers & heavy debris. Protect pillars with property cover.",
        4: "Stormy Summit: Lightning strikes & slips. Use steel, accident nets & joint bolts.",
        5: "Ultimate Trial: Earthquake, flood, lightning & illness. Full protection needed."
    };

    // Cost chart
    const costs = {
        wood: 5,
        steel: 12,
        none: 0,
        rope: 6,
        pillar: 15,
        joint: 8,
        life: 12,
        health: 8,
        critical: 8,
        accident: 6,
        emergency: 6,
        property: 8,
        decoration: 10
    };

    // Asset inventory card definitions
    const inventory = [
        { id: 'wood', type: 'structure', label: 'Basic Term (Wood)', shortLabel: 'Wood', cost: 5, detail: 'Basic protection cover. Low cost, but bends easily under heavy loads.', image: './assets/ui/asset_wood.png' },
        { id: 'steel', type: 'structure', label: 'Endowment (Steel)', shortLabel: 'Steel', cost: 12, detail: 'Long-term Savings Cover. High strength to support double weight and stresses.', image: './assets/ui/asset_steel.png' },
        { id: 'rope', type: 'structure', label: 'Liquid Cash (Ropes)', shortLabel: 'Ropes', cost: 6, detail: 'Emergency Fund Cover. Suspension ropes that absorb wind/economic swings.', image: './assets/ui/asset_rope.png' },
        { id: 'pillar', type: 'structure', label: 'Term Life (Pillar)', shortLabel: 'Pillar', cost: 15, detail: 'Concrete Pillar foundation (Term Life Insurance). Anchored securely to bedrock.', image: './assets/ui/asset_pillar.png' },
        { id: 'joint', type: 'structure', label: 'Critical Rider (Joints)', shortLabel: 'Joints', cost: 8, detail: 'Critical Illness Benefit. Reinforces crucial joints against heavy health shockwaves.', image: './assets/ui/asset_joint.png' },
        
        { id: 'life', type: 'insurance', label: 'Life Insurance', shortLabel: 'Life Cover', cost: 12, detail: 'Term Life Cover. Protects main columns, preventing them from washing away in floods.', image: './assets/ui/asset_life.png' },
        { id: 'health', type: 'insurance', label: 'Health Cover', shortLabel: 'Health', cost: 8, detail: 'Medical Health Plan. Attaches to deck/supports. Absorbs panic/illness costs.', image: './assets/ui/asset_health.png' },
        { id: 'critical', type: 'insurance', label: 'Critical Illness', shortLabel: 'Critical', cost: 8, detail: 'Critical Illness Protection. Absorbs intense disaster and earthquake shockwaves.', image: './assets/ui/asset_critical.png' },
        { id: 'accident', type: 'insurance', label: 'Personal Accident', shortLabel: 'Accident', cost: 6, detail: 'Accident Net. Grid below deck. Catches vehicle safely if planks break.', image: './assets/ui/asset_accident.png' },
        { id: 'emergency', type: 'insurance', label: 'Emergency Fund', shortLabel: 'Emerg. Fund', cost: 6, detail: 'Emergency Fund cover. Cushions suspension ropes from snapping in severe storms.', image: './assets/ui/asset_emergency.png' },
        { id: 'property', type: 'insurance', label: 'Home & Asset Cover', shortLabel: 'Property', cost: 8, detail: 'Property Insurance. Shields deck & pillars from floods and debris impacts.', image: './assets/ui/asset_property.png' },
        
        { id: 'decoration', type: 'luxury', label: 'Impulse Buy', shortLabel: 'Luxury', cost: 10, detail: 'Unnecessary spending (Fancy Flowers & Flags). Adds weight without any protection!', image: './assets/ui/asset_luxury.png' }
    ];

    // Bridge configuration state
    const [segments, setSegments] = useState(Array(6).fill(null).map(() => ({
        deck: 'wood',
        support: 'none',
        reinforcement: false,
        protection: {
            life: false,
            health: false,
            critical: false,
            accident: false,
            emergency: false,
            property: false
        },
        decoration: 'none'
    })));

    const calculateSegmentCost = (seg) => {
        let cost = 0;
        cost += costs[seg.deck];
        cost += costs[seg.support];
        if (seg.reinforcement) cost += costs.joint;
        
        if (seg.protection.life) cost += costs.life;
        if (seg.protection.health) cost += costs.health;
        if (seg.protection.critical) cost += costs.critical;
        if (seg.protection.accident) cost += costs.accident;
        if (seg.protection.emergency) cost += costs.emergency;
        if (seg.protection.property) cost += costs.property;

        if (seg.decoration !== 'none') cost += costs.decoration;
        return cost;
    };

    const calculateTotalCost = (segs) => {
        return segs.reduce((sum, seg) => sum + calculateSegmentCost(seg), 0);
    };

    // Reset bridge to starting settings
    const clearBridge = () => {
        setSegments(Array(6).fill(null).map(() => ({
            deck: 'wood',
            support: 'none',
            reinforcement: false,
            protection: {
                life: false,
                health: false,
                critical: false,
                accident: false,
                emergency: false,
                property: false
            },
            decoration: 'none'
        })));
        showToast("🧹 Bridge cleared!");
    };

    // Sync budget
    useEffect(() => {
        const totalCost = calculateTotalCost(segments);
        setCoins(100 - totalCost);
    }, [segments]);

    // Setup loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const sim = new BridgeSimulation(
            canvas,
            () => {
                setScore(sim.finalCalculatedScores.finalScore);
                setMetrics({
                    protectionScore: sim.finalCalculatedScores.protectionScore,
                    planningScore: sim.finalCalculatedScores.planningScore,
                    safetyScore: sim.finalCalculatedScores.safetyScore,
                    riskManagement: sim.finalCalculatedScores.riskManagement,
                    financialWisdom: sim.finalCalculatedScores.financialWisdom
                });
                setTimeout(() => { setStatus(GAME_STATUS.LEAD_CAPTURE); }, 2000);
            },
            () => {
                setTimeout(() => { setStatus(GAME_STATUS.GAMEOVER); }, 2000);
            },
            (hudData) => {
                setHudProgress(hudData.progress);
                setHudShield(hudData.shield);
                setShield(hudData.shield);
                setActiveDisasters(hudData.disasters);
            }
        );

        sim.level = level;
        sim.segments = segments;
        sim.setupBuildEnvironment();

        // Pass drag state to draw previews
        if (hoveredSegIdx !== null && draggedItem) {
            sim.hoveredSegment = hoveredSegIdx;
            sim.hoveredItemType = draggedItem.id;
        } else {
            sim.hoveredSegment = null;
            sim.hoveredItemType = null;
        }

        simRef.current = sim;

        let lastTime = performance.now();
        const loop = (time) => {
            const dt = Math.min(0.03, (time - lastTime) / 1000);
            lastTime = time;
            sim.update(dt);
            sim.draw();
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(requestRef.current);
    }, [level, segments, hoveredSegIdx, draggedItem]);

    const handleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        audioSynth.muted = nextMute;
    };

    const handleCrossing = () => {
        if (coins < 0) return;
        setIsSimulating(true);
        simRef.current.startCrossing();
    };

    // Coordinates translation for Drag & Drop
    const getSegmentIndexFromEvent = (clientX, clientY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        // Map page X, Y to canvas coordinate plane (800x480)
        const canvasX = ((clientX - rect.left) / rect.width) * 800;
        const canvasY = ((clientY - rect.top) / rect.height) * 480;

        // Cliffs are between x=140 and x=660. spanWidth = (660-140)/6 = 86.66
        const leftCliffX = 140;
        const rightCliffX = 660;
        const spanWidth = (rightCliffX - leftCliffX) / 6;

        if (canvasX >= leftCliffX && canvasX <= rightCliffX) {
            const idx = Math.floor((canvasX - leftCliffX) / spanWidth);
            if (idx >= 0 && idx < 6) return idx;
        }
        return null;
    };

    // Drag handlers
    const handleDragStart = (item, e) => {
        if (isSimulating) return;
        
        // Find touch coordinates if mobile
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDraggedItem(item);
        setDragPos({ x: clientX, y: clientY });
        audioSynth.init();
    };

    const handleDragMove = (e) => {
        if (!draggedItem) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDragPos({ x: clientX, y: clientY });

        // Calculate hovered segment
        const hoveredSeg = getSegmentIndexFromEvent(clientX, clientY);
        setHoveredSegIdx(hoveredSeg);
    };

    const handleDragEnd = (e) => {
        if (!draggedItem) return;

        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        
        const targetSeg = getSegmentIndexFromEvent(clientX, clientY);

        if (targetSeg !== null) {
            // ApplyDraggedItem
            const newSegs = [...segments];
            const seg = { ...newSegs[targetSeg] };
            const item = draggedItem.id;

            // Check if budget handles cost
            const currentCost = calculateTotalCost(newSegs);
            let itemCostDifference = draggedItem.cost;

            if (item === 'wood') {
                itemCostDifference -= costs[seg.deck];
                seg.deck = 'wood';
            } else if (item === 'steel') {
                itemCostDifference -= costs[seg.deck];
                seg.deck = 'steel';
            } else if (item === 'rope') {
                itemCostDifference -= costs[seg.support];
                seg.support = 'rope';
            } else if (item === 'pillar') {
                itemCostDifference -= costs[seg.support];
                seg.support = 'pillar';
            } else if (item === 'joint') {
                if (!seg.reinforcement) seg.reinforcement = true;
                else itemCostDifference = 0; // already reinforced
            } else if (item === 'decoration') {
                if (seg.decoration === 'none') seg.decoration = 'flowers';
                else itemCostDifference = 0; // already decorated
            } else {
                // protection categories
                if (!seg.protection[item]) {
                    seg.protection = { ...seg.protection, [item]: true };
                } else {
                    itemCostDifference = 0; // already covered
                }
            }

            if (currentCost + itemCostDifference <= 100) {
                newSegs[targetSeg] = seg;
                setSegments(newSegs);
                audioSynth.playCreak();
                showToast(`🔧 Applied ${draggedItem.label} to Span ${targetSeg + 1}!`);
            } else {
                showToast("⚠️ Not enough coins for this upgrade!");
            }
        }

        setDraggedItem(null);
        setHoveredSegIdx(null);
    };

    // Setup global touch event listeners so moving outside items continues smooth drag
    useEffect(() => {
        if (draggedItem) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [draggedItem]);

    return (
        <div 
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0B1221',
                position: 'relative',
                boxSizing: 'border-box'
            }}
        >
            {/* Top Info Bar */}
            <div 
                style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(11, 18, 33, 0.9)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    zIndex: 10,
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0, 242, 254, 0.15)', padding: '6px 12px', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                        <Coins size={14} className="text-cyan-400" />
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                            {coins} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>COINS</span>
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Level {level}
                    </span>
                    <button 
                        onClick={handleMute}
                        style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Level Forecast Header */}
            {!isSimulating && (
                <div 
                    style={{
                        padding: '10px 16px',
                        backgroundColor: 'rgba(242, 101, 34, 0.1)',
                        borderBottom: '1px solid rgba(242, 101, 34, 0.2)',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: 'var(--color-orange)',
                        zIndex: 5
                    }}
                >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>Forecast: {forecasts[level]}</span>
                </div>
            )}

            {/* Canvas Area */}
            <div style={{ 
                flex: 1, 
                position: 'relative', 
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#050811'
            }}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={480}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        aspectRatio: '800/480',
                        display: 'block'
                    }}
                />

                {/* Educational Tooltip Card (Active during dragging or item hover) */}
                {(draggedItem || hoveredInventoryItem) && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            right: '16px',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(10, 18, 36, 0.95)',
                            border: '2px solid #00F2FE',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 20px rgba(0, 242, 254, 0.35)',
                            zIndex: 100,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            boxSizing: 'border-box'
                        }}
                    >
                        <Info size={24} className="text-cyan-400" style={{ flexShrink: 0 }} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#00F2FE' }}>
                                {(draggedItem || hoveredInventoryItem).label} ({(draggedItem || hoveredInventoryItem).cost} Coins)
                            </div>
                            <div style={{ fontSize: '10px', color: '#E2E8F0', marginTop: '2px', lineHeight: '1.4' }}>
                                {(draggedItem || hoveredInventoryItem).detail}
                            </div>
                        </div>
                    </div>
                )}

                {/* Crossing HUD overlay */}
                {isSimulating && (
                    <div 
                        style={{
                            position: 'absolute',
                            bottom: '24px',
                            left: '16px',
                            right: '16px',
                            borderRadius: '24px',
                            padding: '16px 20px',
                            background: 'rgba(11, 18, 33, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxSizing: 'border-box',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            zIndex: 10
                        }}
                    >
                        {/* Shield Cover Health */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifySpace: 'between', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 900 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
                                    <Heart size={12} fill="#EF4444" style={{ border: 'none' }} />
                                    <span style={{ uppercase: true, letterSpacing: '0.05em', color: '#FFFFFF' }}>Bridge Health</span>
                                </div>
                                <span style={{ color: '#FFFFFF' }}>{hudShield}%</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${hudShield}%`, backgroundColor: hudShield > 40 ? '#22C55E' : '#EF4444', transition: 'width 0.2s' }} />
                            </div>
                        </div>

                        {/* Vehicle Crossing Progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifySpace: 'between', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 900, color: '#9CA3AF' }}>
                                <span style={{ uppercase: true, letterSpacing: '0.05em', color: '#FFFFFF' }}>Crossing Progress</span>
                                <span style={{ color: '#FFFFFF' }}>{hudProgress}%</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${hudProgress}%`, backgroundColor: '#00F2FE', transition: 'width 0.2s' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Drag & Drop Inventory Dock (Visible only in build phase) */}
            {!isSimulating && (
                <div 
                    style={{
                        background: '#0F172A',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 10,
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header instruction */}
                    <div style={{ padding: '8px 16px', fontSize: '10px', color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        Drag assets onto bridge spans to build & protect
                    </div>

                    {/* Inventory Items list */}
                    <div 
                        style={{
                            display: 'flex',
                            gap: '8px',
                            padding: '12px 16px',
                            overflowX: 'auto',
                            boxSizing: 'border-box'
                        }}
                        className="custom-scrollbar"
                    >
                        {inventory.map((item) => (
                            <div
                                key={item.id}
                                onMouseDown={(e) => handleDragStart(item, e)}
                                onTouchStart={(e) => handleDragStart(item, e)}
                                style={{
                                    flexShrink: 0,
                                    width: '68px',
                                    borderRadius: '12px',
                                    padding: '6px 4px',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'grab',
                                    userSelect: 'none',
                                    touchAction: 'none',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { 
                                    setHoveredInventoryItem(item);
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; 
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.4)'; 
                                }}
                                onMouseLeave={(e) => { 
                                    setHoveredInventoryItem(null);
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; 
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; 
                                }}
                            >
                                <span style={{ fontSize: '8px', fontWeight: 900, color: '#FFFFFF', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>
                                    {item.shortLabel}
                                </span>
                                <div style={{ width: '28px', height: '28px', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                    <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--color-orange)' }}>
                                    {item.cost}c
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Action buttons (Clear & Cross) */}
                    <div style={{ display: 'flex', gap: '12px', padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', boxSizing: 'border-box' }}>
                        <button
                            onClick={clearBridge}
                            style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '16px',
                                backgroundColor: 'transparent',
                                border: '2px solid rgba(255, 255, 255, 0.15)',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FFFFFF'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                        >
                            <RefreshCw size={14} /> Clear Bridge
                        </button>
                        
                        <button
                            onClick={handleCrossing}
                            disabled={coins < 0}
                            style={{
                                flex: 2,
                                padding: '14px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, var(--color-orange) 0%, #E65C00 100%)',
                                border: 'none',
                                color: '#FFFFFF',
                                fontSize: '15px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(242, 101, 34, 0.35)'
                            }}
                        >
                            Cross Bridge
                            <Play size={14} fill="#FFFFFF" />
                        </button>
                    </div>
                </div>
            )}

            {/* Draggable Icon floating copy */}
            {draggedItem && (
                <div
                    style={{
                        position: 'fixed',
                        left: `${dragPos.x}px`,
                        top: `${dragPos.y}px`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '2px solid #00F2FE',
                        color: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 900,
                        fontSize: '12px',
                        boxShadow: '0 10px 25px rgba(0,242,254,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <img src={draggedItem.image} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    <span>{draggedItem.label}</span>
                </div>
            )}
        </div>
    );
};

export default GamePage;
