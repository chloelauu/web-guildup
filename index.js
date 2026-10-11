// AUTHORS: CHLOE & CELESTE

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const taskCreatedBy = document.getElementById("taskCreatedBy");
const taskDeadlineInput = document.getElementById("taskDeadlineInput");
const taskPriorityInput = document.getElementById("taskPriorityInput");
let taskPriorityTouched = false;
if (taskPriorityInput) {
  taskPriorityInput.addEventListener("change", () => {
    taskPriorityTouched = true;
  });
}

c.imageSmoothingEnabled = false;

let DEBUG = false;

// ============================================================
// WORLD HELPERS
// ============================================================
function getBackgroundBounds() {
  return {
    x: background.position.x,
    y: background.position.y,
    width: image.width * background.scale,
    height: image.height * background.scale,
  };
}

function getWorldPositionFromPct(xPct, yPct) {
  const bg = getBackgroundBounds();
  return {
    x: bg.x + bg.width * xPct,
    y: bg.y + bg.height * yPct,
  };
}

function getPctFromWorldPosition(x, y) {
  const bg = getBackgroundBounds();
  return {
    x: (x - bg.x) / bg.width,
    y: (y - bg.y) / bg.height,
  };
}

// ============================================================
// COLLISION SETUP
// ============================================================
const boundaries = [];

function rebuildBoundaries() {
  boundaries.length = 0;

  if (!background) return;

  const bgX = background.position.x;
  const bgY = background.position.y;
  const bgW = image.width * background.scale;
  const bgH = image.height * background.scale;

  collisionZones.forEach((zone) => {
    boundaries.push(
      new Boundary({
        position: {
          x: bgX + zone.xPct * bgW,
          y: bgY + zone.yPct * bgH,
        },
        width: zone.wPct * bgW,
        height: zone.hPct * bgH,
      })
    );
  });
}

// ============================================================
// LOAD IMAGES
// ============================================================
const playerDownImage = new Image();
playerDownImage.src = "./img/playerDown.png";

const playerUpImage = new Image();
playerUpImage.src = "./img/playerUp.png";

const playerLeftImage = new Image();
playerLeftImage.src = "./img/playerLeft.png";

const playerRightImage = new Image();
playerRightImage.src = "./img/playerRight.png";

// ============================================================
// CREATE PLAYER
// ============================================================
const player = new Sprite({
  position: { x: 0, y: 0 },
  image: playerDownImage,
  frames: { max: 4, hold: 10 },
  sprites: {
    up: playerUpImage,
    left: playerLeftImage,
    down: playerDownImage,
    right: playerRightImage,
  },
});

// percentage-based spawn
let playerPct = { x: 0.20, y: 0.55 };

// ============================================================
// MAIN TABLE
// ============================================================
const mainTableImage = new Image();
mainTableImage.src = "./img/maintable.png";

const mainTablePct = { x: 0.33, y: 0.25, w: 0.25 };
const mainTablePos  = { x: 0, y: 0 };
let   mainTableScale = 1;
let   mainTableNear  = false;

function positionMainTable() {
  if (!background) return;
  const bg  = getBackgroundBounds();
  const pos = getWorldPositionFromPct(mainTablePct.x, mainTablePct.y);
  mainTablePos.x = pos.x;
  mainTablePos.y = pos.y;
  if (mainTableImage.naturalWidth > 0) {
    mainTableScale = (bg.width * mainTablePct.w) / mainTableImage.naturalWidth;
  }
}

mainTableImage.onload = () => { if (background) positionMainTable(); };

function getMainTableDrawSize() {
  return {
    w: mainTableImage.naturalWidth  * mainTableScale,
    h: mainTableImage.naturalHeight * mainTableScale,
  };
}

function isNearMainTable() {
  if (!mainTableImage.complete || !mainTableImage.naturalWidth) return false;
  const { w, h } = getMainTableDrawSize();
  const tableCX  = mainTablePos.x + w / 2;
  const tableCY  = mainTablePos.y + h / 2;
  const playerCX = player.position.x + (player.width  || 48) / 2;
  const playerCY = player.position.y + (player.height || 48) / 2;
  const dx = playerCX - tableCX;
  const dy = playerCY - tableCY;
  return Math.sqrt(dx * dx + dy * dy) < 90;
}

// Fraction of the sprite height treated as foreground (drawn over the player).
// The bottom (1 - mainTableSplit) of the sprite is carpet — drawn behind the player.
// Tune this value until only the wooden table top covers the player.
const mainTableSplit = 0.42;

function drawMainTableBackground() {
  if (!mainTableImage.complete || !mainTableImage.naturalWidth) return;
  // Draw the full sprite behind the player so the carpet is visible beneath them
  const { w, h } = getMainTableDrawSize();
  c.drawImage(mainTableImage, mainTablePos.x, mainTablePos.y, w, h);
}

// Matches bulletin board pressE dimensions
const mainTablePressE = { width: 104, height: 26, offsetY: -50 };

function drawMainTableForeground() {
  if (!mainTableImage.complete || !mainTableImage.naturalWidth) return;
  const { w, h } = getMainTableDrawSize();

  // Re-draw only the top portion of the sprite over the player (the wooden table)
  const srcH = mainTableImage.naturalHeight * mainTableSplit;
  const dstH = h * mainTableSplit;
  c.drawImage(
    mainTableImage,
    0, 0, mainTableImage.naturalWidth, srcH,
    mainTablePos.x, mainTablePos.y, w, dstH
  );

  // Cyan bounding box — trimmed to table body only (excludes carpet at bottom)
  if (DEBUG) {
    c.save();
    c.strokeStyle = 'cyan';
    c.lineWidth = 2;
    c.strokeRect(mainTablePos.x, mainTablePos.y + h * 0.35, w, h * 0.30);
    c.restore();
  }

  // "PRESS E" prompt — identical style to bulletin board, positioned above the sprite
  mainTableNear = isNearMainTable();
  if (
    mainTableNear &&
    !bulletinBoard.isOverlayOpen &&
    document.getElementById('guildRosterPopup').style.display !== 'flex'
  ) {
    const px = mainTablePos.x + w / 2 - mainTablePressE.width / 2;
    const py = mainTablePos.y - mainTablePressE.height - mainTablePressE.offsetY;

    c.save();

    c.fillStyle = 'rgba(22, 13, 9, 0.86)';
    c.fillRect(px, py, mainTablePressE.width, mainTablePressE.height);

    c.strokeStyle = '#c9ad7a';
    c.lineWidth = 2;
    c.strokeRect(px + 1, py + 1, mainTablePressE.width - 2, mainTablePressE.height - 2);

    c.fillStyle = '#f4e6c8';
    c.font = "10px 'Press Start 2P'";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('PRESS E', px + mainTablePressE.width / 2, py + mainTablePressE.height / 2 + 1);

    c.restore();
  }
}

// ============================================================
// CUPBOARD
// ============================================================
const cupboardImage = new Image();
cupboardImage.src = "./img/cupboard.png";

const cupboardPct  = { x: 0.22, y: 0.13, w: 0.13 };
const cupboardPos  = { x: 0, y: 0 };
let   cupboardScale     = 1;
let   cupboardNear      = false;
let   cupboardBoundary  = null;

function getCupboardDrawSize() {
  return {
    w: cupboardImage.naturalWidth  * cupboardScale,
    h: cupboardImage.naturalHeight * cupboardScale,
  };
}

function positionCupboard() {
  if (!background) return;
  const bg  = getBackgroundBounds();
  const pos = getWorldPositionFromPct(cupboardPct.x, cupboardPct.y);
  cupboardPos.x = pos.x;
  cupboardPos.y = pos.y;
  if (cupboardImage.naturalWidth > 0) {
    cupboardScale = (bg.width * cupboardPct.w) / cupboardImage.naturalWidth;

    // Rebuild collision boundary
    const idx = boundaries.indexOf(cupboardBoundary);
    if (idx !== -1) boundaries.splice(idx, 1);
    const { w, h } = getCupboardDrawSize();
    cupboardBoundary = new Boundary({
      position: { x: cupboardPos.x, y: cupboardPos.y },
      width: w,
      height: h,
    });
    boundaries.push(cupboardBoundary);
  }
}

cupboardImage.onload = () => { if (background) positionCupboard(); };

function isNearCupboard() {
  if (!cupboardImage.complete || !cupboardImage.naturalWidth) return false;
  const { w, h } = getCupboardDrawSize();
  // Measure from the bottom-center of the sprite so the collision boundary
  // doesn't prevent the player from ever reaching the threshold.
  const cx = cupboardPos.x + w / 2;
  const cy = cupboardPos.y + h - 70;
  const px = player.position.x + (player.width  || 48) / 2;
  const py = player.position.y + (player.height || 48) / 2;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) < 80;
}

