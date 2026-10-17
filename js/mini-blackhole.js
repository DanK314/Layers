import { drawColorTexture } from "./texture.js";

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
        const pullRadius = MiniBlackhole.PULL_RADIUS * scale;
        const range = ctx.createRadialGradient(
            centerX,
            centerY,
            radius,
            centerX,
            centerY,
            pullRadius
        );

        range.addColorStop(0, `${this.#color}18`);
        range.addColorStop(1, `${this.#color}00`);

        ctx.fillStyle = range;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pullRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha *= 0.2;
        ctx.strokeStyle = this.#color;
        ctx.lineWidth = Math.max(1, scale);
        ctx.beginPath();
        ctx.arc(centerX, centerY, pullRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = drawAlpha;
        ctx.fillStyle = this.#color;
        ctx.shadowColor = this.#color;
        ctx.shadowBlur = 8 * scale;

        for (let particle = 0; particle < 12; particle++) {
            const progress = particle / 12;
            const angle = progress * Math.PI * 2 + elapsedTime * 1.8;
            const orbit = radius * (0.35 + progress * 0.65);
            const x = centerX + Math.cos(angle) * orbit;
            const y = centerY + Math.sin(angle) * orbit * 0.72;
            const size = Math.max(1, (1.5 + progress * 1.5) * scale);

            ctx.globalAlpha = 0.35 + progress * 0.45;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        const coreRadius = radius * 0.65;
        const coreX = centerX - coreRadius;
        const coreY = centerY - coreRadius;
        const coreSize = coreRadius * 2;

        ctx.globalAlpha = drawAlpha;
        ctx.fillStyle = this.#color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

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
