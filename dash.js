// === VOLT DASH 3.0: PLATFORMER ENGINE ===

window.dRun = false;
let dLives = 3;
let pD = { x: 50, y: 120, vy: 0, rot: 0 };
let dObs = [];
let particles = [];
let mapIdx = 0;
let passedObsCount = 0;
let dFrames = 0;
let bgPulse = 0;
let nextSpawnDist = 50;

// ФИЗИКА (Отполирована)
const SPEED = 4.5;
const JUMP_FORCE = -9.5; 
const ORB_FORCE = -10.0;
const GRAVITY = 0.8;

const maps = [
    { bg: "#020510", line: "#00ffff", ground: "#003355", cubeMain: "#00ffff", cubeInner: "#0088cc", spike: "#ff0055", block: "#005588" },
    { bg: "#1a0000", line: "#ff3300", ground: "#550000", cubeMain: "#ffae00", cubeInner: "#cc5500", spike: "#ffffff", block: "#881100" },
    { bg: "#001100", line: "#00ffaa", ground: "#005522", cubeMain: "#ff00aa", cubeInner: "#880055", spike: "#00ffaa", block: "#008844" }
];

// ПАТТЕРНЫ (Куски уровня со ступенями, ямами и орбами)
const chunks = [
    { w: 150, obs: [{t:'spike', x:20, y:120}] }, // Одиночный шип
    { w: 200, obs: [{t:'spike', x:20, y:120}, {t:'spike', x:40, y:120}] }, // Двойной шип
    { w: 250, obs: [{t:'pit', x:20, w:100}] }, // ПРОПАСТЬ (Яма)
    { w: 250, obs: [{t:'pit', x:20, w:120}, {t:'orb', x:70, y:70}] }, // Пропасть с желтым орбом посередине
    { w: 300, obs: [ // Ступени вверх
        {t:'block', x:20, y:90, w:60, h:30}, 
        {t:'block', x:80, y:60, w:60, h:60}, 
        {t:'spike', x:80, y:40}
    ]},
    { w: 250, obs: [ // Парящая платформа над ямой
        {t:'pit', x:20, w:150},
        {t:'block', x:40, y:80, w:80, h:20}
    ]},
    { w: 250, obs: [ // Шип, прыжок на платформу
        {t:'spike', x:20, y:120},
        {t:'block', x:80, y:80, w:80, h:20}
    ]}
];

function updateDLives() { 
    const hpEl = document.getElementById('hp-dash');
    if(hpEl) hpEl.innerText = 'HP: ' + dLives; 
}

window.startDash = function() {
    if(window.dRun) return;
    const ov = document.getElementById('ov-dash');
    if(ov) ov.style.display = 'none';
    
    window.dRun = true;
    pD.x = 50; pD.y = 120; pD.vy = 0; pD.rot = 0;
    dObs = []; particles = [];
    dLives = 3; mapIdx = 0; passedObsCount = 0; dFrames = 0; nextSpawnDist = 100;
    
    updateDLives();
    const dc = document.getElementById('dashCanvas');
    if(dc) dc.onpointerdown = window.dashJump;
    if(typeof window.startMusic === 'function') window.startMusic();
    dLoop();
};