function drawCupboardBackground() {
  if (!cupboardImage.complete || !cupboardImage.naturalWidth) return;
  const { w, h } = getCupboardDrawSize();
  c.drawImage(cupboardImage, cupboardPos.x, cupboardPos.y, w, h);
}

function drawCupboardForeground() {
  if (!cupboardImage.complete || !cupboardImage.naturalWidth) return;
  const { w, h } = getCupboardDrawSize();

  // Redraw top half over the player so they walk behind the cupboard body
  const splitH = 0.6;
  c.drawImage(
    cupboardImage,
    0, 0, cupboardImage.naturalWidth, cupboardImage.naturalHeight * splitH,
    cupboardPos.x, cupboardPos.y, w, h * splitH
  );

  if (DEBUG) {
    c.save();
    c.strokeStyle = 'cyan';
    c.lineWidth = 2;
    c.strokeRect(cupboardPos.x, cupboardPos.y, w, h);
    c.restore();
  }

  cupboardNear = isNearCupboard();
}

function drawCupboardPrompt() {
  if (!cupboardNear || bulletinBoard.isOverlayOpen || window.cupboardModal?.isOpen) return;
  if (!cupboardImage.complete || !cupboardImage.naturalWidth) return;
  const { w, h } = getCupboardDrawSize();
  const pw = { width: 104, height: 26 };
  const px = cupboardPos.x + w / 2 - pw.width / 2;
  const py = cupboardPos.y - pw.height - 8;

  c.save();
  c.fillStyle = 'rgba(22, 13, 9, 0.86)';
  c.fillRect(px, py, pw.width, pw.height);
  c.strokeStyle = '#c9ad7a';
  c.lineWidth = 2;
  c.strokeRect(px + 1, py + 1, pw.width - 2, pw.height - 2);
  c.fillStyle = '#f4e6c8';
  c.font = "10px 'Press Start 2P'";
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('PRESS E', px + pw.width / 2, py + pw.height / 2 + 1);
  c.restore();
}

// ============================================================
// BULLETIN BOARD
// ============================================================
const bulletinBoard = new BulletinBoard({
  worldX: 0,
  worldY: 0,
  width: 0,
  height: 0,
  imageSrc: "./img/bulletin_board.png",
  overlayImageSrc: "./img/bulletin_overlay.png",
});
window.bulletinBoard = bulletinBoard;

// percentage-based placement
const boardPct = {
  x: 0.55,
  y: 0.09,
  w: 0.22,
  h: 0.30,
};

// ============================================================
// PLANNER TABLE
// ============================================================
const plannerTable = new PlannerTable({
  worldX: 0,
  worldY: 0,
  width: 0,
  height: 0,
  imageSrc: "./img/table_and_chair.png",
});
window.plannerTable = plannerTable;

const plannerTablePct = {
  x: 0.69,
  y: 0.27,
  w: 0.20,
  h: 0.32,
};

let plannerTableBoundary = null;

// ============================================================
// DECORATION PERCENTAGES
// ============================================================
const decoPcts = {
  barrel01:   { x: 0.10,  y: 0.35,  w: 0.085, h: 0.146 },
  barrel02:   { x: 0.07,  y: 0.4,  w: 0.130, h: 0.195 },
  torch01:    { x: 0.04,  y: 0.75,  w: 0.065, h: 0.098 },
  torch02:    { x: 0.90,  y: 0.75,  w: 0.065, h: 0.098 },
  plant01:    { x: 0.38,  y: 0.20,  w: 0.065, h: 0.107 },
  plant02:    { x: 0.44,  y: 0.16,  w: 0.078, h: 0.146 },
  carpet:     { x: 0.135,  y: 0.54,  w: 0.315, h: 0.410 },
  barrel04:   { x: 0.77,  y: 0.72,  w: 0.11, h: 0.16 },
  barrel03:   { x: 0.72,  y: 0.67,  w: 0.12, h: 0.17 },
  barrelMug:  { x: 0.35,  y: 0.72,  w: 0.08, h: 0.12 },
  candlestick:  { x: 0.735,  y: 0.59,  w: 0.08, h: 0.12 },
  sofa:       { x: 0.16, y: 0.60,  w: 0.195, h: 0.293 },
  corpse:     { x: 0.25,  y: 0.39,  w: 0.150, h: 0.225 },
  barrelSack: { x: 0.24,  y: 0.105, w: 0.039, h: 0.059 },
  skull:      { x: 0.287, y: 0.085, w: 0.046, h: 0.068 },
  skull2:      { x: 0.55, y: 0.05, w: 0.07, h: 0.1 },
  bucket01:   { x: 0.915, y: 0.17, w: 0.07, h: 0.12 },
  bucket02:   { x: 0.93, y: 0.23, w: 0.05, h: 0.07 },
  banner:   { x: 0.38, y: 0.0, w: 0.13, h: 0.2 },
};

// ============================================================
// BACKGROUND
// ============================================================
let background;
const image = new Image();

function setupBackground() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const mapScale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height
  );

  const mapOffsetX = (canvas.width - image.width * mapScale) / 2;
  const mapOffsetY = (canvas.height - image.height * mapScale) / 2;

  background = new Sprite({
    position: { x: mapOffsetX, y: mapOffsetY },
    image: image,
    scale: mapScale,
  });

  rebuildBoundaries();

  const playerPos = getWorldPositionFromPct(playerPct.x, playerPct.y);
  player.position.x = playerPos.x;
  player.position.y = playerPos.y;

  const bgW = image.width * background.scale;
  const bgH = image.height * background.scale;

  const boardPos = getWorldPositionFromPct(boardPct.x, boardPct.y);
  bulletinBoard.position.x = boardPos.x;
  bulletinBoard.position.y = boardPos.y;
  bulletinBoard.width = bgW * boardPct.w;
  bulletinBoard.height = bgH * boardPct.h;

  const plannerPos = getWorldPositionFromPct(plannerTablePct.x, plannerTablePct.y);
  plannerTable.position.x = plannerPos.x;
  plannerTable.position.y = plannerPos.y;
  plannerTable.width = bgW * plannerTablePct.w;
  plannerTable.height = bgH * plannerTablePct.h;

  if (plannerTableBoundary) {
    const idx = boundaries.indexOf(plannerTableBoundary);
    if (idx !== -1) boundaries.splice(idx, 1);
  }

  plannerTableBoundary = plannerTable.getCollisionBoundary();
  boundaries.push(plannerTableBoundary);

  positionMainTable();
  positionCupboard();
}

image.onload = () => {
  setupBackground();
  animate();
};

image.src = "./img/guildBG.png";

// ============================================================
// RESIZE (KEEP PLAYER POSITION)
// ============================================================
window.addEventListener("resize", () => {
  if (image.complete && background) {
    playerPct = getPctFromWorldPosition(
      player.position.x,
      player.position.y
    );

    setupBackground();
    rescaleTeamSprites();
    unstickPlayer();
  }
});

// ============================================================
// INPUT
// ============================================================
const keys = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false },
};

// ============================================================
// HUD
// ============================================================
let _teamXP    = 0;
const _maxTeamXP = 100;

function initHUD() {
  const gs = window.gameState;

  const nameEl   = document.getElementById('playerCardName');
  const classEl  = document.getElementById('playerCardClass');
  const xpEl     = document.getElementById('playerCardXP');
  const avatarEl = document.getElementById('playerCardAvatar');
  const teamLbl  = document.getElementById('teamBarLabel');
  const card     = document.getElementById('playerCard');
  const teamBar  = document.getElementById('teamProgressBar');

  if (nameEl)  nameEl.textContent  = gs.name      || '';
  if (classEl) classEl.textContent = gs.character  || '';
  if (xpEl)    xpEl.textContent    = `XP: ${gs.xp || 0}`;
  if (teamLbl) teamLbl.textContent = gs.teamName   || '';

  // Draw tinted character avatar (reuses drawTintedPreview from overlays.js)
  if (avatarEl) drawTintedPreview(avatarEl, gs.tint || 'rgba(255,255,255,0)');

  if (card)    card.style.display    = 'flex';
  if (teamBar) teamBar.style.display = 'flex';
}

