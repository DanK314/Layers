export class BoxCollider {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.vx = 0;
        this.vy = 0;

        this.setting = {
            gravity: true,
            friction: true,
            collides: true
        };
    }

    isCollidingWith(other) {
        return (
            this.x < other.x + other.w &&
            this.x + this.w > other.x &&
            this.y < other.y + other.h &&
            this.y + this.h > other.y
        );
    }

    resolveCollision(other) {

        if (!this.setting.collides) return;
        if (!this.isCollidingWith(other)) return;

        const dx =
            (this.x + this.w / 2) -
            (other.x + other.w / 2);

        const dy =
            (this.y + this.h / 2) -
            (other.y + other.h / 2);

        const overlapX =
            (this.w + other.w) / 2 -
            Math.abs(dx);

        const overlapY =
            (this.h + other.h) / 2 -
            Math.abs(dy);

        if (overlapX < overlapY) {

            if (dx > 0) {
                this.x += overlapX;
            } else {
                this.x -= overlapX;
            }

            this.vx = 0;

        } else {

            if (dy > 0) {
                this.y += overlapY;
            } else {
                this.y -= overlapY;
            }

            this.vy = 0;
        }
    }

    update(deltaTime = 1 / 60) {

        if (this.setting.gravity) {
            const gravity = 2400;

            this.vy += gravity * deltaTime;
        }

        if (this.setting.friction) {
            const friction = 12;

            this.vx *= Math.max(
                0,
                1 - friction * deltaTime
            );
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }
}
export class BoxDrawer {
    constructor(
        ctx,
        color,
        effect = {}
    ) {
        this.ctx = ctx;

        this.color = color;

        this.opts = {
            glow: false,
            glowColor: "#FFFFFF",
            ...effect
        };
    }

    draw(x, y, w, h) {
        const ctx = this.ctx;

        ctx.save();

        if (this.opts.glow) {
            ctx.shadowColor = this.opts.glowColor;
            ctx.shadowBlur = 24;
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, w, h);

        ctx.restore();
    }
}