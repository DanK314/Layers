
import { GameObject } from "./object.js";

const jumpSoundVolume = 0.1;

export class Player extends GameObject {

    #xStretch = 0.18;
    #yStretch = 0.18;

    #keys = {
        left: false,
        right: false
    };

    // 이동
    #acceleration = 18000;
    #airAcceleration = 9000;
    #maxSpeed = 7500;

    // 바닥 판정
    #isGrounded = false;

    // 스폰
    #spawnX;
    #spawnY;

    // 사운드
    #jumpSound = new Audio("./sfx/Jump.wav");

    // 렌더링
    #ctx;

    // 젤리 시각 효과
    #stretch = 0;
    #squash = 0;
    #lastVx = 0;

    constructor(ctx, x, y) {

        super(
            ctx,
            x,
            y,

            32,
            32,

            "#FFFFFF",

            {
                glow: true,
                glowColor: "#FFFFFF"
            }
        );

        this.#ctx = ctx;

        this.#spawnX = x;
        this.#spawnY = y;

        window.addEventListener(
            "keydown",
            (event) => {
                this.#keyDown(event);
            }
        );

        window.addEventListener(
            "keyup",
            (event) => {
                this.#keyUp(event);
            }
        );
    }

    #keyDown(event) {

        switch (event.code) {

            case "KeyA":

                this.#keys.left = true;

                event.preventDefault();

                break;

            case "KeyD":

                this.#keys.right = true;

                event.preventDefault();

                break;

            case "KeyW":

                this.#jump();

                event.preventDefault();

                break;
        }
    }

    #keyUp(event) {

        switch (event.code) {

            case "KeyA":

                this.#keys.left = false;

                break;

            case "KeyD":

                this.#keys.right = false;

                break;
        }
    }

    #jump() {

        if (!this.#isGrounded) {
            return;
        }

        this.vy = -820;
        this.#isGrounded = false;

        this.#jumpSound.volume = jumpSoundVolume;
        this.#jumpSound.currentTime = 0;
        this.#jumpSound.play().catch(() => {});
    }

    respawn() {

        this.x = this.#spawnX;
        this.y = this.#spawnY;

        this.vx = 0;
        this.vy = 0;

        this.#isGrounded = false;

        // 시각 효과 초기화
        this.#stretch = 0;
        this.#squash = 0;
        this.#lastVx = 0;
    }

    setGrounded(value) {

        this.#isGrounded = value;
    }

    get isGrounded() {

        return this.#isGrounded;
    }

    update(deltaTime) {

        const acceleration =
            this.#isGrounded
                ? this.#acceleration
                : this.#airAcceleration;

        // 좌우 가속
        if (this.#keys.left) {

            this.vx -=
                acceleration *
                deltaTime;
        }

        if (this.#keys.right) {

            this.vx +=
                acceleration *
                deltaTime;
        }

        // 최대 수평 속도 제한
        this.vx = Math.max(
            -this.#maxSpeed,
            Math.min(
                this.#maxSpeed,
                this.vx
            )
        );

        super.update(deltaTime);
    }

    draw(screenX, screenY, scale = 1) {

        const ctx = this.#ctx;

        /*
         * 현재 이동 속도
         */

        const horizontalSpeed =
            Math.abs(this.vx);

        /*
         * 수평 속도가 빠를수록
         * 살짝만 늘어나도록 둔다.
         */

        const speedRatio =
            Math.min(
                horizontalSpeed / 700,
                1
            );

        const targetStretch =
            speedRatio * 0.3;

        /*
         * 갑작스러운 가속이나 감속에
         * 살짝 눌리는 효과
         */

        const accelerationChange =
            this.vx - this.#lastVx;

        const targetSquash =
            Math.min(
                Math.abs(accelerationChange) / 420,
                1
            ) * 0.08;

        /*
         * 부드러운 젤리 보간
         */

        this.#stretch +=
            (
                targetStretch -
                this.#stretch
            ) * 0.08;

        this.#squash +=
            (
                targetSquash -
                this.#squash
            ) * 0.12;

        this.#lastVx = this.vx;

        /*
         * 이동 방향
         *
         * 속도가 너무 느리면
         * 현재 방향을 유지한다.
         */

        /*
         * 기본 크기
         */

        const width =
            this.w * scale;

        const height =
            this.h * scale;

        /*
         * 이동 방향으로 늘어난다.
         *
         * X축은 늘어나고
         * Y축은 살짝 압축된다.
         */

        const stretchX =
            1 + this.#stretch * this.#xStretch;

        const stretchY =
            1 - this.#stretch * this.#yStretch;

        /*
         * 순간적인 눌림
         */

        const squashX =
            1 - this.#squash * 0.75;

        const squashY =
            1 + this.#squash * 0.65;

        const finalScaleX =
            stretchX * squashX;

        const finalScaleY =
            stretchY * squashY;

        /*
         * 플레이어 중심
         */

        const centerX =
            screenX +
            width / 2 +
            this.vx * 0.005;

        const centerY =
            screenY +
            height / 2 +
            this.vy * 0.005;

        ctx.save();

        /*
         * 중심을 기준으로 변형
         */

        ctx.translate(
            centerX,
            centerY
        );

        /*
         * 젤리 형태로 스케일
         */

        ctx.scale(
            finalScaleX,
            finalScaleY
        );

        /*
         * 플레이어 색상
         */

        ctx.fillStyle = "#FFFFFF";

        /*
         * 네온 글로우
         */

        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 22;

        /*
         * 일반 사각형
         */

        ctx.fillRect(
            -width / 2,
            -height / 2,
            width,
            height
        );

        ctx.restore();
    }
}