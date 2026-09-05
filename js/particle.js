export class Particle {

    x;
    y;

    vx;
    vy;

    life;
    maxLife;

    size;

    constructor(x, y, burst = false) {

        this.x = x;
        this.y = y;

        this.vx =
            (Math.random() - 0.5) * (burst ? 260 : 30);

        this.vy =
            (Math.random() - 0.5) * (burst ? 260 : 30);

        this.maxLife =
            1.5 + Math.random() * 1.5;

        this.life = this.maxLife;

        this.size =
            burst
                ? 3 + Math.random() * 4
                : 2 + Math.random() * 3;
    }

    update(deltaTime) {

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        this.life -= deltaTime;
    }

    get alive() {
        return this.life > 0;
    }

    draw(ctx, screenX, screenY, scale) {

        const progress =
            this.life / this.maxLife;

        /*
         * 처음과 마지막에는 희미하고
         * 중간에서 가장 밝게 만든다.
         */

        const alpha =
            Math.sin(progress * Math.PI) * 0.7;

        const size =
            this.size * scale;

        ctx.save();

        ctx.globalAlpha = alpha;

        ctx.fillStyle = "#FFFFFF";

        ctx.beginPath();

        ctx.arc(
            screenX,
            screenY,
            size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}