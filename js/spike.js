export class Spike {
    x;
    y;
    w;
    h;

    constructor(ctx, x, y, size = 64) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = size;
        this.h = size;
    }

    get hitbox() {
        const inset = 24;

        return {
            x: this.x + inset,
            y: this.y + inset,
            w: this.w - inset * 2,
            h: this.h - inset * 2
        };
    }

    draw(screenX, screenY, scale = 1) {
        const ctx = this.ctx;
        const s = this.w * scale;
        const cx = screenX + s / 2;
        const cy = screenY + s / 2;
        const half = s * 0.5;

        ctx.save();
        ctx.fillStyle = "#EAF6FF";
        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(cx, screenY + 2);
        ctx.lineTo(screenX + s - 2, cy);
        ctx.lineTo(cx, screenY + s - 2);
        ctx.lineTo(screenX + 2, cy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, screenY + half);
        ctx.lineTo(screenX + s - half, cy);
        ctx.lineTo(cx, screenY + s - half);
        ctx.lineTo(screenX + half, cy);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
