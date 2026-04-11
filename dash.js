// === VOLT DASH: ULTIMATE GEOMETRY DASH ENGINE ===

// Глобальные переменные состояния
window.dRun = false;
let dLives = 3;
let pD = { x: 50, y: 120, vy: 0, rot: 0, isGrounded: true };
let dObs = [];
let particles = [];
let ghostTrail = [];
let mapIdx = 0;
let passedObsCount = 0;
let dFrames = 0;
let nextSpawnDist = 50;
let bgScroll = 0;
let gridOffset = 0;
let shakeTime = 0;

// === ФИЗИКА УРОВНЯ AAA ===
// Настроено под оригинальный Geometry Dash
const SPEED = 5.0;         // Скорость скроллинга
const JUMP_FORCE = -10.5;  // Резкий, мощный прыжок
const ORB_FORCE = -10.0;   // Прыжок от орба
const GRAVITY = 0.85;      // Тяжелая гравитация, чтобы куб быстро падал вниз

// ЦВЕТОВЫЕ СХЕМЫ (3 разные атмосферы)
const maps = [
    { bg: "#050510", grid: "rgba(0, 255, 255, 0.1)", line: "#00ffff", ground: "#001122", cubeM: "#00ffff", cubeI: "#0088ff", spike: "#ff0055", block: "#002244" },
    { bg: "#100000", grid: "rgba(255, 50, 0, 0.1)",  line: "#ff3300", ground: "#220000", cubeM: "#ffae00", cubeI: "#cc3300", spike: "#ffffff", block: "#330000" },
    { bg: "#001005", grid: "rgba(0, 255, 170, 0.1)", line: "#00ffaa", ground: "#002211", cubeM: "#ff00aa", cubeI: "#880055", spike: "#00ffaa", block: "#003311" }
];

// ПАТТЕРНЫ УРОВНЕЙ (Блочная генерация, 100% проходимость)
const chunks = [
    { w: 180, obs: [{t:'spike', x:0, y:120}] }, // 1 шип
    { w: 220, obs: [{t:'spike', x:0, y:120}, {t:'spike', x:25, y:120}] }, // 2 шипа
    { w: 280, obs: [{t:'spike', x:0, y:120}, {t:'spike', x:25, y:120}, {t:'spike', x:50, y:120}] }, // 3 шипа (скилл-чек)
    { w: 280, obs: [{t:'pit', x:0, w:120}, {t:'orb', x:60, y:60}] }, // Пропасть с желтым кольцом
    { w: 350, obs: [ // Лесенка из блоков
        {t:'block', x:0, y:90, w:50, h:30}, 
        {t:'block', x:50, y:60, w:50, h:60}, 
        {t:'spike', x:50, y:40}
    ]},
    { w: 300, obs: [ // Шип, потом запрыгнуть на парящий блок
        {t:'spike', x:0, y:120},
        {t:'block', x:80, y:80, w:100, h:20}
    ]},
    { w: 280, obs: [ // Яма, внутри блок
        {t:'pit', x:0, w:150},
        {t:'block', x:50, y:90, w:50, h:30}
    ]}
];

// Обновление интерфейса
function updateDLives() { 
    const hpEl = document.getElementById('hp-dash');
    if(hpEl) hpEl.innerText = 'HP: ' + dLives; 
}

// СТАРТ ИГРЫ
window.startDash = function() {
    if(window.dRun) return;
    const ov = document.getElementById('ov-dash');
    if(ov) ov.style.display = 'none';
    
    window.dRun = true;
    pD.x = 50; pD.y = 120; pD.vy = 0; pD.rot = 0; pD.isGrounded = true;
    dObs = []; particles = []; ghostTrail = [];
    dLives = 3; mapIdx = 0; passedObsCount = 0; dFrames = 0; nextSpawnDist = 150; shakeTime = 0;
    
    updateDLives();
    
    // Подключаем тап по экрану для прыжка
    const dc = document.getElementById('dashCanvas');
    if(dc) dc.onpointerdown = window.dashJump;
    
    // Включаем музыку, если она есть
    if(typeof window.startMusic === 'function') window.startMusic();
    dLoop();
};

