const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext("2d");

const paletteButtons =
    document.querySelectorAll(".tile-button");

const clearButton =
    document.getElementById("clear-button");

const saveButton =
    document.getElementById("save-button");

const loadButton =
    document.getElementById("load-button");

const copyButton =
    document.getElementById("copy-button");


/*
 * 맵 설정
 */

const MAP_WIDTH = 16;
const MAP_HEIGHT = 16;


/*
 * Canvas 해상도
 *
 * 실제 맵은 항상 16 × 16 칸이다.
 */

const CANVAS_SIZE = 640;

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;


/*
 * 타일 크기
 */

const TILE_SIZE =
    CANVAS_SIZE / MAP_WIDTH;


/*
 * 사용할 타일 문자
 */

const TILE_CHARS = [
    ".",
    "R",
    "G",
    "B",
    "Y",
    "M",
    "C",
    "W",
    "@",
    "$"
];


/*
 * 현재 선택된 타일
 */

let selectedTile = ".";


/*
 * 맵 데이터
 *
 * map[y][x]
 */

let map = createEmptyMap();


/*
 * 마우스 드래그 상태
 */

let isDrawing = false;


/*
 * 빈 맵 생성
 */

function createEmptyMap() {

    const result = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {

        const row = [];

        for (let x = 0; x < MAP_WIDTH; x++) {

            row.push(".");
        }

        result.push(row);
    }

    return result;
}


/*
 * 타일 색상
 */

function getTileColor(tile) {

    switch (tile) {

        case "R":
            return "#FF0000";

        case "G":
            return "#00FF00";

        case "B":
            return "#0000FF";

        case "Y":
            return "#FFFF00";

        case "M":
            return "#FF00FF";

        case "C":
            return "#00FFFF";

        case "W":
            return "#FFFFFF";

        case "@":
            return "#FFFFFF";

        case "$":
            return "#FFFFFF";

        default:
            return "#000000";
    }
}


/*
 * 맵 그리기
 */

function drawMap() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * 배경
     */

    ctx.fillStyle = "#000000";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * 타일
     */

    for (let y = 0; y < MAP_HEIGHT; y++) {

        for (let x = 0; x < MAP_WIDTH; x++) {

            const tile = map[y][x];

            if (tile === ".") {
                continue;
            }

            const color =
                getTileColor(tile);

            ctx.save();

            /*
             * Goal은 검은색 + 흰색 Glow
             */

            if (tile === "$") {

                ctx.fillStyle = "#000000";

                ctx.shadowColor = "#FFFFFF";
                ctx.shadowBlur = 18;

            } else {

                ctx.fillStyle = color;

                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
            }

            ctx.fillRect(
                x * TILE_SIZE + 1,
                y * TILE_SIZE + 1,
                TILE_SIZE - 2,
                TILE_SIZE - 2
            );

            ctx.restore();
        }
    }


    /*
     * 격자
     */

    ctx.save();

    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;

    for (let x = 0; x <= MAP_WIDTH; x++) {

        const position =
            Math.round(x * TILE_SIZE) + 0.5;

        ctx.beginPath();

        ctx.moveTo(
            position,
            0
        );

        ctx.lineTo(
            position,
            canvas.height
        );

        ctx.stroke();
    }

    for (let y = 0; y <= MAP_HEIGHT; y++) {

        const position =
            Math.round(y * TILE_SIZE) + 0.5;

        ctx.beginPath();

        ctx.moveTo(
            0,
            position
        );

        ctx.lineTo(
            canvas.width,
            position
        );

        ctx.stroke();
    }

    ctx.restore();


    /*
     * 타일 문자 표시
     *
     * 에디터에서 맵 구조를
     * 쉽게 확인할 수 있도록 한다.
     */

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 16px monospace";

    for (let y = 0; y < MAP_HEIGHT; y++) {

        for (let x = 0; x < MAP_WIDTH; x++) {

            const tile = map[y][x];

            if (tile === ".") {
                continue;
            }

            ctx.fillStyle =
                tile === "$"
                    ? "#FFFFFF"
                    : "#000000";

            ctx.fillText(
                tile,
                x * TILE_SIZE + TILE_SIZE / 2,
                y * TILE_SIZE + TILE_SIZE / 2
            );
        }
    }

    ctx.restore();
}


/*
 * Canvas 좌표 → 맵 좌표
 */

function getMapPosition(event) {

    const rect =
        canvas.getBoundingClientRect();

    const canvasX =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const canvasY =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);

    const x =
        Math.floor(
            canvasX / TILE_SIZE
        );

    const y =
        Math.floor(
            canvasY / TILE_SIZE
        );

    if (
        x < 0 ||
        x >= MAP_WIDTH ||
        y < 0 ||
        y >= MAP_HEIGHT
    ) {
        return null;
    }

    return {
        x,
        y
    };
}


