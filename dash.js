// === VOLT DASH 2.5D ENGINE ===

// Глобальные переменные для игры
window.dRun = false;
let dLives = 3;
let pD = { x: 40, y: 120, vy: 0, rot: 0 };
let dObs = [];
let trails = [];
let particles = [];
let mapIdx = 0;
let passedObsCount = 0;
let bgScroll = 0;
let dFrames = 0;
let minGap = 100; // Минимальная дистанция между шипами

// Карты (Смена атмосферы)
const maps = [
    { bg: "#030305", text: "rgba(255, 174, 0, 0.05)", ground: "#ffae00", cubeFront: "#00ffff", cubeSide: "#00aaaa", spike: "#ff0055" }, // Cyber
    { bg: "#0a0202", text: "rgba(255, 0, 0, 0.05)", ground: "#ff3300", cubeFront: "#ffffff", cubeSide: "#aaaaaa", spike: "#ffcc00" }, // Magma
    { bg: "#000a11", text: "rgba(0, 255, 170, 0.05)", ground: "#00ffaa", cubeFront: "#ffae00", cubeSide: "#aa7700", spike: "#00aaff" }  // Quantum
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
    dLives = 3; mapIdx = 0; passedObsCount = 0; dFrames = 0;
    updateDLives();
    
    // Пытаемся запустить музыку, если функция есть в index.html
    if(typeof window.startMusic === 'function') window.startMusic();
    dLoop();
};

window.dashJump = function() {
    if(pD.y >= 120) {
        pD.vy = -8.5; 
        if(typeof window.sndJump === 'function') window.sndJump();
        createParticles(pD.x + 10, pD.y + 20, maps[mapIdx].cubeFront, 10);
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

// 3D Частицы
function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) {
        particles.push({ x: x, y: y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4 - 2, life: 1, color: color });
    }
}

function draw3DCube(ctx, x, y, size, rot, colorFront, colorSide) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rot);
    
    // Боковая тень (эффект 3D)
    ctx.fillStyle = colorSide;
    ctx.fillRect(-size/2 + 3, -size/2 + 3, size, size);
    
    // Лицевая сторона (светящаяся)
    ctx.shadowBlur = 10;
    ctx.shadowColor = colorFront;
    ctx.fillStyle = colorFront;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Блик
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(-size/2 + 2, -size/2 + 2, size - 10, 4);
    
    ctx.restore();
}

function draw3DSpike(ctx, x, y, color) {
    // Тень
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.moveTo(x+5, y+22); ctx.lineTo(x+15, y+5); ctx.lineTo(x+25, y+22); ctx.fill();
    
    // Основной шип
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y+20); ctx.lineTo(x+10, y); ctx.lineTo(x+20, y+20); ctx.closePath(); ctx.fill();
    
    // Внутренний яркий блик
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(x+5, y+18); ctx.lineTo(x+10, y+8); ctx.lineTo(x+15, y+18); ctx.closePath(); ctx.fill();
}

function dLoop() {
    if(!window.dRun) return;
    const dc = document.getElementById('dashCanvas');
    if(!dc) return;
    const ctx = dc.getContext('2d');
    const curMap = maps[mapIdx];
    
    dFrames++;

    // Фон карты
    ctx.fillStyle = curMap.bg;
    ctx.fillRect(0, 0, 300, 150);

    // Параллакс: Фоновый текст "VOLT AI ⚡️"
    bgScroll -= 0.5;
    if(bgScroll <= -300) bgScroll = 0;
    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = curMap.text;
    ctx.fillText("VOLT AI ⚡️", bgScroll + 50, 90);
    ctx.fillText("VOLT AI ⚡️", bgScroll + 350, 90);

    // Земля с эффектом глубины
    ctx.shadowBlur = 15; ctx.shadowColor = curMap.ground;
    ctx.fillStyle = curMap.ground;
    ctx.fillRect(0, 140, 300, 10);
    ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 140, 300, 2); // Блик на земле
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    // Гравитация
    pD.vy += 0.6; 
    pD.y += pD.vy; 
    if(pD.y > 120) { 
        pD.y = 120; pD.vy = 0; 
        pD.rot = Math.round(pD.rot / (Math.PI/2)) * (Math.PI/2); // Выравниваем куб при приземлении
    } else {
        pD.rot += 0.1; // Крутим в полете
    }

    // Шлейф (Трейл)
    trails.push({x: pD.x, y: pD.y, alpha: 0.5}); 
    if(trails.length > 8) trails.shift();
    trails.forEach((t, i) => { 
        ctx.globalAlpha = t.alpha * (i/8);
        ctx.fillStyle = curMap.cubeSide; 
        ctx.fillRect(t.x+2, t.y+2, 16, 16); 
    });
    ctx.globalAlpha = 1.0;

    // Отрисовка игрока
    draw3DCube(ctx, pD.x, pD.y, 20, pD.rot, curMap.cubeFront, curMap.cubeSide);

    // Умная генерация препятствий (защита от непроходимости)
    if(dFrames > minGap && Math.random() < 0.02) {
        dObs.push({x: 300, y: 120, passed: false});
        dFrames = 0;
        minGap = 70 + Math.random() * 60; // Меняем дистанцию до следующего
    }

    // Обработка шипов
    for(let i = dObs.length - 1; i >= 0; i--) {
        let ob = dObs[i]; 
        ob.x -= 4.5; 
        
        draw3DSpike(ctx, ob.x, ob.y, curMap.spike);
        
        // Коллизия
        if(pD.x < ob.x + 15 && pD.x + 20 > ob.x + 5 && pD.y + 20 > ob.y + 10) {
            if(typeof window.sndHit === 'function') window.sndHit();
            createParticles(pD.x+10, pD.y+10, "#ff0055", 30);
            if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
            
            dObs.splice(i, 1); 
            dLives--; 
            updateDLives();
            
            if(dLives <= 0) { 
                window.dRun = false; 
                if(typeof window.stopMusic === 'function') window.stopMusic();
                const ov = document.getElementById('ov-dash');
                const msg = document.getElementById('msg-dash');
                if(ov) ov.style.display = 'flex';
                if(msg) msg.innerHTML = '<span style="color:#ff0055">WASTED</span><br><br><span style="font-size:8px;color:#aaa">TAP TO RETRY</span>';
                return; 
            }
        } else if(!ob.passed && ob.x < pD.x) {
            ob.passed = true;
            passedObsCount++;
            if(typeof window.addScore === 'function') window.addScore(0.005);
            
            // Смена карты каждые 15 шипов
            if(passedObsCount % 15 === 0) {
                mapIdx = (mapIdx + 1) % maps.length;
            }
        } else if(ob.x < -20) { 
            dObs.splice(i, 1); 
        }
    }

    // Отрисовка частиц взрыва/прыжка
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1.0;

    if(window.dRun) requestAnimationFrame(dLoop);
}
