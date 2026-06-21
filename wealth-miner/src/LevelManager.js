import { LEVEL_CONFIGS, ITEM_TYPES, GAME_WIDTH, GAME_HEIGHT } from './constants.js';

export class LevelManager {
    constructor() {
        this.items = [];
    }
    
    setupLevel(level, luckyFinderMultiplier = 1.0) {
        this.items = [];
        const config = LEVEL_CONFIGS[level];
        if (!config) return;
        
        for (const itemSpec of config.items) {
            const count = itemSpec.count;
            const type = itemSpec.type;
            const itemProto = ITEM_TYPES[type];
            
            for (let c = 0; c < count; c++) {
                let spawned = false;
                let attempts = 0;
                
                while (!spawned && attempts < 150) {
                    attempts++;
                    const radius = itemProto.radius;
                    // Keep items safe inside canvas limits
                    const x = radius + 40 + Math.random() * (GAME_WIDTH - radius * 2 - 80);
                    const y = 200 + Math.random() * (GAME_HEIGHT - 200 - radius - 20);
                    
                    // Check overlap
                    let overlap = false;
                    for (const placed of this.items) {
                        const dist = Math.hypot(placed.x - x, placed.y - y);
                        if (dist < (placed.radius + radius + 32)) { 
                            overlap = true;
                            break;
                        }
                    }
                    
                    if (!overlap) {
                        let value = itemProto.value;
                        if (!itemProto.isHazard) {
                            value = Math.round(value * luckyFinderMultiplier);
                        }
                        
                        const itemObj = {
                            x,
                            y,
                            type,
                            name: itemProto.name,
                            radius,
                            value,
                            weight: itemProto.weight,
                            color: itemProto.color,
                            isHazard: itemProto.isHazard || false,
                            isBomb: itemProto.isBomb || false,
                            isMoving: itemProto.isMoving || false,
                            collected: false,
                            vx: itemProto.isMoving ? (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8) : 0,
                            vy: 0,
                            pulseTime: Math.random() * 100
                        };
                        this.items.push(itemObj);
                        spawned = true;
                    }
                }
            }
        }
    }
    
    update() {
        for (const item of this.items) {
            if (item.collected) continue;
            
            item.pulseTime += 0.05;
            
            if (item.isMoving) {
                item.x += item.vx;
                // Bounce off horizontal bounds
                if (item.x - item.radius < 20 || item.x + item.radius > GAME_WIDTH - 20) {
                    item.vx *= -1;
                    item.x = Math.max(item.radius + 20, Math.min(GAME_WIDTH - item.radius - 20, item.x));
                }
            }
        }
    }
}
export default LevelManager;
