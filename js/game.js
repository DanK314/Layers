import { Block } from "./block.js";
import { stageArray } from "./map.js";
import { Player } from "./player.js";
import { Particle } from "./particle.js";
import { Goal } from "./goal.js";
import { Spike } from "./spike.js";

export class Game {

    #canvas;
    #ctx;
    #lightCanvas;
    #lightCtx;

    #blocks = [];
    #spikes = [];
    #particles = [];
    #particleSpawnTime = 0;
    #spawnElapsed = 0;
    #spawnDuration = 0.7;
    #explosionLightTime = 0;
    #explosionLightDuration = 0.5;
    #explosionLightPoint = null;
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
        this.#lightCanvas = document.createElement("canvas");
        this.#lightCtx = this.#lightCanvas.getContext("2d");

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
        this.#lightCanvas.width = this.#canvas.width;
        this.#lightCanvas.height = this.#canvas.height;

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
        this.#particles = [];
        this.#particleSpawnTime = 0;
        this.#spawnElapsed = 0;
        this.#explosionLightTime = 0;
        this.#explosionLightPoint = null;
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
            playerStart.x * this.#tileSize + (this.#tileSize - 32) / 2,
            playerStart.y * this.#tileSize + (this.#tileSize - 32) / 2
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

    #explodePlayer() {

        const explosionPoint = {
            x: this.#player.x + this.#player.w / 2,
            y: this.#player.y + this.#player.h / 2
        };

