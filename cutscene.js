import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const canvas = document.getElementById("cutscene-canvas");
const fade = document.getElementById("fade");


// ==================================================
// Renderer
// ==================================================

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
});

renderer.shadowMap.enabled =
    true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.2;


// ==================================================
// Scene
// ==================================================

const scene = new THREE.Scene();

scene.background =
    new THREE.Color(0x000000);

scene.fog =
    new THREE.FogExp2(
        0x000000,
        0.014
    );


// ==================================================
// Camera
// ==================================================

const camera =
    new THREE.PerspectiveCamera(
        55,
        window.innerWidth /
        window.innerHeight,
        0.1,
        500
    );

camera.position.set(
    0,
    9,
    24
);


// ==================================================
// Lighting
// ==================================================

const ambient =
    new THREE.AmbientLight(
        0xffffff,
        0.035
    );

scene.add(ambient);

const planetLight =
    new THREE.DirectionalLight(
        0xffffff,
        2.2
    );

planetLight.position.set(
    -24,
    32,
    28
);

planetLight.castShadow =
    true;

planetLight.shadow.mapSize.set(
    2048,
    2048
);

planetLight.shadow.camera.left =
    -34;

planetLight.shadow.camera.right =
    34;

planetLight.shadow.camera.top =
    34;

planetLight.shadow.camera.bottom =
    -34;

planetLight.shadow.camera.near =
    1;

planetLight.shadow.camera.far =
    100;

scene.add(planetLight);

planetLight.target.position.set(
    0,
    -20,
    10
);

scene.add(planetLight.target);


// ==================================================
// Stars
// ==================================================

const starGeometry =
    new THREE.BufferGeometry();

const starCount = 3600;

const starPositions =
    new Float32Array(
        starCount * 3
    );

for (let i = 0; i < starCount; i++) {

    const i3 = i * 3;

    starPositions[i3] =
        (Math.random() - 0.5) * 150;

    starPositions[i3 + 1] =
        Math.random() * 90 - 20;

    starPositions[i3 + 2] =
        (Math.random() - 0.5) * 220;
}

starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
        starPositions,
        3
    )
);

const starMaterial =
    new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.4,
        sizeAttenuation: false,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false
    });

scene.add(
    new THREE.Points(
        starGeometry,
        starMaterial
    )
);


// ==================================================
// Ground
// ==================================================

const groundGeometry =
    new THREE.PlaneGeometry(
        80,
        50
    );

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x050505,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });

const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

ground.rotation.x =
    -Math.PI / 2;

ground.position.y = -3;

scene.add(ground);

const planetGeometry =
    new THREE.SphereGeometry(
        18,
        64,
        32
    );

const planetTextureCanvas =
    document.createElement("canvas");

planetTextureCanvas.width =
    1024;

planetTextureCanvas.height =
    512;

const planetTextureContext =
    planetTextureCanvas.getContext("2d");

planetTextureContext.fillStyle =
    "#686868";

planetTextureContext.fillRect(
    0,
    0,
    planetTextureCanvas.width,
    planetTextureCanvas.height
);

for (let i = 0; i < 1100; i++) {

    const shade =
        54 + Math.floor(Math.random() * 126);

    planetTextureContext.fillStyle =
        `rgba(${shade}, ${shade}, ${shade}, 0.44)`;

    planetTextureContext.beginPath();
    planetTextureContext.arc(
        Math.random() * 1024,
        Math.random() * 512,
        12 + Math.random() * 32,
        0,
        Math.PI * 2
    );
    planetTextureContext.fill();
}

for (let i = 0; i < 10000; i++) {

    const shade =
        72 + Math.floor(Math.random() * 112);

    planetTextureContext.fillStyle =
        `rgba(${shade}, ${shade}, ${shade}, 0.48)`;

    planetTextureContext.beginPath();
    planetTextureContext.arc(
        Math.random() * 1024,
        Math.random() * 512,
        1 + Math.random() * 7,
        0,
        Math.PI * 2
    );
    planetTextureContext.fill();
}

planetTextureContext.strokeStyle =
    "rgba(190, 190, 190, 0.48)";

planetTextureContext.lineWidth =
    2;

