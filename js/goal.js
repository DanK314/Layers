import { GameObject } from "./object.js";

export class Goal extends GameObject {

    static HITBOX_INSET = 16;

    constructor(ctx, x, y) {

        super(
            ctx,
            x,
            y,
            64,
            64,
            "#000000",
            {
                glow: true,
                glowColor: "#FFFFFF",
                glowBlur: 20
            }
        );
    }

    update() {
        this.vx = 0;
        this.vy = 0;
    }

    getCollisionData() {
        const inset = Goal.HITBOX_INSET;

        return {
            x: this.x + inset,
            y: this.y + inset,
            w: this.w - inset * 2,
            h: this.h - inset * 2,
            vx: this.vx,
            vy: this.vy
        };
    }
}