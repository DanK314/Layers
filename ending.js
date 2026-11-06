import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// The opening's white traveler, seven colors, and 35 swallowed cubes return here.
const palette = [0xff2020, 0x20ff50, 0x2080ff, 0xffff20, 0xff20ff, 0x20ffff, 0xffffff];
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('ending-canvas'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020309);
const camera = new THREE.PerspectiveCamera(52, 1, .1, 600);
scene.add(new THREE.AmbientLight(0x8499cc, 1.2));
const light = new THREE.PointLight(0xffb877, 95, 100);
light.position.set(0, 3, 5);
scene.add(light);
// Reuse the opening planet: the same radius, crater texture, material, and position.
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



const sunlight = new THREE.DirectionalLight(0xffffff, 2.2);
sunlight.position.set(-24, 32, 28);
scene.add(sunlight);
const hole = new THREE.Group();
hole.rotation.set(.32, 0, -.18);
scene.add(hole);
const core = new THREE.Mesh(new THREE.SphereGeometry(3.08, 64, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
hole.add(core);
const additive = color => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const rim = new THREE.Mesh(new THREE.TorusGeometry(3.14, .065, 12, 160), additive(0xffe5c0));
hole.add(rim);
const diskMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, energy: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p; uniform float time; uniform float energy;
        void main(){float r=length(p.xy);float a=atan(p.y,p.x);
        float bands=.6+.4*sin(r*36.-a*5.+time*(2.+energy*12.));
        float edge=smoothstep(7.8,3.3,r)*smoothstep(3.05,3.5,r);
        vec3 warm=mix(vec3(1.,.18,.025),vec3(1.,.86,.58),pow(3.2/r,3.));
        vec3 rainbow=.55+.45*cos(vec3(0.,2.,4.)+a+r-time*5.);
        gl_FragColor=vec4(mix(warm,rainbow,energy)* (1.+energy),edge*(.3+.7*bands));}`
});
const disk = new THREE.Mesh(new THREE.RingGeometry(3.12, 7.8, 192, 4), diskMaterial);
disk.rotation.x = Math.PI * .39;
hole.add(disk);
// A second thin orbit makes the accretion disk's depth visible during the camera arc.
const orbit = new THREE.Mesh(new THREE.TorusGeometry(4.4, .025, 8, 160), additive(0xff9944));
orbit.rotation.x = Math.PI * .39;
hole.add(orbit);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8, roughness: .22, metalness: .25 });
const player = new THREE.Mesh(new THREE.BoxGeometry(.75, 1.2, .75), playerMaterial);
scene.add(player);
const aura = new THREE.Mesh(new THREE.SphereGeometry(.85, 24, 16), additive(0xffffff));
aura.material.opacity = .08;
player.add(aura);
const starsData = new Float32Array(2400 * 3);
for (let i = 0; i < starsData.length; i += 3) {
    const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(90 + Math.random() * 150);
    v.toArray(starsData, i);
}
const starsGeometry = new THREE.BufferGeometry();
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsData, 3));
const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xbacfff, size: .18, transparent: true, opacity: .8 }));
scene.add(stars);
const cubes = [];
const cubeGeometry = new THREE.BoxGeometry(.7, .7, .7);
for (let i = 0; i < 35; i++) {
    const color = palette[i % palette.length];
    const cube = new THREE.Mesh(cubeGeometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .65, roughness: .3, metalness: .2 }));
    // The explosion throws the cubes upward before the planet pulls them back.
    const angle = i * 2.39996;
    cube.userData.launchVelocity = new THREE.Vector3(Math.cos(angle) * (1.5 + i % 5), 2.5 + (Math.sin(angle) + 1) * 1.8, 1.8 + (i % 7) * .35);
    cube.userData.velocity = cube.userData.launchVelocity.clone();
    cube.userData.landed = false;
    cube.userData.bounces = 0;
    cube.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random());
    scene.add(cube);
    cubes.push(cube);
}
player.userData.launchVelocity = new THREE.Vector3(.5, 4.5, 3.5);
player.userData.velocity = player.userData.launchVelocity.clone();
player.userData.spin = new THREE.Vector3(.3, .45, .15);
player.userData.landed = false;
player.userData.bounces = 0;
const fallingBodies = [...cubes, player];
// Fixed simulation steps keep gravity and ground contact consistent at every frame rate.
let cubeTime = 0;
const gravityDirection = new THREE.Vector3();
const contactNormal = new THREE.Vector3();
const localNormal = new THREE.Vector3();
const inverseRotation = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
function resetCubes() {
    cubeTime = 0;
    for (const cube of fallingBodies) {
        cube.position.set(0, 0, cube === player ? 3.8 : 0);
        cube.rotation.set(0, 0, 0);
        cube.userData.velocity.copy(cube.userData.launchVelocity);
        cube.userData.landed = false;
        cube.userData.bounces = 0;
    }
}
function updateCubes(time, visible) {
    if (visible && cubeTime === 0) player.position.set(0, 0, 3.8);
    const step = 1 / 120;
    while (cubeTime + step <= Math.min(time, 13)) {
        cubeTime += step;
        for (const cube of fallingBodies) {
            const data = cube.userData;
            if (data.landed) continue;
            gravityDirection.subVectors(planet.position, cube.position).normalize();
            data.velocity.addScaledVector(gravityDirection, 4.5 * step);
            data.velocity.multiplyScalar(Math.exp(-.12 * step));
            cube.position.addScaledVector(data.velocity, step);
            cube.rotation.x += data.spin.x * step * 2;
            cube.rotation.y += data.spin.y * step * 2;
            cube.rotation.z += data.spin.z * step * 2;
            contactNormal.subVectors(cube.position, planet.position);
            const distance = contactNormal.length();
            contactNormal.normalize();
            // Project the oriented cube onto the surface normal to keep its corners above ground.
            inverseRotation.copy(cube.quaternion).invert();
            localNormal.copy(contactNormal).applyQuaternion(inverseRotation);
            const halfWidth = cube === player ? .375 : .35;
            const halfHeight = cube === player ? .6 : .35;
            const support = halfWidth * (Math.abs(localNormal.x) + Math.abs(localNormal.z)) + halfHeight * Math.abs(localNormal.y);
            if (distance < 18 + support) {
                cube.position.copy(planet.position).addScaledVector(contactNormal, 18 + support);
                const inwardSpeed = data.velocity.dot(contactNormal);
                if (inwardSpeed < 0) {
                    data.velocity.addScaledVector(contactNormal, -1.28 * inwardSpeed);
                    data.velocity.multiplyScalar(.6);
                    data.bounces++;
                }
                if (data.bounces >= 3 || data.velocity.length() < .8) {
                    data.landed = true;
                    data.velocity.set(0, 0, 0);
                    cube.quaternion.setFromUnitVectors(up, contactNormal);
                    cube.rotateY(data.spin.y * Math.PI * 2);
                    cube.position.copy(planet.position).addScaledVector(contactNormal, 18 + halfHeight);
                }
            }
        }
    }
    for (const cube of cubes) {
        cube.visible = visible;
        cube.scale.setScalar(smooth(0, .4, time));
    }
}
const debrisCount = 1600;
const debrisData = new Float32Array(debrisCount * 3);
const velocities = [];
for (let i = 0; i < debrisCount; i++) velocities.push(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(5 + Math.random() * 16));
const debrisGeometry = new THREE.BufferGeometry();
debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisData, 3));
const debris = new THREE.Points(debrisGeometry, new THREE.PointsMaterial({ color: 0xffddbb, size: .09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(debris);
const waves = [0, 1, 2].map(i => {
    const wave = new THREE.Mesh(new THREE.TorusGeometry(1, .018, 8, 160), additive(palette[i + 2]));
    wave.rotation.set(i * .6, i * .4, 0);
    scene.add(wave);
    return wave;
});
const flash = document.getElementById('flash');
const conclusion = document.getElementById('conclusion');
const credits = document.getElementById('credits');
const creditsRoll = document.getElementById('credits-roll');
const smooth = (a, b, t) => { const v = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
let elapsed = 0;
let finished = false;
function frame(t) {
    const approach = smooth(2, 7, t);
    const launch = THREE.MathUtils.clamp((t - 2) / 5, 0, 1);
    const crouch = smooth(1.2, 1.65, t) * (1 - smooth(1.8, 2.15, t));
    const charge = smooth(7, 12.5, t);
    const burst = Math.max(0, t - 13);
    const exploded = t >= 13;
    const color = new THREE.Color(palette[Math.floor((t - 7) * (3 + charge * 12)) % 7] ?? 0xffffff);
    diskMaterial.uniforms.time.value = t;
    diskMaterial.uniforms.energy.value = charge;
    hole.visible = !exploded;
    hole.scale.setScalar(t < 11.5 ? 1 + charge * .08 * Math.sin(t * 26) : 1 - smooth(11.5, 13, t) * .85);
    rim.material.color.copy(t > 7 ? color : new THREE.Color(0xffe5c0));
    orbit.rotation.z = t * .12;
    const surfaceY = getPlanetSurfaceY(-7, 17);
    player.scale.set(1 + crouch * .2, 1 - crouch * .3, 1 + crouch * .2);
    if (!exploded) {
    player.position.set(
        THREE.MathUtils.lerp(-7, 0, approach),
        THREE.MathUtils.lerp(surfaceY + .6 - crouch * .18, 0, approach) + Math.sin(launch * Math.PI) * 4.8,
        THREE.MathUtils.lerp(17, 3.8, approach)
    );
    player.rotation.set((t - 2) * .24 * approach, (t - 2) * .4 * approach, -Math.sin(launch * Math.PI) * .45 + charge * Math.sin(t * 4) * .3);
    }
    playerMaterial.color.copy(t > 7 && !exploded ? color : new THREE.Color(0xffffff));
    playerMaterial.emissive.copy(playerMaterial.color);
    playerMaterial.emissiveIntensity = 1.8 + charge * 4;
    aura.material.color.copy(playerMaterial.color);
    aura.scale.setScalar(1 + charge * 1.5);
    aura.material.opacity = exploded ? .04 : .06 + charge * .1;
    updateCubes(burst, exploded);
    debris.visible = exploded && burst < 8;
    if (debris.visible) {
        for (let i = 0; i < debrisCount; i++) velocities[i].clone().multiplyScalar(burst).toArray(debrisData, i * 3);
        debrisGeometry.attributes.position.needsUpdate = true;
        debris.material.opacity = 1 - smooth(1, 7, burst);
    }
    waves.forEach((wave, i) => {
        const age = burst - i * .18;
        wave.visible = exploded && age > 0 && age < 4;
        wave.scale.setScalar(Math.max(.001, 1 + age * (12 + i * 3)));
        wave.material.opacity = 1 - smooth(0, 4, age);
    });
    // A single soft flash; the rapid color changes stay local to the traveler and disk.
    flash.style.opacity = exploded ? String(.85 * (1 - smooth(0, .85, burst))) : '0';
    light.color.copy(exploded ? new THREE.Color(0xbedcff) : color);
    light.intensity = exploded ? 150 * Math.exp(-burst * .4) + 35 : 95 + charge * 120;
    const retreat = smooth(14, 23, t);
    const follow = smooth(1.8, 7, t);
    camera.position.set(
        THREE.MathUtils.lerp(-11, 4 * Math.sin(t * .09) * (1 - retreat), follow),
        THREE.MathUtils.lerp(5, 2 + retreat * 3, follow),
        THREE.MathUtils.lerp(34, 29 + retreat * 13, follow)
    );
    if (t > 10 && t < 14.2) {
        const shake = exploded ? .12 * (1 - smooth(13, 14.2, t)) : charge * .045;
        camera.position.x += Math.sin(t * 67) * shake;
        camera.position.y += Math.cos(t * 59) * shake;
    }
    camera.lookAt(THREE.MathUtils.lerp(-4, 0, follow), THREE.MathUtils.lerp(-2, -2.5 * retreat, follow), THREE.MathUtils.lerp(9, retreat * 7, follow));
    stars.rotation.y = t * .006;
    // Drive the roll from the scene clock so tab suspension and Replay stay synchronized.
    const creditsVisible = t >= 24 && t < 53;
    credits.classList.toggle('visible', creditsVisible);
    credits.setAttribute('aria-hidden', String(!creditsVisible));
    if (creditsVisible) {
        const progress = THREE.MathUtils.clamp((t - 24) / 27, 0, 1);
        const viewport = credits.clientHeight;
        const destination = viewport / 2 - creditsRoll.offsetHeight + creditsRoll.lastElementChild.offsetHeight / 2;
        creditsRoll.style.transform = `translateY(${THREE.MathUtils.lerp(viewport, destination, progress)}px)`;
        credits.style.opacity = String(1 - smooth(51, 53, t));
    }
    if (t >= 53 && !finished) {
        finished = true;
        conclusion.classList.add('visible');
        conclusion.setAttribute('aria-hidden', 'false');
        document.getElementById('replay').focus({ preventScroll: true });
    }
    renderer.render(scene, camera);
}
function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener('resize', resize);
window.addEventListener('keydown', event => { if (event.key === 'Escape') location.href = './index.html'; });
document.getElementById('replay').addEventListener('click', () => {
    elapsed = 0;
    resetCubes();
    credits.classList.remove('visible');
    credits.setAttribute('aria-hidden', 'true');
    credits.style.opacity = '';
    finished = false;
    conclusion.classList.remove('visible');
    conclusion.setAttribute('aria-hidden', 'true');
    document.querySelector('.skip').focus({ preventScroll: true });
});
resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), .05);
    if (!document.hidden) elapsed += delta;
    frame(elapsed);
});

