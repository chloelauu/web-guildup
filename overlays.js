// ============================================================
// GAME STATE
// ============================================================
const gameState = {
  name: '',
  email: '',
  teamName: '',
  teammates: [],
  character: '',
  tint: null,
  memberId: null,
  teamId: null,
};
window.gameState = gameState;

// ============================================================
// CHARACTER DEFINITIONS
// ============================================================
const characters = [
  {
    name: 'Warrior',
    description: 'The backbone of any guild.\nSturdy, reliable, and\nunbreakable under pressure.',
    tint: 'rgba(220, 60, 60, 0.55)',
  },
  {
    name: 'Mage',
    description: 'Master of arcane arts.\nFragile but devastatingly\npowerful from a distance.',
    tint: 'rgba(60, 100, 220, 0.55)',
  },
  {
    name: 'Healer',
    description: 'Keeps the team standing.\nWithout them, no quest\nends in victory.',
    tint: 'rgba(60, 200, 80, 0.55)',
  },
  {
    name: 'Rogue',
    description: 'Swift and shadowy.\nStrikes before the enemy\neven knows they\'re there.',
    tint: 'rgba(220, 200, 40, 0.55)',
  },
];

// ============================================================
// CHEAT CODE — press ` (backtick) to skip all overlays [DEV ONLY]
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key !== '`') return;
  gameState.name      = 'DevTest';
  gameState.teamName  = 'DevTeam';
  gameState.teammates = [];
  gameState.character = 'Warrior';
  gameState.tint      = characters[0].tint;
  ['overlay1', 'overlay2', 'overlay3'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );
  player.tint = characters[0].tint;
  console.log('[DEV] Cheat code activated! gameState:', {
    memberName: gameState.name,
    teamName: gameState.teamName,
    characterClass: gameState.character,
  });
  onGameStart();
});

async function syncBulletinBoardUser() {
  if (!window.bulletinBoard) return;
  if (!gameState.memberId || !gameState.teamId) return;

  try {
    await bulletinBoard.syncUser(
      gameState.memberId,
      gameState.teamId,
      gameState.name
    );
  } catch (err) {
    console.error("Failed to sync bulletin board user:", err);
  }
}

// ============================================================
// SPRITE PREVIEW — draws first frame of playerDownImage tinted
// ============================================================
function drawTintedPreview(canvas, tint) {
  const size = 72;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function render() {
    ctx.clearRect(0, 0, size, size);
    const fw = playerDownImage.width / 4;
    const fh = playerDownImage.height;
    const scale = Math.min(size / fw, size / fh) * 0.85;
    const dx = (size - fw * scale) / 2;
    const dy = (size - fh * scale) / 2;
    ctx.drawImage(playerDownImage, 0, 0, fw, fh, dx, dy, fw * scale, fh * scale);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (playerDownImage.complete && playerDownImage.naturalWidth > 0) {
    render();
  } else {
    playerDownImage.addEventListener('load', render, { once: true });
  }
}

// ============================================================
// LOADING STATE HELPER
// ============================================================
function setLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.5' : '1';
  btn.style.cursor  = loading ? 'wait'    : 'pointer';
}

// ============================================================
// OVERLAY 1 — LOGIN
// ============================================================

// Character counter
function attachCharCounter(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const maxLen = 20;
  input.maxLength = maxLen;

  const counter = document.createElement('span');
  counter.className = 'char-counter';
  counter.textContent = `0 / ${maxLen}`;
  counter.style.display = 'none';
  input.insertAdjacentElement('afterend', counter);

  input.addEventListener('input', () => {
    counter.style.display = 'block';
    const len = input.value.length;
    counter.textContent = `${len} / ${maxLen}`;
    counter.classList.toggle('char-counter-full', len >= maxLen);
  });
}

attachCharCounter('member-name');
attachCharCounter('team-name-input');

const loginError = document.createElement('span');
loginError.className = 'max-length-warning';
document.querySelector('#overlay1 .overlay-panel').appendChild(loginError);

function showLoginError(inputId, message) {
  const input = document.getElementById(inputId);
  input.classList.add('input-maxed');
  loginError.textContent = message;
  loginError.style.display = 'block';
}