// ЛОГИКА ПРЫЖКА
window.dashJump = function(e) {
    if(e) e.preventDefault();
    if(!window.dRun) return;

    let hitOrb = false;
    
    // 1. Проверка Орбов (Широкое окно захвата)
    for(let i=0; i<dObs.length; i++) {
        let ob = dObs[i];
        if(ob.t === 'orb' && !ob.used) {
            let dist = Math.hypot((pD.x+10) - (ob.x+10), (pD.y+10) - (ob.y+10));
            if(dist < 65) { // Дистанция захвата
                pD.vy = ORB_FORCE; 
                pD.isGrounded = false;
                ob.used = true;
                hitOrb = true;
                createParts(ob.x+10, ob.y+10, "#ffff00", 25, 6); // Взрыв орба
                if(typeof window.sndJump === 'function') window.sndJump();
                if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
                break;
            }
        }
    }

    // 2. Обычный прыжок с поверхности
    if(!hitOrb && pD.isGrounded) {
        pD.vy = JUMP_FORCE; 
        pD.isGrounded = false;
        if(typeof window.sndJump === 'function') window.sndJump();
        createParts(pD.x + 10, pD.y + 20, maps[mapIdx].cubeM, 8, 2); 
        if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    }
};

// ВЫХОД
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

// ГЕНЕРАТОР ЧАСТИЦ
function createParts(x, y, color, count, speed=5) {
    for(let i=0; i<count; i++) {
        particles.push({ 
            x: x, y: y, 
            vx: (Math.random()-0.5)*speed, 
            vy: (Math.random()-0.5)*speed - 2, 
            life: 1, color: color, size: Math.random()*4+2 
        });
    }
}

// СМЕРТЬ ИГРОКА
function die() {
    if(typeof window.sndHit === 'function') window.sndHit();
    createParts(pD.x+10, pD.y+10, maps[mapIdx].cubeM, 60, 10); // Эпичный разлет куба на пиксели
    if(window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('heavy');
    
    shakeTime = 15; // Тряска экрана
    dLives--; updateDLives();
    
    if(dLives <= 0) { 
        window.dRun = false; 
        if(typeof window.stopMusic === 'function') window.stopMusic();
        document.getElementById('ov-dash').style.display='flex';
        document.getElementById('msg-dash').innerHTML = '<span style="color:#ff0055">WASTED</span><br><br><span style="font-size:8px;color:#aaa">TAP TO RETRY</span>';
    } else {
        // Очищаем экран впереди, чтобы дать возможность разогнаться
        dObs = dObs.filter(o => o.x > 200 || o.t === 'pit');
        pD.y = -20; // Падаем сверху при возрождении
        pD.vy = 0; pD.x = 50; pD.rot = 0;
        ghostTrail = []; // ФИКС: Очищаем шлейф, чтобы не было бага
    }
}

// ОТРИСОВКА КУБИКА (Истинный стиль GD)
function drawGDCube(ctx, x, y, size, rot, cMain, cInner, alpha=1.0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rot);
    
    // Толстая обводка (Свечение)
    ctx.fillStyle = cMain;
    if(alpha === 1.0) { ctx.shadowBlur = 10; ctx.shadowColor = cMain; }
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Внутренний цвет
    ctx.shadowBlur = 0;
    ctx.fillStyle = cInner;
    ctx.fillRect(-size/2 + 3, -size/2 + 3, size - 6, size - 6);
    
    // Лицо (Глаза и рот)
    ctx.fillStyle = "#fff";
    ctx.fillRect(-size/2 + 4, -size/2 + 4, 3, 3); // Л Глаз
    ctx.fillRect(-size/2 + 13, -size/2 + 4, 3, 3); // П Глаз
    ctx.fillRect(-size/2 + 6, -size/2 + 12, 8, 2); // Рот
    
    ctx.restore();
}

