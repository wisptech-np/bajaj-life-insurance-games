import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

export class ClawSystem {
    constructor() {
        this.cx = GAME_WIDTH / 2;
        this.cy = 100; // Pivot under the crane launcher
        this.angle = 0;
        this.length = 60;
        
        // States: 'SWINGING', 'LAUNCHING', 'RETRACTING'
        this.state = 'SWINGING';
        
        this.swingSpeed = 0.025;
        this.swingDirection = 1;
        this.swingLimit = 72 * Math.PI / 180; // swing limit left/right
        
        this.minLength = 60;
        this.maxLength = 680;

        
        this.grabbedItem = null;
        
        // Upgrades cached
        this.upgradeStrength = 1.0; // claw strength factor
        this.upgradeSpeed = 6.0;      // base launch/retract speed
        this.upgradeRadius = 20;     // grab radius of claw tip
        this.upgradeMagnet = 0;      // magnet attraction distance
    }
    
    reset() {
        this.angle = 0;
        this.length = this.minLength;
        this.state = 'SWINGING';
        this.grabbedItem = null;
    }
    
    applyUpgrades(upgrades) {
        // Claw Strength: increases factor to reduce weight penalty
        this.upgradeStrength = upgrades.clawStrength; 
        
        // Reel Speed: increases base launch and retract speeds
        this.upgradeSpeed = upgrades.pullSpeed;
        
        // Grab Radius: increases hitbox
        this.upgradeRadius = 20 * upgrades.grabRadius;
        
        // Treasure Magnet: magnetic attraction radius
        this.upgradeMagnet = upgrades.treasureMagnet;
    }
    
    launch() {
        if (this.state === 'SWINGING') {
            this.state = 'LAUNCHING';
            return true;
        }
        return false;
    }
    
    update(levelManager, particleManager, audioService, onCollect) {
        const tipX = this.cx + Math.sin(this.angle) * this.length;
        const tipY = this.cy + Math.cos(this.angle) * this.length;
        
        if (this.state === 'SWINGING') {
            // Swing back and forth
            this.angle += this.swingSpeed * this.swingDirection;
            if (Math.abs(this.angle) >= this.swingLimit) {
                this.swingDirection *= -1;
                // Clamp within limit
                this.angle = Math.sign(this.angle) * this.swingLimit;
            }
        }
        else if (this.state === 'LAUNCHING') {
            // Extend claw
            this.length += this.upgradeSpeed;
            
            // 1. Check Magnet Attraction
            if (this.upgradeMagnet > 0) {
                for (const item of levelManager.items) {
                    if (item.collected || item.isHazard) continue;
                    
                    const dist = Math.hypot(item.x - tipX, item.y - tipY);
                    if (dist < this.upgradeMagnet) {
                        // Gently pull item towards claw path
                        const pullFactor = 0.08 * (1 - dist / this.upgradeMagnet);
                        item.x += (tipX - item.x) * pullFactor;
                        item.y += (tipY - item.y) * pullFactor;
                    }
                }
            }
            
            // 2. Check collision with canvas boundaries
            const nextTipX = this.cx + Math.sin(this.angle) * (this.length + this.upgradeSpeed);
            const nextTipY = this.cy + Math.cos(this.angle) * (this.length + this.upgradeSpeed);
            
            if (nextTipX < 15 || nextTipX > GAME_WIDTH - 15 || nextTipY > GAME_HEIGHT - 20) {
                this.state = 'RETRACTING';
                audioService.playTone(150, 'sine', 0.1, 0.05); // simple thud
            }
            
            // 3. Check item collision
            for (const item of levelManager.items) {
                if (item.collected) continue;
                
                const dist = Math.hypot(item.x - tipX, item.y - tipY);
                if (dist < (this.upgradeRadius + item.radius)) {
                    // Grab item
                    item.collected = true;
                    this.grabbedItem = item;
                    this.state = 'RETRACTING';
                    audioService.playGrab();
                    
                    // Spawn grab sparks
                    particleManager.spawnSparks(item.x, item.y, item.color, 8);
                    
                    // Bomb triggers immediately!
                    if (item.isBomb) {
                        this.triggerBomb(item, levelManager, particleManager, audioService, onCollect);
                    }
                    break;
                }
            }
            
            // Max length check
            if (this.length >= this.maxLength) {
                this.state = 'RETRACTING';
            }
        }
        else if (this.state === 'RETRACTING') {
            // Speed calculation: heavier items pull slower
            // Claw strength upgrade reduces the weight impact
            let weightPenalty = 1.0;
            if (this.grabbedItem) {
                // Formula: weight reduces pull speed. Strength multiplier dampens this penalty.
                const effectiveWeight = this.grabbedItem.weight / this.upgradeStrength;
                weightPenalty = 1.0 + effectiveWeight;
            }
            
            const currentRetractSpeed = this.upgradeSpeed / weightPenalty;
            this.length -= currentRetractSpeed;
            
            // If item grabbed, keep it locked at the claw tip
            if (this.grabbedItem) {
                this.grabbedItem.x = tipX;
                this.grabbedItem.y = tipY;
            }
            
            // Check reached top
            if (this.length <= this.minLength) {
                this.length = this.minLength;
                this.state = 'SWINGING';
                
                if (this.grabbedItem) {
                    onCollect(this.grabbedItem);
                    this.grabbedItem = null;
                }
            }
        }
    }
    
