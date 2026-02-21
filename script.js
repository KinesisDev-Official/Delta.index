const Game = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),
    active: false,
    money: parseInt(localStorage.getItem('sim_money')) || 0,
    score: 0,
    laneWidth: 90,
    roadWidth: 270,
    currentSpeed: 8,
    maxSpeed: 8,

    init() {
        this.canvas.width = 450;
        this.canvas.height = window.innerHeight;
        this.player = { 
            x: 225 - 24, y: this.canvas.height - 180, 
            w: 50, h: 100, // Un peu plus grande pour le réalisme
            color: '#cc0000', vx: 0, 
            rotation: 0 
        };
        this.enemies = [];
        this.roadOffset = 0;
        document.getElementById('money-val').innerText = this.money;
        this.loop();
    },

    start() {
        document.getElementById('menu').classList.add('hidden');
        this.active = true;
        this.score = 0;
        this.enemies = [];
        this.currentSpeed = 8;
    },

    spawnEnemy() {
        const topEnemies = this.enemies.filter(en => en.y < 150);
        if (Math.random() < 0.04 && topEnemies.length < 2) {
            const lane = Math.floor(Math.random() * 3);
            const startX = (this.canvas.width - this.roadWidth) / 2;
            const x = startX + (lane * this.laneWidth) + (this.laneWidth/2 - 25);
            
            this.enemies.push({ 
                x, y: -150, w: 50, h: 100, 
                speed: this.currentSpeed * (0.5 + Math.random() * 0.4),
                color: '#333' 
            });
        }
    },

    update() {
        if (!this.active) return;

        // --- CONTRÔLES AZERTY (Correction faite ici) ---
        if (Input.keys['q'] || Input.keys['Q']) { this.player.vx -= 1.6; this.player.rotation = -0.12; }
        else if (Input.keys['d'] || Input.keys['D']) { this.player.vx += 1.6; this.player.rotation = 0.12; }
        else { this.player.rotation *= 0.8; }

        // Freinage (Touche S ou Espace)
        if (Input.keys['s'] || Input.keys['S'] || Input.keys[' ']) {
            this.currentSpeed = 3;
        } else {
            this.currentSpeed = this.maxSpeed;
        }

        this.player.vx *= 0.84;
        this.player.x += this.player.vx;

        // Crash bords
        const leftLimit = (this.canvas.width - this.roadWidth) / 2;
        const rightLimit = leftLimit + this.roadWidth - this.player.w;
        if (this.player.x < leftLimit - 8 || this.player.x > rightLimit + 8) this.gameOver();

        this.spawnEnemy();

        this.enemies.forEach((en, i) => {
            en.y += en.speed + (this.currentSpeed - 8); 
            if (this.rectIntersect(this.player, en)) this.gameOver();
            if (en.y > this.canvas.height) {
                this.enemies.splice(i, 1);
                this.score += 25;
                this.money += 10;
                this.maxSpeed += 0.015;
                document.getElementById('money-val').innerText = this.money;
            }
        });

        this.roadOffset += this.currentSpeed;
        localStorage.setItem('sim_money', this.money);
    },

    // --- DESSIN DES VÉHICULES AMÉLIORÉS ---
    drawCar(x, y, w, h, color, rot, isPlayer) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x + w/2, y + h/2);
        ctx.rotate(rot);

        // 1. Ombre portée au sol
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 10;

        // 2. Carrosserie principale avec dégradé
        let grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, '#ffffff33'); // Reflet métal
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        this.roundRect(ctx, -w/2, -h/2, w, h, 12);
        ctx.fill();

        // 3. Détails : Vitres et Toit
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#111';
        ctx.fillRect(-w/2 + 6, -h/2 + 20, w - 12, 35); // Pare-brise et toit
        
        // 4. Feux ARRIÈRE (Stop)
        if (isPlayer && (Input.keys['s'] || Input.keys['S'] || Input.keys[' '])) {
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 20; ctx.shadowColor = 'red';
            ctx.fillRect(-w/2 + 4, h/2 - 10, 14, 8); // Feu gauche
            ctx.fillRect(w/2 - 18, h/2 - 10, 14, 8); // Feu droit
        } else {
            ctx.fillStyle = '#660000';
            ctx.fillRect(-w/2 + 4, h/2 - 8, 12, 5);
            ctx.fillRect(w/2 - 16, h/2 - 8, 12, 5);
        }

        // 5. Roues (petits détails sur les côtés)
        ctx.fillStyle = '#000';
        ctx.fillRect(-w/2 - 2, -h/2 + 15, 4, 15); // Avant gauche
        ctx.fillRect(w/2 - 2, -h/2 + 15, 4, 15);  // Avant droit
        ctx.fillRect(-w/2 - 2, h/2 - 30, 4, 15);  // Arrière gauche
        ctx.fillRect(w/2 - 2, h/2 - 30, 4, 15);   // Arrière droit

        ctx.restore();
    },

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    draw() {
        const ctx = this.ctx;
        const startX = (this.canvas.width - this.roadWidth) / 2;

        // Herbe et Route
        ctx.fillStyle = '#1e3d1e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#222';
        ctx.fillRect(startX, 0, this.roadWidth, this.canvas.height);

        // Lignes blanches
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([40, 60]);
        ctx.lineDashOffset = -this.roadOffset;
        ctx.lineWidth = 4;
        for(let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(startX + i * this.laneWidth, 0);
            ctx.lineTo(startX + i * this.laneWidth, this.canvas.height);
            ctx.stroke();
        }

        // Joueur et Trafic
        this.drawCar(this.player.x, this.player.y, this.player.w, this.player.h, this.player.color, this.player.rotation, true);
        this.enemies.forEach(en => this.drawCar(en.x, en.y, en.w, en.h, en.color, 0, false));
    },

    rectIntersect(a, b) {
        return (a.x < b.x + b.w - 10 && a.x + a.w - 10 > b.x && a.y < b.y + b.h - 10 && a.y + a.h - 10 > b.y);
    },

    gameOver() {
        this.active = false;
        alert("CRASH ! SCORE: " + this.score);
        location.reload();
    },

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
};

const Input = {
    keys: {},
    init() {
        window.addEventListener('keydown', e => { this.keys[e.key] = true; });
        window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    }
};

const UI = { toggleGarage() { document.getElementById('menu').classList.toggle('hidden'); document.getElementById('garage').classList.toggle('hidden'); } };
const Shop = { buy(id, price, color) { if (Game.money >= price) { Game.money -= price; Game.player.color = color; document.getElementById('money-val').innerText = Game.money; localStorage.setItem('sim_money', Game.money); UI.toggleGarage(); } else alert("Pas assez d'argent !"); } };

Input.init();
Game.init();
