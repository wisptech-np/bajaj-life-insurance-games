import React, { useEffect, useRef, useState } from "react";

const Speedometer = ({ score }) => {
    const canvasRef = useRef(null);
    const [displayScore, setDisplayScore] = useState(0);

    const safeScore = isNaN(score) ? 0 : score;
    const clampedScore = Math.min(Math.max(Number(safeScore), 0), 100);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;

        const startAngle = 0.75 * Math.PI;
        const totalRotationRange = 1.5 * Math.PI; // 270 degree gauge

        let currentScore = 0;
        const targetScore = clampedScore;

        const render = () => {
            const diff = targetScore - currentScore;
            if (Math.abs(diff) > 0.1) {
                currentScore += diff * 0.05; 
            } else {
                currentScore = targetScore;
            }

            const nextDisplayScore = Math.round(currentScore);
            if (!isNaN(nextDisplayScore)) {
                setDisplayScore(nextDisplayScore);
            }

            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = 120;

            ctx.clearRect(0, 0, width, height);

            // Background Track
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + totalRotationRange);
            ctx.lineWidth = 15;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; 
            ctx.lineCap = "round";
            ctx.stroke();

            // Gradient Arc
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0.1, "#FF4B4B"); // Red
            gradient.addColorStop(0.5, "#FFB800"); // Yellow
            gradient.addColorStop(0.9, "#00E064"); // Green

            const currentAngle = startAngle + (currentScore / 100) * totalRotationRange;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
            ctx.lineWidth = 15;
            ctx.strokeStyle = gradient;
            ctx.lineCap = "round";
            ctx.stroke();

            // Tick marks
            ctx.save();
            ctx.translate(centerX, centerY);
            const tickCount = 50;
            const step = totalRotationRange / tickCount;
            for (let i = 0; i <= tickCount; i++) {
                const theta = startAngle + i * step;
                const isActive = theta <= currentAngle;

                const tickRadiusInner = radius - 25;
                const tickRadiusOuter = radius - 20;

                const x1 = Math.cos(theta) * tickRadiusInner;
                const y1 = Math.sin(theta) * tickRadiusInner;
                const x2 = Math.cos(theta) * tickRadiusOuter;
                const y2 = Math.sin(theta) * tickRadiusOuter;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.1)";
                ctx.stroke();
            }
            ctx.restore();

            // Needle
            const needleLength = radius - 10;
            const needleX = centerX + Math.cos(currentAngle) * needleLength;
            const needleY = centerY + Math.sin(currentAngle) * needleLength;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(needleX, needleY);
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineCap = "round";
            ctx.stroke();

            // Needle tip dot
            ctx.beginPath();
            ctx.arc(needleX, needleY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#FFFFFF";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "white";
            ctx.fill();
            ctx.shadowBlur = 0; 

            // Center hub
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#1E293B"; 
            ctx.fill();

            if (Math.abs(diff) > 0.1) {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [clampedScore]);

    return (
        <div 
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
            }}
        >
            <canvas
                ref={canvasRef}
                width={350}
                height={300}
                style={{
                    width: '100%',
                    maxWidth: '350px',
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))'
                }}
            />

            <div 
                style={{
                    position: 'absolute',
                    top: '55%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    paddingTop: '24px'
                }}
            >
                <div 
                    style={{
                        fontSize: '36px',
                        fontWeight: '900',
                        color: '#FFFFFF',
                        textShadow: '0 0 20px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.4)',
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    {displayScore}<span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>/100</span>
                </div>
            </div>
        </div>
    );
};

export default Speedometer;