window.addTeamXP = function (amount) {
  _teamXP = Math.min(_maxTeamXP, _teamXP + amount);
  const pct = (_teamXP / _maxTeamXP) * 100;
  const fill = document.getElementById('teamXpFill');
  const text = document.getElementById('teamXpText');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${_teamXP} / ${_maxTeamXP} XP`;
};

// ============================================================
// MULTIPLAYER
// ============================================================
const teamSprites = {};
let lastPositionUpdate = 0;

const classSprites = {
  'warrior': './img/playerDown.png',
  'mage':    './img/playerDown.png',
  'healer':  './img/playerDown.png',
  'rogue':   './img/playerDown.png',
};

// Same tints used in the character selection overlay (overlays.js `characters` array)
const classTints = {
  'warrior': 'rgba(220, 60, 60, 0.55)',
  'mage':    'rgba(60, 100, 220, 0.55)',
  'healer':  'rgba(60, 200, 80, 0.55)',
  'rogue':   'rgba(220, 200, 40, 0.55)',
};

function createTeammateSprite(pos, characterClass) {
  const key = (characterClass || pos.character_class)?.toLowerCase();
  const src  = classSprites[key] || './img/playerDown.png';
  const tint = classTints[key]   || null;

  const img = new Image();
  img.src = src;

  const sprite = new Sprite({
    position: { x: pos.x, y: pos.y },
    image: img,
    frames: { max: 4, hold: 10 },
    sprites: {
      up: playerUpImage,
      left: playerLeftImage,
      down: playerDownImage,
      right: playerRightImage,
    },
  });
  sprite.tint = tint;
  return sprite;
}

function normalizeSavedPosition(pos) {
  if (pos.x <= 1 && pos.y <= 1) {
    return {
      xPct: pos.x,
      yPct: pos.y,
    };
  }

  return getPctFromWorldPosition(pos.x, pos.y);
}

function rescaleTeamSprites() {
  Object.values(teamSprites).forEach((entry) => {
    if (entry.xPct == null || entry.yPct == null) return;

    const scaled = getWorldPositionFromPct(entry.xPct, entry.yPct);

    entry.sprite.position.x = scaled.x;
    entry.sprite.position.y = scaled.y;
    entry.x = scaled.x;
    entry.y = scaled.y;
  });
}

async function onGameStart() {
  const gs = window.gameState;

  initHUD();

  if (!gs.memberId || !gs.teamId) {
    // No team — pick a collision-free random spawn and return.
    const bg = getBackgroundBounds();
    let spawnX, spawnY, spawnAttempts = 0;
    do {
      spawnX = bg.x + bg.width  * (Math.random() * 0.85 + 0.05);
      spawnY = bg.y + bg.height * (Math.random() * 0.70 + 0.15);
      spawnAttempts++;
    } while (willCollide(spawnX, spawnY) && spawnAttempts < 100);
    player.position.x = spawnX;
    player.position.y = spawnY;
    playerPct = getPctFromWorldPosition(spawnX, spawnY);
    return;
  }

  // Fetch classes, names, and existing positions in parallel.
  let memberClassMap = {};
  let memberNameMap = {};
  let existingPositions = [];
  try {
    [memberClassMap, memberNameMap, existingPositions] = await Promise.all([
      fetchTeamMemberClasses(gs.teamId),
      fetchTeamMemberNames(gs.teamId),
      getTeamPositions(gs.teamId),
    ]);
    console.log('[multiplayer] memberClassMap:', memberClassMap);
    console.log('[multiplayer] memberNameMap:', memberNameMap);
    console.log('[multiplayer] positions from DB:', existingPositions);
  } catch (err) {
    console.error('[multiplayer] initial fetch failed:', err);
  }

  // Running list of placed positions used for the 120 px min-distance check.
  // Seeded with all known saved positions so newly generated ones stay spread out.
  const MIN_SPAWN_DIST = 120;
  const placedPositions = [...existingPositions];

  function randomValidPosition() {
    const bg = getBackgroundBounds();
    let x, y, attempts = 0;
    do {
      x = bg.x + bg.width  * (Math.random() * 0.85 + 0.05);
      y = bg.y + bg.height * (Math.random() * 0.70 + 0.15);
      attempts++;
      if (willCollide(x, y)) continue;
      const tooClose = placedPositions.some(p => {
        const dx = x - p.x;
        const dy = y - p.y;
        return Math.sqrt(dx * dx + dy * dy) < MIN_SPAWN_DIST;
      });
      if (!tooClose) break;
    } while (attempts < 200);
    return { x, y };
  }

  // Determine own spawn: resume from saved position, or generate a fresh one.
  const ownSaved = existingPositions.find(p => p.member_id === gs.memberId);
  let spawnX, spawnY;

if (ownSaved && ownSaved.x <= 1 && ownSaved.y <= 1) {
  // saved position is already percentage
  playerPct = {
    x: ownSaved.x,
    y: ownSaved.y,
  };

  const scaledPlayerPos = getWorldPositionFromPct(playerPct.x, playerPct.y);

  player.position.x = scaledPlayerPos.x;
  player.position.y = scaledPlayerPos.y;
} else {
  // new spawn uses pixels first
  ({ x: spawnX, y: spawnY } = randomValidPosition());

  player.position.x = spawnX;
  player.position.y = spawnY;

  playerPct = getPctFromWorldPosition(spawnX, spawnY);

  placedPositions.push({
    member_id: gs.memberId,
    x: playerPct.x,
    y: playerPct.y,
  });

  upsertPosition(gs.memberId, gs.teamId, gs.character, playerPct.x, playerPct.y);
}

  // Place ALL team members — not just those who have previously logged in.
  // Members without a saved position get a generated one written to the DB now.
  gs.teammates = [];
  for (const [idStr, memberName] of Object.entries(memberNameMap)) {
    const memberId = Number(idStr);
    if (memberId === gs.memberId) continue;

    const saved = existingPositions.find(p => p.member_id === memberId);
    let posX, posY;

if (saved && saved.x <= 1 && saved.y <= 1) {
  // Already stored as percentage → convert to world
  const scaled = getWorldPositionFromPct(saved.x, saved.y);

  posX = scaled.x;
  posY = scaled.y;
} else {
  // New spawn → generate pixels first
  ({ x: posX, y: posY } = randomValidPosition());

  // Convert to percentage before saving
  const teammatePct = getPctFromWorldPosition(posX, posY);

  placedPositions.push({
    member_id: memberId,
    x: teammatePct.x,
    y: teammatePct.y,
  });

  upsertPosition(
    memberId,
    gs.teamId,
    memberClassMap[memberId] || null,
    teammatePct.x,
    teammatePct.y
  );
}

    const characterClass = memberClassMap[memberId] || saved?.character_class;
    console.log('[multiplayer] teammate placed —', memberName, 'class:', characterClass,
                'at', Math.round(posX), Math.round(posY));
const teammatePct = normalizeSavedPosition({
  x: posX,
  y: posY,
});

teamSprites[memberId] = {
  sprite: createTeammateSprite({ x: posX, y: posY }, characterClass),
  name: memberName,
  x: posX,
  y: posY,
  xPct: teammatePct.x,
  yPct: teammatePct.y,
};
    gs.teammates.push(memberName);
  }

  // Make sure we didn't spawn inside a wall, an object or a teammate.
  unstickPlayer();

  // Keep positions in sync as teammates move.
  subscribeToPositions(gs.teamId, (row) => {
    if (row.member_id === gs.memberId) return;
    
    // A teammate who joined after we loaded isn't in the name list yet.
    // Mark them as "looking up" and fetch the team's names once.
    if (!(row.member_id in memberNameMap)) {
      memberNameMap[row.member_id] = "";
      fetchTeamMemberNames(gs.teamId)
        .then((names) => {
          Object.assign(memberNameMap, names);
          if (teamSprites[row.member_id]) {
            teamSprites[row.member_id].name = memberNameMap[row.member_id];
          }
        })
        .catch((err) => console.warn("[multiplayer] name lookup failed:", err));
    }
    
    const memberName = memberNameMap[row.member_id];
    if (teamSprites[row.member_id]) {
      const scaled = getWorldPositionFromPct(row.x, row.y);

      // Face the direction of travel and play the walk animation
      const mate = teamSprites[row.member_id];
      const dx = scaled.x - mate.sprite.position.x;
      const dy = scaled.y - mate.sprite.position.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        if (Math.abs(dx) > Math.abs(dy)) {
          mate.sprite.image = dx > 0 ? mate.sprite.sprites.right : mate.sprite.sprites.left;
        } else {
          mate.sprite.image = dy > 0 ? mate.sprite.sprites.down : mate.sprite.sprites.up;
        }
        mate.sprite.animate = true;
        mate.lastMoveAt = performance.now();
      }

      teamSprites[row.member_id].sprite.position.x = scaled.x;
      teamSprites[row.member_id].sprite.position.y = scaled.y;

      teamSprites[row.member_id].x = scaled.x;
      teamSprites[row.member_id].y = scaled.y;
      teamSprites[row.member_id].xPct = row.x;
      teamSprites[row.member_id].yPct = row.y;
      teamSprites[row.member_id].name = memberName;
    } else {
      const characterClass = memberClassMap[row.member_id] || row.character_class;
      const scaled = getWorldPositionFromPct(row.x, row.y);

      teamSprites[row.member_id] = {
        sprite: createTeammateSprite({ x: scaled.x, y: scaled.y }, characterClass),
        name: memberName,
        x: scaled.x,
        y: scaled.y,
        xPct: row.x,
        yPct: row.y,
      };
    }
  });
}

// ============================================================
// MOUSE
// ============================================================
let mouse = { x: 0, y: 0 };

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();

  mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
});

// ============================================================
// TASK FORM
// ============================================================
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDescInput = document.getElementById("taskDescInput");
const aiAssistBtn = document.getElementById("aiAssistBtn");
const taskFormTitle = document.getElementById("taskFormTitle");
const submitTaskBtn = document.getElementById("submitTaskBtn");
const cancelTaskBtn = document.getElementById("cancelTaskBtn");

// AI Assist needs the backend. With no AI_SERVER_URL the button shows as switched off.
if (aiAssistBtn && !AI_SERVER_URL) {
  aiAssistBtn.disabled = true;
  aiAssistBtn.textContent = "AI OFF IN DEMO";
}

if (aiAssistBtn) {
  aiAssistBtn.addEventListener("click", async () => {
    if (!AI_SERVER_URL) return;

    const rawText = taskDescInput.value.trim();

    if (!rawText) return;

    try {
      aiAssistBtn.disabled = true;
      aiAssistBtn.textContent = "Thinking...";

      const res = await fetch(`${AI_SERVER_URL}/ai-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Fill form with AI output
      if (data.title) taskTitleInput.value = data.title;
      if (data.description) taskDescInput.value = data.description;

    } catch (err) {
      console.error("AI Assist failed:", err);
    } finally {
      aiAssistBtn.disabled = false;
      aiAssistBtn.textContent = "AI Assist";
    }
  });
}

