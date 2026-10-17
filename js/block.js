import { GameObject } from "./object.js";
import { drawColorTexture } from "./texture.js";

export class Block extends GameObject {

    layerMask;
    ctx;
    color;
    grassBlades;

    static SIZE = 64;

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

        if (effect.grass && Math.random() < 0.55) {
            const bladeCount = 3 + Math.floor(Math.random() * 4);

            for (let blade = 0; blade < bladeCount; blade++) {
                this.grassBlades.push({
                    x: Block.SIZE * (0.08 + Math.random() * 0.84),
                    height: Block.SIZE * (0.16 + Math.random() * 0.18),
                    width: Block.SIZE * (0.06 + Math.random() * 0.05),
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
        super.draw(screenX, screenY, scale);

        const width = this.w * scale;
        const height = this.h * scale;

        drawColorTexture(
            this.ctx,
            this.color,
            screenX,
            screenY,
            width,
            height,
            "rect"
        );

        for (const blade of this.grassBlades) {
            const baseX = screenX + blade.x * scale;
            const baseY = screenY;

            this.ctx.fillStyle = blade.color;
            this.ctx.beginPath();
            this.ctx.moveTo(baseX - blade.width * scale / 2, baseY);
            this.ctx.lineTo(
                baseX + blade.lean * scale,
                baseY - blade.height * scale
            );
            this.ctx.lineTo(baseX + blade.width * scale / 2, baseY);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
}