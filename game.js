// 全域變數
let gameTable;       // 儲存 loadTable() 讀取的 CSV 資料
let quizData = [];   // 整理後的數據
let gameState = 'menu'; // 當前狀態: 'menu', 'game1', 'game2', 'result'
let score = 0;       // 分數

// 特效與系統變數
let cursorTrail = [];
const TRAIL_LENGTH = 15;
let particleSystem;

// 遊戲 2 相關變數
let fallingLetters = [];
let targetVowel = ''; // 正在掉落字母的正確元音 (例如: 'ㅗ')
let buttonData; // 儲存按鈕位置資訊
let inputKey = null; // 儲存玩家輸入的元音

// === 1. 檔案載入與初始化 ===

function preload() {
    // 必須使用 Live Server 或其他本地伺服器才能載入 CSV
    gameTable = loadTable('quiz_data.csv', 'csv', 'header');
}

function setup() {
    createCanvas(800, 600);
    noStroke();
    noCursor(); // 隱藏預設滑鼠
    textAlign(CENTER, CENTER);
    
    parseGameData(gameTable);
    particleSystem = new ParticleSystem();
    initializeButtons();

    // 遊戲 2 測試用：在 setup 中生成第一個掉落字母
    if (quizData.length > 0) {
        fallingLetters.push(new FallingLetter(quizData[3])); // 假設第 4 筆是 'drop' 數據
    }
}

// 初始化所有固定按鈕的位置，避免重疊
function initializeButtons() {
    buttonData = {
        // 主選單按鈕
        menuBtn1: { x: width / 2, y: 250, w: 200, h: 50, text: "遊戲 1: 單詞配對" },
        menuBtn2: { x: width / 2, y: 350, w: 200, h: 50, text: "遊戲 2: 韓文掉落" },
        
        // 遊戲控制按鈕 (位置修正：避免重疊)
        restart: { x: 700, y: 30, w: 100, h: 30, text: "重新開始" },
        backToMenu: { x: 580, y: 30, w: 100, h: 30, text: "返回選單" }, // 與重新開始按鈕隔開
        
        // 遊戲 2 輸入按鈕 (a, eo, o, u, i)
        vowelInputs: [
            { char: 'ㅏ', label: 'a', x: 200, y: 520, w: 60, h: 40 },
            { char: 'ㅓ', label: 'eo', x: 270, y: 520, w: 60, h: 40 },
            { char: 'ㅗ', label: 'o', x: 340, y: 520, w: 60, h: 40 },
            { char: 'ㅜ', label: 'u', x: 410, y: 520, w: 60, h: 40 },
            { char: 'ㅣ', label: 'i', x: 480, y: 520, w: 60, h: 40 },
        ]
    };
}

// 解析 CSV 資料
function parseGameData(table) {
    let rows = table.getRows();
    for (let row of rows) {
        quizData.push({
            type: row.getString('type'),
            korean: row.getString('korean_word'),
            imgPath: row.getString('image_path'),
            correctVowel: row.getString('correct_vowel') // 遊戲 2 用
            // 在實際專案中，這裡您可能需要 load 圖像
        });
    }
}

// === 2. 主要繪圖迴圈 ===

function draw() {
    background(240);
    
    // 繪製主遊戲畫面
    if (gameState === 'menu') {
        drawMenu();
    } else if (gameState === 'game1') {
        drawGame1(); // 單詞配對遊戲
    } else if (gameState === 'game2') {
        drawGame2(); // 韓文掉落遊戲
    } else if (gameState === 'result') {
        drawResultAnimation();
    }

    // 運行粒子系統
    particleSystem.run();
    
    // 繪製自定義游標特效
    drawCursorTrail();
}

// === 3. 滑鼠/鍵盤事件處理 ===