// if (aiAssistBtn) {
//   aiAssistBtn.addEventListener("click", async () => {
//     const rawText = taskDescInput.value.trim();

//     if (!rawText) return;

//     try {
//       aiAssistBtn.disabled = true;
//       aiAssistBtn.textContent = "Thinking...";

//       const res = await fetch("http://localhost:3001/ai-task", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ text: rawText }),
//       });

//       const data = await res.json();

//       if (!res.ok) throw new Error(data.error);

//       // Fill form with AI output
//       if (data.title) taskTitleInput.value = data.title;
//       if (data.description) taskDescInput.value = data.description;

//     } catch (err) {
//       console.error("AI Assist failed:", err);
//     } finally {
//       aiAssistBtn.disabled = false;
//       aiAssistBtn.textContent = "AI Assist";
//     }
//   });
// }

// =========================
// 🔥 FORCE OPEN CALENDAR PICKER
// =========================
if (taskDeadlineInput) {
  const openDeadlinePicker = () => {
    try {
      if (typeof taskDeadlineInput.showPicker === "function") {
        taskDeadlineInput.showPicker();
      }
    } catch (err) {
      // Some browsers block it, safe to ignore
    }
  };

  taskDeadlineInput.addEventListener("click", openDeadlinePicker);
  taskDeadlineInput.addEventListener("focus", openDeadlinePicker);
}

function resetTaskForm() {
  if (taskPriorityInput) {
    taskPriorityInput.value = "MED";
    taskPriorityInput.disabled = false;
  }
  taskPriorityTouched = false;
  syncPriorityFromDeadline();
  
  if (taskTitleInput) {
    taskTitleInput.value = "";
    taskTitleInput.disabled = false;
  }

  if (taskDeadlineInput) {
    taskDeadlineInput.value = "";
    taskDeadlineInput.disabled = false;
  }

  if (taskDescInput) {
    taskDescInput.value = "";
    taskDescInput.disabled = false;
  }

  if (taskFormTitle) taskFormTitle.textContent = "Create Pickup Task";
  if (submitTaskBtn) {
    submitTaskBtn.textContent = "Submit";
    submitTaskBtn.style.display = "block";
  }
  if (deleteTaskBtn) deleteTaskBtn.style.display = "none";
  if (taskCreatedBy) {
    taskCreatedBy.textContent = "";
    taskCreatedBy.style.display = "none";
  }
  if (taskForm) taskForm.dataset.mode = "create";

  bulletinBoard.selectedTaskIndex = -1;
}

function getAutoPriorityFromDeadline(deadline) {
  if (!deadline) return "LOW";

  const now = new Date();
  const due = new Date(deadline);
  const diff = due - now;

  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

  if (diff <= ONE_WEEK) return "HIGH";
  if (diff <= ONE_MONTH) return "MED";
  return "LOW";
}

function syncPriorityFromDeadline() {
  if (!taskDeadlineInput || !taskPriorityInput) return;
  if (taskPriorityTouched) return;

  taskPriorityInput.value = getAutoPriorityFromDeadline(taskDeadlineInput.value);
}

if (taskDeadlineInput) {
  taskDeadlineInput.addEventListener("input", syncPriorityFromDeadline);
  taskDeadlineInput.addEventListener("change", syncPriorityFromDeadline);
}

if (submitTaskBtn) {
  submitTaskBtn.addEventListener("click", async () => {
    const mode = taskForm?.dataset.mode || "create";

    // =========================
    // ACCEPT TASK
    // =========================
    if (mode === "accept") {
      await bulletinBoard.acceptTask(bulletinBoard.selectedTaskIndex);

      resetTaskForm();
      if (taskForm) taskForm.style.display = "none";
      bulletinBoard.closeCreateTask();
      bulletinBoard.isOverlayOpen = false; // 🔥 CLOSE BOARD

      return;
    }

    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const deadline = taskDeadlineInput.value;

    const priority =
      taskPriorityInput?.value ||
      getAutoPriorityFromDeadline(deadline);

    if (!title || !description) return;

    if (mode === "cupboard-create") {
      const title = taskTitleInput.value.trim();
      const description = taskDescInput.value.trim();
      const deadline = taskDeadlineInput.value;

      if (!title || !description) return;

      await createPersonalTask({
        teamId: gameState.teamId,
        memberId: gameState.memberId,
        memberName: gameState.name,
        memberEmail: gameState.email,
        title,
        description,
        deadline,
        priority,
      });

      resetTaskForm();
      if (taskForm) taskForm.style.display = "none";
      bulletinBoard.closeCreateTask();

      if (window.cupboardModal?.isOpen) {
        await window.cupboardModal.open();
      }

      return;
    }

    if (mode === "planner-create") {
      await bulletinBoard.addTask(title, description, deadline, priority);

      resetTaskForm();
      if (taskForm) taskForm.style.display = "none";
      bulletinBoard.closeCreateTask();

      if (window.plannerTable) {
        await window.plannerTable.open();

        const plannerModal = document.getElementById("plannerModal");
        const plannerContent = document.getElementById("plannerModalContent");

        if (plannerModal) plannerModal.style.display = "flex";

        if (plannerContent) {
          plannerContent.classList.remove("popup-close-horizontal");
          plannerContent.classList.remove("popup-open-horizontal");
          void plannerContent.offsetWidth;
          plannerContent.classList.add("popup-open-horizontal");
        }
      }

      return;
    }


    if (mode === "cupboard-review") {
      const taskId = taskForm?.dataset.taskId;
      if (!taskId) return;

      await updateTaskById(taskId, {
        title,
        description,
        deadline,
        priority,
      });

      resetTaskForm();
      if (taskForm) {
        taskForm.style.display = "none";
        delete taskForm.dataset.taskId;
      }
      bulletinBoard.closeCreateTask();

      if (window.cupboardModal?.isOpen) {
        await window.cupboardModal.open();
      }

      return;
    }

    // =========================
    // UPDATE EXISTING TASK
    // =========================
    if (bulletinBoard.selectedTaskIndex >= 0) {
      await bulletinBoard.updateTask(
        bulletinBoard.selectedTaskIndex,
        title,
        description,
        deadline,
        priority
      );
    }

    // =========================
    // CREATE NEW TASK
    // =========================
    else {
      await bulletinBoard.addTask(title, description, deadline, priority);
    }

    resetTaskForm();
    if (taskForm) taskForm.style.display = "none";
    bulletinBoard.closeCreateTask();
    bulletinBoard.isOverlayOpen = false; // 🔥 CLOSE BOARD
  });
}

if (cancelTaskBtn) {
  cancelTaskBtn.addEventListener("click", async () => {
    const mode = taskForm?.dataset.mode || "create";

    resetTaskForm();
    if (taskForm) taskForm.style.display = "none";
    bulletinBoard.closeCreateTask();

    if (mode === "planner-create") {
      await plannerTable.open();

      const plannerModal = document.getElementById("plannerModal");
      const plannerContent = document.getElementById("plannerModalContent");

      if (plannerModal) plannerModal.style.display = "flex";

      if (plannerContent) {
        plannerContent.classList.remove("popup-close-horizontal");
        plannerContent.classList.remove("popup-open-horizontal");
        void plannerContent.offsetWidth;
        plannerContent.classList.add("popup-open-horizontal");
      }
    }
  });
}