/*
 * 특수 타일 배치
 *
 * @와 $는 맵에 하나만 존재하도록 한다.
 */

function placeTile(x, y) {

    /*
     * @ 또는 $를 새 위치에 놓는 경우
     * 기존 것을 제거한다.
     */

    if (
        selectedTile === "@" ||
        selectedTile === "$"
    ) {

        for (let mapY = 0; mapY < MAP_HEIGHT; mapY++) {

            for (let mapX = 0; mapX < MAP_WIDTH; mapX++) {

                if (
                    map[mapY][mapX]
                    === selectedTile
                ) {
                    map[mapY][mapX] = ".";
                }
            }
        }
    }

    map[y][x] = selectedTile;

    drawMap();
}


/*
 * 팔레트 선택
 */

paletteButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            selectedTile =
                button.dataset.tile;

            paletteButtons.forEach(
                otherButton => {

                    otherButton.classList.remove(
                        "selected"
                    );
                }
            );

            button.classList.add(
                "selected"
            );
        }
    );
});


/*
 * 마우스 누르기
 */

canvas.addEventListener(
    "mousedown",
    event => {

        if (event.button !== 0) {
            return;
        }

        isDrawing = true;

        const position =
            getMapPosition(event);

        if (!position) {
            return;
        }

        placeTile(
            position.x,
            position.y
        );
    }
);


/*
 * 마우스 이동
 *
 * 누르고 드래그하면 계속 칠한다.
 */

canvas.addEventListener(
    "mousemove",
    event => {

        if (!isDrawing) {
            return;
        }

        const position =
            getMapPosition(event);

        if (!position) {
            return;
        }

        /*
         * @와 $는 드래그 배치하지 않는다.
         */

        if (
            selectedTile === "@" ||
            selectedTile === "$"
        ) {
            return;
        }

        map[position.y][position.x] =
            selectedTile;

        drawMap();
    }
);


/*
 * 마우스 떼기
 */

window.addEventListener(
    "mouseup",
    () => {

        isDrawing = false;
    }
);


/*
 * 우클릭 = 지우기
 */

canvas.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();

        const position =
            getMapPosition(event);

        if (!position) {
            return;
        }

        map[position.y][position.x] = ".";

        drawMap();
    }
);


/*
 * CLEAR
 */

clearButton.addEventListener(
    "click",
    () => {

        map = createEmptyMap();

        drawMap();
    }
);


/*
 * Map → 문자열
 */

function mapToString() {

    return map
        .map(row => row.join(""))
        .join("\n");
}


/*
 * Map → JavaScript 코드
 */

function generateMapCode() {

    const mapString =
        mapToString();

    return `{
    map: \`
${mapString}
    \`
}`;
}


/*
 * SAVE
 *
 * 현재 맵을 브라우저 localStorage에 저장한다.
 */

saveButton.addEventListener(
    "click",
    () => {

        localStorage.setItem(
            "layer-s-editor-map",
            JSON.stringify(map)
        );
    }
);


/*
 * LOAD
 *
 * 저장된 맵을 불러온다.
 */

loadButton.addEventListener(
    "click",
    () => {

        const saved =
            localStorage.getItem(
                "layer-s-editor-map"
            );

        if (!saved) {
            return;
        }

        try {

            const loaded =
                JSON.parse(saved);

            if (
                !Array.isArray(loaded) ||
                loaded.length !== MAP_HEIGHT
            ) {
                throw new Error(
                    "Invalid map height."
                );
            }

            for (const row of loaded) {

                if (
                    !Array.isArray(row) ||
                    row.length !== MAP_WIDTH
                ) {
                    throw new Error(
                        "Invalid map width."
                    );
                }

                for (const tile of row) {

                    if (
                        !TILE_CHARS.includes(tile)
                    ) {
                        throw new Error(
                            `Invalid tile: ${tile}`
                        );
                    }
                }
            }

            map = loaded;

            drawMap();

        } catch (error) {

            console.error(
                "Failed to load map:",
                error
            );
        }
    }
);


/*
 * COPY CODE
 *
 * 현재 맵을 LAYER:S map 형식으로
 * 클립보드에 복사한다.
 */

copyButton.addEventListener(
    "click",
    async () => {

        const code =
            generateMapCode();

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

            console.error(
                "Failed to copy:",
                error
            );
        }
    }
);


/*
 * 초기 화면
 */

drawMap();