function mousePressed() {
    if (gameState === 'menu') {
        // 主選單點擊
        if (checkClick(buttonData.menuBtn1)) {
            gameState = 'game1';
            // 可以在此處初始化 Game 1 狀態
        } else if (checkClick(buttonData.menuBtn2)) {
            gameState = 'game2';
            // 可以在此處初始化 Game 2 狀態
        }
    } else if (gameState === 'game1' || gameState === 'game2') {
        // 檢查控制按鈕
        if (checkClick(buttonData.restart)) {
            resetCurrentGame();
        } else if (checkClick(buttonData.backToMenu)) {
            gameState = 'menu';
            // 清理當前遊戲狀態
        }

        if (gameState === 'game2') {
            // 遊戲 2 元音輸入按鈕
            for (let btn of buttonData.vowelInputs) {
                // 檢查是否點擊了元音按鈕
                if (checkClick(btn, {x: btn.x, y: btn.y, w: btn.w, h: btn.h})) {
                    inputKey = btn.char;
                    handleVowelInput(inputKey);
                    return; 
                }
            }
        }
    }
    // 其他遊戲點擊邏輯...
}

function handleVowelInput(vowel) {
    // 檢查是否有掉落的字母
    if (fallingLetters.length > 0) {
        let currentLetter = fallingLetters[0]; // 假設只處理最上面的
        
        if (currentLetter.data.correctVowel === vowel) {
            score++;
            particleSystem.createParticles('praise', currentLetter.pos.x, currentLetter.pos.y, 30);
            fallingLetters.splice(0, 1); // 移除正確的字母
            
            // 生成下一個字母
            let nextIndex = floor(random(quizData.length));
            if(quizData[nextIndex].type === 'drop') {
                fallingLetters.push(new FallingLetter(quizData[nextIndex]));
            }
        } else {
            particleSystem.createParticles('encourage', width / 2, height - 50, 15);
            // 可以在這裡扣分或給予懲罰
        }
    }
}


// 輔助函式：檢查點擊是否在按鈕內 (支援按鈕物件或座標物件)
function checkClick(btn, rect=btn) {
    if (mouseX > rect.x - rect.w / 2 && mouseX < rect.x + rect.w / 2 &&
        mouseY > rect.y - rect.h / 2 && mouseY < rect.y + rect.h / 2) {
        return true;
    }
    return false;
}

// === 4. 繪圖與遊戲邏輯函式 ===

// 繪製主選單
function drawMenu() {
    textSize(48);
    fill(50, 100, 200);
    text("韓文學習測驗系統", width / 2, 100);

    drawButton(buttonData.menuBtn1);
    drawButton(buttonData.menuBtn2);
}

// 遊戲 1: 單詞配對 (修正：確保圖像和文字顯示邏輯)
function drawGame1() {
    textSize(32);
    fill(50);
    text("遊戲 1: 圖像與單詞配對", width / 2, 80);

    // 繪製控制按鈕 (修正重疊問題)
    drawControlButtons();
    
    // --- 修正點: 確保圖像顯示 ---
    let currentItem = quizData.find(d => d.type === 'match'); // 找第一個配對題
    
    if (currentItem && currentItem.imgPath) {
        // ⚠️ 注意: 這裡需要您先在 preload 中載入圖像，並將結果儲存在變數中
        // 為了簡化，這裡僅繪製一個佔位符。
        fill(200, 200, 255);
        rect(width / 2 - 100, 200, 200, 200);
        
        fill(50);
        textSize(18);
        text(``, width / 2, 300); // 圖像佔位符
        
        // --- 修正點: 確保韓文單詞顯示 ---
        textSize(36);
        fill(255, 100, 100);
        text(currentItem.korean, width / 2, 450);
    } else {
         textSize(24);
         fill(255, 50, 50);
         text("數據或圖像路徑未找到，請檢查 quiz_data.csv", width / 2, height / 2);
    }
}

