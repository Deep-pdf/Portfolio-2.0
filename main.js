setInterval(() => {
    document.getElementById("time").innerHTML =
        new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
}, 1000);

const icons = document.querySelectorAll('.icon');

const GRID_SIZE = 110;

icons.forEach(icon => {

    let isDragging = false;

    let offsetX = 0;
    let offsetY = 0;

    icon.addEventListener('mousedown', (e) => {

        isDragging = true;

        icon.classList.add('dragging');

        offsetX = e.clientX - icon.offsetLeft;
        offsetY = e.clientY - icon.offsetTop;

    });

    document.addEventListener('mousemove', (e) => {

        if (!isDragging) return;

        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        icon.style.left = x + 'px';
        icon.style.top = y + 'px';

    });

    document.addEventListener('mouseup', () => {

        if (!isDragging) return;

        isDragging = false;

        icon.classList.remove('dragging');

        /* GRID SNAP */

        let finalX = parseInt(icon.style.left);
        let finalY = parseInt(icon.style.top);

        finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
        finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

        /* Smooth Snap */

        icon.style.transition = 'all 0.18s ease';

        icon.style.left = finalX + 'px';
        icon.style.top = finalY + 'px';

        setTimeout(() => {
            icon.style.transition = '';
        }, 200);
    });
});

const board = document.getElementById("board");
const timerDisplay = document.getElementById("timer");
const mineCountDisplay = document.getElementById("mineCount");
const resetBtn = document.getElementById("resetBtn");
const overlay = document.getElementById("overlay");
const replayBtn = document.getElementById("replayBtn");

const SIZE = 9;
const MINES = 10;

let cells = [];
let gameOver = false;
let firstClick = true;
let timer = 0;
let timerInterval;
let flags = 0;

/* CREATE BOARD */

function createBoard(){

    board.innerHTML = "";

    cells = [];
    gameOver = false;
    firstClick = true;
    timer = 0;
    flags = 0;

    overlay.classList.remove("show");

    clearInterval(timerInterval);

    timerDisplay.textContent = "000";
    mineCountDisplay.textContent = "010";

    resetBtn.textContent = "🙂";

    for(let y=0;y<SIZE;y++){

        for(let x=0;x<SIZE;x++){

            const cellEl = document.createElement("div");

            cellEl.classList.add("cell");

            const cell = {
                x,
                y,
                mine:false,
                revealed:false,
                flagged:false,
                number:0,
                element:cellEl
            };

            cellEl.addEventListener("click",()=>clickCell(cell));

            cellEl.addEventListener("contextmenu",(e)=>{
                e.preventDefault();
                toggleFlag(cell);
            });

            board.appendChild(cellEl);

            cells.push(cell);
        }
    }
}

/* RANDOM MINES */

function placeMines(excludeX, excludeY){

    let placed = 0;

    while(placed < MINES){

        const x = Math.floor(Math.random()*SIZE);
        const y = Math.floor(Math.random()*SIZE);

        if(x === excludeX && y === excludeY) continue;

        const cell = getCell(x,y);

        if(!cell.mine){

            cell.mine = true;

            placed++;
        }
    }

    calculateNumbers();
}

/* NUMBERS */

function calculateNumbers(){

    cells.forEach(cell=>{

        if(cell.mine) return;

        let count = 0;

        for(let dy=-1;dy<=1;dy++){
            for(let dx=-1;dx<=1;dx++){

                if(dx===0 && dy===0) continue;

                const neighbor = getCell(cell.x+dx,cell.y+dy);

                if(neighbor && neighbor.mine) count++;
            }
        }

        cell.number = count;
    });
}

function getCell(x,y){

    if(x<0 || y<0 || x>=SIZE || y>=SIZE) return null;

    return cells.find(c=>c.x===x && c.y===y);
}

/* TIMER */

function startTimer(){

    clearInterval(timerInterval);

    timerInterval = setInterval(()=>{

        timer++;

        timerDisplay.textContent =
            String(timer).padStart(3,'0');

    },1000);
}

/* CLICK */

function clickCell(cell){

    if(gameOver || cell.revealed || cell.flagged) return;

    if(firstClick){

        placeMines(cell.x,cell.y);

        startTimer();

        firstClick = false;
    }

    reveal(cell);

    checkWin();
}

/* REVEAL */

function reveal(cell){

    if(!cell || cell.revealed || cell.flagged) return;

    cell.revealed = true;

    cell.element.classList.add("revealed");

    if(cell.mine){

        triggerExplosion(cell);

        return;
    }

    if(cell.number > 0){

        cell.element.textContent = cell.number;

        cell.element.classList.add(`num${cell.number}`);

    }else{

        for(let dy=-1;dy<=1;dy++){
            for(let dx=-1;dx<=1;dx++){

                if(dx===0 && dy===0) continue;

                reveal(getCell(cell.x+dx,cell.y+dy));
            }
        }
    }
}

/* FLAGS */

function toggleFlag(cell){

    if(gameOver || cell.revealed) return;

    cell.flagged = !cell.flagged;

    if(cell.flagged){

        cell.element.textContent = "🚩";

        flags++;

    }else{

        cell.element.textContent = "";

        flags--;
    }

    mineCountDisplay.textContent =
        String(MINES - flags).padStart(3,'0');
}

/* EXPLOSION */

function triggerExplosion(cell){

    gameOver = true;

    clearInterval(timerInterval);

    resetBtn.textContent = "😵";

    const rect = cell.element.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    const x = rect.left - boardRect.left + 21;
    const y = rect.top - boardRect.top + 21;

    const explosion = document.createElement("div");

    explosion.classList.add("explosion");

    explosion.style.left = x + "px";
    explosion.style.top = y + "px";

    board.appendChild(explosion);

    /* PARTICLES */

    for(let i=0;i<35;i++){

        const particle = document.createElement("div");

        particle.classList.add("particle");

        particle.style.left = x + "px";
        particle.style.top = y + "px";

        particle.style.setProperty(
            "--x",
            `${(Math.random()-0.5)*500}px`
        );

        particle.style.setProperty(
            "--y",
            `${(Math.random()-0.5)*500}px`
        );

        board.appendChild(particle);

        setTimeout(()=>{
            particle.remove();
        },1000);
    }

    setTimeout(()=>{

        revealAllMines();

        overlay.classList.add("show");

    },700);
}

/* SHOW ALL */

function revealAllMines(){

    cells.forEach(cell=>{

        if(cell.mine){

            cell.element.classList.add("revealed");
            cell.element.classList.add("mine");

            cell.element.textContent = "💣";
        }
    });
}

/* WIN */

function checkWin(){

    const won = cells.every(cell =>
        cell.mine || cell.revealed
    );

    if(won){

        gameOver = true;

        clearInterval(timerInterval);

        resetBtn.textContent = "😎";

        setTimeout(()=>{

            overlay.classList.add("show");

            overlay.querySelector(".game-over").innerHTML =
                "YOU WIN 🎉";

        },500);
    }
}

/* RESET */

resetBtn.addEventListener("click",createBoard);

replayBtn.addEventListener("click",()=>{

    overlay.querySelector(".game-over").innerHTML =
        "GAME OVER";

    createBoard();
});

createBoard();
