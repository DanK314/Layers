import { drawColorTexture } from "./texture.js";

// Shared across all holes of the same color; never blur twelve paths per hole per frame.
const effectCache = new Map();
function glowSprite(color, radius) {
    const padding = 24;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.ceil((radius + padding) * 2);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
}
function effectsFor(color) {
    if (effectCache.has(color)) return effectCache.get(color);
    const range = document.createElement("canvas");
    const radius = MiniBlackhole.PULL_RADIUS;
    range.width = range.height = radius * 2 + 4;
    const ctx = range.getContext("2d");
    const center = range.width / 2;
    const gradient = ctx.createRadialGradient(center, center, 64 * 0.28, center, center, radius);
    gradient.addColorStop(0, `${color}18`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    const effects = {
        range,
        particles: Array.from({ length: 12 }, (_, i) => glowSprite(color, 1.5 + i / 12 * 1.5)),
        core: glowSprite(color, 64 * 0.28 * 0.65)
    };
    effectCache.set(color, effects);
    return effects;
}
function drawSprite(ctx, sprite, x, y, scale) {
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    ctx.drawImage(sprite, x - width / 2, y - height / 2, width, height);
}

export class MiniBlackhole {

    x;
    y;
    w = 64;
    h = 64;

    #ctx;
    #color;
    #rgb;

    static PULL_RADIUS = 224;
    static PULL_STRENGTH = 12000;

    constructor(ctx, x, y, color, rgb) {
        this.#ctx = ctx;
        this.x = x;
        this.y = y;
        this.#color = color;
        this.#rgb = rgb;
    }

    isSolid(layer) {
        return this.#rgb[layer];
    }

    pull(player, deltaTime) {
        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;
        const dx = centerX - (player.x + player.w / 2);
        const dy = centerY - (player.y + player.h / 2);
        const distance = Math.hypot(dx, dy);

        if (distance === 0 || distance >= MiniBlackhole.PULL_RADIUS) {
            return;
        }

        const strength =
            MiniBlackhole.PULL_STRENGTH *
            (1 - distance / MiniBlackhole.PULL_RADIUS);

        player.vx += dx / distance * strength * deltaTime;
        player.vy += dy / distance * strength * deltaTime;
    }

    draw(screenX, screenY, scale, elapsedTime) {
        const ctx = this.#ctx;
        const centerX = screenX + this.w * scale / 2;
        const centerY = screenY + this.h * scale / 2;
        const radius = this.w * scale * 0.28;

        ctx.save();

        const drawAlpha = ctx.globalAlpha;
        const effects = effectsFor(this.#color);
        drawSprite(ctx, effects.range, centerX, centerY, scale);

        for (let particle = 0; particle < 12; particle++) {
            const progress = particle / 12;
            const angle = progress * Math.PI * 2 + elapsedTime * 1.8;
            const orbit = radius * (0.35 + progress * 0.65);
            const x = centerX + Math.cos(angle) * orbit;
            const y = centerY + Math.sin(angle) * orbit * 0.72;
            ctx.globalAlpha = drawAlpha * (0.35 + progress * 0.45);
            drawSprite(ctx, effects.particles[particle], x, y, scale);
        }

        const coreRadius = radius * 0.65;
        const coreX = centerX - coreRadius;
        const coreY = centerY - coreRadius;
        const coreSize = coreRadius * 2;

        ctx.globalAlpha = drawAlpha;
        drawSprite(ctx, effects.core, centerX, centerY, scale);

        drawColorTexture(
            ctx,
            this.#color,
            coreX,
            coreY,
            coreSize,
            coreSize,
            "circle"
        );

        ctx.restore();
    }
}
