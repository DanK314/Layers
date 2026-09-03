import { GameObject } from "./object.js";

export class Player extends GameObject {

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

    #spawnX;
    #spawnY;

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

        /*
         * 점프는 위쪽 초기 속도만 설정한다.
         *
         * 중력 자체는 BoxCollider가 담당한다.
         */

        this.vy = -800;

        this.#isGrounded = false;
    }

    respawn() {

        this.x = this.#spawnX;
        this.y = this.#spawnY;

        this.vx = 0;
        this.vy = 0;

        this.#isGrounded = false;
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

        /*
         * 좌우 가속
         */

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

        /*
         * 최대 수평 속도 제한
         */

        this.vx = Math.max(
            -this.#maxSpeed,
            Math.min(
                this.#maxSpeed,
                this.vx
            )
        );

        /*
         * 여기서는 중력 / 마찰을 처리하지 않는다.
         *
         * super.update()
         *      ↓
         * GameObject
         *      ↓
         * BoxCollider
         *
         * BoxCollider가
         * 중력 + 마찰 + 위치 이동을 처리한다.
         */

        super.update(deltaTime);
    }
}