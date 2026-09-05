import { Block } from "./block.js";
import { stageArray } from "./map.js";
import { Player } from "./player.js";
import { Particle } from "./particle.js";
import { Goal } from "./goal.js";
import { Spike } from "./spike.js";

export class Game {

    #canvas;
    #ctx;

    #blocks = [];
    #spikes = [];
    #particles = [];
    #particleSpawnTime = 0;
    #player;
    #goal;

    #spawnPoint;

    #tileSize = 64;
    #mapWidth = 16;
    #mapHeight = 16;

    #scale = 1;
    #offsetX = 0;
    #offsetY = 0;

    #stageIndex = 0;
    #activeLayer = "R";
    #fps = 0;
    #frameTime = 0;
    #elapsedTime = 0;
    #transitionTime = 0;
    #transitionDuration = 0.6;
    #transitioning = false;
    #transitionLoaded = false;

    constructor(canvas) {

        this.#canvas = canvas;
        this.#ctx = canvas.getContext("2d");

        this.#resize();

        this.#loadStage(this.#stageIndex);

        window.addEventListener(
            "resize",
            () => this.#resize()
        );

        window.addEventListener(
            "keydown",
            (event) => {
                this.#keyDown(event);
            }
        );
    }

    #resize() {

        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight;

        const worldWidth =
            this.#mapWidth * this.#tileSize;

        const worldHeight =
            this.#mapHeight * this.#tileSize;

