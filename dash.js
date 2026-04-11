// === VOLT DASH 2.0 ENGINE (GEOMETRY DASH CLONE) ===

window.dRun = false;
let dLives = 3;
let pD = { x: 50, y: 120, vy: 0, rot: 0 };
let dObs = [];
let trails = [];
let particles = [];
let mapIdx = 0;
let passedObsCount = 0;
let dFrames = 0;
let bgPulse = 0;
let groundScroll = 0;
let shakeTime = 0;

// Цветовые схемы карт (Cyber, Magma, Quantum)
const maps = [
    { bg: "#020510", line: "#00ffff", g1: "#005588", g2: "#003355", cubeMain: "#00ffff", cubeInner: "#0088cc", spike: "#ff0055", spikeIn: "#ff88aa" },
    { bg: "#1a0000", line: "#ff3300", g1: "#881100", g2: "#550000", cubeMain: "#ffae00", cubeInner: "#cc5500", spike: "#ffffff", spikeIn: "#aaaaaa" },
    { bg: "#001100", line: "#00ffaa", g1: "#008844", g2: "#005522", cubeMain: "#ff00aa", cubeInner: "#880055", spike: "#00ffaa", spikeIn: "#ccffff" }
];

// Паттерны уровней (для умной генерации)
const patterns = [
    [{ type: 'spike', dx: 0, y: 120 }], // Одиночный
    [{ type: 'spike', dx: 0, y: 120 }, { type: 'spike', dx: 20, y: 120 }], // Двойной
    [{ type: 'spike', dx: 0, y: 120 }, { type: 'spike', dx: 20, y: 120 }, { type: 'spike', dx: 40, y: 120 }], // Тройной (нужен идеальный тайминг)
    [{ type: 'spike', dx: 0, y: 120 }, { type: 'orb', dx: 30, y: 80 }, { type: 'spike', dx: 60, y: 120 }], // Яма с шипами и орбом в воздухе
    [{ type: 'orb', dx: 0, y: 90 }] // Просто орб
];

function updateDLives() { 
    const hpEl = document.getElementById('hp-dash');
    if(hpEl) hpEl.innerText = 'HP: ' + dLives; 
}

window.startDash = function() {
    const ov = document.getElementById('ov-dash');
    if(ov) ov.style.display = 'none';
    window.dRun = true;
    pD.y = 120; pD.vy = 0; pD.rot = 0;
    dObs = []; trails = []; particles = [];
    dLives = 3; mapIdx = 0; passedObsCount = 0; dFrames = 0; shakeTime = 0;
    updateDLives();
    if(typeof window.startMusic === 'function') window.startMusic();
    dLoop();
};

window.dashJump = function() {
    if(!window.dRun) return;

    // 1. Проверяем, летим ли мы через желтый ОРБ (Jump Ring)
    let hitOrb = false;
    for(let i=0; i<dObs.length; i++) {
        let ob = dObs[i];
        if(ob.type === 'orb' && !ob.used) {
            let distX = Math.abs((pD.x + 10) - (ob.x + 10));
            let distY = Math.abs((pD.y + 10) - (ob.y + 10));
            if(distX < 25 && distY < 30) {
                pD.vy = -10; // Мощный прыжок от орба
                ob.used = true;
                hitOrb = true;
                createParticles(ob.x+10, ob.y+10, "#ffff00", 20, 5);
                if(typeof window.sndJump === 'function') window.sndJump();
                if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
                break;
            }
        }
    }

    // 2. Если не орб, проверяем обычный прыжок от земли
    if(!hitOrb && pD.y >= 120) {
        pD.vy = -9.5; // Резкий прыжок GD
        if(typeof window.sndJump === 'function') window.sndJump();
        createParticles(pD.x + 10, pD.y + 20, maps[mapIdx].cubeMain, 8, 2);
        if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    }
};

window.exitDash = function() {
    window.dRun = false;
    const ov = document.getElementById('ov-dash');
    const msg = document.getElementById('msg-dash');
    if(document.fullscreenElement) document.exitFullscreen();
    const wrap = document.getElementById('wrap-dash');
    if(wrap) wrap.classList.remove('fullscreen-active');
    
    if(ov) ov.style.display = 'flex';
    if(msg) msg.innerText = 'TAP TO DASH';
    if(typeof window.stopMusic === 'function') window.stopMusic();
};

