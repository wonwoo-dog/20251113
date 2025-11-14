// 全域變數
let gameTable;       
let quizData = [];   
let gameState = 'menu'; 
let score = 0;       
let game1Index = 0;  

// 特效與系統變數
let cursorTrail = [];
const TRAIL_LENGTH = 15;
let particleSystem;
let dataLoaded = false;

// 遊戲 2 相關變數
let fallingLetters = [];
let buttonData; // 儲存按鈕位置資訊
let inputKey = null;

// === 1. 檔案載入與初始化 ===

function preload() {
    // 載入 CSV 檔案，並檢查載入狀態
    gameTable = loadTable('quiz_data.csv', 'csv', 'header', 
        () => { dataLoaded = true; }, 
        (err) => { console.error("CSV 載入失敗！請確認檔案路徑和伺服器運行:", err); dataLoaded = false; }
    );
}

function setup() {
    createCanvas(800, 600);
    noStroke();
    noCursor(); // 隱藏預設滑鼠
    textAlign(CENTER, CENTER);
    
    if (dataLoaded) {
        parseGameData(gameTable);
    }
    
    particleSystem = new ParticleSystem();
    initializeButtons();

    // 初始化遊戲 2 的第一個掉落字母
    if (quizData.length > 0) {
        const dropQuestions = quizData.filter(d => d.type === 'drop');
        if(dropQuestions.length > 0) {
             fallingLetters.push(new FallingLetter(dropQuestions[0])); 
        }
    }
}

// 初始化所有固定按鈕的位置 (修正重疊問題)
function initializeButtons() {
    buttonData = {
        // 主選單按鈕 (在畫布中央)
        menuBtn1: { x: width / 2, y: 250, w: 250, h: 60, text: "遊戲 1: 單字配對" },
        menuBtn2: { x: width / 2, y: 350, w: 250, h: 60, text: "遊戲 2: 韓文射擊機" },
        
        // 遊戲控制按鈕 (重疊修正: 間隔拉大，並將 x, y 定位設為中心點)
        restart: { x: 700, y: 30, w: 120, h: 30, text: "重新開始" }, // 右上角
        backToMenu: { x: 550, y: 30, w: 120, h: 30, text: "返回選單" }, // 靠左一點
        
        // 遊戲 2 輸入按鈕 (a, eo, o, u, i)
        // 這裡的 x, y 是左上角座標，因為 drawVowelButtons 中使用 rectMode(CORNER)
        vowelInputs: [
            { char: 'ㅏ', label: 'a', x: 200, y: 520, w: 60, h: 40 },
            { char: 'ㅓ', label: 'eo', x: 270, y: 520, w: 60, h: 40 },
            { char: 'ㅗ', label: 'o', x: 340, y: 520, w: 60, h: 40 },
            { char: 'ㅜ', label: 'u', x: 410, y: 520, w: 60, h: 40 },
            { char: 'ㅣ', label: 'i', x: 480, y: 520, w: 60, h: 40 },
        ]
    };
}

function parseGameData(table) {
    let rows = table.getRows();
    for (let row of rows) {
        quizData.push({
            type: row.getString('type'),
            korean: row.getString('korean_word'),
            imgPath: row.getString('image_path'),
            correctVowel: row.getString('correct_vowel') 
        });
    }
}

// === 2. 主要繪圖迴圈 ===

function draw() {
    background(240);
    
    if (gameState === 'menu') {
        drawMenu();
    } else if (gameState === 'game1') {
        drawGame1(); 
    } else if (gameState === 'game2') {
        drawGame2(); 
    } else if (gameState === 'result') {
        drawResultAnimation();
    }

    particleSystem.run();
    drawCursorTrail();
}

// === 3. 滑鼠事件處理 ===

function mousePressed() {
    if (gameState === 'menu') {
        // 點擊主選單按鈕
        if (checkClick(buttonData.menuBtn1)) {
            gameState = 'game1';
            game1Index = 0;
        } else if (checkClick(buttonData.menuBtn2)) {
            gameState = 'game2';
            resetCurrentGame();
        }
    } else if (gameState === 'game1' || gameState === 'game2') {
        // 檢查控制按鈕
        if (checkClick(buttonData.restart)) {
            resetCurrentGame();
        } else if (checkClick(buttonData.backToMenu)) {
            gameState = 'menu';
            score = 0;
            fallingLetters = [];
        }

        if (gameState === 'game2') {
            // 遊戲 2 元音輸入按鈕
            for (let btn of buttonData.vowelInputs) {
                // checkClick 參數調整以適應 rectMode(CORNER) 的按鈕
                if (checkClick(btn, {x: btn.x + btn.w/2, y: btn.y + btn.h/2, w: btn.w, h: btn.h})) {
                    handleVowelInput(btn.char);
                    return; 
                }
            }
        }
    }
}