        this.#scale = Math.min(
            this.#canvas.width / worldWidth,
            this.#canvas.height / worldHeight
        );

        this.#offsetX =
            (this.#canvas.width - worldWidth * this.#scale) / 2;

        this.#offsetY =
            (this.#canvas.height - worldHeight * this.#scale) / 2;
    }

    #loadStage(index) {

        const stage = stageArray[index];

        this.#blocks = [];
        this.#spikes = [];
        this.#goal = null;

        this.#createBlocks(stage.map);

        const playerStart = stage.objects.player[0];

        if (!playerStart) {
            throw new Error(
                `Player start (@) not found in stage ${index}`
            );
        }

        this.#player = new Player(
            this.#ctx,
            playerStart.x * this.#tileSize,
            playerStart.y * this.#tileSize
        );

        this.#spawnPoint = {
            x: playerStart.x * this.#tileSize + this.#tileSize / 2,
            y: playerStart.y * this.#tileSize + this.#tileSize / 2
        };

        /*
         * Goal 생성
         */

        const goal = stage.objects.goal[0];

        if (goal) {

            this.#goal = new Goal(
                this.#ctx,

                goal.x * this.#tileSize,
                goal.y * this.#tileSize
            );
        }
    }
    #createParticle(point) {

        if (!point || this.#particles.length >= 60) {
            return;
        }

        const particle = new Particle(
            point.x,
            point.y
        );

        this.#particles.push(particle);
    }

    #createBlocks(map) {

        for (let y = 0; y < map.length; y++) {

            for (let x = 0; x < map[y].length; x++) {

                const tile = map[y][x];

                if (tile.type === "spike") {
                    this.#spikes.push(
                        new Spike(
                            this.#ctx,
                            x * this.#tileSize,
                            y * this.#tileSize,
                            this.#tileSize
                        )
                    );

                    continue;
                }

                /*
                 * RGB 성분이 하나도 없다면 빈 칸이다.
                 */

                if (!tile.R && !tile.G && !tile.B) {
                    continue;
                }

                /*
                 * RGB 조합에 따라 블록 색상을 결정한다.
                 */

                let color;

                if (tile.R && tile.G && tile.B) {

                    // White
                    color = "#FFFFFF";

                } else if (tile.R && tile.G) {

                    // Yellow
                    color = "#FFFF00";

                } else if (tile.R && tile.B) {

                    // Magenta
                    color = "#FF00FF";

                } else if (tile.G && tile.B) {

                    // Cyan
                    color = "#00FFFF";

                } else if (tile.R) {

                    // Red
                    color = "#FF0000";

                } else if (tile.G) {

                    // Green
                    color = "#00FF00";

                } else {

                    // Blue
                    color = "#0000FF";
                }

                /*
                 * 하나의 맵 타일은 하나의 Block만 생성한다.
                 */

                const block = new Block(
                    this.#ctx,

                    x * this.#tileSize,
                    y * this.#tileSize,

                    color,

                    {
                        R: tile.R,
                        G: tile.G,
                        B: tile.B
                    },

                    {
                        glow: false,
                        glowColor: color
                    }
                );

                this.#blocks.push(block);
            }
        }
    }

    #keyDown(event) {

        if (event.code !== "Enter") {
            return;
        }

        if (this.#transitioning) {
            return;
        }

        event.preventDefault();

        switch (this.#activeLayer) {

            case "R":
                this.#activeLayer = "G";
                break;

            case "G":
                this.#activeLayer = "B";
                break;

            case "B":
                this.#activeLayer = "R";
                break;
        }
    }

    update(deltaTime) {

        if (this.#transitioning) {
            this.#updateTransition(deltaTime);
            return;
        }

        this.#player.setGrounded(false);

        this.#player.update(deltaTime);

        /*
         * 맵 아래로 떨어지면 스폰 위치로 복귀한다.
         */

        if (this.#player.y > this.#mapHeight * this.#tileSize) {

            this.#player.respawn();

            return;
        }

        /*
         * 현재 레이어에서 실체화되는 블록만 충돌시킨다.
         */

        for (const block of this.#blocks) {

            if (!block.isSolid(this.#activeLayer)) {
                continue;
            }

            if (!this.#player.isCollidingWith(block)) {
                continue;
            }

            const playerBottom =
                this.#player.y + this.#player.h;

            const blockTop =
                block.y;

            const wasFalling =
                this.#player.vy >= 0;

            const isLanding =
                playerBottom <= blockTop + 16 &&
                wasFalling;

            this.#player.resolveCollision(block);

            if (isLanding) {
                this.#player.setGrounded(true);
            }
        }

        for (const spike of this.#spikes) {

            const spikeBox = spike.hitbox;

            const colliding =
                this.#player.x < spikeBox.x + spikeBox.w &&
                this.#player.x + this.#player.w > spikeBox.x &&
                this.#player.y < spikeBox.y + spikeBox.h &&
                this.#player.y + this.#player.h > spikeBox.y;

            if (colliding) {
                this.#player.respawn();
                return;
            }
        }
        /*
 * 파티클 업데이트
 */

        for (const particle of this.#particles) {

            particle.update(deltaTime);
        }

        /*
         * 죽은 파티클 제거
         */

        this.#particles =
            this.#particles.filter(
                particle => particle.alive
            );

        /*
         * 스폰 지점과 골인 지점에서
         * 일정 확률로 새로운 파티클 생성
         */

        this.#particleSpawnTime -= deltaTime;

        if (this.#particleSpawnTime <= 0) {

            if (this.#spawnPoint) {
                this.#createParticle(this.#spawnPoint);
            }

            this.#particleSpawnTime = 0.08;
        }
        /*
 * 골인 판정
 */

        if (
            this.#goal &&
            this.#player.isCollidingWith(this.#goal)
        ) {
            this.#nextStage();
            return;
        }
    }

    #nextStage() {

        if (this.#stageIndex >= stageArray.length - 1) {
            return;
        }

        this.#transitioning = true;
        this.#transitionTime = 0;
        this.#transitionLoaded = false;
    }

    #updateTransition(deltaTime) {

        this.#transitionTime += deltaTime;

        if (
            this.#transitionTime < this.#transitionDuration / 2 ||
            this.#transitionLoaded
        ) {
            if (this.#transitionTime >= this.#transitionDuration) {
                this.#transitioning = false;
            }

            return;
        }

        if (this.#stageIndex >= stageArray.length - 1) {
            this.#transitioning = false;
            return;
        }

        this.#stageIndex++;

        this.#loadStage(
            this.#stageIndex
        );

        this.#resize();
        this.#activeLayer = "R";
        this.#particles = [];
        this.#transitionLoaded = true;
    }

    draw() {

        const ctx = this.#ctx;

        ctx.clearRect(
            0,
            0,
            this.#canvas.width,
            this.#canvas.height
        );

        ctx.globalCompositeOperation = "screen";

        for (const spike of this.#spikes) {

            const screenX =
                this.#offsetX +
                spike.x * this.#scale;

            const screenY =
                this.#offsetY +
                spike.y * this.#scale;

            spike.draw(screenX, screenY, this.#scale);
        }

        /*
         * 스폰 / 골인 파티클
         */

        for (const particle of this.#particles) {

            const screenX =
                this.#offsetX +
                particle.x * this.#scale;

            const screenY =
                this.#offsetY +
                particle.y * this.#scale;

            particle.draw(
                ctx,
                screenX,
                screenY,
                this.#scale
            );
        }

        for (const block of this.#blocks) {

            const screenX =
                Math.round(
                    this.#offsetX +
                    block.x * this.#scale
                );

            const screenY =
                Math.round(
                    this.#offsetY +
                    block.y * this.#scale
                );

            const screenRight =
                Math.round(
                    this.#offsetX +
                    (block.x + this.#tileSize) * this.#scale
                );

            const screenBottom =
                Math.round(
                    this.#offsetY +
                    (block.y + this.#tileSize) * this.#scale
                );

            const screenWidth =
                screenRight - screenX;

            const screenHeight =
                screenBottom - screenY;

            /*
             * 현재 레이어에 포함되는 블록은 밝게,
             * 포함되지 않는 블록은 반투명하게 표시한다.
             */

            ctx.globalAlpha =
                block.isSolid(this.#activeLayer)
                    ? 1
                    : 0.3;

            block.draw(
                screenX,
                screenY,
                screenWidth / block.w
            );
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        this.#drawFlashlight();

        /*
         * Player 화면 좌표 계산
         */

        const playerScreenX =
            Math.round(
                this.#offsetX +
                this.#player.x * this.#scale
            );

        const playerScreenY =
            Math.round(
                this.#offsetY +
                this.#player.y * this.#scale
            );

        this.#player.draw(
            playerScreenX,
            playerScreenY,
            this.#scale
        );

        /*
 * Goal 렌더링
 */

        if (this.#goal) {

            const goalScreenX =
                Math.round(
                    this.#offsetX +
                    this.#goal.x * this.#scale
                );

            const goalScreenY =
                Math.round(
                    this.#offsetY +
                    this.#goal.y * this.#scale
                );

            this.#goal.draw(
                goalScreenX,
                goalScreenY,
                this.#scale
            );
        }

        this.#drawLayerIndicator();
        this.#drawTransition();
    }


    #drawFlashlight() {

        const ctx = this.#ctx;

        const playerCenterX =
            this.#offsetX +
            (this.#player.x + this.#player.w / 2) * this.#scale;

        const playerCenterY =
            this.#offsetY +
            (this.#player.y + this.#player.h / 2) * this.#scale;

        const radius = 300 * this.#scale;

        ctx.save();

        /*
         * Flashlight는 맵을 삭제하지 않고
         * 검은색 투명 오버레이만 덮는다.
         */
        ctx.globalCompositeOperation = "source-over";

        const gradient = ctx.createRadialGradient(
            playerCenterX,
            playerCenterY,
            0,
            playerCenterX,
            playerCenterY,
            radius
        );

        /*
         * 중심은 완전히 투명
         */
        gradient.addColorStop(
            0,
            "rgba(0, 0, 0, 0)"
        );

        /*
         * 중심 주변은 아주 약하게 어둡게
         */
        gradient.addColorStop(
            0.35,
            "rgba(0, 0, 0, 0.05)"
        );

        /*
         * 점점 어두워진다.
         */
        gradient.addColorStop(
            0.60,
            "rgba(0, 0, 0, 0.35)"
        );

        gradient.addColorStop(
            0.80,
            "rgba(0, 0, 0, 0.75)"
        );

        /*
         * 손전등 범위 끝
         */
        gradient.addColorStop(
            1,
            "rgba(0, 0, 0, 1)"
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            this.#canvas.width,
            this.#canvas.height
        );

        ctx.restore();
    }

    #drawTransition() {

        if (!this.#transitioning) {
            return;
        }

        const progress =
            this.#transitionTime / this.#transitionDuration;

        const opacity =
            progress < 0.5
                ? progress * 2
                : (1 - progress) * 2;

        const ctx = this.#ctx;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.fillStyle = "#000000";
        ctx.fillRect(
            0,
            0,
            this.#canvas.width,
            this.#canvas.height
        );
        ctx.restore();
    }

    #drawLayerIndicator() {

        const ctx = this.#ctx;

        const padding = 24;

        ctx.save();

        ctx.font = "16px Orbitron, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";

        ctx.fillStyle = "#FFFFFF";

        ctx.fillText(
            this.#activeLayer,
            this.#canvas.width - padding,
            padding
        );

        ctx.textAlign = "left";

        const fpsText = `FPS ${this.#fps.toFixed(0)}  ${this.#frameTime.toFixed(1)} ms`;
        const timerText = `TIME ${this.#elapsedTime.toFixed(1)} s`;

        ctx.fillText(
            fpsText,
            padding,
            padding
        );

        ctx.fillText(
            timerText,
            padding + 220,
            padding
        );

        ctx.restore();
    }

    run() {

        let lastTime = performance.now();

        const loop = (currentTime) => {

            let deltaTime =
                (currentTime - lastTime) / 1000;

            lastTime = currentTime;

            this.#frameTime = deltaTime * 1000;
            this.#fps = deltaTime > 0 ? 1 / deltaTime : 0;
            this.#elapsedTime += deltaTime;

            /*
             * 프레임이 순간적으로 크게 끊겼을 때
             * 물체가 맵을 뚫고 지나가는 것을 방지한다.
             */

            deltaTime = Math.min(
                deltaTime,
                1 / 30
            );

            this.update(deltaTime);
            this.draw();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}