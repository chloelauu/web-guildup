const SUPABASE_URL = 'https://dcukjgnlgzarivrinhry.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdWtqZ25sZ3phcml2cmluaHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDEyOTIsImV4cCI6MjA5MjE3NzI5Mn0.PSPdS43AMSmRUYL2yYgIlGGHycyTiJ_5Pq7lfVY3suk';

const _sbReadHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};
const _sbWriteHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ============================================================
// checkLogin(memberName, teamName)
// Checks if a member exists in a team by name.
// Returns:
//   { exists: true,  member, team }               — both found
//   { exists: false, teamExists: true,  teamId }   — team found, member not in it
//   { exists: false, teamExists: false }            — neither found
// ============================================================
async function checkLogin(memberName, teamName) {
  const teamUrl = `${SUPABASE_URL}/rest/v1/teams?team_name=ilike.${encodeURIComponent(teamName)}&select=*`;
  console.log('[supabase] GET', teamUrl);
  const teamRes = await fetch(teamUrl, { headers: _sbReadHeaders });
  const teams = await teamRes.json();

  console.log('[supabase] teams response:', teams);
  if (!Array.isArray(teams) || teams.length === 0) {
    const result = { exists: false, teamExists: false };
    console.log('[supabase] checkLogin result:', result);
    return result;
  }

  const team = teams[0];
  console.log('[supabase] team found:', team);

  const memberUrl = `${SUPABASE_URL}/rest/v1/members?member_name=ilike.${encodeURIComponent(memberName)}&team_id=eq.${team.id}&select=*`;
  console.log('[supabase] GET', memberUrl);
  const memberRes = await fetch(memberUrl, { headers: _sbReadHeaders });
  const members = await memberRes.json();
  console.log('[supabase] members response:', members);

  if (!Array.isArray(members) || members.length === 0) {
    const result = { exists: false, teamExists: true, teamId: team.id };
    console.log('[supabase] checkLogin result:', result);
    return result;
  }

  const result = { exists: true, member: members[0], team };
  console.log('[supabase] checkLogin result:', result);
  return result;
}

// ============================================================
// createTeam(teamName)
// Inserts a new row into the teams table.
// Returns the created team object (including id).
// ============================================================
async function createTeam(teamName) {
  const teamUrl = `${SUPABASE_URL}/rest/v1/teams`;
  const teamBody = JSON.stringify({ team_name: teamName });
  console.log('[supabase] POST', teamUrl, teamBody);
  const res = await fetch(teamUrl, {
    method: 'POST',
    headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
    body: teamBody,
  });
  const data = await res.json();
  return data[0];
}

// ============================================================
// createMember(memberName, teamId, teammates)
// Inserts the main member into the members table.
// If teammates array is not empty, inserts each as a member
// with the same team_id and null character_class.
// Returns the created member object.
// ============================================================
async function createMember(memberName, email, teamId, teammates) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
    method: 'POST',
    headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      member_name: memberName,
      email: email,
      team_id: teamId
    }),
  });

  const data = await res.json();
  const member = data[0];

  if (teammates && teammates.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/members`, {
      method: 'POST',
      headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(
        teammates.map(name => ({
          member_name: name,
          team_id: teamId,
          character_class: null,
        }))
      ),
    });
  }

  return member;
}

// ============================================================
// updateCharacterClass(memberId, characterClass)
// Updates the character_class column for the given member.
// Returns the updated member object.
// ============================================================
async function updateCharacterClass(memberId, characterClass) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`,
    {
      method: 'PATCH',
      headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ character_class: characterClass }),
    }
  );
  const data = await res.json();
  return data[0];
}

async function updateMemberEmail(memberId, email) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`,
    {
      method: 'PATCH',
      headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ email: email }),
    }
  );

  const data = await res.json();
  console.log('[supabase] updateMemberEmail response:', data);

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to update member email');
  }

  return data[0];
}

// ============================================================
// upsertPosition(memberId, teamId, characterClass, x, y)
// Insert or update a player's position in the positions table.
// member_name is intentionally omitted — names are read from the members table.
// ============================================================
async function upsertPosition(memberId, teamId, characterClass, x, y) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/positions?on_conflict=member_id`, {
    method: 'POST',
    headers: { ..._sbWriteHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      member_id: memberId,
      team_id: teamId,
      character_class: characterClass,
      x,
      y,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[supabase] upsertPosition failed:', res.status, err);
  }
}

