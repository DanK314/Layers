import { GameObject } from "./object.js";
import { drawColorTexture } from "./texture.js";

export class Block extends GameObject {

    static SIZE = 64;
    static VISUAL_PADDING = 2;
    static MAX_VINE_LENGTH = Block.SIZE * 0.55;

    layerMask;
    ctx;
    color;
    grassBlades;
    vines;

    constructor(
        ctx,
        x,
        y,
        color,
        layerMask,
        effect = {}
    ) {
        super(
            ctx,
            x,
            y,
            Block.SIZE,
            Block.SIZE,
            color,
            effect
        );

        this.ctx = ctx;
        this.color = color;
        this.layerMask = layerMask;
        this.grassBlades = [];
        this.vines = Array.from(
            { length: 1 },
            () => ({
                x: Block.SIZE * (0.12 + Math.random() * 0.76),
                length: Block.SIZE * (0.25 + Math.random() * 0.3),
                sway: Block.SIZE * (Math.random() * 0.12 - 0.06),
                bend: Block.SIZE * (Math.random() * 0.18 - 0.09),
                leaves: Array.from(
                    { length: 1 + Math.floor(Math.random() * 2) },
                    (_, leaf) => ({
                        position: 0.2 + leaf * 0.18 + Math.random() * 0.08,
                        side: leaf % 2 === 0 ? -1 : 1,
                        length: Block.SIZE * (0.07 + Math.random() * 0.05)
                    })
                )
            })
        );

        if (effect.grass && Math.random() < 0.55) {
            const bladeCount = 3 + Math.floor(Math.random() * 4);

            for (let blade = 0; blade < bladeCount; blade++) {
                this.grassBlades.push({
                    x: Block.SIZE * (0.08 + Math.random() * 0.84),
                    height: Block.SIZE * (0.16 + Math.random() * 0.18),
                    width: Block.SIZE * (0.025 + Math.random() * 0.02),
                    lean: Block.SIZE * (Math.random() * 0.08 - 0.04),
                    color: this.color
                });
            }
        }

        this.vx = 0;
        this.vy = 0;
    }

    update() {
        this.vx = 0;
        this.vy = 0;
    }

    isSolid(layer) {
        return this.layerMask[layer];
    }

    draw(screenX, screenY, scale = 1) {
        const visualPadding = Block.VISUAL_PADDING * scale;
        const visualX = screenX - visualPadding;
        const visualY = screenY - visualPadding;
        const visualScale =
            scale * (this.w + Block.VISUAL_PADDING * 2) / this.w;

        super.draw(visualX, visualY, visualScale);

        const width = this.w * visualScale;
        const height = this.h * visualScale;

        drawColorTexture(
            this.ctx,
            this.color,
            visualX,
            visualY,
            width,
            height,
            "rect"
        );

        for (const blade of this.grassBlades) {
            const baseX = visualX + blade.x * visualScale;
            const baseY = visualY;

            this.ctx.fillStyle = blade.color;
            this.ctx.beginPath();
            this.ctx.moveTo(baseX - blade.width * visualScale / 2, baseY);
            this.ctx.lineTo(
                baseX + blade.lean * visualScale,
                baseY - blade.height * visualScale
            );
            this.ctx.lineTo(baseX + blade.width * visualScale / 2, baseY);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.save();
        this.ctx.strokeStyle = this.color;
        this.ctx.lineCap = "round";

        for (const vine of this.vines) {
            const startX = screenX + vine.x * scale;
            const startY = screenY + this.h * scale;
            const endX = startX + vine.sway * scale;
            const endY = startY + vine.length * scale;
            const control1X = startX + vine.bend * scale;
            const control1Y = startY + vine.length * scale * 0.35;
            const control2X = endX - vine.bend * scale;
            const control2Y = startY + vine.length * scale * 0.7;

            this.ctx.lineWidth = Math.max(1.2, 3 * scale);
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.bezierCurveTo(
                control1X,
                control1Y,
                control2X,
                control2Y,
                endX,
                endY
            );
            this.ctx.stroke();

            for (const leaf of vine.leaves) {
                const t = leaf.position;
                const inverseT = 1 - t;
                const leafX =
                    inverseT ** 3 * startX +
                    3 * inverseT ** 2 * t * control1X +
                    3 * inverseT * t ** 2 * control2X +
                    t ** 3 * endX;
                const leafY =
                    inverseT ** 3 * startY +
                    3 * inverseT ** 2 * t * control1Y +
                    3 * inverseT * t ** 2 * control2Y +
                    t ** 3 * endY;
                const tangentX =
                    3 * inverseT ** 2 * (control1X - startX) +
                    6 * inverseT * t * (control2X - control1X) +
                    3 * t ** 2 * (endX - control2X);
                const tangentY =
                    3 * inverseT ** 2 * (control1Y - startY) +
                    6 * inverseT * t * (control2Y - control1Y) +
                    3 * t ** 2 * (endY - control2Y);
                const leafAngle =
                    Math.atan2(tangentY, tangentX) +
                    leaf.side * Math.PI * 0.65;
                const leafLength = leaf.length * scale;
                const leafWidth = leafLength * 0.42;
                const rootX = leafX + Math.cos(leafAngle) * scale;
                const rootY = leafY + Math.sin(leafAngle) * scale;

                this.ctx.beginPath();
                this.ctx.moveTo(leafX, leafY);
                this.ctx.lineTo(rootX, rootY);
                this.ctx.stroke();

                this.ctx.save();
                this.ctx.translate(rootX, rootY);
                this.ctx.rotate(leafAngle);
                this.ctx.fillStyle = this.color;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.quadraticCurveTo(
                    leafLength * 0.55,
                    -leafWidth,
                    leafLength,
                    0
                );
                this.ctx.quadraticCurveTo(
                    leafLength * 0.55,
                    leafWidth,
                    0,
                    0
                );
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        this.ctx.restore();
    }
}