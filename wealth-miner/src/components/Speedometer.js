export class Speedometer {
    constructor(canvas, targetScore = 0) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.targetScore = targetScore;
        this.currentScore = 0;
        this.active = true;
    }
    
    setScore(score) {
        this.targetScore = Math.max(0, Math.min(100, score));
    }
    
    reset() {
        this.currentScore = 0;
    }
    
    start() {
        this.active = true;
        this.update();
    }
    
    stop() {
        this.active = false;
    }
    
    update() {
        if (!this.active) return;
        
        const diff = this.targetScore - this.currentScore;
        if (Math.abs(diff) > 0.05) {
            this.currentScore += diff * 0.05;
            this.draw();
            requestAnimationFrame(() => this.update());
        } else {
            this.currentScore = this.targetScore;
            this.draw();
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        const cx = width / 2;
        const cy = height * 0.58; 
        const radius = Math.min(width, height) * 0.38;
        const startAngle = 0.75 * Math.PI;
        const endAngle = 2.25 * Math.PI;
        const totalAngle = endAngle - startAngle;
        
        // 1. Draw track background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // 2. Draw gradient arc up to currentScore
        const scoreFraction = this.currentScore / 100;
        const currentAngle = startAngle + scoreFraction * totalAngle;
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, currentAngle);
        
        const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        gradient.addColorStop(0, "#FF4B4B");   // Red (low fitness)
        gradient.addColorStop(0.5, "#FFB800"); // Yellow (mid fitness)
        gradient.addColorStop(1, "#00E064");   // Green (high fitness)
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // 3. Draw ticks
        const ticksCount = 11; // 0, 10, ... 100
        for (let i = 0; i < ticksCount; i++) {
            const fraction = i / (ticksCount - 1);
            const angle = startAngle + fraction * totalAngle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rStart = radius - 12;
            const rEnd = radius - 20;
            
            ctx.beginPath();
            ctx.moveTo(cx + cos * rStart, cy + sin * rStart);
            ctx.lineTo(cx + cos * rEnd, cy + sin * rEnd);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        
        // 4. Draw Needle
        const needleAngle = startAngle + scoreFraction * totalAngle;
        const needleLen = radius - 10;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(needleAngle - Math.PI / 2);
        
        // Soft drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;
        
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(0, -needleLen);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fillStyle = '#F26522'; 
        ctx.fill();
        ctx.restore();
        
        // 5. Center spindle cap
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
        ctx.fillStyle = '#003DA6'; 
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // 6. Centered scores text
        ctx.shadowBlur = 0; // reset shadows
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(this.currentScore) + "/100", cx, cy + 34);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '600 11px Poppins';
        ctx.fillText("FINANCIAL FITNESS SCORE", cx, cy + 54);
    }
}
