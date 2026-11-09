import { copyRegion, pasteRegion, clipboardShortcut } from "./editor-clipboard.js";
import { fillRectangle, rectangleBounds } from "./editor-rectangle.js";
import { createMapVerification } from "./map-verification.js";
import { createEditorHistory, historyShortcut } from "./editor-history.js";
import { createEditorAutosave } from "./editor-autosave.js";
import { Game } from "./game.js";
import { MapParser } from "./map.js";
import {
    areColorTexturesEnabled,
    drawColorTexture,
    setColorTexturesEnabled
} from "./texture.js";
import { uploadMap } from "./map-api.js";

const canvas = document.querySelector("#map-canvas");
const ctx = canvas.getContext("2d");

const objectButtons = document.querySelectorAll(".object-button");
const colorButtons = document.querySelectorAll(".color-button");

const clearButton = document.querySelector("#clear-button");
const saveButton = document.querySelector("#save-button");
const loadButton = document.querySelector("#load-button");
const loadCodeButton = document.querySelector("#load-code-button");
const copyButton = document.querySelector("#copy-button");
const resizeButton = document.querySelector("#resize-button");
const mapWidthInput = document.querySelector("#map-width-input");
const mapHeightInput = document.querySelector("#map-height-input");
const centerViewButton = document.querySelector("#center-view-button");
const panModeButton = document.querySelector("#pan-mode-button");
const testButton = document.querySelector("#test-button");
const editorMenuToggle = document.querySelector("#editor-menu-toggle");
const editorActionsMenu = document.querySelector("#editor-actions-menu");
const textureToggleButton = document.querySelector("#texture-toggle-button");
const gamePreview = document.querySelector("#game-preview");
const previewCanvas = document.querySelector("#preview-canvas");
const returnEditorButton = document.querySelector("#return-editor-button");
const loadCodeDialog = document.querySelector("#load-code-dialog");
const loadCodeInput = document.querySelector("#load-code-input");
const loadCodeError = document.querySelector("#load-code-error");
const cancelLoadCodeButton = document.querySelector("#cancel-load-code-button");
const submitLoadCodeButton = document.querySelector("#submit-load-code-button");
const clearMapDialog = document.querySelector("#clear-map-dialog");
const cancelClearMapButton = document.querySelector("#cancel-clear-map-button");
const confirmClearMapButton = document.querySelector("#confirm-clear-map-button");
const verification = createMapVerification();
let uploading = false;
const verifyButton = document.createElement('button');
verifyButton.id = 'verify-map-button';
verifyButton.type = 'button';
verifyButton.className = 'object-button';
verifyButton.textContent = 'VERIFY MAP';
const verifyStatus = document.createElement('p');
verifyStatus.id = 'verify-map-status';
verifyStatus.setAttribute('role', 'status');
verifyStatus.textContent = 'Clear the map in a test play before uploading.';
const uploadButton = document.createElement("button");
uploadButton.id = "upload-map-button";
uploadButton.textContent = "UPLOAD MAP";
uploadButton.className = "object-button";
uploadButton.disabled = true;

const uploadStatus = document.createElement("p");
uploadStatus.id = "upload-map-status";
uploadStatus.setAttribute("role", "status");
uploadStatus.style.overflowWrap = "anywhere";

const shareLink = document.createElement("input");
shareLink.id = "share-map-link";
shareLink.type = "text";
shareLink.readOnly = true;
shareLink.hidden = true;
shareLink.setAttribute("aria-label", "Map share link");

const copyShareButton = document.createElement("button");
copyShareButton.id = "copy-share-link-button";
copyShareButton.textContent = "COPY SHARE LINK";
copyShareButton.className = "object-button";
copyShareButton.hidden = true;

const uploadPanel = document.createElement("section");
uploadPanel.id = "upload-map-panel";

uploadPanel.append(
    verifyButton,
    verifyStatus,
    uploadButton,
    uploadStatus,
    shareLink,
    copyShareButton
);

copyButton.insertAdjacentElement("afterend", uploadPanel);

function mapChanged() {
    if (selection) { selection = null; draw(); }
    copySelectionButton.disabled = true;
    verification.invalidate();
    uploadButton.disabled = true;
    verifyStatus.textContent = 'Map changed. Clear it again to verify before uploading.';
    autosave.changed();
}

function toggleEditorMenu(forceOpen) {
    const nextOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : !editorActionsMenu.classList.contains("open");

    editorActionsMenu.classList.toggle("open", nextOpen);
    editorMenuToggle.setAttribute("aria-expanded", String(nextOpen));
}

editorMenuToggle.addEventListener("click", () => {
    toggleEditorMenu();
});

editorActionsMenu.addEventListener("click", event => {
    if (event.target.closest("button")) {
        toggleEditorMenu(false);
    }
});

for (const element of [editorMenuToggle, editorActionsMenu]) {
    element.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !editorActionsMenu.classList.contains('open')) return;
        event.preventDefault();
        event.stopPropagation();
        toggleEditorMenu(false);
        editorMenuToggle.focus();
    });
}

panModeButton.addEventListener("click", () => {
    panModeEnabled = !panModeEnabled;
    panModeButton.textContent = `PAN: ${panModeEnabled ? "ON" : "OFF"}`;
    panModeButton.setAttribute("aria-pressed", String(panModeEnabled));
    canvas.classList.toggle("pan-mode", panModeEnabled);
});