for (let x = 0; x <= 1024; x += 28) {

    planetTextureContext.beginPath();
    planetTextureContext.moveTo(x, 0);
    planetTextureContext.lineTo(x, 512);
    planetTextureContext.stroke();
}

for (let y = 0; y <= 512; y += 24) {

    planetTextureContext.beginPath();
    planetTextureContext.moveTo(0, y);
    planetTextureContext.lineTo(1024, y);
    planetTextureContext.stroke();
}

const planetTexture =
    new THREE.CanvasTexture(
        planetTextureCanvas
    );

planetTexture.colorSpace =
    THREE.SRGBColorSpace;

const planetMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: planetTexture,
        roughness: 0.86,
        metalness: 0.05,
        emissive: 0xffffff,
        emissiveMap: planetTexture,
        emissiveIntensity: 0.42
    });

const planet =
    new THREE.Mesh(
        planetGeometry,
        planetMaterial
    );

planet.receiveShadow =
    true;

planet.scale.set(
    1,
    1,
    1
);

planet.position.set(
    0,
    -20,
    10
);

scene.add(planet);

function getPlanetSurfaceY(x, z) {

    const radius =
        18;

    const localZ =
        z - planet.position.z;

    const horizontalDistanceSquared =
        x * x +
        localZ * localZ;

    const height =
        Math.sqrt(
            Math.max(
                0,
                radius * radius -
                horizontalDistanceSquared
            )
        );

    return planet.position.y + height;
}


// ==================================================
// Cube colors
// ==================================================

const cubeColors = [
    0xff2020,
    0x20ff50,
    0x2080ff,
    0xffff20,
    0xff20ff,
    0x20ffff,
    0xffffff
];


// ==================================================
// Cubes
// ==================================================

const cubeGeometry =
    new THREE.BoxGeometry(
        0.7,
        0.7,
        0.7
    );

const cubes = [];

const CUBE_COUNT = 35;

for (let i = 0; i < CUBE_COUNT; i++) {

    const color =
        cubeColors[
            Math.floor(
                Math.random() *
                cubeColors.length
            )
        ];

    const material =
        new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.4,
            roughness: 0.3,
            metalness: 0.1
        });

    const cube =
        new THREE.Mesh(
            cubeGeometry,
            material
        );

    cube.castShadow =
        true;

    cube.position.set(
        (Math.random() - 0.5) * 24,
        -2.6,
        5 + Math.random() * 10
    );

    cube.position.y =
        getPlanetSurfaceY(
            cube.position.x,
            cube.position.z
        ) + 0.35;

    cube.userData = {

        baseZ:
            cube.position.z,

        speed:
            0.25 +
            Math.random() * 0.35,

        direction:
            Math.random() > 0.5
                ? 1
                : -1,

        phase:
            Math.random() *
            Math.PI * 2,

        sway:
            0.05 +
            Math.random() * 0.08,

        absorbed: false,

        velocity:
            new THREE.Vector3(),

        gravityInitialized:
            false,

        distanceAtStart: 0
    };

    scene.add(cube);

    cubes.push(cube);
}


// ==================================================
// Black Hole
// ==================================================

const blackHole =
    new THREE.Group();

blackHole.position.set(
    0,
    0,
    -24
);

blackHole.scale.setScalar(
    1.4
);

scene.add(blackHole);


// ==================================================
// Event Horizon
// ==================================================

const horizonGeometry =
    new THREE.SphereGeometry(
        2.2,
        96,
        96
    );

const horizonMaterial =
    new THREE.MeshBasicMaterial({
        color: 0x000000
    });

const horizon =
    new THREE.Mesh(
        horizonGeometry,
        horizonMaterial
    );

horizon.scale.setScalar(0.001);

blackHole.add(horizon);


// ==================================================
// Gravitational Lens Shader
// ==================================================

const lensGeometry =
    new THREE.PlaneGeometry(
        8,
        8
    );

