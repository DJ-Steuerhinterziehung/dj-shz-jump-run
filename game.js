const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const modeLabelEl = document.getElementById("modeLabel");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const quickRestartButton = document.getElementById("quickRestartButton");
const pauseButton = document.getElementById("pauseButton");
const jumpButton = document.getElementById("jumpButton");
const canvasWrap = document.getElementById("gameStage");
const fullscreenButton = document.getElementById("fullscreenButton");
const exitFullscreenButton = document.getElementById("exitFullscreenButton");

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 820;
const GROUND_Y = BASE_HEIGHT - 136;
const STORAGE_KEY = "tpose-turbo-highscore";

canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

const playerImage = new Image();
playerImage.src = "assets/main-character.png";

const state = {
  imageReady: false,
  lastFrame: 0,
  started: false,
  playing: false,
  paused: false,
  gameOver: false,
  score: 0,
  highScore: readHighScore(),
  speed: 420,
  distance: 0,
  time: 0,
  spawnTimer: 1.15,
  powerTimer: 9.4,
  hitFlash: 0,
  player: createPlayer(),
  enemies: [],
  powerups: [],
  particles: [],
  farProps: createBackdrop(16, "far"),
  midProps: createBackdrop(12, "mid"),
  nearProps: createBackdrop(10, "near"),
};

function createPlayer() {
  return {
    x: 200,
    y: GROUND_Y - 560,
    width: 450,
    height: 560,
    bodyWidth: 144,
    bodyHeight: 372,
    velocityY: 0,
    jumpBuffer: 0,
    coyoteTime: 0,
    onGround: true,
    airJumps: 0,
    invincible: 0,
    upMode: 0,
    lives: 3,
  };
}

function createBackdrop(count, layer) {
  const props = [];
  for (let index = 0; index < count; index += 1) {
    const prop = {};
    recycleBackdrop(prop, layer, true, index);
    props.push(prop);
  }
  return props;
}

function recycleBackdrop(prop, layer, initial = false, index = 0) {
  const kindsByLayer = {
    far: ["bottle", "bottle", "rim", "monsterGlow"],
    mid: ["bottle", "rim", "speaker", "ad"],
    near: ["bottle", "rim", "crate", "light"],
  };

  prop.layer = layer;
  prop.kind = pick(kindsByLayer[layer]);
  prop.scale = randomRange(0.68, 1.22);
  prop.x = initial
    ? randomRange(0, BASE_WIDTH + 120) + index * 60
    : BASE_WIDTH + randomRange(120, 520);

  if (layer === "far") {
    prop.y = randomRange(160, 380);
    prop.alpha = randomRange(0.14, 0.3);
    prop.speedFactor = 0.14;
  } else if (layer === "mid") {
    prop.y = randomRange(220, 470);
    prop.alpha = randomRange(0.2, 0.44);
    prop.speedFactor = 0.24;
  } else {
    prop.y = randomRange(360, 570);
    prop.alpha = randomRange(0.28, 0.55);
    prop.speedFactor = 0.38;
  }

  prop.wobble = randomRange(0, Math.PI * 2);
}

function resetRun() {
  state.score = 0;
  state.speed = 420;
  state.distance = 0;
  state.time = 0;
  state.spawnTimer = 1.05;
  state.powerTimer = 8.4 + Math.random() * 3.8;
  state.hitFlash = 0;
  state.player = createPlayer();
  state.enemies = [];
  state.powerups = [];
  state.particles = [];
  state.farProps = createBackdrop(16, "far");
  state.midProps = createBackdrop(12, "mid");
  state.nearProps = createBackdrop(10, "near");
  state.gameOver = false;
  state.paused = false;
  pauseButton.textContent = "Pause";
  updateHud();
}

function startRun() {
  if (!state.imageReady) {
    modeLabelEl.textContent = "Bild lädt";
    return;
  }

  resetRun();
  state.started = true;
  state.playing = true;
  startOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
}