document.addEventListener("click", event => {
    const target = event.target;

    if (
        !editorActionsMenu.contains(target) &&
        !editorMenuToggle.contains(target)
    ) {
        toggleEditorMenu(false);
    }
});

/*
 * 맵 설정
 */

let MAP_WIDTH = 16;
let MAP_HEIGHT = 16;


/*
 * 현재 선택
 */

let selectedObject = ".";
let selectedColor = "R";


/*
 * 맵 데이터
 *
 * color[y][x]
 * object[y][x]
 */

let colorMap = createColorMap();
let objectMap = createObjectMap();

const autosave = createEditorAutosave({
    getMap: () => ({ width: MAP_WIDTH, height: MAP_HEIGHT, color: colorMap, object: objectMap }),
    onStatus: message => { document.querySelector('#autosave-status').textContent = message; }
});
window.addEventListener('beforeunload', event => autosave.beforeUnload(event));
window.addEventListener('pagehide', () => autosave.flush());
document.addEventListener('visibilitychange', () => {
    if (document.hidden) autosave.flush();
});



/*
 * 마우스 상태
 */

let isMouseDown = false;
let isPanning = false;
let panModeEnabled = false;
let lastPanPoint = null;
let activePointerId = null;
const activePointers = new Map();
let pinchStart = null;
let ignorePointersUntilReleased = false;
const camera = {
    x: 0,
    y: 0,
    zoom: 1
};
let previewGame = null;
let editorTool = 'brush';
let selection = null;
let clipboard = null;
let pasteTarget = null;
const copySelectionButton = document.querySelector('#copy-selection-button');
const pasteSelectionButton = document.querySelector('#paste-selection-button');
const clipboardStatus = document.querySelector('#clipboard-status');
let rectangleStart = null;
let rectangleEnd = null;
const toolButtons = document.querySelectorAll('[data-editor-tool]');
function setEditorTool(tool) {
    finishPointerInteraction();
    editorTool = tool;
    for (const button of toolButtons) button.setAttribute('aria-pressed', String(button.dataset.editorTool === tool));
    draw();
}
for (const button of toolButtons) button.addEventListener('click', () => setEditorTool(button.dataset.editorTool));
function copySelection() {
    finishPointerInteraction();
    if (!selection) return;
    clipboard = copyRegion(currentMap(), selection.start, selection.end);
    pasteSelectionButton.disabled = false;
    clipboardStatus.textContent = `Copied ${clipboard.width} × ${clipboard.height}. PASTE, then tap a destination.`;
}
function beginPaste() {
    if (!clipboard) return;
    setEditorTool('paste');
    pasteTarget = null;
    clipboardStatus.textContent = 'Tap a destination to paste. Escape or another tool cancels.';
}
copySelectionButton.addEventListener('click', copySelection);
pasteSelectionButton.addEventListener('click', beginPaste);
window.addEventListener('keydown', event => {
    if (previewGame || document.querySelector('dialog[open]')) return;
    const action = clipboardShortcut(event);
    if (action === 'copy' && selection) { event.preventDefault(); copySelection(); }
    if (action === 'paste' && clipboard) { event.preventDefault(); beginPaste(); }
    if (event.key === 'Escape') {
        selection = null;
        copySelectionButton.disabled = true;
        setEditorTool('brush');
        clipboardStatus.textContent = 'Selection cancelled.';
    }
});
function drawRectangleSelection() {
    let start = rectangleStart ?? selection?.start;
    let end = rectangleEnd ?? selection?.end;
    if (editorTool === 'paste' && clipboard && pasteTarget) {
        start = pasteTarget;
        end = { x: start.x + clipboard.width - 1, y: start.y + clipboard.height - 1 };
    }
    if (!start || !end) return;
    const b = rectangleBounds(start, end, MAP_WIDTH, MAP_HEIGHT);
    const size = getCellSize();
    ctx.save();
    ctx.fillStyle = '#ffffff22'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const x = camera.x + b.left * size, y = camera.y + b.top * size;
    const w = (b.right - b.left + 1) * size, h = (b.bottom - b.top + 1) * size;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.restore();
}
let editHistory = null;
const undoButton = document.querySelector('#undo-button');
const redoButton = document.querySelector('#redo-button');
function currentMap() {
    return { width: MAP_WIDTH, height: MAP_HEIGHT, color: colorMap, object: objectMap };
}
function updateHistoryButtons() {
    undoButton.disabled = !editHistory?.canUndo;
    redoButton.disabled = !editHistory?.canRedo;
}
function recordHistory() {
    editHistory?.record(currentMap());
    updateHistoryButtons();
}
function travelHistory(direction) {
    if (previewGame || document.querySelector('dialog[open]')) return;
    finishPointerInteraction();
    recordHistory();
    const map = editHistory[direction]();
    if (!map) return;
    const resized = MAP_WIDTH !== map.width || MAP_HEIGHT !== map.height;
    MAP_WIDTH = map.width;
    MAP_HEIGHT = map.height;
    colorMap = map.color;
    objectMap = map.object;
    mapWidthInput.value = String(MAP_WIDTH);
    mapHeightInput.value = String(MAP_HEIGHT);
    if (resized) recenterMapView();
    draw();
    mapChanged();
    updateHistoryButtons();
}
undoButton.addEventListener('click', () => travelHistory('undo'));
redoButton.addEventListener('click', () => travelHistory('redo'));
window.addEventListener('keydown', event => {
    const direction = historyShortcut(event);
    if (!direction || previewGame || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    travelHistory(direction);
});

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updateTextureToggle() {
    const enabled = areColorTexturesEnabled();

    textureToggleButton.textContent =
        `TEXTURES: ${enabled ? "ON" : "OFF"}`;
    textureToggleButton.setAttribute("aria-pressed", String(enabled));
}

textureToggleButton.addEventListener("click", () => {
    setColorTexturesEnabled(!areColorTexturesEnabled());
    updateTextureToggle();
    draw();
});


/*
 * 색상 정보
 */

const COLORS = {
    R: "#FF0000",
    G: "#00FF00",
    B: "#0000FF",
    Y: "#FFFF00",
    M: "#FF00FF",
    C: "#00FFFF",
    W: "#FFFFFF"
};


/*
 * 오브젝트 정보
 */

const OBJECTS = {
    ".": {
        name: "AIR"
    },

    "#": {
        name: "BLOCK"
    },

    "^": {
        name: "SPIKE"
    },

    "O": {
        name: "MINI BLACKHOLE"
    },

    "@": {
        name: "PLAYER"
    },

    "$": {
        name: "GOAL"
    }
};


/*
 * 맵 생성
 */

function getSafeMapSize(value, fallback) {

    const parsed = Number.parseInt(
        value,
        10
    );

    return Number.isInteger(parsed) && parsed > 0
        ? parsed
        : fallback;
}


function createColorMap(width = MAP_WIDTH, height = MAP_HEIGHT) {

    return Array.from(
        { length: height },
        () =>
            Array(width).fill(".")
    );
}


function createObjectMap(width = MAP_WIDTH, height = MAP_HEIGHT) {

    return Array.from(
        { length: height },
        () =>
            Array(width).fill(".")
    );
}


function resizeMaps(width, height) {
    finishPointerInteraction();

    const nextWidth = getSafeMapSize(
        width,
        MAP_WIDTH
    );

    const nextHeight = getSafeMapSize(
        height,
        MAP_HEIGHT
    );

    const nextColorMap = createColorMap(
        nextWidth,
        nextHeight
    );

    const nextObjectMap = createObjectMap(
        nextWidth,
        nextHeight
    );


    for (let y = 0; y < Math.min(MAP_HEIGHT, nextHeight); y++) {

        for (let x = 0; x < Math.min(MAP_WIDTH, nextWidth); x++) {

            nextColorMap[y][x] = colorMap[y][x] ?? ".";
            nextObjectMap[y][x] = objectMap[y][x] ?? ".";
        }
    }


    MAP_WIDTH = nextWidth;
    MAP_HEIGHT = nextHeight;

    colorMap = nextColorMap;
    objectMap = nextObjectMap;

    mapWidthInput.value = String(MAP_WIDTH);
    mapHeightInput.value = String(MAP_HEIGHT);

    recenterMapView();
    draw();
    mapChanged();
    recordHistory();
}


/*
 * Canvas 크기
 */

function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();

    // Fill the available workspace; cell sizing keeps the map's tiles square.
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));

    recenterMapView();
    draw();
}