if (deleteTaskBtn) {
  deleteTaskBtn.addEventListener("click", async () => {
    const mode = taskForm?.dataset.mode || "create";

    if (mode === "cupboard-review") {
      const taskId = taskForm?.dataset.taskId;
      if (taskId) {
        await deleteTaskById(taskId);
      }

      resetTaskForm();
      if (taskForm) {
        taskForm.style.display = "none";
        delete taskForm.dataset.taskId;
      }
      bulletinBoard.closeCreateTask();

      if (window.cupboardModal?.isOpen) {
        await window.cupboardModal.open();
      }

      return;
    }

    if (bulletinBoard.selectedTaskIndex >= 0) {
      await bulletinBoard.deleteTask(bulletinBoard.selectedTaskIndex);
    }

    resetTaskForm();
    if (taskForm) taskForm.style.display = "none";
    bulletinBoard.closeCreateTask();
  });
}

// ============================================================
// Context HUD TOP RIGHT
// ============================================================
function showContextHUD(title, description) {
  const hud = document.getElementById("contextHUD");
  const titleEl = document.getElementById("contextTitle");
  const textEl = document.getElementById("contextLabel");
  const hintEl = document.getElementById("contextHintKey");

  if (!hud || !titleEl || !textEl || !hintEl) return;

  titleEl.textContent = title;
  textEl.textContent = description;
  hintEl.textContent = "Press E";

  hud.style.display = "flex";
}

function hideContextHUD() {
  const hud = document.getElementById("contextHUD");
  if (hud) hud.style.display = "none";
}

// ============================================================
// TEAM ROSTER
// ============================================================
function getWhyNotMeReason(currentMember, suggestedMember) {
  if (!currentMember || !suggestedMember) {
    return "No recommendation data yet.";
  }

  if (currentMember.mood === 'overwhelmed') {
    return "Not recommended because you marked yourself overwhelmed.";
  }

  if (currentMember.mood === 'busy' && suggestedMember.mood !== 'busy') {
    return "Not recommended because you marked yourself busy.";
  }

  if ((currentMember.workload_count || 0) > (suggestedMember.workload_count || 0)) {
    return "Not recommended because your active workload is higher.";
  }

  if ((currentMember.xp || 0) > (suggestedMember.xp || 0)) {
    return "Not recommended because someone else has contributed less so far.";
  }

  if ((currentMember.completed_count || 0) > (suggestedMember.completed_count || 0)) {
    return "Not recommended because someone else has completed fewer tasks so far.";
  }

  return "Recommended person currently has a lighter load.";
}

function renderGuildFairnessContent(members, summary, list, moodButtons) {
  if (!members.length) {
    list.innerHTML = '<div class="guild-roster-empty">No guild members found.</div>';
    return;
  }

  members.sort((a, b) => {
    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
    return (b.completed_count || 0) - (a.completed_count || 0);
  });

  const totalWorkload = members.reduce((sum, m) => sum + (m.workload_count || 0), 0);
  const avgWorkload = members.length ? totalWorkload / members.length : 0;

  const availableMembers = members.filter(m => m.mood !== 'overwhelmed');
  const pool = availableMembers.length ? availableMembers : members;

  const suggested = pool.length
    ? [...pool].sort((a, b) => {
        if ((a.workload_count || 0) !== (b.workload_count || 0)) {
          return (a.workload_count || 0) - (b.workload_count || 0);
        }
        return (a.xp || 0) - (b.xp || 0);
      })[0]
    : null;

  window._suggestedMemberName = suggested?.member_name || "";
  window._suggestedMemberId = suggested?.id || "";

  const counts = members.map(m => m.workload_count || 0);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const spread = maxCount - minCount;

  const currentUserId = String(window.gameState.memberId);
  const currentMember = members.find(m => String(m.id) === currentUserId);
  const whyNotMeText =
    suggested && currentMember && String(currentMember.id) !== String(suggested.id)
      ? getWhyNotMeReason(currentMember, suggested)
      : '';

  if (spread >= 2) {
    const overwhelmedUser = members.find(m => m.mood === 'overwhelmed');

    if (overwhelmedUser) {
      summary.innerHTML = `
        <div>${overwhelmedUser.member_name} is overwhelmed. Workload should be redistributed.</div>
        ${
          whyNotMeText
            ? `<div class="guild-why-not-me">${whyNotMeText}</div>`
            : ''
        }
      `;
    } else {
      summary.innerHTML = suggested
        ? `
          <div>Workload is uneven right now. Suggested next: ${suggested.member_name}</div>
          ${
            whyNotMeText
              ? `<div class="guild-why-not-me">${whyNotMeText}</div>`
              : ''
          }
        `
        : `<div>No workload data yet.</div>`;
    }

    summary.className = 'guild-balance-uneven';
  } else {
    summary.innerHTML = `
      <div>Workload is balanced right now.</div>
      ${
        whyNotMeText
          ? `<div class="guild-why-not-me">${whyNotMeText}</div>`
          : ''
      }
    `;
    summary.className = 'guild-balance-balanced';
  }

  list.innerHTML = '';

  members.forEach((member, index) => {
    const card = document.createElement('div');

    const isCurrentUser =
      String(member.id) === String(window.gameState.memberId);

    const isSuggestedUser =
      suggested && String(member.id) === String(suggested.id);

    card.className = 'guild-roster-card';

    if (isCurrentUser) card.classList.add('guild-roster-self');
    if (isSuggestedUser) card.classList.add('guild-roster-suggested');
    if (member.mood === 'overwhelmed') card.classList.add('guild-roster-overwhelmed');

    let balanceLabel = 'BALANCED';
    let balanceClass = 'guild-balance-card-balanced';

    const diff = (member.workload_count || 0) - avgWorkload;

    if (member.mood === 'overwhelmed') {
      balanceLabel = 'NEEDS SUPPORT';
      balanceClass = 'guild-balance-card-overloaded';
    } else if (diff >= 2) {
      balanceLabel = member.mood === 'busy' ? 'BUSY • OVERLOADED' : 'OVERLOADED';
      balanceClass = 'guild-balance-card-overloaded';
    } else if (member.mood === 'busy') {
      balanceLabel = 'BUSY';
      balanceClass = 'guild-balance-card-balanced';
    } else if (diff <= -2) {
      balanceLabel = 'NEEDS HELP';
      balanceClass = 'guild-balance-card-needs-help';
    }

    card.innerHTML = `
      <div class="guild-roster-name">
        ${member.member_name}
        ${index === 0 ? '<span class="guild-top">(TOP CONTRIBUTOR)</span>' : ''}
        ${isCurrentUser ? '(YOU)' : ''}
        ${isSuggestedUser ? '(RECOMMENDED)' : ''}
      </div>
      <div class="guild-roster-meta">
        Class: ${member.character_class || 'Unassigned'} •
        Mood:
        <span class="guild-mood-${member.mood || 'fine'}">
          ${(member.mood || 'fine').toUpperCase()}
        </span>
      </div>
      <div class="guild-roster-stats">
        <span>XP: ${member.xp || 0}</span>
        <span>Active: ${member.workload_count || 0}</span>
        <span>Done: ${member.completed_count || 0}</span>
      </div>
      <div class="guild-roster-balance ${balanceClass}">${balanceLabel}</div>
    `;

    list.appendChild(card);
  });

  const currentMood = currentMember?.mood || 'fine';

  moodButtons.forEach(btn => {
    const isActive = btn.dataset.mood === currentMood;
    btn.classList.toggle('active', isActive);

    btn.onclick = async () => {
      try {
        await updateMemberMood(window.gameState.memberId, btn.dataset.mood);

        const refreshedMembers = await fetchTeamFairness(window.gameState.teamId);
        renderGuildFairnessContent(
          refreshedMembers,
          summary,
          list,
          moodButtons
        );
      } catch (err) {
        console.error('[mood] Failed to update mood:', err);
      }
    };
  });
}

function closeGuildFairnessTracker() {
  const popup = document.getElementById('guildRosterPopup');
  const content = document.getElementById('guildRosterContent');

  if (!popup || !content) return;

  content.classList.remove('popup-open-horizontal');
  content.classList.remove('popup-close-horizontal');
  void content.offsetWidth;
  content.classList.add('popup-close-horizontal');

  setTimeout(() => {
    popup.style.display = 'none';
    content.classList.remove('popup-close-horizontal');
  }, 180);
}

async function openGuildFairnessTracker(playAnimation = true) {
  const popup = document.getElementById('guildRosterPopup');
  const list = document.getElementById('guildRosterList');
  const summary = document.getElementById('guildBalanceSummary');
  const moodButtons = document.querySelectorAll('.guild-mood-btn');

  if (!popup || !list || !summary) return;

  popup.style.display = 'flex';

  const content = document.getElementById('guildRosterContent');
  if (content && playAnimation) {
    content.classList.remove('popup-close-horizontal');
    content.classList.remove('popup-open-horizontal');
    void content.offsetWidth;
    content.classList.add('popup-open-horizontal');
  }

  list.innerHTML = '<div class="guild-roster-empty">Loading fairness data...</div>';
  summary.textContent = '';
  summary.className = '';

  const teamId = window.gameState?.teamId;
  if (!teamId) {
    list.innerHTML = '<div class="guild-roster-empty">No team data found.</div>';
    return;
  }

  try {
    const members = await fetchTeamFairness(teamId);
    renderGuildFairnessContent(members, summary, list, moodButtons);
  } catch (err) {
    console.error('[fairness] Failed to load tracker:', err);
    list.innerHTML = '<div class="guild-roster-empty">Failed to load fairness tracker.</div>';
  }
}

