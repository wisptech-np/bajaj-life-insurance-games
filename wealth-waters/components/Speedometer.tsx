import React, { useEffect, useRef, useState } from "react";

interface SpeedometerProps {
  score: number;
}

const Speedometer: React.FC<SpeedometerProps> = ({ score }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const safeScore = isNaN(score) ? 0 : score;
  const clampedScore = Math.min(Math.max(Number(safeScore), 0), 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

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
      const radius = 100;

      ctx.clearRect(0, 0, width, height);

      // Draw background track arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + totalRotationRange);
      ctx.lineWidth = 14;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineCap = "round";
      ctx.stroke();

      // Create continuous color gradient
      const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0.1, "#FF4B4B"); // Red
      gradient.addColorStop(0.5, "#FFB800"); // Yellow
      gradient.addColorStop(0.9, "#00E064"); // Green

      const currentAngle = startAngle + (currentScore / 100) * totalRotationRange;

      // Draw colored progress arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
      ctx.lineWidth = 14;
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw ticks
      ctx.save();
      ctx.translate(centerX, centerY);
      const tickCount = 40;
      const step = totalRotationRange / tickCount;
      for (let i = 0; i <= tickCount; i++) {
        const theta = startAngle + i * step;
        const isActive = theta <= currentAngle;

        const tickRadiusInner = radius - 20;
        const tickRadiusOuter = radius - 16;

        const x1 = Math.cos(theta) * tickRadiusInner;
        const y1 = Math.sin(theta) * tickRadiusInner;
        const x2 = Math.cos(theta) * tickRadiusOuter;
        const y2 = Math.sin(theta) * tickRadiusOuter;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.15)";
        ctx.stroke();
      }
      ctx.restore();

      // Draw needle
      const needleLength = radius - 8;
      const needleX = centerX + Math.cos(currentAngle) * needleLength;
      const needleY = centerY + Math.sin(currentAngle) * needleLength;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(needleX, needleY);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw needle cap highlight
      ctx.beginPath();
      ctx.arc(needleX, needleY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "white";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw center pivots
      ctx.beginPath();
      ctx.arc(centerX, centerY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
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
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[280px]">
      <canvas
        ref={canvasRef}
        width={280}
        height={240}
        className="w-full drop-shadow-2xl"
      />
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pt-12">
        <div 
          className="text-3xl font-black text-white" 
          style={{ textShadow: '0 0 15px rgba(255,255,255,0.7), 0 0 25px rgba(255,255,255,0.3)' }}
        >
          {displayScore}<span className="text-lg">/100</span>
        </div>
      </div>
    </div>
  );
};

export default Speedometer;