function clearLoginError(inputId) {
  document.getElementById(inputId).classList.remove('input-maxed');
  loginError.style.display = 'none';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let loginPrefillRequestId = 0;

async function tryPrefillExistingEmail() {
  const nameInput = document.getElementById('member-name');
  const emailInput = document.getElementById('member-email');
  const teamInput = document.getElementById('team-name-input');

  if (!nameInput || !emailInput || !teamInput) return;

  const name = nameInput.value.trim();
  const teamName = teamInput.value.trim();

  // not enough info to look up yet
  if (!name || !teamName) return;

  const requestId = ++loginPrefillRequestId;

  try {
    const result = await checkLogin(name, teamName);

    // ignore stale responses
    if (requestId !== loginPrefillRequestId) return;

    if (result.exists && result.member && result.member.email) {
      // only autofill when user has not already typed a different email
      if (!emailInput.value.trim()) {
        emailInput.value = result.member.email;
      }

      gameState.memberId = result.member.id;
      gameState.teamId = result.team.id;
      gameState.email = result.member.email;
    }
  } catch (err) {
    console.error('Prefill email lookup failed:', err);
  }
}

document.getElementById('member-name').addEventListener('input', () => clearLoginError('member-name'));
document.getElementById('team-name-input').addEventListener('input', () => clearLoginError('team-name-input'));
document.getElementById('member-email').addEventListener('input', () => clearLoginError('member-email'));
document.getElementById('member-name').addEventListener('blur', tryPrefillExistingEmail);
document.getElementById('team-name-input').addEventListener('blur', tryPrefillExistingEmail);

document.getElementById('login-submit').addEventListener('click', async () => {
  const nameInput = document.getElementById('member-name');
  const emailInput = document.getElementById('member-email');
  const teamInput = document.getElementById('team-name-input');

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const teamName = teamInput.value.trim();

  if (!name) {
    showLoginError('member-name', 'Your name is required, adventurer.');
    return;
  }

  if (name.length > 20) {
    showLoginError('member-name', 'Name too long, keep it under 20 characters');
    return;
  }

  if (email && !isValidEmail(email)) {
    showLoginError('member-email', 'Enter a valid email address.');
    return;
  }

  if (!teamName) {
    showLoginError('team-name-input', 'Your guild needs a name!');
    return;
  }

  if (teamName.length > 20) {
    showLoginError('team-name-input', 'Name too long, keep it under 20 characters');
    return;
  }

  gameState.name = name;
  gameState.email = email;
  gameState.teamName = teamName;

  setLoading('login-submit', true);

  try {
    const result = await checkLogin(name, teamName);

    // =========================
    // EXISTING USER
    // =========================
    if (result.exists) {
      gameState.memberId = result.member.id;
      gameState.teamId = result.team.id;
      gameState.name = result.member.member_name;
      gameState.xp   = result.member.xp || 0;

      if (!result.member.email) {
        if (!email) {
          showLoginError('member-email', 'Email is required to enable reminders.');
          return;
        }

        const updatedMember = await updateMemberEmail(result.member.id, email);
        gameState.email = updatedMember.email || email;
      } else {
        // allow existing user to overwrite old email before entering
        if (email && email !== result.member.email) {
          const updatedMember = await updateMemberEmail(result.member.id, email);
          gameState.email = updatedMember.email || email;
        } else {
          gameState.email = result.member.email;
        }
      }

      if (emailInput && gameState.email) {
        emailInput.value = gameState.email;
      }

      if (!result.member.character_class) {
        document.getElementById('overlay1').style.display = 'none';
        document.getElementById('char-greeting').textContent =
          `Hi ${gameState.name}, choose your class`;
        renderCharacterOptions();
        document.getElementById('overlay3').style.display = 'flex';
      } else {
        gameState.character = result.member.character_class;
        const savedChar = characters.find(c => c.name === gameState.character);
        gameState.tint = savedChar ? savedChar.tint : null;

        ['overlay1', 'overlay2', 'overlay3'].forEach(id =>
          document.getElementById(id).style.display = 'none'
        );

        if (gameState.tint) player.tint = gameState.tint;

        await syncBulletinBoardUser();
        console.log('Game started! gameState:', gameState);
        onGameStart();
      }
    }

    // =========================
    // TEAM EXISTS, NEW MEMBER
    // =========================
    else if (result.teamExists) {
      if (!email) {
        showLoginError('member-email', 'Email is required for new users.');
        return;
      }

      gameState.teamId = result.teamId;

      document.getElementById('overlay1').style.display = 'none';
      document.getElementById('char-greeting').textContent =
        `Hi ${gameState.name}, choose your class`;
      renderCharacterOptions();
      document.getElementById('overlay3').style.display = 'flex';
    }

    // =========================
    // BRAND NEW TEAM
    // =========================
    else {
      if (!email) {
        showLoginError('member-email', 'Email is required for new users.');
        return;
      }

      document.getElementById('guild-nameplate').textContent = gameState.teamName;
      document.getElementById('overlay1').style.display = 'none';
      document.getElementById('overlay2').style.display = 'flex';
    }

  } catch (err) {
    console.error('Login check failed:', err);
    loginError.textContent = 'Connection failed. Please try again.';
    loginError.style.display = 'block';
  } finally {
    setLoading('login-submit', false);
  }
});

// ============================================================
// OVERLAY 2 — TEAM CREATION
// ============================================================
const teammateNames = [];

document.getElementById('add-teammate').addEventListener('click', addTeammate);
document.getElementById('teammate-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTeammate();
});

