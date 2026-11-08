import { setupKeyBindingDialog } from "./keybinding-dialog.js";
import { bestTimes } from "./best-times.js";
import { bindStageKeyboard } from "./stage-keyboard.js";
import { stageArray } from "./map.js";
import { createStageProgress } from "./stage-progress.js";
import { Game } from "./game.js";
import {
    areColorTexturesEnabled,
    setColorTexturesEnabled
} from "./texture.js";
import { parseUserMapData } from "./user-map.js";
import { loadMap } from "./map-api.js";
import { createMapBrowser } from "./map-browser.js";


const titleScreen =
    document.getElementById("title-screen");

const gameScreen =
    document.getElementById("game-screen");

const canvas =
    document.getElementById("canvas");

const homeButton =
    document.getElementById("home-button");

const retryButton =
    document.getElementById("retry-button");

const tutorialDialog =
    document.getElementById("tutorial-dialog");

const closeTutorialButton =
    document.getElementById("close-tutorial");

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

const openKeyBindings = setupKeyBindingDialog(document.getElementById('keybinding-dialog'));

const mobileControls = document.getElementById("mobile-controls");

const stageDialog = document.getElementById('stage-dialog');
const stageList = document.getElementById('stage-list');
const continueButton = document.getElementById('continue-button');
const progressStatus = document.getElementById('progress-status');
const progress = createStageProgress(stageArray.length, {
    onStatus: text => { progressStatus.textContent = text; }
});
function renderStages() {
    document.getElementById('stage-summary').textContent = `${progress.cleared} / ${stageArray.length} STAGES CLEARED`;
    continueButton.textContent = progress.cleared === stageArray.length
        ? 'ALL CLEAR · REPLAY FINAL STAGE'
        : `${progress.cleared ? 'CONTINUE' : 'START'} · STAGE ${progress.resumeIndex + 1}`;
    stageList.replaceChildren();
    stageArray.forEach((stage, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        const unlocked = progress.isUnlocked(index);
        button.disabled = !unlocked;
        button.textContent = `STAGE ${index + 1} · ${index < progress.cleared ? 'CLEARED' : unlocked ? 'OPEN' : 'LOCKED'}`;
        const best = bestTimes.get(`stage:${index + 1}`);
        button.textContent += ` · BEST ${best === null ? '—' : best.toFixed(2) + ' s'}`;
        button.className = index < progress.cleared ? 'stage-cleared' : '';
        button.addEventListener('click', () => playStage(index));
        stageList.append(button);
    });
}
function onCampaignStageCleared(index) {
    progress.complete(index);
    if (index === stageArray.length - 1) {
        window.location.href = './ending.html';
    }
}

function playStage(index) {
    if (gameStarted || !progress.isUnlocked(index)) return;
    stageDialog.close();
    if (index === 0) {
        window.location.href = './cutscene.html';
    } else startGame(null, false, index);
}
continueButton.addEventListener('click', () => playStage(progress.resumeIndex));
document.getElementById('close-stages').addEventListener('click', () => stageDialog.close());
bindStageKeyboard(stageDialog, stageList, continueButton, document.getElementById('close-stages'));

let selectedIndex = 0;

let gameStarted = false;
let userMapLoading = false;
let game = null;
const backgroundMusic = new Audio("./bgm/Layers.wav");
const bgVolume = 0.0;
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

            backgroundMusic.volume = Math.max(0, progress * bgVolume);

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

menuItems.forEach((item, index) => {
    item.addEventListener("click", () => {
        if (gameStarted) return;

        selectedIndex = index;
        updateMenu();
        selectMenu();
    });
});


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
            renderStages();
            stageDialog.showModal();
            continueButton.focus();
            break;

        case "online":
            window.location.href = "./online.html";
            break;

        case "user-map":
            openUserMapDialog();
            break;

        case "how-to-play":
            tutorialDialog.showModal();
            closeTutorialButton.focus();
            break;

        case "map-maker":
            openMapMaker();
            break;

        case "keybindings":
            openKeyBindings();
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

