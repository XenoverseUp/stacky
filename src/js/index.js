// Based on the tutorial of Hunor Marton Borbely: https://youtu.be/hBiGFpBle7E

const difficultyButtons = document.querySelectorAll(".difficulty-card");
const endDifficultyCards = document.querySelectorAll(".end-difficulty-card");
const startButton = document.querySelector("#start");
const restartButton = document.querySelector(".restart");
const soundButtons = document.querySelectorAll(".sound");
const sounds = document.querySelectorAll("audio");
const overlay = document.querySelector(".blurry-overlay");
const startMenu = document.querySelector(".start-menu");
const overMenu = document.querySelector(".over-menu");
const endScore = document.querySelector("#end-score");
const overTalk = document.querySelector("#over-talk");
const counter = document.querySelector(".counter");

const difficulties = ["easy", "medium", "hard"];
let difficulty = "easy";
let muted = false;

[difficultyButtons, endDifficultyCards].forEach((buttons) => {
  buttons[0].addEventListener("click", () => {
    !buttons[0].classList.contains("active") && !muted && sounds[4].play();
    buttons[0].classList.add("active");

    buttons[1].classList.remove("active");
    buttons[2].classList.remove("active");

    difficulty = difficulties[0];
  });

  buttons[1].addEventListener("click", () => {
    !buttons[1].classList.contains("active") && !muted && sounds[4].play();
    buttons[1].classList.add("active");

    buttons[2].classList.remove("active");
    buttons[0].classList.remove("active");

    difficulty = difficulties[1];
  });

  buttons[2].addEventListener("click", () => {
    !buttons[2].classList.contains("active") && !muted && sounds[4].play();
    buttons[2].classList.add("active");

    buttons[0].classList.remove("active");
    buttons[1].classList.remove("active");

    difficulty = difficulties[2];
  });
});

soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("muted")) {
      button.classList.remove("muted");
      muted = false;
    } else {
      button.classList.add("muted");
      muted = true;
    }
  });
});

let camera, scene, renderer;
let world;
let lastTime;
let stack;
let overhangs;
let forwards = true;
const boxHeight = 0.7;
const originalBoxSize = 3;
let autopilot;
let gameEnded;
let robotPrecision;
let rand;
let lastHardChange = 0;

init();

function setRobotPrecision() {
  robotPrecision = Math.random() * 1 - 0.5;
}

function init() {
  autopilot = true;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];
  rand = Math.floor(Math.random() * 361);
  counter.style.display = "none";

  setRobotPrecision();

  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0,
    100
  );

  camera.position.set(4, 3.5, 4);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  addLayer(0, 0, originalBoxSize, originalBoxSize);

  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 0);
  scene.add(dirLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  document.querySelector("main").appendChild(renderer.domElement);
}

function startGame() {
  autopilot = false;
  gameEnded = false;
  forwards = true;
  lastTime = 0;
  stack = [];
  overhangs = [];
  rand = Math.floor(Math.random() * 361);
  overMenu.classList.remove("active");
  overlay.classList.add("gone");
  !muted && sounds[2].play();
  counter.style.display = "block";
  counter.innerHTML = 1;

  if (world) {
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  if (scene) {
    while (scene.children.find((c) => c.type == "Mesh")) {
      const mesh = scene.children.find((c) => c.type == "Mesh");
      scene.remove(mesh);
    }

    addLayer(0, 0, originalBoxSize, originalBoxSize);

    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
  }

  if (camera) {
    camera.position.set(4, 3.5, 4);
    camera.lookAt(0, 0, 0);
  }
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight * stack.length;
  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1);
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
}

function generateBox(x, y, z, width, depth, falls) {
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const color = new THREE.Color(
    `hsl(${
      falls ? rand + (stack.length - 1) * 8 : rand + stack.length * 8
    }, 100%, 50%)`
  );
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0;
  mass *= width / originalBoxSize;
  mass *= depth / originalBoxSize;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth,
  };
}

function cutBox(topLayer, overlap, size, delta) {
  const { direction } = topLayer;
  const newWidth = direction == "x" ? overlap : topLayer.width;
  const newDepth = direction == "z" ? overlap : topLayer.depth;

  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  topLayer.cannonjs.position[direction] -= delta / 2;

  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);
}