// The workspace changes when palettes/toolbars reflow, including mobile rotation.
const workspaceObserver = new ResizeObserver(resizeCanvas);
workspaceObserver.observe(document.querySelector('#canvas-viewport'));


/*
 * 셀 크기
 */

function getCellSize() {
    const visibleColumns = Math.min(MAP_WIDTH, 16);
    const visibleRows = Math.min(MAP_HEIGHT, 16);
    const baseCellSize = Math.min(
        canvas.width / visibleColumns,
        canvas.height / visibleRows
    );

    return baseCellSize * camera.zoom;
}

function recenterMapView() {
    const cellSize = getCellSize();
    const cameraCenterX = Math.min(MAP_WIDTH, 16) / 2;
    const cameraCenterY = Math.min(MAP_HEIGHT, 16) / 2;

    camera.x = canvas.width / 2 - cameraCenterX * cellSize;
    camera.y = canvas.height / 2 - cameraCenterY * cellSize;
}

function resetMapView() {
    camera.zoom = 1;
    recenterMapView();
    draw();
}

function getCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (clientX - rect.left) / rect.width * canvas.width,
        y: (clientY - rect.top) / rect.height * canvas.height
    };
}

function getPointerDistanceAndCenter() {
    const [first, second] = [...activePointers.values()];

    return {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2
    };
}

function zoomAt(nextScale, pointerX, pointerY, anchor = null) {
    const clampedScale = clamp(nextScale, 0.5, 2.2);
    if (clampedScale === camera.zoom) {
        return;
    }

    const previousCellSize = getCellSize();
    const worldX = anchor?.worldX ?? (pointerX - camera.x) / previousCellSize;
    const worldY = anchor?.worldY ?? (pointerY - camera.y) / previousCellSize;

    camera.zoom = clampedScale;
    const nextCellSize = getCellSize();
    camera.x = pointerX - worldX * nextCellSize;
    camera.y = pointerY - worldY * nextCellSize;
    draw();
}

/*
 * 캔버스 좌표 → 맵 좌표
 */