function endRun() {
  state.playing = false;
  state.gameOver = true;
  state.highScore = Math.max(state.highScore, Math.floor(state.score));
  writeHighScore(state.highScore);
  updateHud();
  gameOverText.textContent =
    "Finale Punkte: " +
    Math.floor(state.score) +
    " | Bester Lauf: " +
    state.highScore +
    ". Noch eine Runde?";
  gameOverOverlay.classList.remove("hidden");
}

function queueJump() {
  if (!state.started || state.gameOver) {
    startRun();
    return;
  }

  state.player.jumpBuffer = 0.16;
}

function togglePause() {
  if (!state.started || state.gameOver) {
    return;
  }

  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "Weiter" : "Pause";
  modeLabelEl.textContent = state.paused ? "Pause" : getModeLabel();
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function updateFullscreenState() {
  const isFullscreen = getFullscreenElement() === canvasWrap;
  canvasWrap.classList.toggle("is-fullscreen", isFullscreen);
  fullscreenButton.textContent = isFullscreen ? "Vollbild verlassen" : "Vollbild";
  fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));

  if (isFullscreen) {
    canvas.focus({ preventScroll: true });
  }
}

async function toggleFullscreen() {
  const activeFullscreen = getFullscreenElement();

  try {
    if (activeFullscreen) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        await exit.call(document);
      }
      return;
    }

    const request = canvasWrap.requestFullscreen || canvasWrap.webkitRequestFullscreen;
    if (request) {
      await request.call(canvasWrap, { navigationUI: "hide" });
    }
  } catch (error) {
    fullscreenButton.textContent = "Vollbild nicht verfügbar";
  }
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(state.score));
  highScoreEl.textContent = String(state.highScore);
  livesEl.textContent = String(state.player.lives);
  modeLabelEl.textContent = getModeLabel();
}

function getModeLabel() {
  if (!state.started) {
    return "Warm-up";
  }
  if (state.gameOver) {
    return "Out";
  }
  if (state.paused) {
    return "Pause";
  }
  if (state.player.upMode > 0) {
    return "UP! Boost";
  }
  if (state.player.invincible > 0) {
    return "Recover";
  }
  return state.speed > 640 ? "Rasend" : "Im Lauf";
}

playerImage.addEventListener("load", () => {
  state.imageReady = true;
  updateHud();
});

playerImage.addEventListener("error", () => {
  modeLabelEl.textContent = "Bild fehlt";
});

startButton.addEventListener("click", startRun);
restartButton.addEventListener("click", startRun);
quickRestartButton.addEventListener("click", startRun);
pauseButton.addEventListener("click", togglePause);
jumpButton.addEventListener("click", queueJump);
fullscreenButton.addEventListener("click", toggleFullscreen);
exitFullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenState);
document.addEventListener("webkitfullscreenchange", updateFullscreenState);

if (!(canvasWrap.requestFullscreen || canvasWrap.webkitRequestFullscreen)) {
  fullscreenButton.hidden = true;
}

window.addEventListener("keydown", (event) => {
  const jumpKeys = ["Space", "ArrowUp", "KeyW"];

  if (jumpKeys.includes(event.code)) {
    event.preventDefault();
    queueJump();
    return;
  }

  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
  }

  if (event.code === "KeyR") {
    event.preventDefault();
    startRun();
  }

  if (event.code === "KeyF") {
    event.preventDefault();
    toggleFullscreen();
  }
});

canvasWrap.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) {
    return;
  }
  queueJump();
});

window.addEventListener("blur", () => {
  if (state.playing && !state.gameOver) {
    state.paused = true;
    pauseButton.textContent = "Weiter";
    updateHud();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.playing && !state.gameOver) {
    state.paused = true;
    pauseButton.textContent = "Weiter";
    updateHud();
  }
});

function update(delta) {
  state.time += delta;

  if (!state.playing || state.paused || state.gameOver) {
    return;
  }

  state.distance += state.speed * delta;
  state.score += delta * 18 + (state.speed - 400) * delta * 0.03;
  state.speed = Math.min(780, state.speed + delta * 11);
  state.hitFlash = Math.max(0, state.hitFlash - delta * 3.2);

  updateBackdrop(state.farProps, delta);
  updateBackdrop(state.midProps, delta);
  updateBackdrop(state.nearProps, delta);
  updatePlayer(delta);
  updateEnemies(delta);
  updatePowerups(delta);
  updateParticles(delta);
  spawnEntities(delta);
  updateHud();
}