function handleVowelInput(vowel) {
    if (fallingLetters.length > 0) {
        let currentLetter = fallingLetters[0]; 
        
        if (currentLetter.data.correctVowel === vowel) {
            score++;
            particleSystem.createParticles('praise', currentLetter.pos.x, currentLetter.pos.y, 30);
            fallingLetters.splice(0, 1); 
            spawnNextFallingLetter();
        } else {
            particleSystem.createParticles('encourage', width / 2, height - 50, 15);
        }
    }
}

function spawnNextFallingLetter() {
    const dropQuestions = quizData.filter(d => d.type === 'drop');
    if(dropQuestions.length > 0) {
        let nextIndex = floor(random(dropQuestions.length));
        fallingLetters.push(new FallingLetter(dropQuestions[nextIndex]));
    }
}


// 輔助函式：檢查點擊是否在按鈕內 (使用中心點座標)
function checkClick(btn, rect=btn) {
    // 預設按鈕 data 的 x, y 已經是中心點 (用於 menuBtn 和 controlBtn)
    // 對於 vowelInputs，需要傳入 rect 參數進行修正
    if (mouseX > rect.x - rect.w / 2 && mouseX < rect.x + rect.w / 2 &&
        mouseY > rect.y - rect.h / 2 && mouseY < rect.y + rect.h / 2) {
        return true;
    }
    return false;
}

// === 4. 繪圖與遊戲邏輯函式 ===

function drawMenu() {
    textSize(48);
    fill(50, 100, 200);
    text("韓文學習測驗系統", width / 2, 100);

    drawButton(buttonData.menuBtn1);
    drawButton(buttonData.menuBtn2);

    if (!dataLoaded) {
        textSize(20);
        fill(255, 50, 50);
        text("⚠️ 警告：CSV 文件載入失敗！請使用 Live Server 或檢查路徑。", width / 2, height - 50);
    }
}

// 遊戲 1: 單詞配對 (修正：確保圖像和文字顯示邏輯)
function drawGame1() {
    textSize(32);
    fill(50);
    text("遊戲 1: 圖像與單詞配對", width / 2, 80);

    drawControlButtons(); // 繪製控制按鈕
    
    const matchQuestions = quizData.filter(d => d.type === 'match');
    
    if (matchQuestions.length > 0 && game1Index < matchQuestions.length) {
        let currentItem = matchQuestions[game1Index];
        
        // 繪製圖案/圖像佔位符 (圖案)
        fill(200, 200, 255);
        rectMode(CENTER);
        rect(width / 2, 250, 250, 250); // 圖像/圖案區域
        
        fill(50);
        textSize(18);
        text(`[圖案: ${currentItem.imgPath}]`, width / 2, 250); // 圖像佔位符
        
        // 繪製韓文單詞 (單詞)
        textSize(36);
        fill(255, 100, 100);
        text(currentItem.korean, width / 2, 450);
        
        // TODO: 繪製選項按鈕邏輯...
        
    } else if (!dataLoaded) {
         textSize(24);
         fill(255, 50, 50);
         text("CSV 未載入。請檢查 Live Server。", width / 2, height / 2);
    } else {
         textSize(24);
         fill(50, 200, 50);
         text("遊戲 1 結束或數據不足。", width / 2, height / 2);
    }
    rectMode(CORNER);
}

// 遊戲 2: 韓文掉落 (修正：增加元音按鈕)
function drawGame2() {
    textSize(32);
    fill(50);
    text("遊戲 2: 韓文元音輸入", width / 2, 80);
    text(`分數: ${score}`, 100, 30);
    
    drawControlButtons(); // 繪製控制按鈕

    // 運行掉落邏輯
    for (let letter of fallingLetters) {
        letter.update();
        letter.display();
    }
    
    // 移除掉落超過底部的字母 (懲罰)
    for (let i = fallingLetters.length - 1; i >= 0; i--) {
        if (fallingLetters[i].pos.y > height) {
            fallingLetters.splice(i, 1);
            particleSystem.createParticles('encourage', width / 2, 0, 10);
            spawnNextFallingLetter();
        }
    }

    // --- 修正點: 繪製元音輸入按鈕 ---
    drawVowelButtons();
}