function getCellFromMouse(event) {

    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left) /
        rect.width *
        canvas.width -
        camera.x;

    const y =
        (event.clientY - rect.top) /
        rect.height *
        canvas.height -
        camera.y;

    const cellSize = getCellSize();

    const cellX = Math.floor(
        x / cellSize
    );

    const cellY = Math.floor(
        y / cellSize
    );

    if (
        cellX < 0 ||
        cellX >= MAP_WIDTH ||
        cellY < 0 ||
        cellY >= MAP_HEIGHT
    ) {
        return null;
    }

    return {
        x: cellX,
        y: cellY
    };
}


/*
 * 셀 하나 그리기
 */

function drawCell(x, y) {

    const cellSize = getCellSize();

    const px = x * cellSize + camera.x;
    const py = y * cellSize + camera.y;

    const color = colorMap[y][x];
    const object = objectMap[y][x];


    /*
     * 배경
     */

    ctx.fillStyle = "#000000";

    ctx.fillRect(
        px,
        py,
        cellSize,
        cellSize
    );


    /*
     * 오브젝트가 공기가 아니면
     * 선택된 색상으로 표시
     */

    if (
        object !== "." &&
        color !== "."
    ) {

        ctx.fillStyle =
            COLORS[color];

        ctx.shadowColor =
            COLORS[color];

        ctx.shadowBlur = 8;


        /*
         * BLOCK
         */

        if (object === "#") {

            const blockX = px + cellSize * 0.08;
            const blockY = py + cellSize * 0.08;
            const blockSize = cellSize * 0.84;

            ctx.fillRect(
                blockX,
                blockY,
                blockSize,
                blockSize
            );

            drawColorTexture(
                ctx,
                COLORS[color],
                blockX,
                blockY,
                blockSize,
                blockSize,
                "rect"
            );
        }


        /*
         * SPIKE
         */

        else if (object === "^") {

            const cx = px + cellSize * 0.5;
            const cy = py + cellSize * 0.5;
            const half = cellSize * 0.36;

            ctx.beginPath();
            ctx.moveTo(cx, py + 2);
            ctx.lineTo(px + cellSize - 2, cy);
            ctx.lineTo(cx, py + cellSize - 2);
            ctx.lineTo(px + 2, cy);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx, py + half);
            ctx.lineTo(px + cellSize - half, cy);
            ctx.lineTo(cx, py + cellSize - half);
            ctx.lineTo(px + half, cy);
            ctx.closePath();
            ctx.fill();

            drawColorTexture(
                ctx,
                COLORS[color],
                px,
                py,
                cellSize,
                cellSize,
                "diamond"
            );
        }

        /*
         * MINI BLACKHOLE
         */

        else if (object === "O") {

            const cx = px + cellSize * 0.5;
            const cy = py + cellSize * 0.5;

            for (let particle = 0; particle < 8; particle++) {
                const angle = particle / 8 * Math.PI * 2;
                const orbit = cellSize * (0.12 + particle * 0.018);

                ctx.beginPath();
                ctx.arc(
                    cx + Math.cos(angle) * orbit,
                    cy + Math.sin(angle) * orbit * 0.75,
                    Math.max(1, cellSize * 0.035),
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            const coreRadius = cellSize * 0.12;
            const coreX = cx - coreRadius;
            const coreY = cy - coreRadius;
            const coreSize = coreRadius * 2;

            ctx.beginPath();
            ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
            ctx.fill();

            drawColorTexture(
                ctx,
                COLORS[color],
                coreX,
                coreY,
                coreSize,
                coreSize,
                "circle"
            );
        }


        /*
         * PLAYER
         */

        else if (object === "@") {

            ctx.beginPath();

            ctx.arc(
                px + cellSize * 0.5,
                py + cellSize * 0.5,
                cellSize * 0.30,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        /*
         * GOAL
         */

        else if (object === "$") {

            ctx.strokeStyle =
                COLORS[color];

            ctx.lineWidth =
                Math.max(2, cellSize * 0.08);

            ctx.strokeRect(
                px + cellSize * 0.2,
                py + cellSize * 0.2,
                cellSize * 0.6,
                cellSize * 0.6
            );
        }

        ctx.shadowBlur = 0;
    }


    /*
     * 맵 격자
     */

    ctx.strokeStyle = "#5e5e5e";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        px + 0.5,
        py + 0.5,
        cellSize - 1,
        cellSize - 1
    );
}


/*
 * 전체 맵 그리기
 */

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const cellSize = getCellSize();
    const startX = clamp(Math.floor(-camera.x / cellSize), 0, MAP_WIDTH);
    const startY = clamp(Math.floor(-camera.y / cellSize), 0, MAP_HEIGHT);
    const endX = clamp(Math.ceil((canvas.width - camera.x) / cellSize), 0, MAP_WIDTH);
    const endY = clamp(Math.ceil((canvas.height - camera.y) / cellSize), 0, MAP_HEIGHT);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            drawCell(x, y);
        }
    }
    drawRectangleSelection();
}


/*
 * 오브젝트 선택
 */

function selectObject(object) {

    if (!OBJECTS[object]) {
        return;
    }

    selectedObject = object;


    /*
     * 기존 선택 해제
     */

    objectButtons.forEach(
        button => {
            button.classList.toggle(
                "selected",
                button.dataset.object === object
            );
        }
    );
}


