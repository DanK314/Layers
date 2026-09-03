import { Game } from "./game.js";

const titleScreen = document.getElementById("title-screen");
const gameScreen = document.getElementById("game-screen");
const canvas = document.getElementById("canvas");

let gameStarted = false;
let game = null;

function startGame() {

    if (gameStarted) return;

    gameStarted = true;

    titleScreen.classList.add("hidden");
    gameScreen.classList.add("active");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    game = new Game(canvas);
    game.run();
}

window.addEventListener("keydown", (event) => {

    if (event.code !== "Enter") return;

    startGame();
});