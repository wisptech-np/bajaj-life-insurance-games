export class ParticleManager {
    constructor() {
        this.particles = [];
        this.floaters = [];
    }
    
    reset() {
        this.particles = [];
        this.floaters = [];
    }
    
    spawnSparks(x, y, color = '#FFD700', count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3.5,
                color,
                alpha: 1,
                decay: 0.015 + Math.random() * 0.02,
                gravity: 0.06
            });
        }
    }
    
    spawnGoldBurst(x, y, count = 12) {
        this.spawnSparks(x, y, '#FFD700', count);
        this.spawnSparks(x, y, '#F26522', count / 2);
    }
    
    spawnComboBurst(x, y, text) {
        this.spawnSparks(x, y, '#F26522', 15);
        this.spawnSparks(x, y, '#00BCD4', 15);
        this.spawnFloatingText(x, y, text, '#FFD700', 26, true);
    }
    
    spawnFloatingText(x, y, text, color = '#FFFFFF', size = 18, isCombo = false) {
        this.floaters.push({
            x,
            y,
            text,
            color,
            size,
            alpha: 1,
            vy: -1.2 - Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 1.0,
            decay: 0.012,
            isCombo
        });
    }
    
    update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update floaters
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.x += f.vx;
            f.y += f.vy;
            f.alpha -= f.decay;
            if (f.alpha <= 0) {
                this.floaters.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        // Draw particles
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw floaters
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const f of this.floaters) {
            ctx.globalAlpha = f.alpha;
            ctx.font = f.isCombo ? `900 ${f.size}px Poppins` : `bold ${f.size}px Poppins`;
            
            // Stroke for readability
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = 4;
            ctx.strokeText(f.text, f.x, f.y);
            
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.restore();
    }
}
export default ParticleManager;
