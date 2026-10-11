// AUTHORS: CHLOE & CELESTE

// Address of the AI backend (server.js). Leave empty to switch the AI features
// off, which is how the public demo runs. For local use: "http://localhost:3001"
const AI_SERVER_URL = "";

class PlannerTable {
  constructor({
    worldX,
    worldY,
    width,
    height,
    imageSrc,
    interactKey = "e",
    interactDistance = 90,
  }) {
    this.position = { x: worldX, y: worldY };
    this.width = width;
    this.height = height;

    this.image = new Image();
    this.image.src = imageSrc;

    this.interactKey = interactKey;
    this.interactDistance = interactDistance;

    this.playerNear = false;
    this.isPopupOpen = false;

    this.assignmentDraft = [];
    this.draftMode = false;
    this.cachedMembers = [];
    this.cachedTasks = [];

    this.pressE = {
      width: 104,
      height: 26,
      offsetY: -55,
    };

    this.popup = {
      width: 720,
      height: 430,
    };
  }

  update(player) {
    this.playerNear = this.isPlayerNear(player);
  }

  drawWorld() {
    if (!this.image.complete) return;

    c.save();

    if (DEBUG) {
      c.strokeStyle = "cyan";
      c.lineWidth = 2;
      c.strokeRect(this.position.x, this.position.y, this.width, this.height);
    }

    if (this.playerNear && !this.isPopupOpen && !bulletinBoard.isOverlayOpen && !window.cupboardModal?.isOpen) {
      const px = this.position.x + this.width / 2 - this.pressE.width / 2;
      const py = this.position.y - this.pressE.height - this.pressE.offsetY;

      c.fillStyle = "rgba(22, 13, 9, 0.86)";
      c.fillRect(px, py, this.pressE.width, this.pressE.height);

      c.strokeStyle = "#c9ad7a";
      c.lineWidth = 2;
      c.strokeRect(px + 1, py + 1, this.pressE.width - 2, this.pressE.height - 2);

      c.fillStyle = "#f4e6c8";
      c.font = "10px 'Press Start 2P'";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("PRESS E", px + this.pressE.width / 2, py + this.pressE.height / 2 + 1);
    }

    c.restore();
    c.textAlign = "start";
    c.textBaseline = "alphabetic";
  }

  drawOverlay() {
    if (!this.isPopupOpen) return;

    c.save();
    c.fillStyle = "rgba(0, 0, 0, 0.75)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();
  }

  drawBackground() {
    if (!this.image.complete) return;

    c.save();
    c.imageSmoothingEnabled = false;

    // draw full sprite behind player
    c.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    c.restore();
  }

  drawForeground() {
    if (!this.image.complete) return;

    c.save();
    c.imageSmoothingEnabled = false;

    // top portion redraws over the player
    const split = 0.50; // adjust this
    const srcH = this.image.naturalHeight * split;
    const dstH = this.height * split;

    c.drawImage(
      this.image,
      0, 0, this.image.naturalWidth, srcH,
      this.position.x, this.position.y, this.width, dstH
    );

    c.restore();
  }

  isPlayerNear(player) {
    const playerCenterX = player.position.x + player.width / 2;
    const playerCenterY = player.position.y + player.height / 2;

    const tableCenterX = this.position.x + this.width / 2;
    const tableCenterY = this.position.y + this.height / 2;

    const dx = playerCenterX - tableCenterX;
    const dy = playerCenterY - tableCenterY;

    return Math.sqrt(dx * dx + dy * dy) < this.interactDistance;
  }

  async tryInteract(player) {
    if (!this.isPlayerNear(player)) return false;
    await this.open();
    return true;
  }

