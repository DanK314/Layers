export class Spike {

    x;
    y;
    w;
    h;

    color;

    R;
    G;
    B;

    glow;
    glowColor;

    constructor(
        ctx,
        x,
        y,
        color,
        rgb,
        options
    ) {

        this.ctx = ctx;

        this.x = x;
        this.y = y;

        this.w = 64;
        this.h = 64;

        this.color = color;

        this.R = rgb.R;
        this.G = rgb.G;
        this.B = rgb.B;

        this.glow = options.glow;
        this.glowColor = options.glowColor;
    }


    /*
     * 현재 레이어에서
     * 이 가시가 실체화되는지 확인한다.
     */

    isSolid(layer) {

        switch (layer) {

            case "R":
                return this.R;

            case "G":
                return this.G;

            case "B":
                return this.B;

            default:
                return false;
        }
    }


    /*
     * 실제 충돌 판정 영역
     *
     * 시각적인 크기보다 작게 만들어
     * 걸치기 점프를 가능하게 한다.
     */

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

        const cx =
            screenX + s / 2;

        const cy =
            screenY + s / 2;

        const half =
            s * 0.5;


        ctx.save();

        ctx.fillStyle = this.color;

        ctx.shadowColor =
            this.glowColor;

        ctx.shadowBlur =
            this.glow
                ? 10
                : 0;


        /*
         * 바깥쪽 다이아몬드
         */

        ctx.beginPath();

        ctx.moveTo(
            cx,
            screenY + 2
        );

        ctx.lineTo(
            screenX + s - 2,
            cy
        );

        ctx.lineTo(
            cx,
            screenY + s - 2
        );

        ctx.lineTo(
            screenX + 2,
            cy
        );

        ctx.closePath();

        ctx.fill();


        /*
         * 안쪽 다이아몬드
         */

        ctx.beginPath();

        ctx.moveTo(
            cx,
            screenY + half
        );

        ctx.lineTo(
            screenX + s - half,
            cy
        );

        ctx.lineTo(
            cx,
            screenY + s - half
        );

        ctx.lineTo(
            screenX + half,
            cy
        );

        ctx.closePath();

        ctx.fill();


        ctx.restore();
    }
}