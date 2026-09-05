import { Game } from "./game.js";


const titleScreen =
    document.getElementById("title-screen");

const gameScreen =
    document.getElementById("game-screen");

const canvas =
    document.getElementById("canvas");

const menuItems = [
    ...document.querySelectorAll(".menu-item")
];


let selectedIndex = 0;

let gameStarted = false;
let game = null;


/* =====================================
   MENU
===================================== */

function updateMenu() {

    menuItems.forEach((item, index) => {

        item.classList.toggle(
            "selected",
            index === selectedIndex
        );

    });
}


/* =====================================
   MOVE MENU
===================================== */

function moveMenu(direction) {

    selectedIndex += direction;


    // 위에서 위로 이동하면 마지막 항목
    if (selectedIndex < 0) {

        selectedIndex =
            menuItems.length - 1;

    }


    // 아래에서 아래로 이동하면 첫 항목
    if (selectedIndex >= menuItems.length) {

        selectedIndex = 0;

    }


    updateMenu();
}


/* =====================================
   SELECT MENU
===================================== */

function selectMenu() {

    const selected =
        menuItems[selectedIndex];

    if (!selected) return;


    const menu =
        selected.dataset.menu;


    switch (menu) {

        case "play":
            startGame();
            break;

        case "map-maker":
            openMapMaker();
            break;

    }
}


/* =====================================
   START GAME
===================================== */

function startGame() {

    if (gameStarted) return;

    gameStarted = true;


    titleScreen.classList.add("hidden");

    gameScreen.classList.add("active");


    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;


    game = new Game(canvas);

    game.run();
}


/* =====================================
   OPEN MAP MAKER
===================================== */

function openMapMaker() {

    if (gameStarted) return;

    gameStarted = true;


    titleScreen.classList.add("hidden");


    setTimeout(() => {

        window.location.href =
            "./editor.html";

    }, 250);
}


/* =====================================
   KEYBOARD
===================================== */

window.addEventListener(
    "keydown",
    (event) => {

        // 게임/맵메이커 선택 후에는 메뉴 입력 무시
        if (gameStarted) return;


        switch (event.code) {

            case "ArrowUp":

                event.preventDefault();

                moveMenu(-1);

                break;


            case "ArrowDown":

                event.preventDefault();

                moveMenu(1);

                break;


            case "Enter":

                event.preventDefault();

                selectMenu();

                break;

        }

    }
);

window.addEventListener("pageshow", (event) => {

    if (event.persisted) {
        window.location.reload();
    }

});

/* =====================================
   INITIALIZE
===================================== */

updateMenu();