function createParticles(x, y, color, count, speed=4) {
    for(let i=0; i<count; i++) {
        particles.push({ 
            x: x, y: y, 
            vx: (Math.random()-0.5)*speed, 
            vy: (Math.random()-0.5)*speed - 1, 
            life: 1, color: color, size: Math.random()*3+2 
        });
    }
}

// Отрисовка правильного GD Кубика
function drawGDCube(ctx, x, y, size, rot, cMain, cInner) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rot);
    
    // Внешняя толстая рамка
    ctx.fillStyle = cMain;
    ctx.shadowBlur = 15; ctx.shadowColor = cMain;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Внутренняя часть (Лицо кубика)
    ctx.shadowBlur = 0;
    ctx.fillStyle = cInner;
    ctx.fillRect(-size/2 + 3, -size/2 + 3, size - 6, size - 6);
    
    // Глаза
    ctx.fillStyle = "#fff";
    ctx.fillRect(-size/2 + 5, -size/2 + 5, 4, 4);
    ctx.fillRect(-size/2 + 11, -size/2 + 5, 4, 4);
    
    ctx.restore();
}

function drawGDSpike(ctx, x, y, cMain, cInner) {
    ctx.fillStyle = cMain;
    ctx.shadowBlur = 10; ctx.shadowColor = cMain;
    ctx.beginPath(); ctx.moveTo(x, y+20); ctx.lineTo(x+10, y); ctx.lineTo(x+20, y+20); ctx.closePath(); ctx.fill();
    
    ctx.fillStyle = cInner;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(x+5, y+18); ctx.lineTo(x+10, y+6); ctx.lineTo(x+15, y+18); ctx.closePath(); ctx.fill();
}

function drawOrb(ctx, x, y, used) {
    if(used) return;
    ctx.beginPath();
    ctx.arc(x+10, y+10, 8 + Math.sin(dFrames*0.2)*2, 0, Math.PI*2); // Пульсация
    ctx.fillStyle = "#ffff00";
    ctx.shadowBlur = 15; ctx.shadowColor = "#ffff00";
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x+10, y+10, 5, 0, Math.PI*2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.fill();
}

function triggerShake() { shakeTime = 15; }

