import { Game } from "./game.js";
import {
    areColorTexturesEnabled,
    setColorTexturesEnabled
} from "./texture.js";
import { MapParser } from "./map.js";
import { loadMap } from "./map-api.js";


const titleScreen =
    document.getElementById("title-screen");

const gameScreen =
    document.getElementById("game-screen");

const canvas =
    document.getElementById("canvas");

const userMapDialog =
    document.getElementById("user-map-dialog");

const userMapForm =
    document.getElementById("user-map-form");

const userMapInput =
    document.getElementById("user-map-input");

const userMapError =
    document.getElementById("user-map-error");

const loadUserMapButton =
    document.getElementById("load-user-map-button");

const menuItems = [
    ...document.querySelectorAll(".menu-item")
];


let selectedIndex = 0;

let gameStarted = false;
let userMapLoading = false;
let game = null;
const backgroundMusic = new Audio("./bgm/Layers.wav");
backgroundMusic.loop = true;


function playBackgroundMusic() {

    backgroundMusic.volume = 0;

    const playPromise = backgroundMusic.play();

    if (!playPromise) return;

    playPromise.then(() => {

        const fadeStart = performance.now();
        const fadeDuration = 4000;

        function fadeIn(currentTime) {

            const progress = Math.min(
                (currentTime - fadeStart) / fadeDuration,
                1
            );

            backgroundMusic.volume = progress * 0.2;

            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            }
        }

        requestAnimationFrame(fadeIn);
    }).catch(() => {});
}


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

        case "user-map":
            openUserMapDialog();
            break;

        case "map-maker":
            openMapMaker();
            break;

        case "color-textures":
            setColorTexturesEnabled(!areColorTexturesEnabled());
            updateTextureMenuItem();
            break;

    }
}

function updateTextureMenuItem() {
    const textureMenuItem = document.querySelector(
        '[data-menu="color-textures"]'
    );

    textureMenuItem.textContent =
        `TEXTURES: ${areColorTexturesEnabled() ? "ON" : "OFF"}`;
}


/* =====================================
   START GAME
===================================== */

function startGame(customStage = null) {

    if (gameStarted) return;

    gameStarted = true;
    playBackgroundMusic();


    titleScreen.classList.add("hidden");

    gameScreen.classList.add("active");


    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;


    game = new Game(canvas, customStage);

    game.run();
}

function parseUserMapId(value) {
    const input = value.trim();

    if (/^[1-9]\d*$/.test(input)) {
        return input;
    }

    let url;

    try {
        url = new URL(input);
    } catch {
        throw new Error("Enter a map number or a valid map share link.");
    }

    const mapId = url.searchParams.get("map");

    if (!mapId || !/^[1-9]\d*$/.test(mapId)) {
        throw new Error("That link does not contain a valid map number.");
    }

    return mapId;
}

function parseUserMapData(response) {
    const mapData = response?.mapData;

    if (
        !mapData ||
        !Number.isInteger(mapData.width) ||
        !Number.isInteger(mapData.height) ||
        mapData.width < 1 ||
        mapData.height < 1 ||
        mapData.width > 128 ||
        mapData.height > 128 ||
        !Array.isArray(mapData.color) ||
        !Array.isArray(mapData.object) ||
        mapData.color.length !== mapData.height ||
        mapData.object.length !== mapData.height
    ) {
        throw new Error("The uploaded map data is invalid.");
    }

    for (const [layerName, layer] of [
        ["color", mapData.color],
        ["object", mapData.object]
    ]) {
        if (
            layer.some(row =>
                !Array.isArray(row) ||
                row.length !== mapData.width ||
                row.some(cell => typeof cell !== "string" || cell.length !== 1)
            )
        ) {
            throw new Error(`The uploaded map's ${layerName} layer is invalid.`);
        }
    }

    const stage = MapParser.parse({
        width: mapData.width,
        height: mapData.height,
        color: mapData.color.map(row => row.join("")).join("\n"),
        object: mapData.object.map(row => row.join("")).join("\n")
    });

    if (stage.objects.player.length !== 1) {
        throw new Error("The uploaded map must contain exactly one player start.");
    }

    return stage;
}

function openUserMapDialog() {
    if (gameStarted || userMapLoading) return;

    userMapError.hidden = true;
    userMapInput.value = "";
    userMapDialog.showModal();
    userMapInput.focus();
}

async function startUserMap(mapIdInput, showDialogErrors = false) {
    if (gameStarted || userMapLoading) return;

    let mapId;

    try {
        mapId = parseUserMapId(mapIdInput);
    } catch (error) {
        if (showDialogErrors) {
            userMapError.textContent = error.message;
            userMapError.hidden = false;
        } else {
            window.alert(error.message);
        }

        return;
    }

    userMapLoading = true;
    loadUserMapButton.disabled = true;
    userMapError.hidden = true;

    try {
        const response = await loadMap(mapId);
        const stage = parseUserMapData(response);

        if (userMapDialog.open) {
            userMapDialog.close();
        }

        startGame(stage);
    } catch (error) {
        console.error("User map loading failed:", error);

        const message = `Could not load user map: ${error.message}`;

        if (showDialogErrors) {
            userMapError.textContent = message;
            userMapError.hidden = false;
        } else {
            window.alert(message);
        }
    } finally {
        userMapLoading = false;
        loadUserMapButton.disabled = false;
    }
}

userMapForm.addEventListener("submit", event => {
    event.preventDefault();
    void startUserMap(userMapInput.value, true);
});

document.getElementById("cancel-user-map-button").addEventListener(
    "click",
    () => userMapDialog.close()
);


/* =====================================
   OPEN MAP MAKER
===================================== */

function openMapMaker() {

    if (gameStarted || userMapLoading || userMapDialog.open) return;

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
updateTextureMenuItem();

const sharedMapId = new URLSearchParams(window.location.search).get("map");

if (sharedMapId) {
    void startUserMap(sharedMapId);
}