    triggerBomb(bombItem, levelManager, particleManager, audioService, onCollect) {
        // Explode bomb
        audioService.playExplosion();
        
        // Spawn massive explosion particles
        particleManager.spawnSparks(bombItem.x, bombItem.y, '#FF3D00', 25);
        particleManager.spawnSparks(bombItem.x, bombItem.y, '#FFA500', 15);
        particleManager.spawnSparks(bombItem.x, bombItem.y, '#555555', 20);
        
        // Apply negative score change immediately (the bomb item itself)
        onCollect(bombItem);
        this.grabbedItem = null; // bomb is destroyed/collected
        
        // Destroy surrounding items within a radius of 150px
        const blastRadius = 145;
        for (const other of levelManager.items) {
            if (other.collected || other === bombItem) continue;
            
            const dist = Math.hypot(other.x - bombItem.x, other.y - bombItem.y);
            if (dist < blastRadius) {
                other.collected = true; // Mark as destroyed
                
                // Explode visually
                particleManager.spawnSparks(other.x, other.y, '#777777', 6);
                
                // If it was another bomb, chain reaction with a slight delay!
                if (other.isBomb) {
                    setTimeout(() => {
                        this.triggerBomb(other, levelManager, particleManager, audioService, onCollect);
                    }, 150);
                }
            }
        }
    }
    
    draw(ctx, clawImg, craneImg) {
        const tipX = this.cx + Math.sin(this.angle) * this.length;
        const tipY = this.cy + Math.cos(this.angle) * this.length;
        
        ctx.save();
        
        // ── Draw Crane / Machine Launcher at top ──
        if (craneImg && craneImg.complete && craneImg.naturalWidth > 0) {
            ctx.drawImage(craneImg, this.cx - 50, this.cy - 65, 100, 75);
        } else {
            // Fallback Crane: brushed gold and dark titanium
            ctx.fillStyle = '#1A237E';
            ctx.strokeStyle = '#003DA6';
            ctx.lineWidth = 4;
            // Draw luxury platform base
            ctx.beginPath();
            ctx.rect(this.cx - 60, this.cy - 60, 120, 20);
            ctx.fill();
            ctx.stroke();
            // Draw rotating gear housing
            ctx.fillStyle = '#DAA520';
            ctx.beginPath();
            ctx.arc(this.cx, this.cy - 30, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // ── Draw Cable ──
        ctx.beginPath();
        ctx.moveTo(this.cx, this.cy);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#D4AF37'; // Golden chain look
        ctx.lineWidth = 3;
        // Draw links pattern on chain
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();
        
        // ── Draw Claw Tip ──
        ctx.save();
        ctx.translate(tipX, tipY);
        ctx.rotate(-this.angle); // orient perpendicular to string
        
        if (clawImg && clawImg.complete && clawImg.naturalWidth > 0) {
            ctx.drawImage(clawImg, -30, -10, 60, 50);
        } else {
            // Fallback articulating fingers
            // Draw claw wrist base
            ctx.fillStyle = '#003DA6';
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.rect(-14, -6, 28, 12);
            ctx.fill();
            ctx.stroke();
            
            // Finger angle: open when swinging/launching, closed when retracting
            let fingerAngle = 0.45; // open
            if (this.state === 'RETRACTING') {
                fingerAngle = this.grabbedItem ? 0.15 : 0.05; // closed
            }
            
            // Draw three fingers: Left, Center, Right
            // Left finger
            ctx.save();
            ctx.translate(-10, 4);
            ctx.rotate(fingerAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6, 12);
            ctx.lineTo(-2, 24);
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.restore();
            
            // Right finger
            ctx.save();
            ctx.translate(10, 4);
            ctx.rotate(-fingerAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(6, 12);
            ctx.lineTo(2, 24);
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.restore();
            
            // Center gear/stabilizer
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.arc(0, 4, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
export default ClawSystem;