const lensMaterial =
    new THREE.ShaderMaterial({

        transparent: true,

        depthWrite: false,

        blending:
            THREE.AdditiveBlending,

        uniforms: {

            time: {
                value: 0
            },

            strength: {
                value: 0
            }
        },

        vertexShader: `

            varying vec2 vUv;

            void main() {

                vUv = uv;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

        fragmentShader: `

            varying vec2 vUv;

            uniform float time;
            uniform float strength;

            void main() {

                vec2 uv =
                    vUv - 0.5;

                float radius =
                    length(uv);

                float ring =
                    exp(
                        -pow(
                            (radius - 0.29) * 38.0,
                            2.0
                        )
                    );

                float outer =
                    exp(
                        -pow(
                            (radius - 0.39) * 15.0,
                            2.0
                        )
                    );

                float pulse =
                    0.85 +
                    sin(time * 2.5) * 0.15;

                vec3 innerColor =
                    vec3(
                        1.0,
                        1.0,
                        1.0
                    );

                vec3 outerColor =
                    vec3(
                        1.0,
                        1.0,
                        1.0
                    );

                vec3 color =
                    mix(
                        outerColor,
                        innerColor,
                        radius * 2.0
                    );

                float alpha =
                    (
                        ring +
                        outer * 0.28
                    )
                    * strength
                    * pulse;

                alpha *=
                    smoothstep(
                        0.5,
                        0.08,
                        radius
                    );

                gl_FragColor =
                    vec4(
                        color,
                        alpha
                    );
            }
        `
    });

const gravitationalLens =
    new THREE.Mesh(
        lensGeometry,
        lensMaterial
    );

gravitationalLens.position.z =
    -0.05;

blackHole.add(
    gravitationalLens
);


// ==================================================
// Photon Ring
// ==================================================

const photonRingGeometry =
    new THREE.TorusGeometry(
        2.45,
        0.09,
        16,
        160
    );

const photonRingMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });

const photonRing =
    new THREE.Mesh(
        photonRingGeometry,
        photonRingMaterial
    );

photonRing.rotation.x =
    0.3;

photonRing.scale.setScalar(
    0.001
);

blackHole.add(
    photonRing
);


// ==================================================
// Accretion Disk
// ==================================================

const diskGroup =
    new THREE.Group();

blackHole.add(
    diskGroup
);

const diskParticles = [];

const diskParticleGeometry =
    new THREE.SphereGeometry(
        0.035,
        6,
        6
    );

for (let i = 0; i < 1200; i++) {

    const angle =
        Math.random() *
        Math.PI * 2;

    const radius =
        2.4 +
        Math.random() * 5;

    const material =
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity:
                0.25 +
                Math.random() * 0.55,
            depthWrite: false,
            blending:
                THREE.AdditiveBlending
        });

    const particle =
        new THREE.Mesh(
            diskParticleGeometry,
            material
        );

    particle.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) *
        radius * 0.05,
        Math.sin(angle) *
        radius *
        0.42
    );

    particle.userData = {
        angle,
        radius,
        speed:
            0.7 +
            5 / radius
    };

    diskGroup.add(
        particle
    );

    diskParticles.push(
        particle
    );
}

diskGroup.rotation.x =
    0.3;

diskGroup.scale.setScalar(
    0.001
);


// ==================================================
// Black Hole Glow
// ==================================================

const glowGeometry =
    new THREE.SphereGeometry(
        2.8,
        64,
        64
    );

const glowMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending:
            THREE.AdditiveBlending
    });

const glow =
    new THREE.Mesh(
        glowGeometry,
        glowMaterial
    );

glow.scale.setScalar(0.001);

blackHole.add(glow);


// ==================================================
// Player
// ==================================================

const player =
    new THREE.Group();

player.position.set(
    -10,
    getPlanetSurfaceY(-10, 2) + 0.7,
    2
);

scene.add(player);

const playerGeometry =
    new THREE.BoxGeometry(
        0.75,
        1.2,
        0.75
    );

const playerMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthWrite: false,
        transparent: true,
        opacity: 1,
        toneMapped: false
    });

const playerBody =
    new THREE.Mesh(
        playerGeometry,
        playerMaterial
    );

player.add(
    playerBody
);

player.renderOrder =
    20;

player.traverse(
    (child) => {
        if (
            child.isMesh
        ) {
            child.renderOrder =
                20;
            child.material.depthTest =
                    true;
                child.material.depthWrite =
                    true;
        }
    }
);

const playerLight =
    new THREE.PointLight(
        0xffffff,
        2.5,
        8
    );

player.add(
    playerLight
);


// ==================================================
// Shockwave
// ==================================================

const shockwaveGeometry =
    new THREE.SphereGeometry(
        1,
        64,
        64
    );

const shockwaveMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        wireframe: true,
        depthWrite: false,
        blending:
            THREE.AdditiveBlending
    });

const shockwave =
    new THREE.Mesh(
        shockwaveGeometry,
        shockwaveMaterial
    );

shockwave.scale.setScalar(
    0.01
);

shockwave.position.copy(
    blackHole.position
);

scene.add(shockwave);


// ==================================================
// Shockwave ring
// ==================================================

const ringGeometry =
    new THREE.RingGeometry(
        1,
        1.05,
        128
    );

const ringMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending:
            THREE.AdditiveBlending
    });

const shockRing =
    new THREE.Mesh(
        ringGeometry,
        ringMaterial
    );

shockRing.position.copy(
    blackHole.position
);

shockRing.rotation.x =
    Math.PI / 2;

scene.add(
    shockRing
);


// ==================================================
// States
// ==================================================

const STATE = {

    LIFE: 0,

    FORMING: 1,

    SUCKING: 2,

    COLLAPSE: 3,

    SHOCKWAVE: 4,

    LAUNCH: 5,

    FADE: 6,

    END: 7
};

let state =
    STATE.LIFE;

let stateTime = 0;

let elapsed = 0;

let shake = 0;

let absorptionProgress =
    0;

let launchStarted =
    false;

let playerVelocity =
    new THREE.Vector3();


// ==================================================
// State Change
// ==================================================

function setState(next) {

    state = next;

    stateTime = 0;

    if (next === STATE.SUCKING) {

        absorptionProgress =
            0;

        for (const cube of cubes) {

            cube.userData.velocity.set(
                0,
                0,
                0
            );
        }

        playerVelocity.set(
            0,
            0,
            0
        );
    }

    if (next === STATE.SHOCKWAVE) {

        launchStarted =
            true;

        shockwave.scale.setScalar(
            0.01
        );

        shockwaveMaterial.opacity =
            1;

        shockRing.scale.setScalar(
            0.01
        );

        ringMaterial.opacity =
            1;

        shake = 1.8;

        const escapeDirection =
            new THREE.Vector3()
                .subVectors(
                    player.position,
                    blackHole.position
                )
                .normalize();

        playerVelocity
            .copy(escapeDirection)
            .multiplyScalar(20)
            .add(
                new THREE.Vector3(
                    0,
                    2,
                    0
                )
            );
    }

    if (next === STATE.LAUNCH) {

        const escapeDirection =
            new THREE.Vector3()
                .subVectors(
                    player.position,
                    blackHole.position
                )
                .normalize();

        playerVelocity
            .copy(escapeDirection)
            .multiplyScalar(20)
            .add(
                new THREE.Vector3(
                    0,
                    7,
                    0
                )
            );
    }
}


// ==================================================
// Living Cube Motion
// ==================================================

function updateLivingCubes() {

    for (const cube of cubes) {

        if (
            cube.userData.absorbed
        ) {
            continue;
        }

        const data =
            cube.userData;

        const t =
            elapsed *
            data.speed +
            data.phase;

        /*
         * 수평 이동만 한다.
         */

        cube.position.x +=
            data.direction *
            data.speed *
            0.01;

        /*
         * 화면 밖으로 나가면 반대편에서 등장.
         */

        if (cube.position.x > 14) {
            cube.position.x = -14;
        }

        if (cube.position.x < -14) {
            cube.position.x = 14;
        }

        /*
         * 생명체 같은 미세한 흔들림.
         */

        cube.position.z =
            data.baseZ +
            Math.sin(t * 1.7) *
            data.sway;

        cube.position.y =
            getPlanetSurfaceY(
                cube.position.x,
                cube.position.z
            ) +
            0.35 +
            Math.abs(
                Math.sin(t * 2)
            ) * 0.035;

        /*
         * 굴러가지 않고 몸체가
         * 살짝 좌우로 흔들린다.
         */

        cube.rotation.x =
            Math.sin(t * 1.5) *
            0.08;

        cube.rotation.z =
            Math.sin(t) *
            0.06;
    }
}


// ==================================================
// Gravity
// ==================================================

function updateGravity(delta) {

    const hole =
        blackHole.position;

    let remaining = 0;

    for (const cube of cubes) {

        if (
            cube.userData.absorbed
        ) {
            continue;
        }

        remaining++;

        const offset =
            new THREE.Vector3()
                .subVectors(
                    hole,
                    cube.position
                );

        const distance =
            offset.length();

        const direction =
            offset.clone().normalize();

        const targetSpeed =
            Math.min(
                18,
                8 + distance * 0.55
            );

        cube.userData.velocity.lerp(
            direction.multiplyScalar(targetSpeed),
            Math.min(1, delta * 10)
        );

        cube.position.add(
            cube.userData.velocity
                .clone()
                .multiplyScalar(delta)
        );

        /*
         * 빨려 들어가는 방향으로
         * 빠르게 회전.
         */

        cube.rotation.x +=
            delta * 5;

        cube.rotation.y +=
            delta * 8;

        /*
         * 가까워질수록 길어진다.
         */

        const stretch =
            1 +
            Math.max(
                0,
                7 - distance
            ) * 0.32;

        cube.scale.set(
            stretch,
            1 /
            Math.sqrt(stretch),
            1 /
            Math.sqrt(stretch)
        );

        cube.material
            .emissiveIntensity =
            1.5 +
            Math.max(
                0,
                6 - distance
            ) * 1.2;

        /*
         * 이벤트 호라이즌 진입.
         */

        if (
            distance < 1.1
        ) {

            cube.userData.absorbed =
                true;

            cube.visible =
                false;
        }
    }

    absorptionProgress =
        1 - remaining / cubes.length;

    /*
     * 모두 빨려 들어가면
     * 즉시 압축 단계로 넘어간다.
     */

    if (
        remaining === 0
    ) {

        absorptionProgress =
            1;

        setState(
            STATE.COLLAPSE
        );
    }
}


// ==================================================
// Disk
// ==================================================

function updateDisk(delta) {

    for (
        const particle
        of diskParticles
    ) {

        particle.userData.angle +=
            particle.userData.speed *
            delta;

        const angle =
            particle.userData.angle;

        const radius =
            particle.userData.radius;

        particle.position.x =
            Math.cos(angle) *
            radius;

        particle.position.z =
            Math.sin(angle) *
            radius *
            0.42;
    }

    diskGroup.rotation.z +=
        delta * 0.05;
}


// ==================================================
// Black Hole
// ==================================================

function updateBlackHole() {

    lensMaterial.uniforms
        .time.value =
        elapsed;
}


// ==================================================
// Shockwave
// ==================================================

function updateShockwave() {

    const progress =
        Math.min(
            stateTime / 1.25,
            1
        );

    const eased =
        1 -
        Math.pow(
            1 - progress,
            3
        );

    shockwave.scale.setScalar(
        eased * 18
    );

    shockwaveMaterial.opacity =
        1 - progress;

    shockRing.scale.setScalar(
        eased * 11
    );

    ringMaterial.opacity =
        1 - progress;
}


// ==================================================
// Player
// ==================================================

function updatePlayer(delta) {

    player.position.add(
        playerVelocity
            .clone()
            .multiplyScalar(
                delta
            )
    );

    player.rotation.x +=
        delta * 5;

    player.rotation.z +=
        delta * 8;
}


function updatePlayerGravity(delta) {

    const offset =
        new THREE.Vector3()
            .subVectors(
                blackHole.position,
                player.position
            );

    const distance =
        offset.length();

    const safeRadius = 3.25;

    if (
        distance < safeRadius
    ) {
        const direction =
            offset.normalize();

        const tangent =
            new THREE.Vector3(
                -direction.z,
                0,
                direction.x
            );

        player.position.copy(
            blackHole.position
        ).add(
            direction.multiplyScalar(-safeRadius)
        );

        playerVelocity.copy(tangent)
            .multiplyScalar(3.5);
    } else {
        const targetSpeed =
            Math.min(
                18,
                8 + distance * 0.55
            );

        playerVelocity.lerp(
            offset.normalize()
                .multiplyScalar(targetSpeed),
            Math.min(1, delta * 10)
        );
    }

    player.position.add(
        playerVelocity
            .clone()
            .multiplyScalar(delta)
    );
}


// ==================================================
// Camera
// ==================================================

function updateCamera(delta) {

    const cameraSway =
        Math.sin(elapsed * 0.32) * 4.5;

    const cameraLift =
        Math.sin(elapsed * 0.47) * 1.2;

    const cameraDepth =
        Math.cos(elapsed * 0.28) * 3.5;

    const targetSway =
        Math.sin(elapsed * 0.24) * 1.4;

    let target =
        new THREE.Vector3(
            0,
            -1,
            -24
        );

    if (
        state === STATE.LIFE
    ) {

        const progress =
            Math.min(stateTime / 5, 1);

        const eased =
            1 - Math.pow(1 - progress, 3);

        camera.position.lerp(
            new THREE.Vector3(
                cameraSway * (0.4 + eased),
                12 - eased * 5 + cameraLift,
                52 - eased * 22 + cameraDepth
            ),
            delta * 1.2
        );

        target.set(
            targetSway * eased,
            -6 + eased * 4,
            10 - eased * 2
        );
    }

    if (state === STATE.FORMING) {

        const preSuctionProgress =
            Math.min(
                Math.max(
                    (stateTime - 1.8) /
                    0.4,
                    0
                ),
                1
            );

        const zoomProgress =
            (1 - Math.pow(
                1 - preSuctionProgress,
                3
            )) * 0.35;

        const widePosition =
            new THREE.Vector3(
                cameraSway * 0.7,
                7.5 + cameraLift,
                29 + cameraDepth
            );

        const closePosition =
            new THREE.Vector3(
                cameraSway * 0.55,
                5.5 + cameraLift,
                5 + cameraDepth * 0.5
            );

        const zoomPosition =
            new THREE.Vector3().lerpVectors(
                widePosition,
                closePosition,
                zoomProgress
            );

        camera.position.lerp(
            zoomPosition,
            delta * 0.9
        );

        target = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(
                targetSway * 0.4,
                -1.5 + cameraLift * 0.25,
                -7
            ),
            new THREE.Vector3(
                targetSway * 0.15,
                cameraLift * 0.25,
                -24
            ),
            zoomProgress
        );
    }

    if (
        state === STATE.SUCKING ||
        state === STATE.COLLAPSE
    ) {

        const zoomProgress =
            state === STATE.COLLAPSE
                ? 1
                : 0.35 +
                Math.min(
                    absorptionProgress * 0.65,
                    0.65
                );

        const zoomEased =
            1 - Math.pow(1 - zoomProgress, 3);

        const widePosition =
            new THREE.Vector3(
                cameraSway * 0.7,
                7.5 + cameraLift,
                29 + cameraDepth
            );

        const closePosition =
            new THREE.Vector3(
                cameraSway * 0.55,
                5.5 + cameraLift,
                5 + cameraDepth * 0.5
            );

        const zoomPosition =
            new THREE.Vector3().lerpVectors(
                widePosition,
                closePosition,
                zoomEased
            );

        camera.position.lerp(
            zoomPosition,
            delta * 0.9
        );

        target = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(
                targetSway * 0.4,
                -1.5 + cameraLift * 0.25,
                -7
            ),
            new THREE.Vector3(
                targetSway * 0.15,
                cameraLift * 0.25,
                -24
            ),
            zoomEased
        );
    }

    if (
        launchStarted
    ) {

        target.copy(
            player.position
        );
    }

    camera.lookAt(
        target
    );

    /*
     * 충격파 카메라 흔들림.
     */

    if (shake > 0) {

        camera.position.x +=
            (Math.random() - 0.5) *
            shake;

        camera.position.y +=
            (Math.random() - 0.5) *
            shake;

        camera.position.z +=
            (Math.random() - 0.5) *
            shake;

        shake *=
            Math.pow(
                0.02,
                delta
            );
    }
}


// ==================================================
// Main Update
// ==================================================

function update(delta) {

    stateTime += delta;

    updateDisk(delta);

    updateBlackHole();

    switch (state) {

        case STATE.LIFE:

            updateLivingCubes();

            if (
                stateTime > 5
            ) {

                setState(
                    STATE.FORMING
                );
            }

            break;


        case STATE.FORMING: {

            updateLivingCubes();

            const progress =
                Math.min(
                    stateTime / 2.2,
                    1
                );

            const eased =
                1 -
                Math.pow(
                    1 - progress,
                    4
                );

            horizon.scale.setScalar(
                eased
            );

            glow.scale.setScalar(
                eased
            );

            diskGroup.scale.setScalar(
                eased
            );

            photonRing.scale.setScalar(
                eased
            );

            glowMaterial.opacity =
                eased * 0.1;

            lensMaterial.uniforms
                .strength.value =
                eased;

            /*
             * 블랙홀 등장과 동시에
             * 주변 큐브를 약간 흔든다.
             */

            for (const cube of cubes) {

                if (
                    cube.userData.absorbed
                ) {
                    continue;
                }

                const distance =
                    cube.position.distanceTo(
                        blackHole.position
                    );

                if (
                    distance < 10
                ) {

                    cube.position.z +=
                        Math.sin(
                            elapsed * 10 +
                            distance
                        ) *
                        0.008 *
                        eased;
                }
            }

            if (
                stateTime > 2.2
            ) {

                setState(
                    STATE.SUCKING
                );
            }

            break;
        }


        case STATE.SUCKING:

            lensMaterial.uniforms
                .strength.value =
                1;

            updateGravity(delta);
            updatePlayerGravity(delta);

            break;


        case STATE.COLLAPSE: {

            const progress =
                Math.min(
                    stateTime / 0.8,
                    1
                );

            const squeeze =
                1 -
                Math.sin(
                    progress * Math.PI
                ) * 0.35;

            horizon.scale.set(
                squeeze,
                squeeze,
                squeeze
            );

            diskGroup.scale.setScalar(
                1 -
                progress * 0.7
            );

            photonRing.scale.setScalar(
                1 -
                progress * 0.35
            );

            glowMaterial.opacity =
                0.1 +
                progress * 0.25;

            lensMaterial.uniforms
                .strength.value =
                1 -
                progress * 0.75;

            updatePlayerGravity(delta);

            if (
                stateTime > 0.8
            ) {

                setState(
                    STATE.SHOCKWAVE
                );
            }

            break;
        }


        case STATE.SHOCKWAVE:

            updateShockwave();
            updatePlayer(delta);

            if (
                stateTime > 1.25
            ) {

                setState(
                    STATE.LAUNCH
                );
            }

            break;


        case STATE.LAUNCH:

            updatePlayer(delta);

            if (
                stateTime > 2.5
            ) {

                setState(
                    STATE.FADE
                );
            }

            break;


        case STATE.FADE: {

            updatePlayer(delta);

            const progress =
                Math.min(
                    stateTime / 2,
                    1
                );

            playerMaterial.opacity =
                1 - progress;

            playerMaterial.depthWrite =
                progress < 1;

            if (
                stateTime > 2
            ) {

                setState(
                    STATE.END
                );

                onCutsceneEnd();
            }

            break;
        }


        case STATE.END:
            updatePlayer(delta);
            break;
    }

    updateCamera(delta);
}


// ==================================================
// End
// ==================================================

function onCutsceneEnd() {

    /*
     * 기존 게임 시작 코드로 연결.
     */

    console.log(
        "LAYER:S CUTSCENE END"
    );

    // window.location.href = "../index.html";
}


// ==================================================
// Resize
// ==================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );
    }
);


// ==================================================
// Loop
// ==================================================

const clock =
    new THREE.Clock();

function animate() {

    requestAnimationFrame(
        animate
    );

    const delta =
        Math.min(
            clock.getDelta(),
            0.033
        );

    elapsed += delta;

    update(delta);

    renderer.render(
        scene,
        camera
    );
}

animate();