// ОСНОВНОЙ ИГРОВОЙ ЦИКЛ
function dLoop() {
    if(!window.dRun) return;
    const dc = document.getElementById('dashCanvas');
    if(!dc) return;
    const ctx = dc.getContext('2d');
    const curMap = maps[mapIdx];
    
    dFrames++;

    // --- 1. ОЧИСТКА И ТРЯСКА ЭКРАНА ---
    ctx.fillStyle = curMap.bg;
    ctx.fillRect(0, 0, 300, 150);

    ctx.save();
    if(shakeTime > 0) {
        ctx.translate((Math.random()-0.5)*8, (Math.random()-0.5)*8);
        shakeTime--;
    }

    // --- 2. ФОН: КИБЕР-СЕТКА И ПАРАЛЛАКС ---
    // Пульсация фона
    let pulse = 0.5 + Math.sin(dFrames * 0.1) * 0.2;
    ctx.fillStyle = curMap.block; ctx.globalAlpha = pulse * 0.2;
    ctx.fillRect(0, 0, 300, 150); ctx.globalAlpha = 1.0;

    // Движущаяся 3D Сетка
    ctx.strokeStyle = curMap.grid; ctx.lineWidth = 1;
    gridOffset -= SPEED * 0.5; if(gridOffset <= -30) gridOffset = 0;
    for(let i=0; i<15; i++) {
        ctx.beginPath(); ctx.moveTo(gridOffset + i*30, 0); ctx.lineTo(gridOffset + i*30, 150); ctx.stroke();
    }

    // Текст VOLT AI на фоне
    bgScroll -= SPEED * 0.2; if(bgScroll <= -400) bgScroll = 0;
    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillText("VOLT AI ⚡️", bgScroll + 50, 90);
    ctx.fillText("VOLT AI ⚡️", bgScroll + 450, 90);

    // --- 3. ПОЛ И ЕГО ДВИЖЕНИЕ ---
    ctx.fillStyle = curMap.ground; ctx.fillRect(0, 140, 300, 10);
    ctx.fillStyle = curMap.line; ctx.shadowBlur = 10; ctx.shadowColor = curMap.line;
    ctx.fillRect(0, 138, 300, 2); ctx.shadowBlur = 0;

    // --- 4. ГЕНЕРАЦИЯ УРОВНЯ ---
    nextSpawnDist -= SPEED;
    if(nextSpawnDist <= 0) {
        let chunk = chunks[Math.floor(Math.random() * chunks.length)];
        let startX = 320;
        chunk.obs.forEach(obj => {
            dObs.push({ t: obj.t, x: startX + obj.x, y: obj.y, w: obj.w, h: obj.h, passed: false, used: false });
        });
        nextSpawnDist = chunk.w; 
    }

    // --- 5. ФИЗИКА КУБИКА ---
    pD.vy += GRAVITY;
    pD.y += pD.vy;
    
    let targetGround = 120; // Базовая высота пола
    let onPlatform = false;
    let cx = pD.x + 10; // Центр кубика
    let cy = pD.y + 10;

    // --- 6. ОБРАБОТКА ОБЪЕКТОВ ---
    for(let i = dObs.length - 1; i >= 0; i--) {
        let ob = dObs[i]; 
        ob.x -= SPEED; 

        // 6.1 ПРОПАСТЬ
        if(ob.t === 'pit') {
            ctx.fillStyle = curMap.bg; 
            ctx.fillRect(ob.x, 138, ob.w, 12); // Рисуем дыру
            if(cx > ob.x && cx < ob.x + ob.w && !onPlatform) {
                targetGround = 200; // Разрешаем падать в яму
            }
        }
        
        // 6.2 БЛОК (ПЛАТФОРМА)
        if(ob.t === 'block') {
            ctx.fillStyle = curMap.block; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
            ctx.strokeStyle = curMap.line; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
            
            // Проверка: приземлился ли куб СВЕРХУ на блок
            if(cx > ob.x && cx < ob.x + ob.w && pD.y + 20 >= ob.y && pD.y + 20 - pD.vy <= ob.y + 10 && pD.vy >= 0) {
                targetGround = ob.y - 20;
                onPlatform = true;
            }
            // Проверка: врезался ли куб в БОК блока
            else if(pD.x + 18 > ob.x && pD.x + 2 < ob.x + ob.w && pD.y + 18 > ob.y && pD.y + 2 < ob.y + ob.h) {
                die(); 
                if(!window.dRun) return;
                break; // ФИКС КРАША: прерываем цикл, массив изменен!
            }
        }

        // 6.3 ШИПЫ
        if(ob.t === 'spike') {
            ctx.fillStyle = curMap.spike; ctx.shadowBlur = 10; ctx.shadowColor = curMap.spike;
            ctx.beginPath(); ctx.moveTo(ob.x, ob.y+20); ctx.lineTo(ob.x+10, ob.y); ctx.lineTo(ob.x+20, ob.y+20); ctx.fill(); ctx.shadowBlur = 0;
            
            // ЧЕСТНЫЙ ХИТБОКС (Суженная зона смерти)
            let sLeft = ob.x + 6, sRight = ob.x + 14, sTop = ob.y + 8, sBot = ob.y + 20;
            if(pD.x + 16 > sLeft && pD.x + 4 < sRight && pD.y + 16 > sTop && pD.y + 4 < sBot) {
                die(); 
                if(!window.dRun) return;
                break; // ФИКС КРАША: прерываем цикл!
            }
        }

        // 6.4 ОРБЫ (Кольца прыжка)
        if(ob.t === 'orb' && !ob.used) {
            ctx.beginPath(); ctx.arc(ob.x+10, ob.y+10, 8 + Math.sin(dFrames*0.2)*2, 0, Math.PI*2);
            ctx.fillStyle = "#ffff00"; ctx.shadowBlur = 15; ctx.shadowColor = "#ffff00"; ctx.fill();
            ctx.beginPath(); ctx.arc(ob.x+10, ob.y+10, 4, 0, Math.PI*2); ctx.fillStyle = "#fff"; ctx.shadowBlur = 0; ctx.fill();
        }

        // 6.5 НАЧИСЛЕНИЕ ОЧКОВ
        if(!ob.passed && ob.x + (ob.w || 20) < pD.x) {
            ob.passed = true;
            if(ob.t === 'spike' || ob.t === 'pit') {
                passedObsCount++;
                if(typeof window.addScore === 'function') window.addScore(0.005); // Копеечка!
                if(passedObsCount % 15 === 0) mapIdx = (mapIdx + 1) % maps.length; // Смена цвета уровня
            }
        }
        
        // Удаление старых объектов
        if(ob.x < -150) dObs.splice(i, 1); 
    }

    // --- 7. ПРИЗЕМЛЕНИЕ И ВРАЩЕНИЕ ---
    if(pD.y >= targetGround) {
        pD.y = targetGround;
        pD.vy = 0;
        pD.isGrounded = true;
        // Магнитное выравнивание (Snap to 90 degrees)
        pD.rot = Math.round(pD.rot / (Math.PI/2)) * (Math.PI/2); 
        
        if(targetGround > 150) { 
            die(); 
            if(!window.dRun) return; 
        } 
    } else {
        pD.isGrounded = false;
        pD.rot += 0.15; // Вращение в воздухе
    }

    // --- 8. ОТРИСОВКА ИГРОКА И GHOST TRAIL ---
    if(dLives > 0) {
        // Запись следа (только в прыжке)
        if(!pD.isGrounded) {
            ghostTrail.push({x: pD.x, y: pD.y, rot: pD.rot});
            if(ghostTrail.length > 6) ghostTrail.shift();
        } else if(ghostTrail.length > 0) {
            ghostTrail.shift(); // Быстро убираем след на земле
        }

        // Рисуем шлейф (Фантомы)
        ghostTrail.forEach((t, i) => {
            drawGDCube(ctx, t.x, t.y, 20, t.rot, curMap.cubeM, curMap.cubeI, (i+1)*0.08);
        });

        // Основной куб
        drawGDCube(ctx, pD.x, pD.y, 20, pD.rot, curMap.cubeM, curMap.cubeI, 1.0);
    }

    // --- 9. ОТРИСОВКА ЧАСТИЦ ВЗРЫВА ---
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore(); // Конец Screen Shake

    if(window.dRun) requestAnimationFrame(dLoop);
}
