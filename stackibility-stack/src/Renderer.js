// Renderer.js – all canvas 2D drawing

// Level theme backgrounds (sky gradients)
const LEVEL_THEMES = [
    { sky: ['#0A192F', '#004080'], ground: '#002B59', name: 'Starting Life' },
    { sky: ['#002B59', '#005BAC'], ground: '#004080', name: 'Young Professional' },
    { sky: ['#004080', '#3B8DD4'], ground: '#005BAC', name: 'Family Builder' },
    { sky: ['#0f172a', '#0A192F'], ground: '#0f172a', name: 'Business Owner' },
    { sky: ['#0A192F', '#002B59'], ground: '#002B59', name: 'Wealth Builder' },
    { sky: ['#002B59', '#005BAC'], ground: '#004080', name: 'Retirement' },
];

export function getLevelTheme(level) {
    return LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
}

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._resize();
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
    }

    get W() { return window.innerWidth; }
    get H() { return window.innerHeight; }

    clear() {
        this.ctx.clearRect(0, 0, this.W, this.H);
    }

    // ── Background — altitude-driven parallax sky ─────────────────────────
    // As the camera lifts (cameraScrollY becomes more negative), bands fade in
    // and out: ground/road → city skyline → mountains → clouds → stratosphere
    // cirrus → space (stars, nebula glow, earth horizon). Matches the design's
    // game.jsx draw() pipeline. `theme` parameter is preserved for API compat
    // but theme.sky is no longer used; sky color now interpolates with altitude.
    drawBackground(theme, shakeOffset = 0, cameraScrollY = 0) {
        const { ctx, W, H } = this;
        const sx = W / 390;       // horizontal scale relative to design canvas
        const time = performance.now();

        ctx.save();
        ctx.translate(shakeOffset, 0);

        // Altitude in tower-units. 1 unit ≈ 350 px of camera lift.
        const alt = Math.max(0, -cameraScrollY) / 350;
        const A = (a, b) => Math.max(0, Math.min(1, (alt - a) / (b - a)));
        const groundBand   = 1 - A(0, 1.2);
        const cityBand     = A(0.2, 1.0) * (1 - A(1.0, 2.0));
        const mountainBand = A(0.8, 1.6) * (1 - A(2.2, 3.2));
        const cloudBand    = A(0.4, 2.0) * (1 - A(3.0, 4.0));
        const stratoBand   = A(2.0, 3.2) * (1 - A(4.5, 5.5));
        const spaceBand    = A(3.5, 5.0);
        const birdBand     = A(0.4, 0.9) * (1 - A(1.6, 2.2));
        const skyMix       = Math.min(1, alt / 4.5);

        // ── Sky gradient — day-blue → deep-space ──
        const top1 = this._mix('#9CC8E8', '#020610', skyMix);
        const top2 = this._mix('#6FA9D2', '#040A1A', skyMix);
        const mid  = this._mix('#3B8DD4', '#082042', skyMix);
        const low  = this._mix('#A6C8E8', '#0a2a52', Math.min(1, skyMix * 1.4));
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0,    top1);
        grad.addColorStop(0.35, top2);
        grad.addColorStop(0.7,  mid);
        grad.addColorStop(1,    low);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // ── Space layer (high alt) — stars, nebula, earth horizon ──
        if (spaceBand > 0.02 || skyMix > 0.4) {
            const starOpacity = Math.max(0, Math.min(1, (skyMix - 0.35) * 1.6));
            ctx.fillStyle = `rgba(255,255,255,${0.85 * starOpacity})`;
            for (let i = 0; i < 80; i++) {
                const x = ((i * 71) % W);
                const y = ((i * 53 + (-cameraScrollY * 0.05)) % H + H) % H;
                const sz = (i % 7 === 0) ? 2 : 1;
                ctx.fillRect(x, y, sz, sz);
            }
            if (spaceBand > 0.1) {
                const ng = ctx.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, 220);
                ng.addColorStop(0, `rgba(255,140,90,${0.18 * spaceBand})`);
                ng.addColorStop(1, 'rgba(255,140,90,0)');
                ctx.fillStyle = ng;
                ctx.fillRect(0, 0, W, H);

                const ng2 = ctx.createRadialGradient(W * 0.25, H * 0.55, 10, W * 0.25, H * 0.55, 240);
                ng2.addColorStop(0, `rgba(80,140,255,${0.15 * spaceBand})`);
                ng2.addColorStop(1, 'rgba(80,140,255,0)');
                ctx.fillStyle = ng2;
                ctx.fillRect(0, 0, W, H);
            }
            if (spaceBand > 0.4) {
                const earthY = H + 80 - spaceBand * 60;
                const eg = ctx.createRadialGradient(W / 2, earthY + 80, 30, W / 2, earthY + 80, 260);
                eg.addColorStop(0, `rgba(120,180,230,${0.5 * spaceBand})`);
                eg.addColorStop(0.6, `rgba(40,80,150,${0.25 * spaceBand})`);
                eg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = eg;
                ctx.fillRect(0, 0, W, H);
            }
        }

        // ── Stratosphere cirrus (high alt, parallax 0.05) ──
        if (stratoBand > 0.02) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.05);
            ctx.fillStyle = `rgba(255,255,255,${0.12 * stratoBand})`;
            [[40, 180], [200, 260], [80, 380], [260, 460]].forEach(([x, y]) => {
                ctx.beginPath();
                ctx.ellipse(x * sx, y, 80 * sx, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // ── Distant mountains (parallax 0.25) + closer mountains (0.45) ──
        if (mountainBand > 0.02) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.25);
            ctx.fillStyle = `rgba(20,50,90,${0.55 * mountainBand})`;
            const peaks1 = [0, 70, 130, 200, 260, 330, 390];
            const ph1   = [0, 60,  30,  90,  45,  75,  20];
            ctx.beginPath();
            ctx.moveTo(0, H - 60);
            peaks1.forEach((x, i) => ctx.lineTo(x * sx, H - 60 - ph1[i]));
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fill();
            // Snow caps on tall peaks
            ctx.fillStyle = `rgba(255,255,255,${0.55 * mountainBand})`;
            peaks1.forEach((x, i) => {
                if (ph1[i] > 50) {
                    ctx.beginPath();
                    ctx.moveTo(x * sx, H - 60 - ph1[i]);
                    ctx.lineTo(x * sx - 8, H - 60 - ph1[i] + 12);
                    ctx.lineTo(x * sx + 8, H - 60 - ph1[i] + 12);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.restore();

            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.45);
            ctx.fillStyle = `rgba(8,32,70,${0.85 * mountainBand})`;
            const peaks2 = [0, 60, 140, 220, 300, 390];
            const ph2   = [0, 80,  40,  90,  30,  70];
            ctx.beginPath();
            ctx.moveTo(0, H - 30);
            peaks2.forEach((x, i) => ctx.lineTo(x * sx, H - 30 - ph2[i]));
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // ── City skyline (low alt, parallax 0.6) ──
        if (cityBand > 0.02 || groundBand > 0.02) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.6);
            const cityAlpha = Math.max(cityBand, groundBand);
            ctx.fillStyle = `rgba(10,25,55,${0.85 * cityAlpha})`;
            const sky = [
                [0, 30], [25, 40], [50, 25], [75, 55], [110, 35], [140, 70],
                [175, 40], [205, 80], [240, 45], [270, 65], [300, 30], [330, 55],
                [360, 38], [390, 50],
            ];
            ctx.beginPath();
            ctx.moveTo(0, H);
            sky.forEach(([x, h]) => {
                ctx.lineTo(x * sx, H - h);
                ctx.lineTo((x + 22) * sx, H - h);
            });
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();
            // Window lights
            ctx.fillStyle = `rgba(255,220,130,${0.6 * cityAlpha})`;
            sky.forEach(([x, h], i) => {
                for (let r = 0; r < Math.floor(h / 10); r++) {
                    for (let c = 0; c < 3; c++) {
                        if ((i + r + c) % 3 !== 0) {
                            ctx.fillRect(x * sx + (4 + c * 6) * sx, H - h + 6 + r * 8, 2 * sx, 3);
                        }
                    }
                }
            });
            ctx.restore();
        }

        // ── Ground / road (very low alt, parallax 0.9) ──
        if (groundBand > 0.02) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.9);
            ctx.fillStyle = `rgba(15,28,50,${0.95 * groundBand})`;
            ctx.fillRect(0, H - 8, W, 8);
            ctx.fillStyle = `rgba(255,200,100,${0.6 * groundBand})`;
            for (let x = 10; x < W; x += 28) ctx.fillRect(x, H - 4, 14, 1.5);
            ctx.restore();
        }

        // ── Birds (low-mid alt, parallax 0.7, animated) ──
        if (birdBand > 0.05) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.7);
            ctx.strokeStyle = `rgba(20,30,50,${0.75 * birdBand})`;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            const t = time * 0.0006;
            const birds = [
                [60  + Math.sin(t)            * 30, 240],
                [78  + Math.sin(t + 0.4)      * 30, 248],
                [180 + Math.sin(t * 1.1 + 1)  * 40, 210],
                [200 + Math.sin(t * 1.1 + 1.4)* 40, 220],
                [320 + Math.sin(t * 0.8 + 2)  * 35, 280],
            ];
            birds.forEach(([x, y]) => {
                const wing = Math.sin(t * 6 + x) * 2;
                const bx = x * sx;
                ctx.beginPath();
                ctx.moveTo(bx - 6, y + wing);
                ctx.quadraticCurveTo(bx - 3, y - 2 - wing, bx, y);
                ctx.quadraticCurveTo(bx + 3, y - 2 - wing, bx + 6, y + wing);
                ctx.stroke();
            });
            ctx.restore();
        }

        // ── Puffy clouds (mid alt, parallax 0.15) ──
        if (cloudBand > 0.02) {
            ctx.save();
            ctx.translate(0, -cameraScrollY * 0.15);
            ctx.fillStyle = `rgba(255,255,255,${0.55 * cloudBand})`;
            const clouds = [
                [60, 220, 50],  [240, 280, 40], [120, 460, 60], [280, 540, 45],
                [50, 700, 55],  [220, 820, 50], [160, 980, 65], [310, 1100, 40],
            ];
            clouds.forEach(([x, y, r]) => {
                const cx = x * sx;
                ctx.beginPath();
                ctx.ellipse(cx,            y,     r * sx,         r * 0.32, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + r * 0.5,  y - 4, r * 0.6  * sx,  r * 0.28, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - r * 0.5,  y - 2, r * 0.55 * sx,  r * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        ctx.restore(); // shake
    }

    _mix(hexA, hexB, t) {
        const pa = parseInt(hexA.slice(1), 16);
        const pb = parseInt(hexB.slice(1), 16);
        const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
        const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
        return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
    }

    // ── Ground platform ────────────────────────────────────────────────────
    drawGround(groundWorldY, theme, shakeOffset = 0) {
        const { ctx, W } = this;
        const platH = 30;
        ctx.fillStyle = theme.ground;
        ctx.fillRect(shakeOffset + W / 2 - 100, groundWorldY, 200, platH);

        // Brick pattern
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                const bx = shakeOffset + W / 2 - 100 + col * 50 + (row % 2 === 0 ? 0 : 25);
                const by = groundWorldY + row * 15;
                ctx.strokeRect(bx, by, 50, 15);
            }
        }
    }

    // ── Tower blocks ───────────────────────────────────────────────────────
    // Architectural building section: gradient body + facade detail (windows,
    // doors, rooflines) + colored name strip at the bottom. Matches design's
    // game.jsx drawBlock + drawAssetIcon (5 building types).
    drawBlock(block, worldX, worldY, shakeOffset = 0, alpha = 1) {
        const { ctx } = this;
        const { width: w, height: h } = block;
        const x = worldX - w / 2 + shakeOffset;
        const y = worldY - h / 2;
        const labelH = block.labelHeight != null
            ? block.labelHeight
            : (h >= 30 ? Math.max(10, Math.min(14, h * 0.20)) : 0);

        ctx.globalAlpha = alpha;

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        this._roundRect(x + 3, y + 3, w, h, 8);
        ctx.fill();

        // Body — vertical gradient over the facade portion
        const grad = ctx.createLinearGradient(x, y, x, y + Math.max(1, h - labelH));
        grad.addColorStop(0, this._lighten(block.color, 0.18));
        grad.addColorStop(0.6, block.color);
        grad.addColorStop(1, this._darken(block.color, 0.15));
        ctx.fillStyle = grad;
        this._roundRect(x, y, w, h, 8);
        ctx.fill();

        // Top bevel highlight
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        this._roundRect(x + 1, y + 1, w - 2, 3, 2);
        ctx.fill();

        // Building facade in upper portion
        if (block.iconType) {
            this._drawFacade(block.iconType, x, y, w, h - labelH);
        }

        // Bottom name strip — clipped to the rounded block silhouette
        if (labelH > 0 && block.label) {
            ctx.save();
            ctx.beginPath();
            this._roundRect(x, y, w, h, 8);
            ctx.clip();

            const lg = ctx.createLinearGradient(x, y + h - labelH, x, y + h);
            lg.addColorStop(0, this._darken(block.color, 0.28));
            lg.addColorStop(1, this._darken(block.color, 0.45));
            ctx.fillStyle = lg;
            ctx.fillRect(x, y + h - labelH, w, labelH);

            ctx.fillStyle = 'rgba(0,0,0,0.30)';
            ctx.fillRect(x, y + h - labelH, w, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(x, y + h - labelH + 1, w, 0.8);

            const fs = block.labelFontSize != null
                ? block.labelFontSize
                : Math.max(7, Math.min(10, h * 0.13));
            ctx.font = `800 ${fs}px Poppins, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillText(block.label.toUpperCase(), x + w / 2, y + h - labelH / 2 + 1);
            ctx.fillStyle = 'rgba(255,255,255,0.94)';
            ctx.fillText(block.label.toUpperCase(), x + w / 2, y + h - labelH / 2);
            ctx.restore();
        }

        ctx.globalAlpha = 1;
    }

    // ── Architectural facades — each scaled from a 64×64 reference grid ───
    // Cottage / Hospital / Townhouse / Garage / School (matches design's atoms.jsx).
    _drawFacade(iconType, blockX, blockY, w, facadeH) {
        if (facadeH <= 0) return;
        const ctx = this.ctx;
        const winFill = 'rgba(255,255,255,0.55)';
        const lineCol = 'rgba(0,0,0,0.30)';

        ctx.save();
        // Clip to upper portion of rounded block so detail doesn't bleed
        // past the rounded corners.
        ctx.beginPath();
        ctx.rect(blockX, blockY, w, facadeH);
        ctx.clip();

        ctx.translate(blockX, blockY);
        ctx.scale(w / 64, facadeH / 64);
        ctx.lineWidth = 0.6;

        switch (iconType) {
            case 'cottage': {
                // Pitched roof
                ctx.fillStyle = 'rgba(0,0,0,0.30)';
                ctx.beginPath();
                ctx.moveTo(4, 22); ctx.lineTo(32, 6); ctx.lineTo(60, 22);
                ctx.lineTo(60, 26); ctx.lineTo(4, 26); ctx.closePath();
                ctx.fill();
                ctx.fillRect(46, 10, 5, 10); // chimney
                // Door
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(28, 40, 8, 20);
                // Two pane windows
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                ctx.fillRect(10, 34, 12, 10); ctx.strokeRect(10, 34, 12, 10);
                ctx.beginPath(); ctx.moveTo(16, 34); ctx.lineTo(16, 44); ctx.moveTo(10, 39); ctx.lineTo(22, 39); ctx.stroke();
                ctx.fillRect(42, 34, 12, 10); ctx.strokeRect(42, 34, 12, 10);
                ctx.beginPath(); ctx.moveTo(48, 34); ctx.lineTo(48, 44); ctx.moveTo(42, 39); ctx.lineTo(54, 39); ctx.stroke();
                // Window boxes
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(10, 44, 12, 2);
                ctx.fillRect(42, 44, 12, 2);
                break;
            }
            case 'hospital': {
                // Parapet
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.fillRect(4, 6, 56, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(4, 10, 56, 2);
                // Red cross sign
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(28, 2, 8, 8);
                ctx.fillStyle = 'rgba(239,68,68,0.95)';
                ctx.fillRect(31, 3, 2, 6);
                ctx.fillRect(29, 5, 6, 2);
                // 3 floors × 5 windows
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                [16, 30, 44].forEach(yy => [6, 17, 28, 39, 50].forEach(xx => {
                    ctx.fillRect(xx, yy, 8, 8);
                    ctx.strokeRect(xx, yy, 8, 8);
                }));
                // Entrance
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(28, 54, 8, 10);
                break;
            }
            case 'townhouse': {
                // Crown
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(2, 6, 60, 3);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(4, 9, 56, 2);
                // Top floor — 3 windows
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                [8, 26, 44].forEach(xx => {
                    ctx.fillRect(xx, 14, 12, 14);
                    ctx.strokeRect(xx, 14, 12, 14);
                });
                // Floor divider
                ctx.fillStyle = 'rgba(0,0,0,0.30)';
                ctx.fillRect(2, 32, 60, 2);
                // Ground — 2 windows
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                ctx.fillRect(6, 38, 14, 16); ctx.strokeRect(6, 38, 14, 16);
                ctx.fillRect(44, 38, 14, 16); ctx.strokeRect(44, 38, 14, 16);
                // Arched door
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.moveTo(26, 64); ctx.lineTo(26, 44);
                ctx.quadraticCurveTo(26, 38, 32, 38);
                ctx.quadraticCurveTo(38, 38, 38, 44);
                ctx.lineTo(38, 64);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'garage': {
                // Parapet
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(2, 6, 60, 2.5);
                ctx.fillStyle = 'rgba(255,255,255,0.20)';
                ctx.fillRect(2, 8.5, 60, 2);
                // Top window strip
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                [6, 14, 22, 30, 38, 46, 54].forEach(xx => {
                    ctx.fillRect(xx, 14, 6, 10);
                    ctx.strokeRect(xx, 14, 6, 10);
                });
                // Floor band
                ctx.fillStyle = 'rgba(0,0,0,0.30)';
                ctx.fillRect(2, 26, 60, 2);
                // Garage door
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.fillRect(6, 32, 52, 28);
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.strokeRect(6, 32, 52, 28);
                // Panel lines
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                [36, 42, 48, 54].forEach(yy => {
                    ctx.beginPath();
                    ctx.moveTo(6, yy); ctx.lineTo(58, yy);
                    ctx.stroke();
                });
                // Handle
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillRect(30, 45, 4, 2);
                break;
            }
            case 'school': {
                // Clock-tower roof
                ctx.fillStyle = 'rgba(0,0,0,0.40)';
                ctx.beginPath();
                ctx.moveTo(26, 4); ctx.lineTo(32, -2); ctx.lineTo(38, 4);
                ctx.lineTo(38, 10); ctx.lineTo(26, 10); ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(26, 10, 12, 14);
                // Clock face
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath();
                ctx.arc(32, 16, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(32, 16); ctx.lineTo(32, 13);
                ctx.moveTo(32, 16); ctx.lineTo(34, 16);
                ctx.stroke();
                ctx.lineWidth = 0.5;
                // Wing windows
                ctx.fillStyle = winFill;
                ctx.strokeStyle = lineCol;
                [24, 36, 48].forEach(yy => [5, 14, 44, 53].forEach(xx => {
                    ctx.fillRect(xx, yy, 6, 8);
                    ctx.strokeRect(xx, yy, 6, 8);
                }));
                // Tower base entrance
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.fillRect(28, 50, 8, 14);
                break;
            }
            case 'apartment': {
                // Parapet
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(2, 6, 60, 3);
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(2, 9, 60, 1.5);
                // 3 floors × 3 windows + balcony rails
                [16, 32, 48].forEach(yy => {
                    ctx.fillStyle = winFill;
                    ctx.strokeStyle = lineCol;
                    [8, 28, 48].forEach(xx => {
                        ctx.fillRect(xx, yy, 8, 10);
                        ctx.strokeRect(xx, yy, 8, 10);
                    });
                    // Balcony rails (horizontal bar + verticals)
                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.fillRect(6, yy + 10, 12, 1);
                    ctx.fillRect(26, yy + 10, 12, 1);
                    ctx.fillRect(46, yy + 10, 12, 1);
                });
                // Entrance
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.fillRect(28, 56, 8, 8);
                break;
            }
            case 'office': {
                // Top branding band
                ctx.fillStyle = 'rgba(0,0,0,0.34)';
                ctx.fillRect(2, 4, 60, 6);
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                [10, 24, 44].forEach(xx => ctx.fillRect(xx, 6, 10, 2));
                // Glass curtain wall — three bands
                ctx.fillStyle = 'rgba(150,200,235,0.35)';
                ctx.fillRect(4, 12, 56, 14);
                ctx.fillRect(4, 28, 56, 14);
                ctx.fillRect(4, 44, 56, 14);
                // Mullion grid
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                [12, 28, 44, 58].forEach(yy => ctx.fillRect(4, yy - 0.4, 56, 0.8));
                [12, 24, 36, 48].forEach(xx => ctx.fillRect(xx - 0.3, 12, 0.6, 46));
                // Specular highlight
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(8, 14, 6, 42);
                // Revolving entrance
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(26, 58, 12, 6);
                break;
            }
            case 'foundation': {
                // Top cap highlight
                ctx.fillStyle = 'rgba(255,255,255,0.20)';
                ctx.fillRect(0, 0, 64, 2);
                // Alternating brick courses
                const rowH = 9;
                ctx.lineWidth = 0.6;
                for (let row = 0; row < 7; row++) {
                    const yy = 3 + row * rowH;
                    const offset = (row % 2) * 8;
                    for (let col = -1; col < 5; col++) {
                        const xx = col * 16 + offset;
                        ctx.fillStyle = 'rgba(255,255,255,0.07)';
                        ctx.fillRect(xx + 1, yy + 1, 14, rowH - 2);
                        ctx.strokeStyle = 'rgba(0,0,0,0.42)';
                        ctx.strokeRect(xx + 1, yy + 1, 14, rowH - 2);
                    }
                }
                // Base shadow band
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(0, 62, 64, 2);
                break;
            }
            case 'bank': {
                // Pediment (triangular roof)
                ctx.fillStyle = 'rgba(0,0,0,0.36)';
                ctx.beginPath();
                ctx.moveTo(8, 16); ctx.lineTo(32, 4); ctx.lineTo(56, 16);
                ctx.lineTo(56, 20); ctx.lineTo(8, 20); ctx.closePath();
                ctx.fill();
                // Frieze ornament
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(12, 17, 40, 1.5);
                // 3 columns
                ctx.fillStyle = 'rgba(255,255,255,0.40)';
                [14, 29, 44].forEach(xx => ctx.fillRect(xx, 24, 6, 32));
                // Capitals + bases
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                [14, 29, 44].forEach(xx => {
                    ctx.fillRect(xx - 1.5, 23, 9, 2);
                    ctx.fillRect(xx - 1.5, 54, 9, 2);
                });
                // Door
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.fillRect(28, 36, 8, 18);
                // $ sign
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.font = 'bold 9px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 32, 12);
                // Steps
                ctx.fillStyle = 'rgba(255,255,255,0.20)';
                ctx.fillRect(4, 56, 56, 3);
                ctx.fillRect(2, 60, 60, 4);
                break;
            }
        }
        ctx.restore();
    }

    _lighten(hex, amt) {
        if (!hex || hex[0] !== '#') return hex;
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const f = (c) => Math.round(c + (255 - c) * amt);
        return `rgb(${f(r)},${f(g)},${f(b)})`;
    }

    _darken(hex, amt) {
        if (!hex || hex[0] !== '#') return hex;
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const f = (c) => Math.round(c * (1 - amt));
        return `rgb(${f(r)},${f(g)},${f(b)})`;
    }

    // ── Drop Prediction Shadow ────────────────────────────────────────────
    drawPredictionShadow(x, width) {
        const { ctx } = this;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x - width / 2, -5000, width, 10000); // Massive vertical beam
    }

    // ── Chain (was rope) ──────────────────────────────────────────────────
    // Series of metallic oval links alternating orientation, plus a steel
    // mount disc at the anchor. Replaces the dashed rope so the swinging
    // building reads as heavy industrial cargo, not flimsy rope.
    drawRope(anchorX, anchorY, blockX, blockY) {
        const ctx = this.ctx;
        const blockTopY = this._pendulumBlock?.height
            ? blockY - this._pendulumBlock.height / 2
            : blockY;
        const dx = blockX - anchorX;
        const dy = blockTopY - anchorY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const angle = Math.atan2(dy, dx);

        // Walk the line in fixed-length steps. Each link straddles the
        // midpoint between two anchor-points so they appear interlocked.
        const linkSpacing = 8;
        const linkCount = Math.max(2, Math.floor(dist / linkSpacing));

        for (let i = 0; i <= linkCount; i++) {
            const t = i / linkCount;
            const cx = anchorX + dx * t;
            const cy = anchorY + dy * t;

            ctx.save();
            ctx.translate(cx, cy);
            // Alternate links 90° so they look interlocked.
            ctx.rotate(angle + (i % 2 === 0 ? 0 : Math.PI / 2));

            // Drop shadow under link
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.ellipse(0.6, 0.7, 5.2, 3.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Steel link body (vertical brushed gradient)
            const grad = ctx.createLinearGradient(0, -3, 0, 3);
            grad.addColorStop(0,   '#e2e8f0');
            grad.addColorStop(0.45,'#94a3b8');
            grad.addColorStop(1,   '#475569');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner cutout — gives the ring its hole
            ctx.fillStyle = 'rgba(8,14,32,0.92)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Specular highlight
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.ellipse(-1.3, -1.2, 1.8, 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Anchor mount — small steel disc with a bolt at the trolley.
        ctx.save();
        ctx.translate(anchorX, anchorY);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(0.6, 0.8, 7.5, 0, Math.PI * 2);
        ctx.fill();
        const mountGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
        mountGrad.addColorStop(0,   '#f1f5f9');
        mountGrad.addColorStop(0.55,'#94a3b8');
        mountGrad.addColorStop(1,   '#334155');
        ctx.fillStyle = mountGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
        // Center bolt
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    setPendulumBlock(block) { this._pendulumBlock = block; }

    // ── Particles ─────────────────────────────────────────────────────────
    drawParticles(particles) {
        const { ctx } = this;
        for (const p of particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    _roundRect(x, y, w, h, r) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