function drawResultAnimation() {
    textSize(40);
    fill(50);
    text(`測驗結束！最終分數: ${score}`, width / 2, height / 2);
    drawButton({ x: width / 2, y: height * 0.7, w: 150, h: 50, text: "返回選單" });
    if (checkClick({ x: width / 2, y: height * 0.7, w: 150, h: 50, text: "返回選單" })) {
         gameState = 'menu';
    }
}

// 繪製通用按鈕 (使用 CENTER 模式)
function drawButton(btn) {
    let isHover = checkClick(btn);
    
    rectMode(CENTER);
    fill(isHover ? 100 : 150, 150, 255);
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    
    fill(255);
    textSize(20);
    text(btn.text, btn.x, btn.y);
    rectMode(CORNER); // 繪製完畢切回 CORNER
}

// 繪製遊戲中的控制按鈕 (重新開始和返回選單)
function drawControlButtons() {
    drawButton(buttonData.restart);
    drawButton(buttonData.backToMenu);
}

// 繪製遊戲 2 的元音輸入按鈕 (使用 CORNER 模式)
function drawVowelButtons() {
    for (let btn of buttonData.vowelInputs) {
        // 檢查滑鼠是否在按鈕上 (需要將左上角轉換為中心點檢查)
        let centerPoint = {x: btn.x + btn.w/2, y: btn.y + btn.h/2, w: btn.w, h: btn.h};
        let isHover = checkClick(btn, centerPoint);
        
        rectMode(CORNER);
        fill(isHover ? 255 : 200, 220, 100);
        rect(btn.x, btn.y, btn.w, btn.h, 5);
        
        fill(50);
        textSize(24);
        text(btn.char, btn.x + btn.w / 2, btn.y + btn.h / 2 - 5); // 韓文元音
        
        textSize(14);
        fill(100);
        text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 15); // 英文標籤
    }
}

function resetCurrentGame() {
    score = 0;
    if (gameState === 'game1') {
        game1Index = 0;
    } else if (gameState === 'game2') {
        fallingLetters = [];
        spawnNextFallingLetter();
    }
}

// === 5. 特效與物件類別 ===

class FallingLetter {
    constructor(data) {
        this.data = data;
        this.pos = createVector(random(100, width - 100), -50);
        this.vel = createVector(0, random(1, 3));
        this.acc = createVector(0, 0.05);
        this.color = color(random(50, 150), 100, 200);
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
    }

    display() {
        fill(this.color);
        textSize(40);
        text(this.data.korean, this.pos.x, this.pos.y);
    }
}

class Particle {
    constructor(x, y, type) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(2, 5));
        this.acc = createVector(0, 0);
        this.life = 255;
        this.type = type;
        this.size = random(5, 15);

        switch (this.type) {
            case 'praise': 
                this.color = color(random(100, 200), 255, random(100, 200), this.life);
                this.vel.y = random(-5, -1); 
                this.acc = createVector(0, -0.05); 
                break;
            case 'encourage': 
                this.color = color(random(100, 200), random(100, 200), 255, this.life);
                this.acc = createVector(0, 0.1); 
                break;
            default:
                this.color = color(255, 200, 0, this.life);
                this.vel = p5.Vector.random2D().mult(random(3, 8));
                this.acc = createVector(0, 0.2); 
        }
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.life -= 4; 
        this.size *= 0.98;
    }

    display() {
        if (this.life > 0) {
            this.color.setAlpha(this.life);
            fill(this.color);
            ellipse(this.pos.x, this.pos.y, this.size);
        }
    }

    isFinished() {
        return this.life < 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createParticles(type, x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, type));
        }
    }

    run() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.display();
            if (p.isFinished()) {
                this.particles.splice(i, 1);
            }
        }
    }
}

function drawCursorTrail() {
    cursorTrail.push({ x: mouseX, y: mouseY, life: 255 });

    if (cursorTrail.length > TRAIL_LENGTH) {
        cursorTrail.shift();
    }

    for (let i = 0; i < cursorTrail.length; i++) {
        let p = cursorTrail[i];
        let alpha = map(i, 0, cursorTrail.length, 0, 200);
        let size = map(i, 0, cursorTrail.length, 5, 15);

        fill(255, 255, 0, alpha);
        
        push();
        translate(p.x, p.y);
        rotate(frameCount * 0.05);
        
        rect(0, -size/2, 1, size);
        rect(-size/2, 0, size, 1);
        
        pop();
    }
}