function updateBackdrop(props, delta) {
  for (const prop of props) {
    prop.x -= state.speed * prop.speedFactor * delta;
    prop.wobble += delta * (0.4 + prop.speedFactor);

    if (prop.x < -220) {
      recycleBackdrop(prop, prop.layer);
    }
  }
}

function updatePlayer(delta) {
  const player = state.player;
  const gravity = player.upMode > 0 ? 1820 : 2200;
  const jumpForce = player.upMode > 0 ? -1260 : -1040;
  const maxAirJumps = player.upMode > 0 ? 1 : 0;

  player.jumpBuffer = Math.max(0, player.jumpBuffer - delta);
  player.coyoteTime = Math.max(0, player.coyoteTime - delta);
  player.invincible = Math.max(0, player.invincible - delta);
  player.upMode = Math.max(0, player.upMode - delta);

  const canJump =
    player.onGround || player.coyoteTime > 0 || player.airJumps < maxAirJumps;

  if (player.jumpBuffer > 0 && canJump) {
    const usedGroundJump = player.onGround || player.coyoteTime > 0;
    player.velocityY = jumpForce;
    player.onGround = false;
    player.coyoteTime = 0;
    player.jumpBuffer = 0;

    if (!usedGroundJump) {
      player.airJumps += 1;
    }

    spawnBurst(player.x + player.width * 0.52, GROUND_Y - 12, "#d6ff31", 12, 160);
  }

  player.velocityY += gravity * delta;
  player.y += player.velocityY * delta;

  const floor = GROUND_Y - player.height;
  if (player.y >= floor) {
    if (!player.onGround && Math.abs(player.velocityY) > 200) {
      spawnBurst(player.x + player.width * 0.5, GROUND_Y - 10, "#4bf9d2", 10, 120);
    }

    player.y = floor;
    player.velocityY = 0;
    player.onGround = true;
    player.airJumps = 0;
    player.coyoteTime = 0.12;
  } else {
    player.onGround = false;
  }
}

function updateEnemies(delta) {
  const playerBox = getPlayerHitbox();

  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    enemy.x -= (state.speed + enemy.speedBonus) * delta;
    enemy.spin += delta * enemy.spinRate;
    enemy.bob += delta * enemy.bobRate;

    if (enemy.kind === "smallMonster") {
      enemy.y = GROUND_Y - enemy.height + Math.sin(enemy.bob) * 4;
    }

    if (enemy.x + enemy.width < -140) {
      state.enemies.splice(index, 1);
      continue;
    }

    const enemyBox = getEnemyHitbox(enemy);
    if (!intersects(playerBox, enemyBox)) {
      continue;
    }

    const stomped =
      state.player.velocityY > 140 &&
      playerBox.y + playerBox.height - enemyBox.y < 46;

    if (state.player.upMode > 0 || stomped) {
      state.score += enemy.kind === "bigMonster" ? 120 : 80;
      state.player.velocityY = stomped ? -620 : -320;
      spawnBurst(enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.45, "#ff8a28", 16, 210);
      state.enemies.splice(index, 1);
      continue;
    }

    if (state.player.invincible > 0) {
      continue;
    }

    state.player.invincible = 1.8;
    state.hitFlash = 1;
    state.player.lives -= 1;
    state.score = Math.max(0, state.score - 80);
    spawnBurst(playerBox.x + playerBox.width * 0.5, playerBox.y + playerBox.height * 0.5, "#ff4aa5", 20, 240);

    if (state.player.lives <= 0) {
      endRun();
      return;
    }
  }
}