// ============================================================
// getTeamPositions(teamId)
// Fetch all current positions for a team.
// ============================================================
async function getTeamPositions(teamId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/positions?team_id=eq.${teamId}&select=*`,
    { headers: _sbReadHeaders }
  );
  if (!res.ok) return [];
  return await res.json();
}

// ============================================================
// subscribeToPositions(teamId, onUpdate)
// Subscribe to Supabase Realtime changes on the positions table.
// Calls onUpdate(row) on INSERT or UPDATE events for the given team.
// ============================================================
function subscribeToPositions(teamId, onUpdate) {
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') +
    `/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
  const ws = new WebSocket(wsUrl);
  let ref = 0;
  let heartbeatInterval;

  function send(msg) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  ws.addEventListener('open', () => {
    ref++;
    send({
      topic: 'realtime:public:positions',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: '' },
          postgres_changes: [{
            event: '*',
            schema: 'public',
            table: 'positions',
            filter: `team_id=eq.${teamId}`,
          }],
        },
        access_token: SUPABASE_KEY,
      },
      ref: String(ref),
      join_ref: String(ref),
    });

    heartbeatInterval = setInterval(() => {
      ref++;
      send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(ref) });
    }, 30000);
  });

  ws.addEventListener('message', (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.event === 'postgres_changes' && msg.payload?.data) {
      const { type, record: row } = msg.payload.data;
      if ((type === 'INSERT' || type === 'UPDATE') && row) {
        onUpdate(row);
      }
    }
  });

  ws.addEventListener('close', () => {
    clearInterval(heartbeatInterval);
    console.log('[supabase] Realtime disconnected');
  });

  ws.addEventListener('error', (err) => {
    console.error('[supabase] Realtime error:', err);
  });

  return ws;
}

// ============================================================
// TASK HELPERS (Bulletin Board)
// ============================================================
async function fetchTasksByTeam(teamId) {
  const url =
    `${SUPABASE_URL}/rest/v1/tasks?team_id=eq.${teamId}&task_type=eq.pickup&status=eq.open&select=*&order=created_at.desc`;
  const res = await fetch(url, { headers: _sbReadHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function createTask({
  teamId,
  memberId,
  memberName,
  memberEmail,
  title,
  description,
  imageIndex,
  deadline,
  priority
}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: { ..._sbWriteHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      team_id: teamId,
      created_by_member_id: memberId,
      created_by_name: memberName,
      created_by_email: memberEmail,
      title,
      description,
      image_index: imageIndex,
      deadline: deadline,
      priority: priority || 'MED',
      task_type: 'pickup',
      status: 'open',
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to create task');
  }

  return data[0];
}

async function acceptTaskById(taskId, memberId, memberName, memberEmail) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { ..._sbWriteHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      accepted_by_member_id: memberId,
      accepted_by_name: memberName,
      accepted_by_email: memberEmail,
      accepted_at: new Date().toISOString(),
      status: 'in_progress',
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to accept task');
  }

  return data[0];
}

async function updateTaskById(taskId, updates) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { ..._sbWriteHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  return data[0];
}

async function deleteTaskById(taskId) {
  await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'DELETE',
    headers: _sbWriteHeaders,
  });
}

// ============================================================
// CUPBOARD HELPERS
// ============================================================
async function fetchCupboardTasks(memberId) {
  const url =
    `${SUPABASE_URL}/rest/v1/tasks?or=(and(task_type.eq.pickup,accepted_by_member_id.eq.${memberId},status.eq.in_progress),and(task_type.eq.personal,created_by_member_id.eq.${memberId},status.eq.in_progress))&select=*&order=created_at.desc`;

  const res = await fetch(url, { headers: _sbReadHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchTeamMemberClasses(teamId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?team_id=eq.${teamId}&select=id,character_class`,
    { headers: _sbReadHeaders }
  );
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  if (Array.isArray(data)) data.forEach(m => { map[m.id] = m.character_class; });
  return map;
}

async function fetchTeamMemberNames(teamId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?team_id=eq.${teamId}&select=id,member_name`,
    { headers: _sbReadHeaders }
  );
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  if (Array.isArray(data)) data.forEach(m => { map[m.id] = m.member_name; });
  return map;
}

async function incrementMemberXP(memberId, amount) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}&select=xp`,
    { headers: _sbReadHeaders }
  );
  const data = await res.json();
  const currentXP = (Array.isArray(data) && data[0]?.xp) ? data[0].xp : 0;

  await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`, {
    method: 'PATCH',
    headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({ xp: currentXP + amount }),
  });
}