function dLoop() {
    if(!window.dRun) return;
    const dc = document.getElementById('dashCanvas');
    if(!dc) return;
    const ctx = dc.getContext('2d');
    const curMap = maps[mapIdx];
    const speed = 5.5; // Скорость игры
    
    dFrames++;

    // Screen Shake Effect
    ctx.save();
    if(shakeTime > 0) {
        let dx = (Math.random()-0.5)*8; let dy = (Math.random()-0.5)*8;
        ctx.translate(dx, dy);
        shakeTime--;
    }

    // 1. ПУЛЬСИРУЮЩИЙ ФОН
    bgPulse = 0.5 + Math.sin(dFrames * 0.05) * 0.2;
    ctx.fillStyle = curMap.bg;
    ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = curMap.g1; ctx.globalAlpha = bgPulse * 0.3;
    ctx.fillRect(0, 0, 300, 150); ctx.globalAlpha = 1.0;

    // Параллакс: Фоновый текст "VOLT AI ⚡️"
    let textScroll = -(dFrames * 0.5) % 400;
    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillText("VOLT AI ⚡️", textScroll + 50, 90);
    ctx.fillText("VOLT AI ⚡️", textScroll + 450, 90);

    // 2. ИКОНИЧЕСКИЙ ПОЛ GD
    groundScroll -= speed;
    if(groundScroll <= -40) groundScroll = 0;
    
    ctx.fillStyle = curMap.g2;
    ctx.fillRect(0, 140, 300, 10);
    // Диагональные полосы на полу
    ctx.fillStyle = curMap.g1;
    for(let i = -40; i < 340; i += 40) {
        ctx.beginPath(); ctx.moveTo(i + groundScroll, 150); ctx.lineTo(i + 20 + groundScroll, 150);
        ctx.lineTo(i + 30 + groundScroll, 140); ctx.lineTo(i + 10 + groundScroll, 140); ctx.fill();
    }
    // Толстая неоновая линия раздела
    ctx.fillStyle = curMap.line;
    ctx.shadowBlur = 10; ctx.shadowColor = curMap.line;
    ctx.fillRect(0, 138, 300, 2);
    ctx.shadowBlur = 0;

    // 3. ФИЗИКА И ВРАЩЕНИЕ
    pD.vy += 0.8; // Тяжелая гравитация
    pD.y += pD.vy; 
    
    if(pD.y > 120) { 
        pD.y = 120; pD.vy = 0; 
        // Жесткое выравнивание куба при приземлении (Snap to 90 degrees)
        pD.rot = Math.round(pD.rot / (Math.PI/2)) * (Math.PI/2); 
    } else {
        pD.rot += 0.15; // Быстрое вращение в воздухе
    }

    // Трейл
    trails.push({x: pD.x, y: pD.y}); 
    if(trails.length > 5) trails.shift();
    trails.forEach((t, i) => { 
        ctx.globalAlpha = i * 0.1;
        ctx.fillStyle = curMap.cubeMain; 
        ctx.fillRect(t.x+2, t.y+2, 16, 16); 
    });
    ctx.globalAlpha = 1.0;

    // 4. ГЕНЕРАЦИЯ УРОВНЯ
    if(dObs.length === 0 || dObs[dObs.length-1].x < 100) {
        if(Math.random() < 0.05) { // Шанс заспавнить паттерн
            let pat = patterns[Math.floor(Math.random() * patterns.length)];
            let startX = 320;
            pat.forEach(obj => {
                dObs.push({ type: obj.type, x: startX + obj.dx, y: obj.y, passed: false, used: false });
            });
        }
    }

    // 5. ОТРИСОВКА И КОЛЛИЗИЯ ПРЕПЯТСТВИЙ
    for(let i = dObs.length - 1; i >= 0; i--) {
        let ob = dObs[i]; 
        ob.x -= speed; 
        
        if(ob.type === 'spike') {
            drawGDSpike(ctx, ob.x, ob.y, curMap.spike, curMap.spikeIn);
            // Жесткая коллизия с шипом
            if(pD.x < ob.x + 12 && pD.x + 18 > ob.x + 8 && pD.y + 20 > ob.y + 8) {
                if(typeof window.sndHit === 'function') window.sndHit();
                triggerShake();
                createParticles(pD.x+10, pD.y+10, curMap.cubeMain, 40, 8); // Мощный взрыв кубика
                if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
                
                dObs.splice(i, 1); dLives--; updateDLives();
                
                if(dLives <= 0) { 
                    window.dRun = false; 
                    if(typeof window.stopMusic === 'function') window.stopMusic();
                    const ov = document.getElementById('ov-dash');
                    const msg = document.getElementById('msg-dash');
                    if(ov) ov.style.display = 'flex';
                    if(msg) msg.innerHTML = '<span style="color:#ff0055">WASTED</span><br><br><span style="font-size:8px;color:#aaa">TAP TO RETRY</span>';
                }
                continue;
            }
        } else if(ob.type === 'orb') {
            drawOrb(ctx, ob.x, ob.y, ob.used);
        }
        
        // Начисление очков и смена карты
        if(!ob.passed && ob.x < pD.x) {
            ob.passed = true;
            if(ob.type === 'spike') {
                passedObsCount++;
                if(typeof window.addScore === 'function') window.addScore(0.005);
                if(passedObsCount % 15 === 0) mapIdx = (mapIdx + 1) % maps.length; // Смена цвета
            }
        } else if(ob.x < -30) { 
            dObs.splice(i, 1); 
        }
    }

    // Игрок рисуется только если жив
    if(dLives > 0) drawGDCube(ctx, pD.x, pD.y, 20, pD.rot, curMap.cubeMain, curMap.cubeInner);

    // Частицы
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore(); // Конец Screen Shake

    if(window.dRun) requestAnimationFrame(dLoop);
}
