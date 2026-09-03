import { BoxCollider } from "./engine.js";
import { BoxDrawer } from "./engine.js";

export class GameObject {

    #collider;
    #drawer;

    constructor(ctx, x, y, w, h, color, effect = {}) {
        this.#collider = new BoxCollider(x, y, w, h);

        this.#drawer = new BoxDrawer(
            ctx,
            color,
            effect
        );
    }

    update() {
        this.#collider.update();
    }

    get x() {
        return this.#collider.x;
    }

    set x(value) {
        this.#collider.x = value;
    }

    get y() {
        return this.#collider.y;
    }

    set y(value) {
        this.#collider.y = value;
    }

    get w() {
        return this.#collider.w;
    }

    set w(value) {
        this.#collider.w = value;
    }

    get h() {
        return this.#collider.h;
    }

    set h(value) {
        this.#collider.h = value;
    }

    get vx() {
        return this.#collider.vx;
    }

    set vx(value) {
        this.#collider.vx = value;
    }

    get vy() {
        return this.#collider.vy;
    }

    set vy(value) {
        this.#collider.vy = value;
    }

    getCollisionData() {
        return {
            x: this.#collider.x,
            y: this.#collider.y,
            w: this.#collider.w,
            h: this.#collider.h,
            vx: this.#collider.vx,
            vy: this.#collider.vy
        };
    }

    isCollidingWith(other) {
        return this.#collider.isCollidingWith(
            other.getCollisionData()
        );
    }

    resolveCollision(other) {
        this.#collider.resolveCollision(
            other.getCollisionData()
        );
    }

    draw(screenX, screenY, scale = 1) {
        this.#drawer.draw(
            screenX,
            screenY,
            this.w * scale,
            this.h * scale
        );
    }
}