// ============================================================
// COLLISION
// ============================================================
function rectangularCollision({ rectangle1, rectangle2 }) {
  return (
    rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
    rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
    rectangle1.position.y + rectangle1.height >= rectangle2.position.y &&
    rectangle1.position.y <= rectangle2.position.y + rectangle2.height
  );
}

function willCollide(nextX, nextY) {
  const pw = player.width  || 48;
  const ph = player.height || 48;
  const testPlayer = {
    position: {
      x: nextX + pw * 0.3,
      y: nextY + ph * 0.6,
    },
    width:  pw * 0.4,
    height: ph * 0.28,
  };

  for (let i = 0; i < boundaries.length; i++) {
    if (
      rectangularCollision({
        rectangle1: testPlayer,
        rectangle2: boundaries[i],
      })
    ) {
      return true;
    }
  }

  return false;
}

function willCollideWithTeammates(nextX, nextY) {
  // Hitbox covers the bottom half of the sprite (50–95%) so the player is
  // blocked at a natural distance from all sides, not just the top.
  const testPlayer = {
    position: {
      x: nextX + player.width * 0.2,
      y: nextY + player.height * 0.5,
    },
    width: player.width * 0.6,
    height: player.height * 0.45,
  };

  return Object.values(teamSprites).some(entry => {
    const sw = entry.sprite.width  || 48;
    const sh = entry.sprite.height || 48;
    const teammate = {
      position: {
        x: entry.x + sw * 0.2,
        y: entry.y + sh * 0.5,
      },
      width:  sw * 0.6,
      height: sh * 0.45,
    };
    return rectangularCollision({ rectangle1: testPlayer, rectangle2: teammate });
  });
}

function wouldBlock(nextX, nextY) {
  return willCollide(nextX, nextY) || willCollideWithTeammates(nextX, nextY);
}

// If the player is inside a collision area or a teammate, move them to the
// nearest free spot and save that position.
function unstickPlayer() {
  const startX = player.position.x;
  const startY = player.position.y;
  if (!wouldBlock(startX, startY)) return;

  const bg = getBackgroundBounds();
  const pw = player.width  || 48;
  const ph = player.height || 48;

  for (let radius = 4; radius <= 800; radius += 4) {
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * Math.PI * 2;
      const x = startX + Math.cos(angle) * radius;
      const y = startY + Math.sin(angle) * radius;

      const insideMap =
        x >= bg.x && x + pw <= bg.x + bg.width &&
        y >= bg.y && y + ph <= bg.y + bg.height;

      if (insideMap && !wouldBlock(x, y)) {
        player.position.x = x;
        player.position.y = y;
        playerPct = getPctFromWorldPosition(x, y);

        const gs = window.gameState;
        if (gs?.memberId && gs?.teamId) {
          upsertPosition(gs.memberId, gs.teamId, gs.character, playerPct.x, playerPct.y);
        }
        return;
      }
    }
  }
}

function clampPlayerToBackground() {
  if (!background) return;

  const bg = getBackgroundBounds();

  const hitboxOffsetX = player.width * 0.3;
  const hitboxOffsetY = player.height * 0.6;
  const hitboxWidth = player.width * 0.4;
  const hitboxHeight = player.height * 0.28;

  const minX = bg.x - hitboxOffsetX;
  const maxX = bg.x + bg.width - hitboxOffsetX - hitboxWidth;
  const minY = bg.y - hitboxOffsetY;
  const maxY = bg.y + bg.height - hitboxOffsetY - hitboxHeight;

  player.position.x = Math.max(minX, Math.min(maxX, player.position.x));
  player.position.y = Math.max(minY, Math.min(maxY, player.position.y));
}