startButton.addEventListener("click", eventHandler);
startButton.addEventListener("touchstart", eventHandler);
restartButton.addEventListener("click", startGame);
restartButton.addEventListener("touchstart", startGame);
window.addEventListener("keydown", (e) => {
  if (!autopilot) {
    if (e.key == " ") {
      e.preventDefault();
      eventHandler();
      return;
    }
  }
});

function eventHandler() {
  if (autopilot) {
    overlay.classList.add("gone");
    startMenu.classList.add("gone");

    startGame();
  } else splitBlockAndAddNextOneIfOverlaps();
}

function splitBlockAndAddNextOneIfOverlaps() {
  if (gameEnded) return;
  forwards = true;
  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  const { direction } = topLayer;

  const size = direction == "x" ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    counter.innerHTML = stack.length;

    cutBox(topLayer, overlap, size, delta);

    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX =
      direction == "x"
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
    const overhangZ =
      direction == "z"
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
    const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width;
    const newDepth = topLayer.depth;
    const nextDirection = direction == "x" ? "z" : "x";

    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    !autopilot && !muted && sounds[3].play();
  } else {
    missedTheSpot();
  }
}

function missedTheSpot() {
  const topLayer = stack[stack.length - 1];

  addOverhang(
    topLayer.threejs.position.x,
    topLayer.threejs.position.z,
    topLayer.width,
    topLayer.depth
  );
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  gameEnded = true;
  !autopilot && !muted && sounds[0].play();

  if (!autopilot) {
    endScore.innerHTML = `${stack.length - 1} ${
      stack.length == 2 ? "meter" : "meters"
    }`;
    overTalk.innerHTML =
      stack.length < 10
        ? "What is this crap! Don't you have fingers?"
        : stack.length < 18
        ? "Not bad, but can be better."
        : stack.length < 24
        ? "You started to get my attention."
        : stack.length < 30
        ? "Is that you shining or am I dead, already?"
        : "You rocked my world baby, keep going!";

    if (muted) {
      soundButtons[1].classList.add("muted");
    } else {
      soundButtons[1].classList.remove("muted");
    }

    switch (difficulty) {
      case "easy":
        endDifficultyCards[0].classList.add("active");
        endDifficultyCards[1].classList.remove("active");
        endDifficultyCards[2].classList.remove("active");
        break;
      case "medium":
        endDifficultyCards[1].classList.add("active");
        endDifficultyCards[0].classList.remove("active");
        endDifficultyCards[2].classList.remove("active");
        break;
      case "hard":
        endDifficultyCards[2].classList.add("active");
        endDifficultyCards[1].classList.remove("active");
        endDifficultyCards[0].classList.remove("active");
        break;
    }

    setTimeout(() => {
      overlay.classList.remove("gone");
      overMenu.classList.add("active");
    }, 750);
  }
}

function animation(time) {
  if (lastTime) {
    const timePassed = time - lastTime;
    const speed = autopilot || difficulty == "easy" ? 0.008 : 0.01;

    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    if (
      difficulty == "hard" &&
      !autopilot &&
      topLayer.threejs.position[topLayer.direction] < 3 &&
      topLayer.threejs.position[topLayer.direction] > -3 &&
      time - lastHardChange > 500
    ) {
      const random = Math.random();
      if (random < 0.012) {
        forwards = !forwards;
        lastHardChange = time;
      }
    }

    const boxShouldMove =
      !gameEnded &&
      (!autopilot ||
        (autopilot &&
          topLayer.threejs.position[topLayer.direction] <
            previousLayer.threejs.position[topLayer.direction] +
              robotPrecision));

    if (boxShouldMove) {
      if (forwards) {
        topLayer.threejs.position[topLayer.direction] += speed * timePassed;
        topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;
      } else {
        topLayer.threejs.position[topLayer.direction] -= speed * timePassed;
        topLayer.cannonjs.position[topLayer.direction] -= speed * timePassed;
      }

      if (
        topLayer.threejs.position[topLayer.direction] > 10 ||
        topLayer.threejs.position[topLayer.direction] < -10
      ) {
        changeDirection();
      }
    } else {
      if (autopilot) {
        splitBlockAndAddNextOneIfOverlaps();
        setRobotPrecision();
      }
    }

    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }
  lastTime = time;
}

const changeDirection = () => (forwards = !forwards);

function updatePhysics(timePassed) {
  world.step(timePassed / 1000);

  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}

window.addEventListener("resize", () => {
  console.log("resize", window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera.top = height / 2;
  camera.bottom = height / -2;
  camera.left = width / -2;
  camera.right = width / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});