window.dashJump = function(e) {
    if(e) e.preventDefault();
    if(!window.dRun) return;

    let hitOrb = false;
    
    // 1. ПРОВЕРКА ЖЕЛТОГО ОРБА (Огромная зона захвата: 60px)
    for(let i=0; i<dObs.length; i++) {
        let ob = dObs[i];
        if(ob.t === 'orb' && !ob.used) {
            let dist = Math.hypot((pD.x+10) - (ob.x+10), (pD.y+10) - (ob.y+10));
            if(dist < 60) { // Если кубик просто пролетает рядом - прыжок сработает!
                pD.vy = ORB_FORCE; 
                ob.used = true;
                hitOrb = true;
                createParts(ob.x+10, ob.y+10, "#ffff00", 30, 6); 
                if(typeof window.sndJump === 'function') window.sndJump();
                if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
                break;
            }
        }
    }

    // 2. ПРЫЖОК С ЗЕМЛИ ИЛИ ПЛАТФОРМЫ
    if(!hitOrb && pD.vy === 0) { // vy === 0 значит мы твердо стоим на поверхности
        pD.vy = JUMP_FORCE; 
        if(typeof window.sndJump === 'function') window.sndJump();
        createParts(pD.x + 10, pD.y + 20, maps[mapIdx].cubeMain, 10, 2); 
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

function createParts(x, y, color, count, speed=4) {
    for(let i=0; i<count; i++) {
        particles.push({ x: x, y: y, vx: (Math.random()-0.5)*speed, vy: (Math.random()-0.5)*speed - 1, life: 1, color: color });
    }
}

function die() {
    if(typeof window.sndHit === 'function') window.sndHit();
    createParts(pD.x+10, pD.y+10, maps[mapIdx].cubeMain, 50, 8); // Мощный взрыв
    if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
    
    dLives--; updateDLives();
    
    if(dLives <= 0) { 
        window.dRun = false; 
        if(typeof window.stopMusic === 'function') window.stopMusic();
        document.getElementById('ov-dash').style.display='flex';
        document.getElementById('msg-dash').innerHTML = '<span style="color:#ff0055">WASTED</span><br><br><span style="font-size:8px;color:#aaa">TAP TO RETRY</span>';
    } else {
        // Возрождение: очищаем препятствия перед игроком, чтобы не умереть дважды
        dObs = dObs.filter(o => o.x > 150 || o.t === 'pit');
        pD.y = 100; pD.vy = 0; pD.x = 50;
    }
}

function dLoop() {
    if(!window.dRun) return;
    const dc = document.getElementById('dashCanvas');
    if(!dc) return;
    const ctx = dc.getContext('2d');
    const curMap = maps[mapIdx];
    
    dFrames++;

    // 1. ФОН И ПАРАЛЛАКС
    bgPulse = 0.5 + Math.sin(dFrames * 0.05) * 0.2;
    ctx.fillStyle = curMap.bg; ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = curMap.block; ctx.globalAlpha = bgPulse * 0.2;
    ctx.fillRect(0, 0, 300, 150); ctx.globalAlpha = 1.0;

    let textScroll = -(dFrames * 0.4) % 400;
    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillText("VOLT AI ⚡️", textScroll + 50, 90);
    ctx.fillText("VOLT AI ⚡️", textScroll + 450, 90);

    // 2. ОТРИСОВКА БАЗОВОГО ПОЛА
    ctx.fillStyle = curMap.ground; ctx.fillRect(0, 140, 300, 10);
    ctx.fillStyle = curMap.line; ctx.fillRect(0, 138, 300, 2);

    // 3. ГЕНЕРАЦИЯ БЛОКОВ (ЧАНКОВ)
    nextSpawnDist -= SPEED;
    if(nextSpawnDist <= 0) {
        let chunk = chunks[Math.floor(Math.random() * chunks.length)];
        let startX = 320;
        chunk.obs.forEach(obj => {
            dObs.push({ t: obj.t, x: startX + obj.x, y: obj.y, w: obj.w, h: obj.h, passed: false, used: false });
        });
        nextSpawnDist = chunk.w; 
    }

    // 4. ФИЗИКА, ПЛАТФОРМЫ И СТОЛКНОВЕНИЯ
    pD.vy += GRAVITY;
    pD.y += pD.vy;
    
    let targetGround = 120; // Базовый пол
    let onBlock = false;
    let cx = pD.x + 10; // Центр куба

    for(let i = dObs.length - 1; i >= 0; i--) {
        let ob = dObs[i]; 
        ob.x -= SPEED; 

        // Логика пропасти (ямы)
        if(ob.t === 'pit') {
            ctx.fillStyle = curMap.bg; // Рисуем дыру в полу
            ctx.fillRect(ob.x, 138, ob.w, 12);
            // Если мы над ямой и не на блоке
            if(cx > ob.x && cx < ob.x + ob.w && !onBlock) {
                targetGround = 200; // Падаем в бездну
            }
        }
        
        // Логика платформ (блоков/ступеней)
        if(ob.t === 'block') {
            ctx.fillStyle = curMap.block; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
            ctx.strokeStyle = curMap.line; ctx.lineWidth = 1; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
            
            // Если кубик падает сверху на платформу
            if(cx > ob.x && cx < ob.x + ob.w && pD.y + 20 >= ob.y && pD.y + 20 - pD.vy <= ob.y + 5 && pD.vy >= 0) {
                targetGround = ob.y - 20;
                onBlock = true;
            }
            // Если кубик врезается в бок платформы
            else if(pD.x + 18 > ob.x && pD.x + 2 < ob.x + ob.w && pD.y + 18 > ob.y && pD.y + 2 < ob.y + ob.h) {
                die(); if(!window.dRun) return;
            }
        }

        // Логика шипов
        if(ob.t === 'spike') {
            ctx.fillStyle = curMap.spike;
            ctx.beginPath(); ctx.moveTo(ob.x, ob.y+20); ctx.lineTo(ob.x+10, ob.y); ctx.lineTo(ob.x+20, ob.y+20); ctx.fill();
            // Строгий хитбокс
            if(pD.x + 16 > ob.x + 8 && pD.x + 4 < ob.x + 12 && pD.y + 18 > ob.y + 8 && pD.y + 2 < ob.y + 20) {
                die(); if(!window.dRun) return;
            }
        }

        // Логика орбов
        if(ob.t === 'orb' && !ob.used) {
            ctx.beginPath(); ctx.arc(ob.x+10, ob.y+10, 8 + Math.sin(dFrames*0.2)*2, 0, Math.PI*2);
            ctx.fillStyle = "#ffff00"; ctx.fill(); ctx.beginPath(); ctx.arc(ob.x+10, ob.y+10, 4, 0, Math.PI*2); ctx.fillStyle = "#fff"; ctx.fill();
        }

        // Удаление старых объектов и очки
        if(!ob.passed && ob.x < pD.x) {
            ob.passed = true;
            if(ob.t === 'spike' || ob.t === 'pit') {
                passedObsCount++;
                if(typeof window.addScore === 'function') window.addScore(0.005);
                if(passedObsCount % 15 === 0) mapIdx = (mapIdx + 1) % maps.length; 
            }
        }
        if(ob.x < -150) dObs.splice(i, 1); 
    }

    // Приземление
    if(pD.y >= targetGround) {
        pD.y = targetGround;
        pD.vy = 0;
        pD.rot = Math.round(pD.rot / (Math.PI/2)) * (Math.PI/2); // Магнитное выравнивание
        if(targetGround > 150) { die(); if(!window.dRun) return; } // Упал в пропасть!
    } else {
        pD.rot += 0.15; // Крутимся в полете
    }

    // 5. ОТРИСОВКА КУБИКА (ИГРОКА)
    if(dLives > 0) {
        ctx.save();
        ctx.translate(pD.x + 10, pD.y + 10);
        ctx.rotate(pD.rot);
        ctx.fillStyle = curMap.cubeMain;
        ctx.shadowBlur = 10; ctx.shadowColor = curMap.cubeMain;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = curMap.cubeInner; ctx.shadowBlur = 0;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = "#fff"; ctx.fillRect(-5, -5, 4, 4); ctx.fillRect(1, -5, 4, 4);
        ctx.restore();
    }

    // Частицы
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1.0;

    if(window.dRun) requestAnimationFrame(dLoop);
}