// ============================================================
// MAIN LOOP
// ============================================================
function animate() {
  window.requestAnimationFrame(animate);

  c.fillStyle = "#1a0f05";
  c.fillRect(0, 0, canvas.width, canvas.height);

  if (background) background.draw();
  boundaries.forEach((boundary) => boundary.draw());

  bulletinBoard.update(player, mouse);
  plannerTable.update(player);

  bulletinBoard.drawWorld();
  plannerTable.drawWorld();

  player.animate = false;

if (!bulletinBoard.isOverlayOpen && !window.cupboardModal?.isOpen && !plannerTable.isPopupOpen) {
  let moved = false;

  if (keys.w.pressed && lastKey === "w") {
    player.animate = true;
    player.image = player.sprites.up;

    if (!wouldBlock(player.position.x, player.position.y - 3)) {
      player.position.y -= 3;
      moved = true;
    }
  } 
  else if (keys.a.pressed && lastKey === "a") {
    player.animate = true;
    player.image = player.sprites.left;

    if (!wouldBlock(player.position.x - 3, player.position.y)) {
      player.position.x -= 3;
      moved = true;
    }
  } 
  else if (keys.s.pressed && lastKey === "s") {
    player.animate = true;
    player.image = player.sprites.down;

    if (!wouldBlock(player.position.x, player.position.y + 3)) {
      player.position.y += 3;
      moved = true;
    }
  } 
  else if (keys.d.pressed && lastKey === "d") {
    player.animate = true;
    player.image = player.sprites.right;

    if (!wouldBlock(player.position.x + 3, player.position.y)) {
      player.position.x += 3;
      moved = true;
    }
  }

  clampPlayerToBackground();

  if (moved) {
    playerPct = getPctFromWorldPosition(
      player.position.x,
      player.position.y
    );
  }
}

  if (!bulletinBoard.isOverlayOpen && !window.cupboardModal?.isOpen && !plannerTable.isPopupOpen) {
    if (bulletinBoard.playerNear) {
      showContextHUD(
        "Task Board",
        "Post new pickup tasks or review open team tasks."
      );
    }
    else if (mainTableNear) {
      showContextHUD(
        "Fairness Tracker",
        "See everyone's workload balance and who should take the next task."
      );
    }
    else if (cupboardNear) {
      showContextHUD(
        "My Tasks",
        "View, edit, add and complete tasks already assigned to you."
      );
    }
    else if (plannerTable.playerNear) {
      showContextHUD(
        "Assignment Planner",
        "Auto-assign unclaimed tasks fairly across the team."
      );
    }
    else {
      hideContextHUD();
    }
  }

  // Throttled position sync — only while a movement key is held
  const _now = performance.now();
  if (
    window.gameState?.memberId &&
    _now - lastPositionUpdate >= 100 &&
    !bulletinBoard.isOverlayOpen &&
    (keys.w.pressed || keys.a.pressed || keys.s.pressed || keys.d.pressed)
  ) {
    lastPositionUpdate = _now;
    upsertPosition(
      window.gameState.memberId,
      window.gameState.teamId,
      window.gameState.character,
      playerPct.x,
      playerPct.y
    );
  }

  // Decorations (drawn behind player)
  const bg = getBackgroundBounds();
  c.drawImage(DecoAssets.torch01,  bg.x + bg.width * decoPcts.torch01.x,  bg.y + bg.height * decoPcts.torch01.y,  bg.width * decoPcts.torch01.w,  bg.height * decoPcts.torch01.h);
  c.drawImage(DecoAssets.torch02,  bg.x + bg.width * decoPcts.torch02.x,  bg.y + bg.height * decoPcts.torch02.y,  bg.width * decoPcts.torch02.w,  bg.height * decoPcts.torch02.h);
  c.drawImage(DecoAssets.banner, bg.x + bg.width * decoPcts.banner.x,   bg.y + bg.height * decoPcts.banner.y,   bg.width * decoPcts.banner.w,   bg.height * decoPcts.banner.h);
  c.drawImage(DecoAssets.skull2, bg.x + bg.width * decoPcts.skull2.x,   bg.y + bg.height * decoPcts.skull2.y,   bg.width * decoPcts.skull2.w,   bg.height * decoPcts.skull2.h);
  c.drawImage(DecoAssets.plant01,  bg.x + bg.width * decoPcts.plant01.x,  bg.y + bg.height * decoPcts.plant01.y,  bg.width * decoPcts.plant01.w,  bg.height * decoPcts.plant01.h);
  c.drawImage(DecoAssets.plant02,  bg.x + bg.width * decoPcts.plant02.x,  bg.y + bg.height * decoPcts.plant02.y,  bg.width * decoPcts.plant02.w,  bg.height * decoPcts.plant02.h);
  
  c.drawImage(DecoAssets.carpet,    bg.x + bg.width * decoPcts.carpet.x,    bg.y + bg.height * decoPcts.carpet.y,    bg.width * decoPcts.carpet.w,    bg.height * decoPcts.carpet.h);
  c.drawImage(DecoAssets.sofa,      bg.x + bg.width * decoPcts.sofa.x,      bg.y + bg.height * decoPcts.sofa.y,      bg.width * decoPcts.sofa.w,      bg.height * decoPcts.sofa.h);
  c.drawImage(DecoAssets.barrelMug, bg.x + bg.width * decoPcts.barrelMug.x, bg.y + bg.height * decoPcts.barrelMug.y, bg.width * decoPcts.barrelMug.w, bg.height * decoPcts.barrelMug.h);
  c.drawImage(DecoAssets.barrel03,  bg.x + bg.width * decoPcts.barrel03.x,  bg.y + bg.height * decoPcts.barrel03.y,  bg.width * decoPcts.barrel03.w,  bg.height * decoPcts.barrel03.h);
  c.drawImage(DecoAssets.barrel04, bg.x + bg.width * decoPcts.barrel04.x, bg.y + bg.height * decoPcts.barrel04.y, bg.width * decoPcts.barrel04.w, bg.height * decoPcts.barrel04.h);
  c.drawImage(DecoAssets.candlestick, bg.x + bg.width * decoPcts.candlestick.x, bg.y + bg.height * decoPcts.candlestick.y, bg.width * decoPcts.candlestick.w, bg.height * decoPcts.candlestick.h);
  c.drawImage(DecoAssets.bucket01, bg.x + bg.width * decoPcts.bucket01.x,   bg.y + bg.height * decoPcts.bucket01.y,   bg.width * decoPcts.bucket01.w,   bg.height * decoPcts.bucket01.h);
  c.drawImage(DecoAssets.bucket02, bg.x + bg.width * decoPcts.bucket02.x,   bg.y + bg.height * decoPcts.bucket02.y,   bg.width * decoPcts.bucket02.w,   bg.height * decoPcts.bucket02.h);
  
  // Background pass — full sprites so base elements sit behind the player
  c.drawImage(DecoAssets.barrel02, bg.x + bg.width * decoPcts.barrel02.x, bg.y + bg.height * decoPcts.barrel02.y, bg.width * decoPcts.barrel02.w, bg.height * decoPcts.barrel02.h);
  drawMainTableBackground();
  c.drawImage(DecoAssets.corpse, bg.x + bg.width * decoPcts.corpse.x, bg.y + bg.height * decoPcts.corpse.y, bg.width * decoPcts.corpse.w, bg.height * decoPcts.corpse.h);
  
  drawCupboardBackground();

  plannerTable.drawBackground();
  
  // Depth-sort player and teammates by feet Y so characters further south
  // (larger Y) render on top — correct top-down perspective from all sides.
  const depthChars = [];

  depthChars.push({
    isPlayer: true,
    sortY: player.position.y + (player.height || 48),
  });

  Object.entries(teamSprites).forEach(([id, entry]) => {
    const sh = entry.sprite.height || 48;
    depthChars.push({ isPlayer: false, id, entry, sortY: (entry.y || 0) + sh });
  });

  depthChars.sort((a, b) => a.sortY - b.sortY);

  depthChars.forEach(char => {
    if (char.isPlayer) {
      player.draw();
    } else {
      const { entry } = char;
      entry.sprite.opacity = 1.0;
      // Stop the walk animation shortly after the last position update
      if (entry.sprite.animate && performance.now() - (entry.lastMoveAt || 0) > 300) {
        entry.sprite.animate = false;
        entry.sprite.frames.val = 0;
      }
      entry.sprite.draw();
    }
  });

  if (DEBUG) {
    const hitbox = {
      x: player.position.x + player.width * 0.3,
      y: player.position.y + player.height * 0.6,
      w: player.width * 0.4,
      h: player.height * 0.28,
    };

    c.fillStyle = "rgba(0,255,0,0.4)";
    c.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);

    // Draw teammate hitboxes (mirrors willCollideWithTeammates formula)
    Object.values(teamSprites).forEach(entry => {
      const sw = entry.sprite.width  || 48;
      const sh = entry.sprite.height || 48;
      c.fillStyle = "rgba(255,165,0,0.4)";
      c.fillRect(entry.x + sw * 0.2, entry.y + sh * 0.5, sw * 0.6, sh * 0.45);
    });
  }

  // Foreground sprites — player walks behind these
  // sofa foreground — top 50% redrawn over the player
  const sofax = bg.x + bg.width * decoPcts.sofa.x;
  const sofay = bg.y + bg.height * decoPcts.sofa.y;
  const sofaw = bg.width * decoPcts.sofa.w;
  const sofah = bg.height * decoPcts.sofa.h;
  c.drawImage(DecoAssets.sofa, 0, 0, DecoAssets.sofa.naturalWidth, DecoAssets.sofa.naturalHeight * 0.5, sofax, sofay, sofaw, sofah * 0.5);

  // barrelMug foreground — top 50% redrawn over the player
  const bmugx = bg.x + bg.width * decoPcts.barrelMug.x;
  const bmugy = bg.y + bg.height * decoPcts.barrelMug.y;
  const bmugw = bg.width * decoPcts.barrelMug.w;
  const bmugh = bg.height * decoPcts.barrelMug.h;
  c.drawImage(DecoAssets.barrelMug, 0, 0, DecoAssets.barrelMug.naturalWidth, DecoAssets.barrelMug.naturalHeight * 0.5, bmugx, bmugy, bmugw, bmugh * 0.5);
  
  drawMainTableForeground();
  drawCupboardForeground();
  c.drawImage(DecoAssets.barrelSack, bg.x + bg.width * decoPcts.barrelSack.x, bg.y + bg.height * decoPcts.barrelSack.y, bg.width * decoPcts.barrelSack.w, bg.height * decoPcts.barrelSack.h);
  c.drawImage(DecoAssets.skull,      bg.x + bg.width * decoPcts.skull.x,      bg.y + bg.height * decoPcts.skull.y,      bg.width * decoPcts.skull.w,      bg.height * decoPcts.skull.h);
  c.drawImage(DecoAssets.barrel01, bg.x + bg.width * decoPcts.barrel01.x, bg.y + bg.height * decoPcts.barrel01.y, bg.width * decoPcts.barrel01.w, bg.height * decoPcts.barrel01.h);
  
  // barrel02 foreground — top 50% redrawn over the player
  const b02x = bg.x + bg.width * decoPcts.barrel02.x;
  const b02y = bg.y + bg.height * decoPcts.barrel02.y;
  const b02w = bg.width * decoPcts.barrel02.w;
  const b02h = bg.height * decoPcts.barrel02.h;
  const b02split = 0.5;
  c.drawImage(DecoAssets.barrel02, 0, 0, DecoAssets.barrel02.naturalWidth, DecoAssets.barrel02.naturalHeight * b02split, b02x, b02y, b02w, b02h * b02split);

  // torch01 foreground — top 50% redrawn over the player
  const t01x = bg.x + bg.width * decoPcts.torch01.x;
  const t01y = bg.y + bg.height * decoPcts.torch01.y;
  const t01w = bg.width * decoPcts.torch01.w;
  const t01h = bg.height * decoPcts.torch01.h;
  const t01split = 0.5;
  c.drawImage(DecoAssets.torch01, 0, 0, DecoAssets.torch01.naturalWidth, DecoAssets.torch01.naturalHeight * t01split, t01x, t01y, t01w, t01h * t01split);

  // torch02 foreground — top 50% redrawn over the player
  const t02x = bg.x + bg.width * decoPcts.torch02.x;
  const t02y = bg.y + bg.height * decoPcts.torch02.y;
  const t02w = bg.width * decoPcts.torch02.w;
  const t02h = bg.height * decoPcts.torch02.h;
  const t02split = 0.5;
  c.drawImage(DecoAssets.torch02, 0, 0, DecoAssets.torch02.naturalWidth, DecoAssets.torch02.naturalHeight * t02split, t02x, t02y, t02w, t02h * t02split);

  // corpse foreground — top 50% redrawn over the player
  const crpx = bg.x + bg.width * decoPcts.corpse.x;
  const crpy = bg.y + bg.height * decoPcts.corpse.y;
  const crpw = bg.width * decoPcts.corpse.w;
  const crph = bg.height * decoPcts.corpse.h;
  const crpsplit = 0.5;
  c.drawImage(DecoAssets.corpse, 0, 0, DecoAssets.corpse.naturalWidth, DecoAssets.corpse.naturalHeight * crpsplit, crpx, crpy, crpw, crph * crpsplit);
  

  plannerTable.drawForeground();

  // barrel03 foreground — top 50% redrawn over the player
  const b03x = bg.x + bg.width * decoPcts.barrel03.x;
  const b03y = bg.y + bg.height * decoPcts.barrel03.y;
  const b03w = bg.width * decoPcts.barrel03.w;
  const b03h = bg.height * decoPcts.barrel03.h;
  c.drawImage(DecoAssets.barrel03, 0, 0, DecoAssets.barrel03.naturalWidth, DecoAssets.barrel03.naturalHeight * 0.5, b03x, b03y, b03w, b03h * 0.5);

  // barrel04 foreground — top 50% redrawn over the player
  const b04x = bg.x + bg.width * decoPcts.barrel04.x;
  const b04y = bg.y + bg.height * decoPcts.barrel04.y;
  const b04w = bg.width * decoPcts.barrel04.w;
  const b04h = bg.height * decoPcts.barrel04.h;
  c.drawImage(DecoAssets.barrel04, 0, 0, DecoAssets.barrel04.naturalWidth, DecoAssets.barrel04.naturalHeight * 0.5, b04x, b04y, b04w, b04h * 0.5);

  // candlestick foreground — full sprite redrawn so player is always behind it
  const cndx = bg.x + bg.width * decoPcts.candlestick.x;
  const cndy = bg.y + bg.height * decoPcts.candlestick.y;
  const cndw = bg.width * decoPcts.candlestick.w;
  const cndh = bg.height * decoPcts.candlestick.h;
  c.drawImage(DecoAssets.candlestick, cndx, cndy, cndw, cndh);

  // Press E prompts — drawn after all foreground assets so they always appear on top
  bulletinBoard.drawPrompt();
  drawCupboardPrompt();

  // Name labels — drawn last so they always appear on top of everything
  c.save();
  c.font = '8px "Press Start 2P"';
  c.textAlign = 'center';
  if (window.gameState?.name) {
    const pw = player.width || 48;
    c.fillStyle = 'white';
    c.globalAlpha = 1.0;
    c.fillText(window.gameState.name, player.position.x + pw / 2, player.position.y - 6);
  }
  Object.values(teamSprites).forEach(entry => {
    const sw = entry.sprite.width || 48;
    c.fillStyle = 'white';
    c.globalAlpha = 0.8;
    c.fillText(entry.name, entry.x + sw / 2, entry.y - 6);
  });
  c.restore();

  bulletinBoard.drawOverlay();
  plannerTable.drawOverlay();
}

