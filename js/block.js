import { GameObject } from "./object.js";

export class Block extends GameObject {

    layerMask;

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

        this.layerMask = layerMask;

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
}