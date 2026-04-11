// === VOLT DASH 2.0 ENGINE ===

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
let nextSpawnDist = 50;

// === НАСТРОЙКА БАЛАНСА ===
const SPEED = 4.2; // Замедлили игру для комфорта (было 5.5)
const JUMP_FORCE = -8.2; // Сила прыжка с земли
const ORB_FORCE = -8.0; // Сила прыжка от желтого кольца
const GRAVITY = 0.55; // Ослабленная гравитация для плавности

// Цветовые схемы карт (Cyber, Magma, Quantum)
const maps = [
    { bg: "#020510", line: "#00ffff", g1: "#005588", g2: "#003355", cubeMain: "#00ffff", cubeInner: "#0088cc", spike: "#ff0055", spikeIn: "#ff88aa" },
    { bg: "#1a0000", line: "#ff3300", g1: "#881100", g2: "#550000", cubeMain: "#ffae00", cubeInner: "#cc5500", spike: "#ffffff", spikeIn: "#aaaaaa" },
    { bg: "#001100", line: "#00ffaa", g1: "#008844", g2: "#005522", cubeMain: "#ff00aa", cubeInner: "#880055", spike: "#00ffaa", spikeIn: "#ccffff" }
];

// УМНЫЕ ПАТТЕРНЫ (Исключают непроходимость)
const patterns = [
    { elems: [{ type: 'spike', dx: 0, y: 120 }], dist: 160 }, // Одиночный шип
    { elems: [{ type: 'spike', dx: 0, y: 120 }, { type: 'spike', dx: 20, y: 120 }], dist: 190 }, // Двойной шип
    { elems: [{ type: 'spike', dx: 0, y: 120 }, { type: 'orb', dx: 45, y: 75 }, { type: 'spike', dx: 90, y: 120 }], dist: 230 }, // Шип -> Орб -> Шип
    { elems: [{ type: 'orb', dx: 0, y: 80 }], dist: 140 }, // Просто орб в воздухе
    { elems: [{ type: 'spike', dx: 0, y: 120 }, { type: 'spike', dx: 20, y: 120 }, { type: 'orb', dx: 60, y: 65 }], dist: 210 } // Двойной шип -> спасение на орбе
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
    dLives = 3; mapIdx = 0; passedObsCount = 0; dFrames = 0; shakeTime = 0; nextSpawnDist = 100;
    updateDLives();
    if(typeof window.startMusic === 'function') window.startMusic();
    dLoop();
};

window.dashJump = function() {
    if(!window.dRun) return;

    let hitOrb = false;
    
    // 1. Проверяем желтые орбы вокруг кубика
    for(let i=0; i<dObs.length; i++) {
        let ob = dObs[i];
        if(ob.type === 'orb' && !ob.used) {
            // Если орб находится в пределах досягаемости и кубик оторван от земли
            if(ob.x > 10 && ob.x < 90 && pD.y < 115) { 
                pD.vy = ORB_FORCE; // Прыжок от орба
                ob.used = true;
                hitOrb = true;
                createParticles(ob.x+10, ob.y+10, "#ffff00", 25, 6); // Взрыв орба
                if(typeof window.sndJump === 'function') window.sndJump();
                if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
                break;
            }
        }
    }

    // 2. Если орба нет, делаем обычный прыжок с земли
    if(!hitOrb && pD.y >= 120) {
        pD.vy = JUMP_FORCE; 
        if(typeof window.sndJump === 'function') window.sndJump();
        createParticles(pD.x + 10, pD.y + 20, maps[mapIdx].cubeMain, 10, 2); // Пыль из-под куба
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

// Отрисовка 2.5D Кубика
function drawGDCube(ctx, x, y, size, rot, cMain, cInner) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rot);
    
    // Внешнее свечение
    ctx.fillStyle = cMain;
    ctx.shadowBlur = 15; ctx.shadowColor = cMain;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Внутренняя часть
    ctx.shadowBlur = 0;
    ctx.fillStyle = cInner;
    ctx.fillRect(-size/2 + 3, -size/2 + 3, size - 6, size - 6);
    
    // Глаза кубика
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
    ctx.arc(x+10, y+10, 8 + Math.sin(dFrames*0.2)*2, 0, Math.PI*2);
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
    
    dFrames++;

    // Тряска экрана (Screen Shake)
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

    // Параллакс "VOLT AI"
    let textScroll = -(dFrames * 0.4) % 400;
    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillText("VOLT AI ⚡️", textScroll + 50, 90);
    ctx.fillText("VOLT AI ⚡️", textScroll + 450, 90);

    // 2. ДВИЖЕНИЕ ПОЛА
    groundScroll -= SPEED;
    if(groundScroll <= -40) groundScroll = 0;
    
    ctx.fillStyle = curMap.g2;
    ctx.fillRect(0, 140, 300, 10);
    ctx.fillStyle = curMap.g1;
    for(let i = -40; i < 340; i += 40) {
        ctx.beginPath(); ctx.moveTo(i + groundScroll, 150); ctx.lineTo(i + 20 + groundScroll, 150);
        ctx.lineTo(i + 30 + groundScroll, 140); ctx.lineTo(i + 10 + groundScroll, 140); ctx.fill();
    }
    ctx.fillStyle = curMap.line;
    ctx.shadowBlur = 10; ctx.shadowColor = curMap.line;
    ctx.fillRect(0, 138, 300, 2);
    ctx.shadowBlur = 0;

    // 3. ФИЗИКА И ГРАВИТАЦИЯ
    pD.vy += GRAVITY; 
    pD.y += pD.vy; 
    
    if(pD.y > 120) { 
        pD.y = 120; pD.vy = 0; 
        pD.rot = Math.round(pD.rot / (Math.PI/2)) * (Math.PI/2); // Магнитное выравнивание
    } else {
        pD.rot += 0.12; // Вращение
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

    // 4. ГЕНЕРАЦИЯ УРОВНЯ ПО ПАТТЕРНАМ
    nextSpawnDist -= SPEED;
    if(nextSpawnDist <= 0) {
        let pat = patterns[Math.floor(Math.random() * patterns.length)];
        let startX = 320;
        pat.elems.forEach(obj => {
            dObs.push({ type: obj.type, x: startX + obj.dx, y: obj.y, passed: false, used: false });
        });
        nextSpawnDist = pat.dist; // Задаем расстояние до следующего блока
    }

    // 5. ОТРИСОВКА И КОЛЛИЗИЯ
    for(let i = dObs.length - 1; i >= 0; i--) {
        let ob = dObs[i]; 
        ob.x -= SPEED; 
        
        if(ob.type === 'spike') {
            drawGDSpike(ctx, ob.x, ob.y, curMap.spike, curMap.spikeIn);
            // Просчет коллизии шипа
            if(pD.x < ob.x + 12 && pD.x + 18 > ob.x + 8 && pD.y + 20 > ob.y + 8) {
                if(typeof window.sndHit === 'function') window.sndHit();
                triggerShake();
                createParticles(pD.x+10, pD.y+10, curMap.cubeMain, 40, 8); 
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
                if(passedObsCount % 15 === 0) mapIdx = (mapIdx + 1) % maps.length; // Карта меняется каждые 15 шипов
            }
        } else if(ob.x < -30) { 
            dObs.splice(i, 1); 
        }
    }

    if(dLives > 0) drawGDCube(ctx, pD.x, pD.y, 20, pD.rot, curMap.cubeMain, curMap.cubeInner);

    // Отрисовка частиц
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore(); // Сброс смещения (Screen Shake)

    if(window.dRun) requestAnimationFrame(dLoop);
}