        for (let index = 0; index < 28; index++) {

            if (this.#particles.length >= 60) {
                break;
            }

            this.#particles.push(
                new Particle(
                    explosionPoint.x,
                    explosionPoint.y,
                    true
                )
            );
        }

        this.#explosionLightPoint = explosionPoint;
        this.#explosionLightTime = this.#explosionLightDuration;
        this.#player.respawn();
        this.#spawnElapsed = 0;
        this.#particleSpawnTime = 0;
    }

    #createBlocks(map) {

        for (let y = 0; y < map.length; y++) {

            for (let x = 0; x < map[y].length; x++) {

                const tile = map[y][x];

                /*
                 * 블록과 스파이크만 게임 오브젝트로 생성한다.
                 */

                if (
                    tile.type !== "block" &&
                    tile.type !== "spike"
                ) {
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
                 * 공통 생성 인자
                 */

                const rgb = {
                    R: tile.R,
                    G: tile.G,
                    B: tile.B
                };

                const options = {
                    glow: false,
                    glowColor: color
                };


                /*
                 * 타입에 따라 객체를 생성한다.
                 */

                if (tile.type === "spike") {

                    this.#spikes.push(
                        new Spike(
                            this.#ctx,
                            x * this.#tileSize,
                            y * this.#tileSize,
                            color,
                            rgb,
                            options
                        )
                    );

                    continue;
                }


                /*
                 * 기본 타입은 Block이다.
                 */

                this.#blocks.push(
                    new Block(
                        this.#ctx,
                        x * this.#tileSize,
                        y * this.#tileSize,
                        color,
                        rgb,
                        options
                    )
                );
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

        this.#explosionLightTime = Math.max(
            0,
            this.#explosionLightTime - deltaTime
        );

        if (this.#transitioning) {
            this.#updateTransition(deltaTime);
            return;
        }

        if (this.#spawnElapsed < this.#spawnDuration) {

            this.#spawnElapsed = Math.min(
                this.#spawnElapsed + deltaTime,
                this.#spawnDuration
            );

            this.#particleSpawnTime -= deltaTime;

            if (this.#particleSpawnTime <= 0) {

                this.#createParticle(this.#spawnPoint);
                this.#particleSpawnTime = 0.03;
            }

            for (const particle of this.#particles) {
                particle.update(deltaTime);
            }

            this.#particles = this.#particles.filter(
                particle => particle.alive
            );

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

        const playerArea =
            this.#player.w * this.#player.h;

        const stuckInBlock =
            this.#blocks.some(block => {

                if (!block.isSolid(this.#activeLayer)) {
                    return false;
                }

                const overlapWidth =
                    Math.min(
                        this.#player.x + this.#player.w,
                        block.x + block.w
                    ) -
                    Math.max(this.#player.x, block.x);

                const overlapHeight =
                    Math.min(
                        this.#player.y + this.#player.h,
                        block.y + block.h
                    ) -
                    Math.max(this.#player.y, block.y);

                const overlapArea =
                    Math.max(0, overlapWidth) *
                    Math.max(0, overlapHeight);

                return overlapArea >= playerArea / 2;
            });

        if (stuckInBlock) {
            this.#explodePlayer();
            return;
        }

        for (const spike of this.#spikes) {

            if (!spike.isSolid(this.#activeLayer)) {
                continue;
            }

            const spikeBox = spike.hitbox;

            const colliding =
                this.#player.x < spikeBox.x + spikeBox.w &&
                this.#player.x + this.#player.w > spikeBox.x &&
                this.#player.y < spikeBox.y + spikeBox.h &&
                this.#player.y + this.#player.h > spikeBox.y;

            if (colliding) {

                this.#explodePlayer();

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

        const spawnProgress =
            Math.min(
                1,
                this.#spawnElapsed / this.#spawnDuration
            );

        const easedSpawnProgress =
            1 - Math.pow(1 - spawnProgress, 3);

        let portalScale = 1;

        if (this.#transitioning && !this.#transitionLoaded) {

            const transitionProgress =
                Math.min(
                    1,
                    this.#transitionTime / (this.#transitionDuration / 2)
                );

            portalScale =
                Math.pow(1 - transitionProgress, 2);
        }

        const playerDrawScale =
            this.#scale *
            (0.35 + easedSpawnProgress * 0.65) *
            portalScale;

        const playerDrawX =
            playerScreenX +
            (this.#player.w * this.#scale - this.#player.w * playerDrawScale) / 2;

        const playerDrawY =
            playerScreenY +
            (this.#player.h * this.#scale - this.#player.h * playerDrawScale) / 2;

        ctx.save();
        ctx.globalAlpha = easedSpawnProgress;

        this.#player.draw(
            playerDrawX,
            playerDrawY,
            playerDrawScale
        );

        ctx.restore();

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

        const lightCtx = this.#lightCtx;

        lightCtx.globalCompositeOperation = "source-over";
        lightCtx.globalAlpha = 1;
        lightCtx.fillStyle = "#000000";
        lightCtx.fillRect(
            0,
            0,
            this.#canvas.width,
            this.#canvas.height
        );

        const drawLight = (centerX, centerY, radius, strength) => {

            const gradient = lightCtx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                radius
            );

            gradient.addColorStop(
                0,
                `rgba(0, 0, 0, ${strength})`
            );

            gradient.addColorStop(
                0.35,
                `rgba(0, 0, 0, ${strength * 0.95})`
            );

            gradient.addColorStop(
                0.60,
                `rgba(0, 0, 0, ${strength * 0.65})`
            );

            gradient.addColorStop(
                0.80,
                `rgba(0, 0, 0, ${strength * 0.25})`
            );

            gradient.addColorStop(
                1,
                "rgba(0, 0, 0, 0)"
            );

            lightCtx.globalCompositeOperation = "destination-out";
            lightCtx.fillStyle = gradient;
            lightCtx.fillRect(
                0,
                0,
                this.#canvas.width,
                this.#canvas.height
            );
        };

        const playerCenterX =
            this.#offsetX +
            (this.#player.x + this.#player.w / 2) * this.#scale;

        const playerCenterY =
            this.#offsetY +
            (this.#player.y + this.#player.h / 2) * this.#scale;

        const radius = 400 * this.#scale;

        drawLight(
            playerCenterX,
            playerCenterY,
            radius,
            1
        );

        if (
            this.#explosionLightPoint &&
            this.#explosionLightTime > 0
        ) {

            const progress =
                1 -
                this.#explosionLightTime / this.#explosionLightDuration;

            drawLight(
                this.#offsetX + this.#explosionLightPoint.x * this.#scale,
                this.#offsetY + this.#explosionLightPoint.y * this.#scale,
                radius,
                1 - progress
            );
        }

        const ctx = this.#ctx;

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(
            this.#lightCanvas,
            0,
            0
        );
        ctx.restore();

        this.#drawExplosionFlash();
    }

    #drawExplosionFlash() {

        if (
            !this.#explosionLightPoint ||
            this.#explosionLightTime <= 0
        ) {
            return;
        }

        const progress =
            1 -
            this.#explosionLightTime / this.#explosionLightDuration;

        const intensity =
            Math.pow(1 - progress, 2) * 0.9;

        const centerX =
            this.#offsetX +
            this.#explosionLightPoint.x * this.#scale;

        const centerY =
            this.#offsetY +
            this.#explosionLightPoint.y * this.#scale;

        const radius =
            400 * this.#scale;

        const ctx = this.#ctx;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            radius
        );

        gradient.addColorStop(
            0,
            `rgba(255, 255, 255, ${intensity})`
        );

        gradient.addColorStop(
            0.35,
            `rgba(255, 255, 255, ${intensity * 0.4})`
        );

        gradient.addColorStop(
            0.75,
            `rgba(255, 255, 255, ${intensity * 0.08})`
        );

        gradient.addColorStop(
            1,
            "rgba(255, 255, 255, 0)"
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
        let physicsAccumulator = 0;
        const physicsStep = 1 / 60;

        const loop = (currentTime) => {

            const frameDeltaTime =
                (currentTime - lastTime) / 1000;

            lastTime = currentTime;

            this.#frameTime = frameDeltaTime * 1000;
            this.#fps = frameDeltaTime > 0 ? 1 / frameDeltaTime : 0;
            this.#elapsedTime += frameDeltaTime;

            /*
             * 실제 경과 시간을 고정 물리 스텝으로 누적한다.
             * 디스플레이 주사율과 물리 속도를 분리한다.
             */

            physicsAccumulator += Math.min(
                frameDeltaTime,
                0.25
            );

            while (physicsAccumulator >= physicsStep) {

                this.update(physicsStep);
                physicsAccumulator -= physicsStep;
            }

            this.draw();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}