const canvas = document.querySelector("#map-canvas");
const ctx = canvas.getContext("2d");

const objectButtons = document.querySelectorAll(".object-button");
const colorButtons = document.querySelectorAll(".color-button");

const clearButton = document.querySelector("#clear-button");
const saveButton = document.querySelector("#save-button");
const loadButton = document.querySelector("#load-button");
const copyButton = document.querySelector("#copy-button");
const resizeButton = document.querySelector("#resize-button");
const mapWidthInput = document.querySelector("#map-width-input");
const mapHeightInput = document.querySelector("#map-height-input");


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


/*
 * 마우스 상태
 */

let isMouseDown = false;


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

    draw();
}


/*
 * Canvas 크기
 */

function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();

    const size = Math.min(
        rect.width,
        rect.height
    );

    canvas.width = size;
    canvas.height = size;

    draw();
}


window.addEventListener(
    "resize",
    resizeCanvas
);


/*
 * 셀 크기
 */

function getCellSize() {

    return canvas.width / MAP_WIDTH;
}


/*
 * 캔버스 좌표 → 맵 좌표
 */

function getCellFromMouse(event) {

    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left) /
        rect.width *
        canvas.width;

    const y =
        (event.clientY - rect.top) /
        rect.height *
        canvas.height;

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

    const px = x * cellSize;
    const py = y * cellSize;

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

            ctx.fillRect(
                px + cellSize * 0.08,
                py + cellSize * 0.08,
                cellSize * 0.84,
                cellSize * 0.84
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

            drawCell(x, y);
        }
    }
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
 * 4 = PLAYER
 * 5 = GOAL
 */

window.addEventListener(
    "keydown",
    event => {

        const keyMap = {
            "1": ".",
            "2": "#",
            "3": "^",
            "4": "@",
            "5": "$"
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
}


/*
 * 마우스 누르기
 */

canvas.addEventListener(
    "mousedown",
    event => {

        isMouseDown = true;

        const cell =
            getCellFromMouse(event);

        if (!cell) {
            return;
        }

        paintCell(
            cell.x,
            cell.y
        );
    }
);


/*
 * 마우스 이동
 *
 * 누른 상태에서 드래그 페인팅
 */

canvas.addEventListener(
    "mousemove",
    event => {

        if (!isMouseDown) {
            return;
        }

        const cell =
            getCellFromMouse(event);

        if (!cell) {
            return;
        }

        paintCell(
            cell.x,
            cell.y
        );
    }
);


/*
 * 마우스 버튼 해제
 */

window.addEventListener(
    "mouseup",
    () => {

        isMouseDown = false;

    }
);


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

        colorMap =
            createColorMap();

        objectMap =
            createObjectMap();

        draw();

    }
);


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
            "PLAYER(@)가 없습니다."
        );

        return false;
    }


    if (playerCount > 1) {

        alert(
            "PLAYER(@)는 하나만 존재해야 합니다."
        );

        return false;
    }


    if (goalCount > 1) {

        alert(
            "GOAL($)은 하나만 존재해야 합니다."
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
                "코드를 복사할 수 없습니다."
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
                "저장된 맵이 없습니다."
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

            draw();

        } catch (error) {

            console.error(error);

            alert(
                "맵 데이터를 불러올 수 없습니다."
            );
        }
    }
);


/*
 * 초기화
 */

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

resizeCanvas();
selectObject("#");
selectColor("W");
draw();