// 遊戲 2: 韓文掉落 (修正：增加元音按鈕)
function drawGame2() {
    textSize(32);
    fill(50);
    text("遊戲 2: 韓文元音輸入", width / 2, 80);
    text(`分數: ${score}`, 100, 30);
    
    // 繪製控制按鈕 (修正重疊問題)
    drawControlButtons();

    // 運行掉落邏輯
    for (let letter of fallingLetters) {
        letter.update();
        letter.display();
    }
    
    // 移除掉落超過底部的字母 (懲罰)
    for (let i = fallingLetters.length - 1; i >= 0; i--) {
        if (fallingLetters[i].pos.y > height) {
            fallingLetters.splice(i, 1);
            // 掉落懲罰: 產生鼓勵粒子並重新生成
            particleSystem.createParticles('encourage', width / 2, 0, 10);
            
            let nextIndex = floor(random(quizData.length));
            if(quizData[nextIndex].type === 'drop') {
                fallingLetters.push(new FallingLetter(quizData[nextIndex]));
            }
        }
    }

    // --- 修正點: 繪製元音輸入按鈕 ---
    drawVowelButtons();
}

// 繪製結果畫面
function drawResultAnimation() {
    // 略... 這裡可以放您的結果動畫邏輯
}

// 繪製通用按鈕
function drawButton(btn) {
    let isHover = checkClick(btn);
    
    // 繪製矩形
    rectMode(CENTER);
    fill(isHover ? 100 : 150, 150, 255);
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    
    // 繪製文字
    fill(255);
    textSize(20);
    text(btn.text, btn.x, btn.y);
    rectMode(CORNER);
}

// 繪製遊戲中的控制按鈕
function drawControlButtons() {
    drawButton(buttonData.restart);
    drawButton(buttonData.backToMenu);
}

// 繪製遊戲 2 的元音輸入按鈕
function drawVowelButtons() {
    for (let btn of buttonData.vowelInputs) {
        let isHover = checkClick(btn, {x: btn.x, y: btn.y, w: btn.w, h: btn.h});
        
        // 繪製矩形
        rectMode(CORNER);
        fill(isHover ? 255 : 200, 220, 100);
        rect(btn.x, btn.y, btn.w, btn.h, 5);
        
        // 繪製文字 (韓文元音)
        fill(50);
        textSize(24);
        text(btn.char, btn.x + btn.w / 2, btn.y + btn.h / 2);
        
        // 繪製標籤 (a, eo, o, u, i)
        textSize(14);
        fill(100);
        text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 15);
    }
}

// 重設當前遊戲
function resetCurrentGame() {
    score = 0;
    if (gameState === 'game2') {
        fallingLetters = [];
        // 重新初始化遊戲 2
        let nextIndex = floor(random(quizData.length));
        if(quizData[nextIndex].type === 'drop') {
            fallingLetters.push(new FallingLetter(quizData[nextIndex]));
        }
    }
    // TODO: 增加 game1 的重設邏輯
}


// === 5. 特效與物件類別 (保留原測驗系統的優秀部分) ===

// 掉落字母類別 (為遊戲 2 設計)
class FallingLetter {
    constructor(data) {
        this.data = data;
        this.pos = createVector(random(100, width - 100), -50);
        this.vel = createVector(0, random(1, 3));
        this.acc = createVector(0, 0.05); // 加速度讓它越來越快
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

// 粒子系統 (Particle System) 和 游標軌跡 (Cursor Trail) 
// 請參考我前一個回答中的 drawCursorTrail, Particle 和 ParticleSystem 類別，
// 將它們貼到 sketch.js 文件的最下方。

// [這裡應該貼上 Particle 和 ParticleSystem 類別]

// [這裡應該貼上 drawCursorTrail 函式]

/* --- 複製並貼上以下兩個類別和一個函式 --- */

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
        
        // 簡單的十字星形狀
        rect(0, -size/2, 1, size);
        rect(-size/2, 0, size, 1);
        
        pop();
    }
}
