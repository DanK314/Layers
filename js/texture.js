const COLOR_TEXTURE_STORAGE_KEY = "layer-s-color-textures";

let colorTexturesEnabled =
    localStorage.getItem(COLOR_TEXTURE_STORAGE_KEY) !== "false";

document.documentElement.dataset.colorTextures =
    colorTexturesEnabled ? "on" : "off";

const PATTERN_BY_COLOR = {
    "#FF0000": "horizontal",
    "#00FF00": "vertical",
    "#0000FF": "dots",
    "#FFFF00": "diagonal",
    "#FF00FF": "crosshatch",
    "#00FFFF": "reverse-diagonal",
    "#FFFFFF": "checker"
};

const TEXTURE_SIZE = 64;
const textureCache = new Map();

export function areColorTexturesEnabled() {
    return colorTexturesEnabled;
}

export function setColorTexturesEnabled(enabled) {
    colorTexturesEnabled = enabled;
    localStorage.setItem(
        COLOR_TEXTURE_STORAGE_KEY,
        String(enabled)
    );
    document.documentElement.dataset.colorTextures =
        enabled ? "on" : "off";
}

function createColorTexture(color, shape) {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;

    const textureCtx = canvas.getContext("2d");
    if (!colorTexturesEnabled) {
        return canvas;
    }

    const pattern = PATTERN_BY_COLOR[color.toUpperCase()];

    if (!pattern) {
        return canvas;
    }

    const colorChannels = color.match(/[a-f\d]{2}/gi).map(channel => Number.parseInt(channel, 16));
    const luminance =
        colorChannels[0] * 0.299 +
        colorChannels[1] * 0.587 +
        colorChannels[2] * 0.114;
    const textureColor = luminance > 140 ? "#000000" : "#FFFFFF";
    const spacing = TEXTURE_SIZE / 4;

    textureCtx.beginPath();
    if (shape === "diamond") {
        textureCtx.moveTo(TEXTURE_SIZE / 2, 0);
        textureCtx.lineTo(TEXTURE_SIZE, TEXTURE_SIZE / 2);
        textureCtx.lineTo(TEXTURE_SIZE / 2, TEXTURE_SIZE);
        textureCtx.lineTo(0, TEXTURE_SIZE / 2);
        textureCtx.closePath();
    } else if (shape === "circle") {
        textureCtx.arc(
            TEXTURE_SIZE / 2,
            TEXTURE_SIZE / 2,
            TEXTURE_SIZE / 2,
            0,
            Math.PI * 2
        );
    } else {
        textureCtx.rect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    }
    textureCtx.clip();
    textureCtx.globalAlpha = 0.65;
    textureCtx.strokeStyle = textureColor;
    textureCtx.fillStyle = textureColor;
    textureCtx.lineWidth = TEXTURE_SIZE * 0.035;

    if (pattern === "horizontal" || pattern === "vertical") {
        textureCtx.beginPath();

        for (let offset = spacing / 2; offset < TEXTURE_SIZE; offset += spacing) {
            if (pattern === "horizontal") {
                textureCtx.moveTo(0, offset);
                textureCtx.lineTo(TEXTURE_SIZE, offset);
            } else {
                textureCtx.moveTo(offset, 0);
                textureCtx.lineTo(offset, TEXTURE_SIZE);
            }
        }

        textureCtx.stroke();
    } else if (pattern === "dots") {
        const radius = TEXTURE_SIZE * 0.045;

        for (let row = 0; row * spacing < TEXTURE_SIZE; row++) {
            for (let column = 0; column * spacing < TEXTURE_SIZE; column++) {
                textureCtx.beginPath();
                textureCtx.arc(
                    spacing / 2 + column * spacing,
                    spacing / 2 + row * spacing,
                    radius,
                    0,
                    Math.PI * 2
                );
                textureCtx.fill();
            }
        }
    } else if (pattern === "checker") {
        const squareSize = spacing / 2;

        for (let row = 0; row * squareSize < TEXTURE_SIZE; row++) {
            for (let column = 0; column * squareSize < TEXTURE_SIZE; column++) {
                if ((row + column) % 2 === 0) {
                    textureCtx.fillRect(
                        column * squareSize,
                        row * squareSize,
                        squareSize,
                        squareSize
                    );
                }
            }
        }
    } else {
        textureCtx.beginPath();

        for (let offset = -TEXTURE_SIZE; offset <= TEXTURE_SIZE; offset += spacing) {
            if (pattern === "diagonal" || pattern === "crosshatch") {
                textureCtx.moveTo(offset, TEXTURE_SIZE);
                textureCtx.lineTo(offset + TEXTURE_SIZE, 0);
            }

            if (
                pattern === "reverse-diagonal" ||
                pattern === "crosshatch"
            ) {
                textureCtx.moveTo(offset, 0);
                textureCtx.lineTo(offset + TEXTURE_SIZE, TEXTURE_SIZE);
            }
        }

        textureCtx.stroke();
    }

    return canvas;
}

export function drawColorTexture(ctx, color, x, y, width, height, shape = "rect") {
    if (!colorTexturesEnabled) {
        return;
    }

    const cacheKey = `${color.toUpperCase()}:${shape}`;
    let texture = textureCache.get(cacheKey);

    if (!texture) {
        texture = createColorTexture(color, shape);
        textureCache.set(cacheKey, texture);
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.drawImage(texture, x, y, width, height);
    ctx.restore();
}