function updatePowerups(delta) {
  const playerBox = getPlayerHitbox();

  for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
    const powerup = state.powerups[index];
    powerup.x -= state.speed * delta;
    powerup.bob += delta * 3.2;
    powerup.y += Math.sin(powerup.bob) * 18 * delta;

    if (powerup.x + powerup.size < -50) {
      state.powerups.splice(index, 1);
      continue;
    }

    const powerBox = {
      x: powerup.x,
      y: powerup.y,
      width: powerup.size,
      height: powerup.size,
    };

    if (!intersects(playerBox, powerBox)) {
      continue;
    }

    state.player.upMode = 7.5;
    state.player.invincible = Math.max(state.player.invincible, 0.8);
    state.score += 180;
    state.speed = Math.min(820, state.speed + 35);
    spawnBurst(powerup.x + powerup.size * 0.5, powerup.y + powerup.size * 0.5, "#d6ff31", 24, 280);
    state.powerups.splice(index, 1);
  }
}

function updateParticles(delta) {
  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    particle.x += particle.velocityX * delta;
    particle.y += particle.velocityY * delta;
    particle.velocityY += particle.gravity * delta;
    particle.life -= delta;

    if (particle.life <= 0) {
      state.particles.splice(index, 1);
    }
  }
}

function spawnEntities(delta) {
  state.spawnTimer -= delta;
  state.powerTimer -= delta;

  if (state.spawnTimer <= 0) {
    spawnEnemy();
    const base = Math.max(0.48, 1.15 - (state.speed - 400) * 0.0012);
    state.spawnTimer = base + Math.random() * 0.65;
  }

  if (state.powerTimer <= 0) {
    if (state.powerups.length === 0 && state.player.upMode <= 0.2) {
      spawnPowerup();
    }
    state.powerTimer = getNextPowerDelay();
  }
}

function spawnEnemy() {
  const roll = Math.random();
  let enemy;

  if (roll < 0.38) {
    enemy = {
      kind: "smallMonster",
      x: BASE_WIDTH + 120,
      y: GROUND_Y - 90,
      width: 96,
      height: 88,
      speedBonus: randomRange(40, 90),
      spin: 0,
      spinRate: 0,
      bob: Math.random() * Math.PI * 2,
      bobRate: randomRange(4.2, 6),
      tone: randomRange(0, 1),
    };
  } else if (roll < 0.72) {
    enemy = {
      kind: "bigMonster",
      x: BASE_WIDTH + 120,
      y: GROUND_Y - 160,
      width: 142,
      height: 152,
      speedBonus: randomRange(5, 40),
      spin: 0,
      spinRate: 0,
      bob: Math.random() * Math.PI * 2,
      bobRate: randomRange(2.2, 3.4),
      tone: randomRange(0, 1),
    };
  } else {
    enemy = {
      kind: "rim",
      x: BASE_WIDTH + 120,
      y: GROUND_Y - 108,
      width: 108,
      height: 108,
      speedBonus: randomRange(80, 140),
      spin: randomRange(0, Math.PI * 2),
      spinRate: randomRange(8, 12),
      bob: 0,
      bobRate: 0,
      tone: randomRange(0, 1),
    };
  }

  state.enemies.push(enemy);

  if (Math.random() < 0.2 && enemy.kind !== "rim" && state.speed > 520) {
    const rim = {
      kind: "rim",
      x: enemy.x + enemy.width + randomRange(120, 200),
      y: GROUND_Y - 108,
      width: 104,
      height: 104,
      speedBonus: randomRange(90, 150),
      spin: randomRange(0, Math.PI * 2),
      spinRate: randomRange(8, 12),
      bob: 0,
      bobRate: 0,
      tone: randomRange(0, 1),
    };
    state.enemies.push(rim);
  }
}

function spawnPowerup() {
  const lanes = [238, 302, 372, 438];
  state.powerups.push({
    x: BASE_WIDTH + randomRange(80, 260),
    y: pick(lanes) + randomRange(-18, 22),
    size: randomRange(74, 92),
    bob: Math.random() * Math.PI * 2,
  });
}

function getNextPowerDelay() {
  const scarcity = Math.min(4.8, state.time * 0.065);
  return 7.8 + Math.random() * 5.8 + scarcity;
}

