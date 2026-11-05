import { loadMap } from "./map-api.js";
import { parseUserMapData } from "./user-map.js";

const COLORS = { R: "#ff4545", G: "#4cff83", B: "#537cff", Y: "#ffe35c", M: "#f366ff", C: "#50e8ff", W: "#ffffff" };
const LAYERS = { R: "R", G: "G", B: "B", Y: "RG", M: "RB", C: "GB", W: "RGB" };

export function drawMapPreview(canvas, map, layer = "ALL") {
    const ctx = canvas.getContext("2d");
    canvas.width = 960;
    canvas.height = 600;
    const tile = Math.min(80, 912 / map.width, 552 / map.height);
    const left = (canvas.width - map.width * tile) / 2;
    const top = (canvas.height - map.height * tile) / 2;
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#383838";
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, map.width * tile, map.height * tile);
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            const object = map.object[y][x];
            if (object === ".") continue;
            const color = map.color[y][x];
            const px = left + x * tile;
            const py = top + y * tile;
            const inset = tile > 10 ? 1 : 0;
            ctx.save();
            ctx.fillStyle = COLORS[color] || "#ffffff";
            ctx.globalAlpha = layer === "ALL" || LAYERS[color]?.includes(layer) ? 1 : 0.18;
            if (object === "#") {
                ctx.fillRect(px + inset, py + inset, tile - inset * 2, tile - inset * 2);
            } else if (object === "^") {
                ctx.beginPath();
                ctx.moveTo(px + tile / 2, py + inset);
                ctx.lineTo(px + tile - inset, py + tile - inset);
                ctx.lineTo(px + inset, py + tile - inset);
                ctx.closePath();
                ctx.fill();
            } else if (object === "O") {
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = Math.max(1, tile * 0.1);
                ctx.beginPath();
                ctx.arc(px + tile / 2, py + tile / 2, tile * 0.32, 0, Math.PI * 2);
                ctx.stroke();
            } else if (object === "@" || object === "$") {
                ctx.globalAlpha = 1;
                ctx.fillStyle = object === "@" ? "#77ffb4" : "#ffe479";
                ctx.beginPath();
                ctx.arc(px + tile / 2, py + tile / 2, Math.max(3, tile * 0.4), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#111111";
                if (tile >= 16) {
                    ctx.font = `bold ${Math.floor(tile * 0.5)}px Arial`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(object === "@" ? "S" : "G", px + tile / 2, py + tile / 2);
                }
            }
            ctx.restore();
        }
    }
}

export function createMapPreview(root, { onSelect, getBestTime = () => null, onOpen, onClose }) {
    const canvas = root.querySelector("[data-preview-canvas]");
    const title = root.querySelector("[data-preview-title]");
    const details = root.querySelector("[data-preview-meta]");
    const status = root.querySelector("[data-preview-status]");
    const play = root.querySelector("[data-preview-play]");
    const back = root.querySelector("[data-preview-back]");
    const layers = [...root.querySelectorAll("[data-preview-layer]")];
    let controller = null;
    let current = null;
    let mapData = null;
    let selectedLayer = "ALL";
    let selecting = false;
    const cache = new Map();

    function controls() {
        play.disabled = !mapData || selecting;
        back.disabled = selecting;
        for (const button of layers) {
            button.disabled = !mapData || selecting;
            button.setAttribute("aria-pressed", String(button.dataset.previewLayer === selectedLayer));
        }
    }
    function cancel() {
        controller?.abort();
        controller = null;
        current = null;
        mapData = null;
        root.hidden = true;
    }
    async function open(map) {
        cancel();
        const request = controller = new AbortController();
        const timeout = setTimeout(() => request.abort(), 15000);
        current = map;
        selectedLayer = "ALL";
        root.hidden = false;
        canvas.hidden = true;
        title.textContent = map.title;
        details.textContent = `#${map.id}`;
        status.textContent = "Loading map preview…";
        controls();
        onOpen();
        try {
            const response = cache.get(map.id) || await loadMap(map.id, { signal: request.signal });
            if (controller !== request || request.signal.aborted) return;
            parseUserMapData(response);
            if (!cache.has(map.id)) {
                if (cache.size >= 20) cache.delete(cache.keys().next().value);
                cache.set(map.id, response);
            }
            mapData = response.mapData;
            title.textContent = response.title || map.title;
            details.textContent = `#${map.id} · ${mapData.width} × ${mapData.height} tiles`;
            const best = getBestTime(map.id);
            details.textContent += ` · BEST ${best === null ? '—' : best.toFixed(2) + ' s'}`;
            canvas.setAttribute("aria-label", `Preview of ${response.title || map.title}. ${mapData.width} by ${mapData.height} tiles. S marks the start; G marks the goal.`);
            drawMapPreview(canvas, mapData, selectedLayer);
            canvas.hidden = false;
            status.textContent = "S: Start · G: Goal · ▲: Spikes · ◯: Black holes";
            controls();
        } catch (error) {
            if (controller !== request) return;
            mapData = null;
            canvas.hidden = true;
            status.textContent = request.signal.aborted ? "The preview took too long to load. Return to the list and try again." : `Could not load preview: ${error.message}`;
            controls();
        } finally { clearTimeout(timeout); }
    }
    for (const button of layers) {
        button.addEventListener("click", () => {
            if (!mapData || selecting) return;
            selectedLayer = button.dataset.previewLayer;
            drawMapPreview(canvas, mapData, selectedLayer);
            controls();
        });
    }
    play.addEventListener("click", async () => {
        if (!current || !mapData || selecting) return;
        const id = current.id;
        selecting = true;
        controls();
        try { await onSelect(id); }
        finally { selecting = false; controls(); }
    });
    back.addEventListener("click", () => {
        if (selecting) return;
        cancel();
        onClose();
    });
    return { open, cancel, clearCache: () => cache.clear() };
}