/*
 * 색상 선택
 */

function selectColor(color) {

    if (!COLORS[color]) {
        return;
    }

    selectedColor = color;


    /*
     * 기존 선택 해제
     */

    colorButtons.forEach(
        button => {
            button.classList.toggle(
                "selected",
                button.dataset.color === color
            );
        }
    );
}


/*
 * 오브젝트 버튼 클릭
 */

objectButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            selectObject(
                button.dataset.object
            );
        }
    );

});


/*
 * 색상 버튼 클릭
 */

colorButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            selectColor(
                button.dataset.color
            );
        }
    );

});


/*
 * 키보드 입력
 *
 * 1 = AIR
 * 2 = BLOCK
 * 3 = SPIKE
 * 4 = MINI BLACKHOLE
 * 5 = PLAYER
 * 6 = GOAL
 */

window.addEventListener(
    "keydown",
    event => {

        if (previewGame || document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey ||
            event.target?.closest?.('input, textarea, select, [contenteditable]')) return;

        const keyMap = {
            "1": ".",
            "2": "#",
            "3": "^",
            "4": "O",
            "5": "@",
            "6": "$"
        };

        const object =
            keyMap[event.key];

        if (!object) {
            return;
        }

        selectObject(object);
    }
);


/*
 * 맵 칸에 현재 선택 적용
 */

function paintCell(x, y) {

    objectMap[y][x] =
        selectedObject;


    /*
     * 공기는 색상도 제거
     */

    if (selectedObject === ".") {

        colorMap[y][x] = ".";

    } else {

        colorMap[y][x] =
            selectedColor;
    }


    draw();
    mapChanged();
}


/*
 * 마우스 누르기
 */

canvas.addEventListener(
    "pointerdown",
    event => {
        if (event.pointerType === "touch") {
            activePointers.set(event.pointerId, getCanvasPoint(event.clientX, event.clientY));
            canvas.setPointerCapture(event.pointerId);

            if (activePointers.size >= 2) {
                const { distance, centerX, centerY } = getPointerDistanceAndCenter();
                if (distance > 0) {
                    const cellSize = getCellSize();

                    pinchStart = {
                        distance,
                        scale: camera.zoom,
                        worldX: (centerX - camera.x) / cellSize,
                        worldY: (centerY - camera.y) / cellSize
                    };
                }
                rectangleStart = rectangleEnd = null;
                draw();
                recordHistory();
                ignorePointersUntilReleased = true;
                isMouseDown = false;
                isPanning = false;
                activePointerId = null;
                canvas.classList.remove("panning");
                event.preventDefault();
                return;
            }
        }

        if (ignorePointersUntilReleased) {
            event.preventDefault();
            return;
        }

        if (event.button === 1 || event.altKey || panModeEnabled) {
            isPanning = true;
            isMouseDown = false;
            lastPanPoint = {
                x: event.clientX,
                y: event.clientY
            };
            activePointerId = event.pointerId;
            canvas.setPointerCapture(event.pointerId);
            canvas.classList.add("panning");
            event.preventDefault();
            return;
        }

        isMouseDown = true;
        activePointerId = event.pointerId;
        canvas.setPointerCapture(event.pointerId);
        event.preventDefault();

        const cell =
            getCellFromMouse(event);

        if (!cell) {
            return;
        }

        if (editorTool === 'paste' && clipboard) {
            pasteTarget = cell;
            draw();
            return;
        }
        if (editorTool === 'rectangle' || editorTool === 'select') {
            rectangleStart = rectangleEnd = cell;
            draw();
            return;
        }
        paintCell(
            cell.x,
            cell.y
        );
    }
);


canvas.addEventListener(
    "pointermove",
    event => {
        if (activePointers.has(event.pointerId)) {
            activePointers.set(event.pointerId, getCanvasPoint(event.clientX, event.clientY));

            if (pinchStart && activePointers.size >= 2) {
                const { distance, centerX, centerY } = getPointerDistanceAndCenter();
                const nextScale = pinchStart.scale * distance / pinchStart.distance;
                zoomAt(nextScale, centerX, centerY, pinchStart);
                return;
            }
        }

        if (ignorePointersUntilReleased) {
            return;
        }

        if (editorTool === 'paste' && !isPanning) {
            pasteTarget = getCellFromMouse(event);
            draw();
            return;
        }
        if (event.pointerId !== activePointerId) {
            return;
        }

        if (isPanning) {
            const rect = canvas.getBoundingClientRect();
            camera.x += (event.clientX - lastPanPoint.x) * canvas.width / rect.width;
            camera.y += (event.clientY - lastPanPoint.y) * canvas.height / rect.height;
            lastPanPoint = {
                x: event.clientX,
                y: event.clientY
            };
            draw();
            return;
        }

        if (!isMouseDown) {
            return;
        }

        const cell =
            getCellFromMouse(event);

        if (!cell) {
            return;
        }

        if (editorTool === 'rectangle' || editorTool === 'select') {
            if (rectangleStart) rectangleEnd = cell;
            draw();
            return;
        }
        paintCell(
            cell.x,
            cell.y
        );
    }
);