function bindMobileControl(control, press, release = null) {
    const button = document.querySelector(`[data-control="${control}"]`);

    if (!button) {
        return;
    }

    const handlePress = (event) => {
        event.preventDefault();
        button.classList.add("pressed");
        press();
    };

    const handleRelease = (event) => {
        event.preventDefault();
        button.classList.remove("pressed");
        if (release) {
            release();
        }
    };

    button.addEventListener("pointerdown", handlePress);
    button.addEventListener("pointerup", handleRelease);
    button.addEventListener("pointerleave", handleRelease);
    button.addEventListener("pointercancel", handleRelease);
}

function setupMobileControls() {
    bindMobileControl("left", () => {
        if (game) {
            game.setInput("left", true);
        }
    }, () => {
        if (game) {
            game.setInput("left", false);
        }
    });

    bindMobileControl("right", () => {
        if (game) {
            game.setInput("right", true);
        }
    }, () => {
        if (game) {
            game.setInput("right", false);
        }
    });

    bindMobileControl("jump", () => {
        if (game) {
            game.jump();
        }
    });

    bindMobileControl("layer", () => {
        if (game) {
            game.cycleLayer();
        }
    });
}


/* =====================================
   START GAME
===================================== */

function startGame(customStage = null, startFromSky = false, stageIndex = progress.resumeIndex, recordKey = null) {

    if (gameStarted) return;

    gameStarted = true;
    playBackgroundMusic();
    titleScreen.classList.add("hidden");
    gameScreen.classList.add("active");
    gameScreen.classList.remove("stage-ended");

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;

    game = new Game(
        canvas,
        customStage,
        stageEnded => gameScreen.classList.toggle("stage-ended", stageEnded),
        startFromSky,
        false,
        { recordKey, stageIndex: progress.isUnlocked(stageIndex) ? stageIndex : 0,
          onStageCleared: onCampaignStageCleared }
    );

    game.run();

    const documentElement = document.documentElement;

    if (documentElement.classList.contains("starting-game")) {
        requestAnimationFrame(() => {
            documentElement.classList.add("fade-in");
            window.setTimeout(() => {
                documentElement.classList.remove("starting-game", "fade-in");
            }, 650);
        });
    }
}

closeTutorialButton.addEventListener("click", () => tutorialDialog.close());

homeButton.addEventListener("click", () => {
    if (!gameStarted) return;

    const homeUrl = new URL(window.location.href);
    homeUrl.searchParams.delete('startGame');
    window.history.replaceState(window.history.state, '', homeUrl.href);
    document.documentElement.classList.remove('starting-game', 'fade-in');
    game?.stop();
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    game = null;
    gameStarted = false;
    gameScreen.classList.remove("active");
    gameScreen.classList.remove("stage-ended");
    titleScreen.classList.remove("hidden");
    updateMenu();
});

retryButton.addEventListener("click", () => {
    game?.retry();
});

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


const mapBrowser = createMapBrowser(
    document.getElementById("user-map-browser"),
    id => startUserMap(id, true),
    { getBestTime: id => bestTimes.get(`user:${id}`) }
);
userMapDialog.addEventListener("close", () => mapBrowser.cancel());

function openUserMapDialog() {
    if (gameStarted || userMapLoading) return;

    userMapError.hidden = true;
    userMapInput.value = "";
    userMapDialog.showModal();
    void mapBrowser.refresh();
    document.querySelector("[data-map-refresh]").focus();
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

        startGame(stage, false, 0, `user:${mapId}`);
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
        if (gameStarted || document.querySelector("dialog[open]") || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;


        switch (event.code) {

            case "KeyW":
            case "KeyA":
            case "ArrowUp":

                event.preventDefault();

                moveMenu(-1);

                break;


            case "KeyS":
            case "KeyD":
            case "ArrowDown":

                event.preventDefault();

                moveMenu(1);

                break;


            case "NumpadEnter":
            case "Enter":

                event.preventDefault();

                if (!event.repeat) selectMenu();

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
setupMobileControls();

const sharedMapId = new URLSearchParams(window.location.search).get("map");
const startAfterCutscene =
    new URLSearchParams(window.location.search).get("startGame") === "1";

if (sharedMapId) {
    void startUserMap(sharedMapId);
} else if (startAfterCutscene) {
    progress.markIntroSeen();
    startGame(null, true, 0);
}