function spawnBurst(x, y, color, amount, power) {
  for (let index = 0; index < amount; index += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(power * 0.3, power);
    state.particles.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 120,
      gravity: randomRange(280, 620),
      life: randomRange(0.25, 0.7),
      radius: randomRange(3, 8),
      color,
    });
  }
}

function getPlayerHitbox() {
  return {
    x: state.player.x + 152,
    y: state.player.y + 106,
    width: state.player.bodyWidth,
    height: state.player.bodyHeight,
  };
}

function getEnemyHitbox(enemy) {
  if (enemy.kind === "rim") {
    return {
      x: enemy.x + 10,
      y: enemy.y + 10,
      width: enemy.width - 20,
      height: enemy.height - 20,
    };
  }

  if (enemy.kind === "bigMonster") {
    return {
      x: enemy.x + 16,
      y: enemy.y + 18,
      width: enemy.width - 32,
      height: enemy.height - 26,
    };
  }

  return {
    x: enemy.x + 10,
    y: enemy.y + 10,
    width: enemy.width - 20,
    height: enemy.height - 18,
  };
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function draw() {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  drawSky();
  drawBackdrops(state.farProps);
  drawBillboard();
  drawBackdrops(state.midProps);
  drawGround();
  drawBackdrops(state.nearProps);
  drawPowerups();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawFocusEffects();
}

function drawSky() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  skyGradient.addColorStop(0, "#160a2c");
  skyGradient.addColorStop(0.42, "#1a1034");
  skyGradient.addColorStop(1, "#06040d");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  const pulse = 0.5 + Math.sin(state.time * 0.8) * 0.5;
  ctx.fillStyle = "rgba(255, 74, 165, 0.22)";
  ctx.beginPath();
  ctx.arc(220, 136, 110 + pulse * 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(75, 249, 210, 0.11)";
  ctx.beginPath();
  ctx.arc(BASE_WIDTH - 170, 180, 160, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 28; index += 1) {
    const x = (index * 61 + state.distance * 0.03) % (BASE_WIDTH + 80);
    const y = 60 + (index % 5) * 48;
    ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.13)" : "rgba(214,255,49,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawGround() {
  const groundGradient = ctx.createLinearGradient(0, GROUND_Y - 40, 0, BASE_HEIGHT);
  groundGradient.addColorStop(0, "#1d1331");
  groundGradient.addColorStop(1, "#09060f");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, GROUND_Y - 28, BASE_WIDTH, BASE_HEIGHT - GROUND_Y + 28);

  ctx.fillStyle = "rgba(255, 74, 165, 0.18)";
  ctx.fillRect(0, GROUND_Y - 28, BASE_WIDTH, 6);

  for (let index = 0; index < 26; index += 1) {
    const stripeX = ((index * 95 - state.distance * 0.75) % (BASE_WIDTH + 120)) - 60;
    ctx.fillStyle = index % 2 === 0 ? "rgba(75, 249, 210, 0.12)" : "rgba(255, 138, 40, 0.12)";
    ctx.fillRect(stripeX, GROUND_Y + 22, 52, 4);
  }

  for (let index = 0; index < 12; index += 1) {
    const x = ((index * 180 - state.distance * 0.3) % (BASE_WIDTH + 200)) - 80;
    drawBottle(x, GROUND_Y + 34 + (index % 2) * 10, 0.44, 0.26, 0.8);
  }
}

function drawBillboard() {
  const x = BASE_WIDTH * 0.76 - ((state.distance * 0.18) % (BASE_WIDTH + 520));
  const y = 170;
  const width = 320;
  const height = 190;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.06);
  ctx.fillStyle = "rgba(18, 14, 29, 0.68)";
  ctx.strokeStyle = "rgba(30, 215, 96, 0.38)";
  ctx.lineWidth = 4;
  roundRect(ctx, -width / 2, -height / 2, width, height, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1ed760";
  ctx.font = '800 18px "Trebuchet MS"';
  ctx.fillText("SPOTIFY LIVE", -116, -46);
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 30px "Arial Black"';
  ctx.fillText("LEERGUT", -116, -4);
  ctx.fillStyle = "#d6ff31";
  ctx.font = '900 34px "Arial Black"';
  ctx.fillText("UP! RUN", -116, 38);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = '600 15px "Trebuchet MS"';
  ctx.fillText("DJ Steuerhinterziehung", -116, 70);
  ctx.restore();
}

function drawBackdrops(props) {
  for (const prop of props) {
    if (prop.kind === "bottle") {
      drawBottle(prop.x, prop.y, prop.scale, prop.alpha, prop.layer === "near" ? 1 : 0.78);
    } else if (prop.kind === "rim") {
      drawRimProp(prop);
    } else if (prop.kind === "speaker") {
      drawSpeaker(prop);
    } else if (prop.kind === "monsterGlow") {
      drawMonsterGlow(prop);
    } else if (prop.kind === "crate") {
      drawCrate(prop);
    } else if (prop.kind === "light") {
      drawLightBeam(prop);
    } else if (prop.kind === "ad") {
      drawMiniAd(prop);
    }
  }
}

function drawBottle(x, y, scale, alpha, brightness) {
  const width = 32 * scale;
  const height = 116 * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(75, 249, 210, 0.8)";
  ctx.shadowColor = "rgba(75, 249, 210, 0.65)";
  ctx.shadowBlur = 18 * brightness;

  roundRect(ctx, -width * 0.32, -height, width * 0.64, height * 0.74, 12 * scale);
  ctx.fill();
  roundRect(ctx, -width * 0.18, -height * 1.14, width * 0.36, height * 0.18, 6 * scale);
  ctx.fill();

  ctx.fillStyle = "rgba(214, 255, 49, 0.7)";
  roundRect(ctx, -width * 0.3, -height * 0.58, width * 0.6, height * 0.2, 10 * scale);
  ctx.fill();
  ctx.restore();
}

function drawRimProp(prop) {
  const radius = 34 * prop.scale;
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  ctx.rotate(prop.wobble * 0.4);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 8 * prop.scale;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 138, 40, 0.28)";
  ctx.lineWidth = 4 * prop.scale;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSpeaker(prop) {
  const width = 92 * prop.scale;
  const height = 124 * prop.scale;

  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  ctx.fillStyle = "rgba(255, 74, 165, 0.16)";
  roundRect(ctx, -width / 2, -height / 2, width, height, 18 * prop.scale);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -height * 0.14, width * 0.18, 0, Math.PI * 2);
  ctx.arc(0, height * 0.2, width * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMonsterGlow(prop) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  ctx.fillStyle = "rgba(255, 74, 165, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 56 * prop.scale, 34 * prop.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(-14 * prop.scale, -4 * prop.scale, 8 * prop.scale, 8 * prop.scale);
  ctx.fillRect(6 * prop.scale, -4 * prop.scale, 8 * prop.scale, 8 * prop.scale);
  ctx.restore();
}

function drawCrate(prop) {
  const width = 72 * prop.scale;
  const height = 64 * prop.scale;
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  ctx.fillStyle = "rgba(255, 138, 40, 0.18)";
  roundRect(ctx, -width / 2, -height / 2, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 221, 180, 0.22)";
  ctx.strokeRect(-width * 0.33, -height * 0.2, width * 0.66, height * 0.4);
  ctx.restore();
}

function drawLightBeam(prop) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  const beam = ctx.createLinearGradient(0, -120 * prop.scale, 0, 40 * prop.scale);
  beam.addColorStop(0, "rgba(75, 249, 210, 0)");
  beam.addColorStop(1, "rgba(75, 249, 210, 0.24)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, -130 * prop.scale);
  ctx.lineTo(-30 * prop.scale, 32 * prop.scale);
  ctx.lineTo(30 * prop.scale, 32 * prop.scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMiniAd(prop) {
  const width = 110 * prop.scale;
  const height = 60 * prop.scale;
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.globalAlpha = prop.alpha;
  ctx.fillStyle = "rgba(30, 215, 96, 0.12)";
  roundRect(ctx, -width / 2, -height / 2, width, height, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = '800 14px "Trebuchet MS"';
  ctx.fillText("LEERGUT", -width * 0.24, 5);
  ctx.restore();
}

function drawPowerups() {
  for (const powerup of state.powerups) {
    const pulse = 0.86 + Math.sin(powerup.bob * 2.4) * 0.12;
    ctx.save();
    ctx.translate(powerup.x + powerup.size * 0.5, powerup.y + powerup.size * 0.5);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "rgba(214, 255, 49, 0.7)";
    ctx.shadowBlur = 26;
    ctx.fillStyle = "rgba(214, 255, 49, 0.22)";
    roundRect(ctx, -powerup.size / 2, -powerup.size / 2, powerup.size, powerup.size, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.26)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#d6ff31";
    ctx.font = '900 34px "Arial Black"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("UP!", 0, 3);
    ctx.restore();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.kind === "smallMonster") {
      drawSmallMonster(enemy);
    } else if (enemy.kind === "bigMonster") {
      drawBigMonster(enemy);
    } else {
      drawWheelEnemy(enemy);
    }
  }
}

function drawDowntempoStamp(width, y, fontSize) {
  ctx.save();
  roundRect(ctx, -width / 2, y, width, 24, 12);
  ctx.fillStyle = "rgba(214, 255, 49, 0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(17, 8, 22, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#120916";
  ctx.font = `900 ${fontSize}px "Arial Black"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DOWNTEMPO", 0, y + 13);
  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawSmallMonster(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  ctx.shadowColor = enemy.tone > 0.5 ? "rgba(255, 74, 165, 0.38)" : "rgba(75, 249, 210, 0.34)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = enemy.tone > 0.5 ? "#281433" : "#183145";
  ctx.beginPath();
  ctx.moveTo(-44, 18);
  ctx.quadraticCurveTo(-56, -8, -34, -34);
  ctx.lineTo(-26, -54);
  ctx.lineTo(-10, -40);
  ctx.lineTo(0, -62);
  ctx.lineTo(12, -40);
  ctx.lineTo(28, -54);
  ctx.lineTo(36, -34);
  ctx.quadraticCurveTo(56, -6, 44, 18);
  ctx.quadraticCurveTo(34, 42, 0, 48);
  ctx.quadraticCurveTo(-34, 42, -44, 18);
  ctx.fill();

  ctx.fillStyle = "#100815";
  ctx.beginPath();
  ctx.moveTo(-34, -22);
  ctx.lineTo(-22, -48);
  ctx.lineTo(-8, -18);
  ctx.closePath();
  ctx.moveTo(8, -18);
  ctx.lineTo(22, -48);
  ctx.lineTo(34, -22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff5d7e";
  ctx.beginPath();
  ctx.arc(-16, -2, 10, 0, Math.PI * 2);
  ctx.arc(16, -2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4f8";
  ctx.beginPath();
  ctx.arc(-20, -6, 4, 0, Math.PI * 2);
  ctx.arc(12, -6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#180812";
  ctx.beginPath();
  ctx.arc(-16, -1, 4, 0, Math.PI * 2);
  ctx.arc(16, -1, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffe9f1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20, 20);
  ctx.lineTo(-10, 28);
  ctx.lineTo(0, 18);
  ctx.lineTo(10, 28);
  ctx.lineTo(20, 20);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, 18);
  ctx.lineTo(-44, 34);
  ctx.moveTo(30, 18);
  ctx.lineTo(44, 34);
  ctx.stroke();

  drawDowntempoStamp(84, 4, 9);
  ctx.restore();
}

function drawBigMonster(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  ctx.shadowColor = enemy.tone > 0.5 ? "rgba(255, 74, 165, 0.34)" : "rgba(214, 255, 49, 0.26)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = enemy.tone > 0.5 ? "#351622" : "#182f20";
  ctx.beginPath();
  ctx.moveTo(-60, 44);
  ctx.quadraticCurveTo(-78, 0, -54, -46);
  ctx.lineTo(-38, -68);
  ctx.lineTo(-20, -48);
  ctx.lineTo(0, -84);
  ctx.lineTo(20, -48);
  ctx.lineTo(38, -68);
  ctx.lineTo(54, -46);
  ctx.quadraticCurveTo(78, 0, 60, 44);
  ctx.quadraticCurveTo(34, 70, 0, 74);
  ctx.quadraticCurveTo(-34, 70, -60, 44);
  ctx.fill();

  ctx.fillStyle = "#0f0914";
  ctx.beginPath();
  ctx.moveTo(-42, -34);
  ctx.lineTo(-26, -72);
  ctx.lineTo(-10, -34);
  ctx.closePath();
  ctx.moveTo(10, -34);
  ctx.lineTo(26, -72);
  ctx.lineTo(42, -34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff597f";
  ctx.beginPath();
  ctx.ellipse(-22, -10, 16, 12, -0.1, 0, Math.PI * 2);
  ctx.ellipse(22, -10, 16, 12, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8fb";
  ctx.beginPath();
  ctx.arc(-28, -14, 5, 0, Math.PI * 2);
  ctx.arc(16, -14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#120711";
  ctx.beginPath();
  ctx.arc(-22, -10, 6, 0, Math.PI * 2);
  ctx.arc(22, -10, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffeef3";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-30, 28);
  ctx.lineTo(-18, 42);
  ctx.lineTo(-6, 24);
  ctx.lineTo(6, 42);
  ctx.lineTo(18, 24);
  ctx.lineTo(30, 40);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-42, 32);
  ctx.lineTo(-58, 54);
  ctx.moveTo(42, 32);
  ctx.lineTo(58, 54);
  ctx.stroke();

  drawDowntempoStamp(106, 2, 11);
  ctx.restore();
}

function drawWheelEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  ctx.rotate(enemy.spin);

  ctx.fillStyle = "#11141d";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.width * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d0d7df";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.width * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 4;
  for (let spoke = 0; spoke < 6; spoke += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(enemy.width * 0.28, 0);
    ctx.stroke();
  }

  ctx.fillStyle = "#ff8a28";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.width * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  const bob = player.onGround ? Math.sin(state.time * 12) * 6 : 0;
  const tilt = clamp(player.velocityY / 1800, -0.16, 0.22);

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2 + bob);
  ctx.rotate(tilt);

  const scaleX = player.upMode > 0 ? 1.04 + Math.sin(state.time * 18) * 0.02 : 1;
  const scaleY = player.upMode > 0 ? 0.98 + Math.cos(state.time * 18) * 0.02 : 1;
  ctx.scale(scaleX, scaleY);

  if (player.upMode > 0) {
    ctx.fillStyle = "rgba(214, 255, 49, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 40, player.width * 0.3, player.height * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player.invincible > 0) {
    ctx.globalAlpha = Math.sin(state.time * 28) > 0 ? 0.98 : 0.72;
    ctx.shadowColor = "rgba(255,255,255,0.6)";
    ctx.shadowBlur = 26;
  }

  if (state.imageReady) {
    ctx.drawImage(
      playerImage,
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height
    );
  } else {
    ctx.fillStyle = "#ff4aa5";
    roundRect(ctx, -52, -160, 104, 260, 28);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life * 1.8);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFocusEffects() {
  if (state.hitFlash > 0) {
    ctx.fillStyle = "rgba(255, 74, 165, " + 0.18 * state.hitFlash + ")";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  if (state.player.upMode > 0) {
    ctx.strokeStyle = "rgba(214, 255, 49, 0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, BASE_WIDTH - 24, BASE_HEIGHT - 24);
  }
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function readHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch (error) {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    return;
  }
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function frame(timestamp) {
  if (!state.lastFrame) {
    state.lastFrame = timestamp;
  }

  const delta = Math.min(0.033, (timestamp - state.lastFrame) / 1000);
  state.lastFrame = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(frame);
}

updateHud();
draw();
requestAnimationFrame(frame);