canvas.addEventListener("wheel", event => {
    if (previewGame) {
        return;
    }

    event.preventDefault();

    const previousScale = camera.zoom;
    const nextScale = clamp(camera.zoom + (event.deltaY < 0 ? 0.12 : -0.12), 0.5, 2.2);

    if (nextScale === previousScale) {
        return;
    }

    const { x, y } = getCanvasPoint(event.clientX, event.clientY);
    zoomAt(nextScale, x, y);
}, { passive: false });

function finishPointerInteraction(event) {
    if (event?.pointerId !== undefined) {
        activePointers.delete(event.pointerId);
    }

    if (activePointers.size < 2) {
        pinchStart = null;
    }

    if (activePointers.size === 0) {
        ignorePointersUntilReleased = false;
    }

    if (event && event.pointerId !== activePointerId) {
        return;
    }

    // Commit on release so pointer cancellation and two-finger gestures never paste.
    if (event?.type === 'pointerup' && isMouseDown && editorTool === 'paste' && clipboard && pasteTarget) {
        const cell = pasteTarget;
        if (pasteRegion(currentMap(), clipboard, cell)) mapChanged();
        selection = { start: cell, end: { x: Math.min(MAP_WIDTH - 1, cell.x + clipboard.width - 1), y: Math.min(MAP_HEIGHT - 1, cell.y + clipboard.height - 1) } };
        copySelectionButton.disabled = false;
        editorTool = 'select';
        for (const button of toolButtons) button.setAttribute('aria-pressed', String(button.dataset.editorTool === editorTool));
        clipboardStatus.textContent = 'Pasted. Ctrl+Z / UNDO restores the previous map.';
    }
    if (rectangleStart && rectangleEnd && event?.type === 'pointerup') {
        if (editorTool === 'select') {
            selection = { start: rectangleStart, end: rectangleEnd };
            copySelectionButton.disabled = false;
            clipboardStatus.textContent = 'Area selected. COPY or Ctrl+C / Cmd+C.';
        } else if (editorTool === 'rectangle' && fillRectangle(currentMap(), rectangleStart, rectangleEnd, selectedObject, selectedColor)) mapChanged();
    }
    rectangleStart = rectangleEnd = null;
    draw();
    recordHistory();
    isMouseDown = false;
    isPanning = false;
    lastPanPoint = null;
    activePointerId = null;
    canvas.classList.remove("panning");
}

/*
 * 마우스 버튼 해제
 */

window.addEventListener("pointerup", finishPointerInteraction);
window.addEventListener("pointercancel", finishPointerInteraction);
window.addEventListener("blur", () => finishPointerInteraction());
canvas.addEventListener("lostpointercapture", finishPointerInteraction);


/*
 * 우클릭 메뉴 방지
 */

canvas.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();

    }
);


/*
 * CLEAR
 */

clearButton.addEventListener(
    "click",
    () => {
        clearMapDialog.showModal();
    }
);

cancelClearMapButton.addEventListener("click", () => {
    clearMapDialog.close();
});

confirmClearMapButton.addEventListener("click", () => {
    finishPointerInteraction();
    colorMap = createColorMap();
    objectMap = createObjectMap();
    mapChanged();
    recordHistory();

    draw();
    clearMapDialog.close();
});



/*
 * 현재 맵을 JS 코드 형태로 변환
 */

function createMapCode() {

    const colorLines =
        colorMap.map(
            row => row.join("")
        );

    const objectLines =
        objectMap.map(
            row => row.join("")
        );


    const colorText =
        colorLines.join("\n");

    const objectText =
        objectLines.join("\n");


    return `{
    width: ${MAP_WIDTH},
    height: ${MAP_HEIGHT},

    color: \`
${colorText}
    \`,

    object: \`
${objectText}
    \`
}`;
}