  close() {
    this.isPopupOpen = false;
  }

async open() {
  this.isPopupOpen = true;
  this.updateAssignButtonLabel();
  await this.renderTaskList();
}

updateAssignButtonLabel(isLoading = false) {
  const btn = document.getElementById("plannerAutoAssignAll");
  if (!btn) return;

  if (isLoading) {
    btn.textContent = this.assignmentDraft.length ? "GENERATING..." : "GENERATING...";
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  btn.textContent = this.assignmentDraft.length ? "REASSIGN ALL" : "AUTO ASSIGN ALL";
}

// Original version, kept for reference. Replaced by the function below it.
// async getAIAssignmentPlan(tasks, members) {
// const res = await fetch("http://localhost:3001/ai-assign", {
//     method: "POST",
//     headers: {
//     "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ tasks, members }),
// });

// const data = await res.json();
// if (!res.ok) throw new Error(data.error || "AI assignment failed");

// return data.assignments || [];
// }

async getAIAssignmentPlan(tasks, members) {
  // No backend in the public demo: callers catch this and use the fairness rule.
  if (!AI_SERVER_URL) throw new Error("AI is switched off in this demo");

  const res = await fetch(`${AI_SERVER_URL}/ai-assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tasks, members }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI assignment failed");

  return data.assignments || [];
}

// Original version, kept for reference. Replaced by the function below it.
// async getAIReassignmentPlan(tasks, members, draft, lockedTaskId) {
//   const res = await fetch("http://localhost:3001/ai-reassign", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       tasks,
//       members,
//       draft,
//       locked_task_id: lockedTaskId,
//     }),
//   });

//   const data = await res.json();
//   if (!res.ok) throw new Error(data.error || "AI reassignment failed");

//   return data.assignments || [];
// }

async getAIReassignmentPlan(tasks, members, draft, lockedTaskId) {
  // No backend in the public demo: callers catch this and keep the current draft.
  if (!AI_SERVER_URL) throw new Error("AI is switched off in this demo");

  const res = await fetch(`${AI_SERVER_URL}/ai-reassign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks,
      members,
      draft,
      locked_task_id: lockedTaskId,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI reassignment failed");

  return data.assignments || [];
}

async renderTaskList() {
  const list = document.getElementById("plannerTaskList");
  const draftList = document.getElementById("plannerDraftList");
  const draftActions = document.getElementById("plannerDraftActions");

  if (!list || !draftList || !draftActions) return;

  const teamId = window.gameState?.teamId;
  if (!teamId) {
    list.innerHTML = `<div class="planner-empty">No team found.</div>`;
    draftList.innerHTML = `<div class="planner-empty">No draft assignments yet.</div>`;
    draftActions.style.display = "none";
    return;
  }

  list.innerHTML = `<div class="planner-empty">Loading unassigned tasks...</div>`;

  try {
    const tasks = await fetchPlannerUnassignedTasks(teamId);
    const members = await fetchTeamFairness(teamId);

    this.cachedTasks = tasks || [];
    this.cachedMembers = members || [];

    if (!tasks || tasks.length === 0) {
      list.innerHTML = `<div class="planner-empty">No unassigned tasks yet.</div>`;
    } else {
      const availableMembers = members.filter(m => m.mood !== "overwhelmed");
      const pool = availableMembers.length ? availableMembers : members;

      const suggested = [...pool].sort((a, b) => {
        if ((a.workload_count || 0) !== (b.workload_count || 0)) {
          return (a.workload_count || 0) - (b.workload_count || 0);
        }
        return (a.xp || 0) - (b.xp || 0);
      })[0];

      list.innerHTML = "";

      tasks.forEach((task) => {
        const card = document.createElement("div");

        const priority = (task.priority || "MED").toUpperCase();

        let priorityClass = "planner-priority-med";
        let cardClass = "planner-card-med";

        if (priority === "HIGH") {
          priorityClass = "planner-priority-high";
          cardClass = "planner-card-high";
        } else if (priority === "LOW") {
          priorityClass = "planner-priority-low";
          cardClass = "planner-card-low";
        }

        let deadlineHTML = "";
        if (task.deadline) {
          const dueDate = new Date(task.deadline);
          const pad = (n) => String(n).padStart(2, "0");

          const formattedDeadline =
            `${pad(dueDate.getDate())}/${pad(dueDate.getMonth() + 1)}/${dueDate.getFullYear()} ` +
            `${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`;

          deadlineHTML = `<div class="planner-task-deadline">Due: ${formattedDeadline}</div>`;
        }

        card.className = `planner-task-card ${cardClass}`;
        card.innerHTML = `
          <div class="planner-task-title">${escapeHtml(task.title || "Untitled Task")}</div>
          <div class="planner-task-desc">${escapeHtml(task.description || "")}</div>
          <div class="planner-task-priority ${priorityClass}">${priority}</div>
          ${deadlineHTML}
          <div class="planner-task-creator">Posted by: ${escapeHtml(task.created_by_name || "Unknown")}</div>
          <div class="planner-task-status">Recommended: ${escapeHtml(suggested?.member_name || "—")}</div>
          <button class="planner-assign-btn" data-task-id="${task.id}">AUTO ASSIGN THIS</button>
        `;

        const btn = card.querySelector(".planner-assign-btn");
        if (btn) {
          btn.addEventListener("click", async () => {
            try {
              let aiPlan = null;

              try {
                aiPlan = await this.getAISingleTaskRecommendation(task, members);
              } catch (aiErr) {
                console.warn("[planner] AI single-task assignment failed, falling back:", aiErr);
              }

              let picked = null;

              if (aiPlan) {
                picked = members.find(
                  m => String(m.id) === String(aiPlan.recommended_member_id)
                );
              }

              if (!picked) picked = suggested;
              if (!picked) return;

              this.assignmentDraft = [{
                task_id: task.id,
                recommended_member_id: picked.id,
                recommended_member_name: picked.member_name,
                reason: aiPlan?.reason || "Assigned by fairness suggestion.",
                group_label: aiPlan?.group_label || "General",
                confidence: aiPlan?.confidence || "MEDIUM",
                reason_tags: aiPlan?.reason_tags || ["fairness fallback", "available"]
              }];

              this.draftMode = true;
              await this.renderDraftList();
            } catch (err) {
              console.error("[planner] Failed to build single-task draft:", err);
            }
          });
        }

        list.appendChild(card);
      });
    }

    await this.renderDraftList();
  } catch (err) {
    console.error("[planner] Failed to load planner tasks:", err);
    list.innerHTML = `<div class="planner-empty">Failed to load unassigned tasks.</div>`;
    draftList.innerHTML = `<div class="planner-empty">Failed to load draft assignments.</div>`;
    draftActions.style.display = "none";
  }
}

async renderDraftList() {
  const draftList = document.getElementById("plannerDraftList");
  const draftActions = document.getElementById("plannerDraftActions");

  if (!draftList || !draftActions) return;

  if (!this.assignmentDraft.length) {
    draftList.innerHTML = `<div class="planner-empty">No draft assignments yet.</div>`;
    draftActions.style.display = "none";
    this.renderProjectedFairness();
    this.updateAssignButtonLabel();
    return;
  }

  draftActions.style.display = "flex";
  draftList.innerHTML = "";

  const groupedDrafts = {};
  this.assignmentDraft.forEach((draft) => {
    const key = draft.group_label || "General";
    if (!groupedDrafts[key]) groupedDrafts[key] = [];
    groupedDrafts[key].push(draft);
  });

  Object.entries(groupedDrafts).forEach(([groupLabel, drafts]) => {

    const groupHeader = document.createElement("div");
    groupHeader.className = "planner-draft-group-header";
    groupHeader.textContent = `GROUP: ${groupLabel.toUpperCase()}`;
    draftList.appendChild(groupHeader);

    drafts.forEach((draft) => {
        const task = this.cachedTasks.find(t => String(t.id) === String(draft.task_id));
        if (!task) return;

        const card = document.createElement("div");
        card.className = "planner-draft-card";

        const priority = (task.priority || "MED").toUpperCase();

        let priorityClass = "planner-priority-med";
        if (priority === "HIGH") priorityClass = "planner-priority-high";
        if (priority === "LOW") priorityClass = "planner-priority-low";

        let deadlineHTML = "";
        if (task.deadline) {
        const dueDate = new Date(task.deadline);
        const pad = (n) => String(n).padStart(2, "0");

        const formattedDeadline =
            `${pad(dueDate.getDate())}/${pad(dueDate.getMonth() + 1)}/${dueDate.getFullYear()} ` +
            `${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`;

        deadlineHTML = `<div class="planner-task-deadline">Due: ${formattedDeadline}</div>`;
        }

        const confidence = (draft.confidence || "MEDIUM").toUpperCase();

        let confidenceClass = "planner-confidence-medium";
        if (confidence === "HIGH") confidenceClass = "planner-confidence-high";
        if (confidence === "LOW") confidenceClass = "planner-confidence-low";

        const assignedMember = this.cachedMembers.find(
        m => String(m.id) === String(draft.recommended_member_id)
        );

        const isBusy = assignedMember?.mood === "busy";
        const isOverwhelmed = assignedMember?.mood === "overwhelmed";

        const warningHTML = isOverwhelmed
        ? `<div class="planner-task-warning">Warning: assigned member is overwhelmed.</div>`
        : isBusy
        ? `<div class="planner-task-warning planner-task-warning-busy">Note: assigned member is busy.</div>`
        : "";

        const tags = Array.isArray(draft.reason_tags) ? draft.reason_tags : [];
        const tagsHTML = tags.length
        ? `<div class="planner-reason-tags">${
            tags.map(tag => `<span class="planner-reason-tag">${escapeHtml(tag)}</span>`).join("")
            }</div>`
        : "";

        const optionsHTML = this.cachedMembers.map((member) => {
        const selected =
            String(member.id) === String(draft.recommended_member_id) ? "selected" : "";
        return `<option value="${member.id}" ${selected}>${escapeHtml(member.member_name)}</option>`;
        }).join("");

        card.innerHTML = `
        <div class="planner-task-title">${escapeHtml(task.title || "Untitled Task")}</div>
        <div class="planner-task-desc">${escapeHtml(task.description || "")}</div>
        <div class="planner-task-priority ${priorityClass}">${priority}</div>
        ${deadlineHTML}
        <div class="planner-task-category">Category: ${escapeHtml(draft.group_label || "General")}</div>
        <div class="planner-task-assignee">Assigned to: ${escapeHtml(draft.recommended_member_name || "—")}</div>
        <div class="planner-task-reason">Why: ${escapeHtml(draft.reason || "No reason given.")}</div>
        <div class="planner-task-confidence ${confidenceClass}">AI Confidence: ${confidence}</div>
        ${tagsHTML}
        ${warningHTML}
        <select class="planner-draft-member-select" data-task-id="${draft.task_id}">
            ${optionsHTML}
        </select>
        `;

        const select = card.querySelector(".planner-draft-member-select");
        if (select) {
            select.addEventListener("change", async (e) => {
                const taskId = e.target.dataset.taskId;
                const memberId = e.target.value;
                const member = this.cachedMembers.find(m => String(m.id) === String(memberId));
                const targetDraft = this.assignmentDraft.find(d => String(d.task_id) === String(taskId));

                if (!member || !targetDraft) return;

                targetDraft.recommended_member_id = member.id;
                targetDraft.recommended_member_name = member.member_name;
                targetDraft.reason = "Manually reassigned by team.";
                targetDraft.confidence = "LOW";
                targetDraft.reason_tags = ["manual override"];

                await this.rebalanceDraftAfterManualChange(taskId);
            });
        }

        draftList.appendChild(card);
    });
    });
    this.renderProjectedFairness();
    this.updateAssignButtonLabel();
}

async getAISingleTaskRecommendation(task, members) {
  const assignments = await this.getAIAssignmentPlan([task], members);
  return assignments?.[0] || null;
}

async rebalanceDraftAfterManualChange(lockedTaskId) {
  if (!this.assignmentDraft.length) return;

  const draftList = document.getElementById("plannerDraftList");

  try {
    const tasks = this.cachedTasks || [];
    const members = this.cachedMembers || [];
    if (!tasks.length || !members.length) return;

    const lockedDraft = this.assignmentDraft.find(
      d => String(d.task_id) === String(lockedTaskId)
    );

    if (draftList) {
      draftList.style.opacity = "0.65";
      draftList.innerHTML = `<div class="planner-empty">Generating reassignment...</div>`;
    }

    const aiAssignments = await this.getAIReassignmentPlan(
      tasks,
      members,
      this.assignmentDraft,
      lockedTaskId
    );

    if (!Array.isArray(aiAssignments) || !aiAssignments.length) {
      if (draftList) draftList.style.opacity = "1";
      await this.renderDraftList();
      return;
    }

    const nextDraft = aiAssignments.map((item) => {
      if (String(item.task_id) === String(lockedTaskId) && lockedDraft) {
        return {
          ...lockedDraft,
          reason: "Manually reassigned by team. AI rebalanced the rest.",
          confidence: "LOW",
          reason_tags: ["manual override", "locked assignment"],
        };
      }

      return {
        task_id: item.task_id,
        recommended_member_id: item.recommended_member_id,
        recommended_member_name: item.recommended_member_name,
        reason: item.reason,
        group_label: item.group_label,
        confidence: item.confidence,
        reason_tags: item.reason_tags,
      };
    });

    this.assignmentDraft = nextDraft;

    if (draftList) draftList.style.opacity = "1";
    await this.renderDraftList();
  } catch (err) {
    console.warn("[planner] AI draft rebalance failed, keeping manual change:", err);
    if (draftList) draftList.style.opacity = "1";
    await this.renderDraftList();
  } finally {
    this.updateAssignButtonLabel();
  }
}

async autoAssignAll() {
  const teamId = window.gameState?.teamId;
  if (!teamId) return;

  const btn = document.getElementById("plannerAutoAssignAll");

  try {
    this.updateAssignButtonLabel(true);

    const draftList = document.getElementById("plannerDraftList");
    if (draftList) {
      draftList.innerHTML = `<div class="planner-empty">Generating assignment plan...</div>`;
      draftList.style.opacity = "0.7";
    }

    const tasks = await fetchPlannerUnassignedTasks(teamId);
    const members = await fetchTeamFairness(teamId);

    this.cachedTasks = tasks || [];
    this.cachedMembers = members || [];

    if (!tasks.length || !members.length) {
      if (draftList) draftList.style.opacity = "1";
      this.updateAssignButtonLabel();
      return;
    }

    let assignments = [];

    try {
      if (this.assignmentDraft.length > 0) {
        const lockedTaskId = this.assignmentDraft[0]?.task_id || "";
        assignments = await this.getAIReassignmentPlan(
          tasks,
          members,
          this.assignmentDraft,
          lockedTaskId
        );
      } else {
        assignments = await this.getAIAssignmentPlan(tasks, members);
      }
    } catch (aiErr) {
      console.warn("[planner] AI assignment failed, falling back to fairness:", aiErr);

      const workingMembers = members
        .filter(m => m.mood !== "overwhelmed")
        .map(m => ({ ...m }));

      const pool = workingMembers.length ? workingMembers : members.map(m => ({ ...m }));

      assignments = tasks.map((task) => {
        pool.sort((a, b) => {
          if ((a.workload_count || 0) !== (b.workload_count || 0)) {
            return (a.workload_count || 0) - (b.workload_count || 0);
          }
          return (a.xp || 0) - (b.xp || 0);
        });

        const picked = pool[0];
        if (picked) {
          picked.workload_count = (picked.workload_count || 0) + 1;
        }

        return {
          task_id: task.id,
          recommended_member_id: picked?.id || "",
          recommended_member_name: picked?.member_name || "—",
          reason: "Assigned by fairness fallback based on current workload.",
          group_label: "General",
          confidence: "MEDIUM",
          reason_tags: ["fairness fallback", "balanced distribution"]
        };
      });
    }

    this.assignmentDraft = assignments;
    this.draftMode = true;

    if (draftList) draftList.style.opacity = "1";
    await this.renderDraftList();
  } catch (err) {
    console.error("[planner] Auto assign all failed:", err);
  } finally {
    const draftList = document.getElementById("plannerDraftList");
    if (draftList) draftList.style.opacity = "1";
    this.updateAssignButtonLabel();
    if (btn) btn.disabled = false;
  }
}

async acceptAllDraftAssignments() {
  if (!this.assignmentDraft.length) return;

  try {
    for (const draft of this.assignmentDraft) {
      if (!draft.recommended_member_id) continue;

      await acceptTaskById(
        draft.task_id,
        draft.recommended_member_id,
        draft.recommended_member_name,
        ""
      );
    }

    this.assignmentDraft = [];
    this.draftMode = false;

    await this.renderTaskList();

    if (window.bulletinBoard) {
      await window.bulletinBoard.loadTasks();
    }

    if (window.cupboardModal?.isOpen) {
      await window.cupboardModal.open();
    }
  } catch (err) {
    console.error("[planner] Accept all failed:", err);
  }
}

renderProjectedFairness() {
  const box = document.getElementById("plannerProjectedFairness");
  if (!box) return;

  if (!this.cachedMembers.length || !this.assignmentDraft.length) {
    box.innerHTML = `<div class="planner-empty">No draft assignments yet.</div>`;
    return;
  }

  const currentMap = {};
  this.cachedMembers.forEach((member) => {
    currentMap[String(member.id)] = member.workload_count || 0;
  });

  const projectedMap = {};
  this.cachedMembers.forEach((member) => {
    projectedMap[String(member.id)] = member.workload_count || 0;
  });

  this.assignmentDraft.forEach((draft) => {
    const memberId = String(draft.recommended_member_id || "");
    if (!memberId) return;
    projectedMap[memberId] = (projectedMap[memberId] || 0) + 1;
  });

  const currentCounts = this.cachedMembers.map(m => currentMap[String(m.id)] || 0);
  const projectedCounts = this.cachedMembers.map(m => projectedMap[String(m.id)] || 0);

  const currentSpread = currentCounts.length ? Math.max(...currentCounts) - Math.min(...currentCounts) : 0;
  const projectedSpread = projectedCounts.length ? Math.max(...projectedCounts) - Math.min(...projectedCounts) : 0;

  const improved = projectedSpread < currentSpread;
  const same = projectedSpread === currentSpread;

  let summaryClass = "planner-fairness-summary";
  let summaryText = `Current spread: ${currentSpread} • Projected spread: ${projectedSpread}`;

  if (improved) {
    summaryClass += " planner-fairness-good";
    summaryText += " • More balanced";
  } else if (same) {
    summaryText += " • No change";
  } else {
    summaryClass += " planner-fairness-bad";
    summaryText += " • Less balanced";
  }

  box.innerHTML = `<div class="${summaryClass}">${summaryText}</div>`;

  this.cachedMembers.forEach((member) => {
    const current = currentMap[String(member.id)] || 0;
    const projected = projectedMap[String(member.id)] || 0;
    const delta = projected - current;

    const row = document.createElement("div");
    row.className = "planner-fairness-row";

    const shiftClass =
      delta > 0 ? "planner-fairness-bad" :
      delta < 0 ? "planner-fairness-good" :
      "";

    const deltaText =
      delta > 0 ? `+${delta}` :
      delta < 0 ? `${delta}` :
      `0`;

    row.innerHTML = `
      <div class="planner-fairness-name">${escapeHtml(member.member_name)}</div>
      <div class="planner-fairness-shift ${shiftClass}">
        ${current} → ${projected} (${deltaText})
      </div>
    `;

    box.appendChild(row);
  });
}

declineAllDraftAssignments() {
  this.assignmentDraft = [];
  this.draftMode = false;
  this.renderDraftList();
}

getCollisionBoundary() {
    return new Boundary({
        position: { x: this.position.x, y: this.position.y + this.height * 0.42 },
        width: this.width,
        height: this.height * 0.28,
    });
}
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}