// ============================================================
// EVENTS
// ============================================================
let lastKey = "";

function overlaysVisible() {
  return ['overlay1', 'overlay2', 'overlay3'].some(
    id => document.getElementById(id)?.style.display !== 'none'
  );
}

window.addEventListener("keydown", async (e) => {
  if (overlaysVisible()) return;
  if (e.repeat) return;

  switch (e.key) {
    case "w":
      keys.w.pressed = true;
      lastKey = "w";
      break;
    case "a":
      keys.a.pressed = true;
      lastKey = "a";
      break;
    case "s":
      keys.s.pressed = true;
      lastKey = "s";
      break;
    case "d":
      keys.d.pressed = true;
      lastKey = "d";
      break;

    case "e":
      if (bulletinBoard.tryInteract(player)) break;

      if (!bulletinBoard.isOverlayOpen && mainTableNear &&
          document.getElementById('guildRosterPopup').style.display !== 'flex') {
        openGuildFairnessTracker();
        break;
      }

      if (!bulletinBoard.isOverlayOpen && cupboardNear && !window.cupboardModal?.isOpen) {
        window.cupboardModal.open();
        break;
      }

      if (!bulletinBoard.isOverlayOpen && !window.cupboardModal?.isOpen) {
        const opened = await plannerTable.tryInteract(player);
        if (opened) {
          const modal = document.getElementById("plannerModal");
          const content = document.getElementById("plannerModalContent");

          if (modal) modal.style.display = "flex";

          if (content) {
            content.classList.remove("popup-close-horizontal");
            content.classList.remove("popup-open-horizontal");
            void content.offsetWidth;
            content.classList.add("popup-open-horizontal");
          }

          break;
        }
      }
      break;

    case "Escape":
      bulletinBoard.isOverlayOpen = false;
      resetTaskForm();
      bulletinBoard.closeCreateTask();
      if (taskForm) taskForm.style.display = "none";
      closeGuildFairnessTracker();
      window.cupboardModal?.close();

      plannerTable.close();

      const plannerModal = document.getElementById("plannerModal");
      const plannerContent = document.getElementById("plannerModalContent");

      if (plannerModal && plannerContent) {
        plannerContent.classList.remove("popup-open-horizontal");
        plannerContent.classList.remove("popup-close-horizontal");
        void plannerContent.offsetWidth;
        plannerContent.classList.add("popup-close-horizontal");

        setTimeout(() => {
          plannerModal.style.display = "none";
          plannerContent.classList.remove("popup-close-horizontal");
        }, 180);
      }

      break;

    case "p":
      DEBUG = !DEBUG;
      break;
  }
});

window.addEventListener("keyup", (e) => {
  if (overlaysVisible()) return;
  switch (e.key) {
    case "w":
      keys.w.pressed = false;
      break;
    case "a":
      keys.a.pressed = false;
      break;
    case "s":
      keys.s.pressed = false;
      break;
    case "d":
      keys.d.pressed = false;
      break;
  }
});

canvas.addEventListener("click", (e) => {
  if (!bulletinBoard.isOverlayOpen) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

  if (bulletinBoard.tryCloseCreateTask(mouseX, mouseY)) {
    return;
  }

  if (bulletinBoard.tryClose(mouseX, mouseY)) {
    resetTaskForm();
    if (taskForm) taskForm.style.display = "none";
    return;
  }

  if (bulletinBoard.tryOpenExistingTask(mouseX, mouseY)) {
    return;
  }

  if (bulletinBoard.tryOpenCreateTask(mouseX, mouseY)) {
    return;
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    if (!bulletinBoard.isOverlayOpen) return;

    e.preventDefault();
    bulletinBoard.scrollTasks(e.deltaY);
  },
  { passive: false }
);

document.getElementById('guildRosterClose').addEventListener('click', () => {
  closeGuildFairnessTracker();
});

// ============================================================
// PLANNER EVENTS
// ============================================================
document.getElementById("plannerAcceptAll")?.addEventListener("click", async () => {
  await plannerTable.acceptAllDraftAssignments();
});

document.getElementById("plannerDeclineAll")?.addEventListener("click", () => {
  plannerTable.declineAllDraftAssignments();
});

document.getElementById("plannerAutoAssignAll")?.addEventListener("click", async () => {
  await plannerTable.autoAssignAll();
});

document.getElementById("plannerClose")?.addEventListener("click", () => {
  plannerTable.close();

  const plannerModal = document.getElementById("plannerModal");
  const plannerContent = document.getElementById("plannerModalContent");

  if (!plannerModal || !plannerContent) return;

  plannerContent.classList.remove("popup-open-horizontal");
  plannerContent.classList.remove("popup-close-horizontal");
  void plannerContent.offsetWidth;
  plannerContent.classList.add("popup-close-horizontal");

  setTimeout(() => {
    plannerModal.style.display = "none";
    plannerContent.classList.remove("popup-close-horizontal");
  }, 180);
});

document.getElementById("plannerCreateTask")?.addEventListener("click", () => {
  bulletinBoard.selectedTaskIndex = -1;
  bulletinBoard.isCreateTaskOpen = true;
  bulletinBoard.updateCreateTaskLayout();

  const form = document.getElementById("taskForm");
  const titleInput = document.getElementById("taskTitleInput");
  const descInput = document.getElementById("taskDescInput");
  const deadlineInput = document.getElementById("taskDeadlineInput");
  const priorityInput = document.getElementById("taskPriorityInput");
  const formTitle = document.getElementById("taskFormTitle");
  const submitBtn = document.getElementById("submitTaskBtn");
  const deleteBtn = document.getElementById("deleteTaskBtn");
  const createdByText = document.getElementById("taskCreatedBy");

  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";
  if (deadlineInput) deadlineInput.value = "";
  if (priorityInput) priorityInput.value = "MED";

  taskPriorityTouched = false;
  syncPriorityFromDeadline();

  if (formTitle) formTitle.textContent = "Create Unassigned Task";
  if (submitBtn) {
    submitBtn.textContent = "Submit";
    submitBtn.style.display = "block";
  }
  if (deleteBtn) deleteBtn.style.display = "none";
  if (createdByText) {
    createdByText.textContent = "";
    createdByText.style.display = "none";
  }

  if (form) {
    form.dataset.mode = "planner-create";
    form.style.display = "flex";
    bulletinBoard.positionTaskForm();
  }
});
// ============================================================
// AUDIO
// ============================================================
let clicked = false;
addEventListener("click", () => {
  if (!clicked) {
    audio.Map.play();
    clicked = true;
  }
});