function parseMapCode(code) {

    const widthMatch = code.match(/\bwidth\s*:\s*(\d+)\s*,/);
    const heightMatch = code.match(/\bheight\s*:\s*(\d+)\s*,/);
    const colorMatch = code.match(/\bcolor\s*:\s*`([\s\S]*?)`/);
    const objectMatch = code.match(/\bobject\s*:\s*`([\s\S]*?)`/);

    if (!widthMatch || !heightMatch || !colorMatch || !objectMatch) {
        throw new Error("Map code format is not recognized.");
    }

    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);

    if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        height < 1 ||
        width > 128 ||
        height > 128
    ) {
        throw new Error("Map width and height must be between 1 and 128.");
    }

    const colorRows = colorMatch[1]
        .trim()
        .split(/\r?\n/)
        .map(row => row.trim())
        .filter(row => row.length > 0);

    const objectRows = objectMatch[1]
        .trim()
        .split(/\r?\n/)
        .map(row => row.trim())
        .filter(row => row.length > 0);

    if (
        colorRows.length !== height ||
        objectRows.length !== height ||
        colorRows.some(row => row.length !== width) ||
        objectRows.some(row => row.length !== width)
    ) {
        throw new Error("Map code rows do not match the declared size.");
    }

    if (
        colorRows.some(row => /[^.WRGBYMC]/.test(row)) ||
        objectRows.some(row => /[^.#^O@$]/.test(row))
    ) {
        throw new Error("Map code contains an unknown color or object.");
    }

    return {
        width,
        height,
        color: colorRows.map(row => [...row]),
        object: objectRows.map(row => [...row])
    };
}


/*
 * Player / Goal 검사
 */

function validateMap() {

    let playerCount = 0;
    let goalCount = 0;


    for (
        let y = 0;
        y < MAP_HEIGHT;
        y++
    ) {

        for (
            let x = 0;
            x < MAP_WIDTH;
            x++
        ) {

            const object =
                objectMap[y][x];

            if (object === "@") {
                playerCount++;
            }

            if (object === "$") {
                goalCount++;
            }
        }
    }


    if (playerCount === 0) {

        alert(
            "PLAYER(@) is missing."
        );

        return false;
    }


    if (playerCount > 1) {

        alert(
            "Only one PLAYER(@) is allowed."
        );

        return false;
    }


    if (goalCount > 1) {

        alert(
            "Only one GOAL($) is allowed."
        );

        return false;
    }


    return true;
}


/*
 * COPY CODE
 */

copyButton.addEventListener(
    "click",
    async () => {

        if (!validateMap()) {
            return;
        }

        const code =
            createMapCode();

        try {

            await navigator.clipboard.writeText(
                code
            );

            copyButton.textContent =
                "COPIED";

            setTimeout(
                () => {
                    copyButton.textContent =
                        "COPY CODE";
                },
                1000
            );

        } catch (error) {

            console.error(error);

            alert(
                "Unable to copy code."
            );
        }
    }
);


/*
 * SAVE
 *
 * 브라우저 LocalStorage에 저장
 */

saveButton.addEventListener(
    "click",
    () => {

        const data = {
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            color: colorMap,
            object: objectMap
        };

        localStorage.setItem(
            "layer-s-map",
            JSON.stringify(data)
        );


        saveButton.textContent =
            "SAVED";

        setTimeout(
            () => {

                saveButton.textContent =
                    "SAVE";

            },
            1000
        );
    }
);


/*
 * LOAD
 */

loadButton.addEventListener(
    "click",
    () => {

        const saved =
            localStorage.getItem(
                "layer-s-map"
            );

        if (!saved) {

            alert(
                "No saved map found."
            );

            return;
        }


        try {

            const data =
                JSON.parse(saved);

            const colorRows = Array.isArray(data.color)
                ? data.color.map(
                    row => Array.isArray(row)
                        ? [...row]
                        : [...String(row)]
                )
                : [];

            const objectRows = Array.isArray(data.object)
                ? data.object.map(
                    row => Array.isArray(row)
                        ? [...row]
                        : [...String(row)]
                )
                : [];


            if (
                colorRows.length === 0 ||
                objectRows.length === 0 ||
                colorRows.length !== objectRows.length
            ) {

                throw new Error(
                    "Invalid map size"
                );
            }


            const mapWidth = Math.max(
                ...colorRows.map(row => row.length),
                ...objectRows.map(row => row.length),
                1
            );

            const mapHeight = colorRows.length;

            finishPointerInteraction();
            MAP_WIDTH = mapWidth;
            MAP_HEIGHT = mapHeight;

            colorMap = Array.from(
                { length: mapHeight },
                (_, y) =>
                    Array.from(
                        { length: mapWidth },
                        (_, x) => colorRows[y]?.[x] ?? "."
                    )
            );

            objectMap = Array.from(
                { length: mapHeight },
                (_, y) =>
                    Array.from(
                        { length: mapWidth },
                        (_, x) => objectRows[y]?.[x] ?? "."
                    )
            );

            mapWidthInput.value = String(MAP_WIDTH);
            mapHeightInput.value = String(MAP_HEIGHT);

            recenterMapView();
            draw();
            mapChanged();
    recordHistory();

        } catch (error) {

            console.error(error);

            alert(
                "Unable to load map data."
            );
        }
    }
);


/*
 * LOAD WITH CODE
 */

loadCodeButton.addEventListener(
    "click",
    () => {

        loadCodeError.hidden = true;
        loadCodeError.textContent = "";
        loadCodeDialog.showModal();
        loadCodeInput.focus();
    }
);


cancelLoadCodeButton.addEventListener(
    "click",
    () => loadCodeDialog.close()
);


submitLoadCodeButton.addEventListener(
    "click",
    () => {

        try {

            const data = parseMapCode(loadCodeInput.value);

            finishPointerInteraction();
            MAP_WIDTH = data.width;
            MAP_HEIGHT = data.height;
            colorMap = data.color;
            objectMap = data.object;

            mapWidthInput.value = String(MAP_WIDTH);
            mapHeightInput.value = String(MAP_HEIGHT);

            recenterMapView();
            draw();
            mapChanged();
    recordHistory();
            loadCodeDialog.close();

        } catch (error) {

            loadCodeError.textContent = `Could not load map code: ${error.message}`;
            loadCodeError.hidden = false;
        }
    }
);

const GAME_URL = new URL("./index.html", window.location.href);

uploadButton.addEventListener("click", async () => {
    if (uploadButton.disabled) return;
    if (!validateMap()) return;
    if (!verification.isVerified(currentMap())) {
        verifyStatus.textContent = 'Select VERIFY MAP and reach the goal before uploading.';
        uploadButton.disabled = true;
        return;
    }

    const titleInput = prompt("Enter a map name.", "Untitled");

    if (titleInput === null) return;

    const title = titleInput.trim() || "Untitled";

    // 기존 에디터 데이터를 그대로 복사
    const mapData = {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        color: colorMap.map(row => [...row]),
        object: objectMap.map(row => [...row])
    };

    uploading = true;
    uploadButton.disabled = true;
    uploadStatus.textContent = "Uploading map...";
    copyShareButton.hidden = true;
    shareLink.hidden = true;

    try {
        const result = await uploadMap(mapData, title);

        const url = new URL(GAME_URL.href);
        url.searchParams.set("map", String(result.mapId));

        shareLink.value = url.href;
        shareLink.hidden = false;
        copyShareButton.hidden = false;

        uploadStatus.textContent =
            `Upload complete! Map number: ${result.mapId}`;

    } catch (error) {
        console.error("Map upload failed:", error);

        if (error.status === 429) {
            const seconds = Number.isFinite(error.retryAfter)
                ? error.retryAfter
                : 600;

            uploadStatus.textContent =
                `Upload limit reached: please try again in ${seconds} seconds.`;
        } else {
            uploadStatus.textContent =
                `Upload failed: ${error.message}`;
        }
    } finally {
        uploading = false;
        uploadButton.disabled = !verification.isVerified(currentMap());
    }
});

copyShareButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(shareLink.value);
        copyShareButton.textContent = "COPIED";

        setTimeout(() => {
            copyShareButton.textContent = "COPY SHARE LINK";
        }, 1000);
    } catch (error) {
        console.error(error);
        shareLink.focus();
        shareLink.select();
        uploadStatus.textContent =
            "Link selected. Press Ctrl+C to copy.";
    }
});