async function createPersonalTask({
  teamId,
  memberId,
  memberName,
  memberEmail,
  title,
  description,
  deadline,
  priority
}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: { ..._sbWriteHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      team_id: teamId,
      created_by_member_id: memberId,
      created_by_name: memberName,
      created_by_email: memberEmail,
      title,
      description,
      deadline: deadline,
      priority: priority || 'MED',
      task_type: 'personal',
      status: 'in_progress',
      accepted_by_member_id: memberId,
      accepted_by_name: memberName,
      accepted_by_email: memberEmail,
      accepted_at: new Date().toISOString(),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to create personal task');
  }

  return data[0];
}

async function fetchTeamFairness(teamId) {
  const [membersRes, tasksRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/members?team_id=eq.${teamId}&select=id,member_name,xp,character_class,mood`,
      { headers: _sbReadHeaders }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/tasks?team_id=eq.${teamId}&or=(status.eq.in_progress,status.eq.completed)&select=id,task_type,created_by_member_id,accepted_by_member_id,status`,
      { headers: _sbReadHeaders }
    ),
  ]);

  const members = await membersRes.json();
  const tasks = await tasksRes.json();

  if (!Array.isArray(members)) return [];

  const workloadCountMap = {};
  const completedCountMap = {};

  if (Array.isArray(tasks)) {
    tasks.forEach(task => {
      const ownerId =
        task.task_type === 'pickup'
          ? task.accepted_by_member_id
          : task.created_by_member_id;

      if (!ownerId) return;

      if (task.status === 'in_progress') {
        workloadCountMap[ownerId] = (workloadCountMap[ownerId] || 0) + 1;
      }

      if (task.status === 'completed') {
        completedCountMap[ownerId] = (completedCountMap[ownerId] || 0) + 1;
      }
    });
  }

  return members.map(member => ({
    id: member.id,
    member_name: member.member_name || 'Unknown',
    xp: member.xp || 0,
    workload_count: workloadCountMap[member.id] || 0,
    completed_count: completedCountMap[member.id] || 0,
    character_class: member.character_class || '',
    mood: member.mood || 'fine',
  }));
}

async function fetchPlannerUnassignedTasks(teamId) {
  const url =
    `${SUPABASE_URL}/rest/v1/tasks?team_id=eq.${teamId}&task_type=eq.pickup&status=eq.open&select=*&order=created_at.desc`;
  const res = await fetch(url, { headers: _sbReadHeaders });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function updateMemberMood(memberId, mood) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`,
    {
      method: 'PATCH',
      headers: { ..._sbWriteHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ mood }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to update member mood');
  }

  return data[0];
}

// Original version, kept for reference. The address of the email function
// is removed from the public repo.
// const SEND_EMAIL_URL = "[removed]";
//
// async function sendTaskAcceptedEmail(task) {
//   try {
//     const res = await fetch(SEND_EMAIL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         ownerName: task.created_by_name,
//         ownerEmail: task.created_by_email,
//         accepterName: task.accepted_by_name,
//         accepterEmail: task.accepted_by_email,
//         taskTitle: task.title,
//         taskDescription: task.description,
//         deadline: task.deadline,
//       }),
//     });
//     const data = await res.json();
//     console.log("[email] sendTaskAcceptedEmail response:", data);
//   } catch (err) {
//     console.error("[email] sendTaskAcceptedEmail failed:", err);
//   }
// }

// Email notifications are switched off in the public demo.
async function sendTaskAcceptedEmail(task) {
  console.log("[email] notifications are switched off in this demo");
}