const avatarColors = ['#e05252', '#6080e0', '#50c860', '#c8c040', '#c060c0', '#50b8c0'];

function addTeammate() {
  const input = document.getElementById('teammate-input');
  const name = input.value.trim();
  if (!name) return;
  teammateNames.push(name);
  const color = avatarColors[(teammateNames.length - 1) % avatarColors.length];
  input.value = '';

  const li = document.createElement('li');
  li.className = 'member-card';

  const avatar = document.createElement('div');
  avatar.className = 'member-avatar';
  avatar.style.background = color;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'member-name';
  nameSpan.textContent = name;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'member-remove';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    const idx = teammateNames.indexOf(name);
    if (idx !== -1) teammateNames.splice(idx, 1);
    li.remove();
  });

  li.appendChild(avatar);
  li.appendChild(nameSpan);
  li.appendChild(removeBtn);
  document.getElementById('teammate-list').appendChild(li);
}

async function proceedToCharSelect() {
  gameState.teamName  = document.getElementById('guild-nameplate').textContent || gameState.teamName;
  gameState.teammates = [...teammateNames];

  setLoading('skip-team',   true);
  setLoading('create-team', true);
  try {
    // Create team only if not already found via checkLogin
    if (!gameState.teamId) {
      const team = await createTeam(gameState.teamName);
      gameState.teamId = team.id;
    }

    const member = await createMember(
      gameState.name,
      gameState.email,
      gameState.teamId,
      gameState.teammates
    );
    gameState.memberId = member.id;

    document.getElementById('overlay2').style.display = 'none';
    document.getElementById('overlay3').style.display = 'flex';
    document.getElementById('char-greeting').textContent = `Hi ${gameState.name}, choose your class`;
    renderCharacterOptions();
  } catch (err) {
    console.error('Team/member creation failed:', err);
  } finally {
    setLoading('skip-team',   false);
    setLoading('create-team', false);
  }
}

document.getElementById('skip-team').addEventListener('click', proceedToCharSelect);
document.getElementById('create-team').addEventListener('click', proceedToCharSelect);

// ============================================================
// OVERLAY 3 — CHARACTER SELECTION
// ============================================================
function renderCharacterOptions() {
  const container = document.getElementById('character-options');
  container.innerHTML = '';

  characters.forEach((char, i) => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.innerHTML = `
      <canvas class="char-preview"></canvas>
      <div class="char-name">${char.name}</div>
      <div class="char-desc">${char.description.replace(/\n/g, '<br>')}</div>
      <button class="rpg-btn select-btn" onclick="selectCharacter(${i})">SELECT</button>
    `;
    container.appendChild(card);
    drawTintedPreview(card.querySelector('.char-preview'), char.tint);
  });
}

async function selectCharacter(i) {
  const chosen = characters[i];
  gameState.character = chosen.name;
  gameState.tint      = chosen.tint;

  try {
    if (!gameState.memberId) {
      const member = await createMember(gameState.name, gameState.email, gameState.teamId, []);
      gameState.memberId = member.id;
    }
    await updateCharacterClass(gameState.memberId, chosen.name);
  } catch (err) {
    console.error('Failed to save character:', err);
  }

  ['overlay1', 'overlay2', 'overlay3'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );

  player.tint = chosen.tint;
  await syncBulletinBoardUser();
  console.log('Game started! gameState:', gameState);
  onGameStart();
}