/*
 * 초기화
 */

const restoredDraft = autosave.restore();
if (restoredDraft) {
    MAP_WIDTH = restoredDraft.width;
    MAP_HEIGHT = restoredDraft.height;
    colorMap = restoredDraft.color;
    objectMap = restoredDraft.object;
}

mapWidthInput.value = String(MAP_WIDTH);
mapHeightInput.value = String(MAP_HEIGHT);

resizeButton.addEventListener(
    "click",
    () => {

        resizeMaps(
            mapWidthInput.value,
            mapHeightInput.value
        );
    }
);

centerViewButton.addEventListener("click", () => {
    resetMapView();
});

editHistory = createEditorHistory(currentMap());
updateHistoryButtons();
resizeCanvas();
recenterMapView();
selectObject("#");
selectColor("W");
updateTextureToggle();
draw();

function startPreview() {
    if (previewGame) return;
    finishPointerInteraction();

    if (!validateMap()) {
        return;
    }

    const stage = MapParser.parse({
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        color: colorMap.map(row => row.join("")).join("\n"),
        object: objectMap.map(row => row.join("")).join("\n")
    });

    previewCanvas.width = window.innerWidth;
    previewCanvas.height = window.innerHeight;
    gamePreview.classList.add("active");
    gamePreview.setAttribute("aria-hidden", "false");
    if (!objectMap.some(row => row.includes('$'))) {
        alert('A GOAL($) is required to verify the map.');
        gamePreview.classList.remove('active');
        gamePreview.setAttribute('aria-hidden', 'true');
        return;
    }
    const attempt = verification.begin(currentMap());
    verifyStatus.textContent = 'Verification in progress. Reach the goal to enable upload.';
    let attemptGame;
    attemptGame = new Game(previewCanvas, stage, cleared => {
        if (!cleared || previewGame !== attemptGame) return;
        if (!verification.complete(attempt, currentMap())) return;
        verifyStatus.textContent = 'VERIFIED · Map cleared. Ready to upload.';
        uploadButton.disabled = uploading;
        queueMicrotask(() => { if (previewGame === attemptGame) stopPreview(); });
    });
    previewGame = attemptGame;
    previewGame.run();
}

function stopPreview() {

    if (!previewGame) {
        return;
    }

    releasePreviewControls();
    previewGame.stop();
    previewGame = null;
    if (!verification.isVerified(currentMap())) verifyStatus.textContent = 'Verification incomplete. Reach the goal to enable upload.';
    gamePreview.classList.remove("active");
    gamePreview.setAttribute("aria-hidden", "true");
}

verifyButton.addEventListener('click', startPreview);
testButton.addEventListener("click", startPreview);
returnEditorButton.addEventListener("click", stopPreview);

window.addEventListener("keydown", event => {

    if (event.code === "Escape" && previewGame) {
        event.preventDefault();
        stopPreview();
    }
});
const previewPointers = new Map();
function releasePreviewControls() {
    previewGame?.setInput('left', false);
    previewGame?.setInput('right', false);
    for (const pointers of previewPointers.values()) pointers.clear();
}
for (const button of document.querySelectorAll('[data-preview-control]')) {
    const control = button.dataset.previewControl;
    const pointers = new Set();
    previewPointers.set(control, pointers);
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (!previewGame) return;
        pointers.add(event.pointerId);
        button.setPointerCapture(event.pointerId);
        if (control === 'jump') previewGame.jump();
        else if (control === 'layer') previewGame.cycleLayer();
        else previewGame.setInput(control, true);
    });
    const release = event => {
        pointers.delete(event.pointerId);
        if (!pointers.size && (control === 'left' || control === 'right')) previewGame?.setInput(control, false);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
}
window.addEventListener('blur', releasePreviewControls);
document.addEventListener('visibilitychange', () => { if (document.hidden) releasePreviewControls(); });
