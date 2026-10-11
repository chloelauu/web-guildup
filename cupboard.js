// cupboard.js — My Tasks modal

class CupboardModal {
  constructor() {
    this.isOpen = false;
  }

  async open() {
    this.isOpen = true;

    const modal = document.getElementById('cupboardModal');
    const list  = document.getElementById('cupboardTaskList');
    const msg   = document.getElementById('cupboardSuccessMsg');
    if (!modal || !list) return;

    msg.style.display = 'none';
    modal.style.display = 'flex';

    const content = document.getElementById('cupboardModalContent');
    if (content) {
      content.classList.remove('popup-close-horizontal');
      content.classList.remove('popup-open-horizontal');
      void content.offsetWidth;
      content.classList.add('popup-open-horizontal');
    }

    const memberId = window.gameState?.memberId;
    if (!memberId) {
      list.innerHTML = '<div class="cupboard-empty">No tasks in progress. Accept quests from the bulletin board!</div>';
      return;
    }

    list.innerHTML = '<div class="cupboard-empty">Loading...</div>';

    try {
      const tasks = await fetchCupboardTasks(memberId);
      this._renderTasks(tasks);
    } catch (err) {
      console.error('[cupboard] Failed to load tasks:', err);
      list.innerHTML = '<div class="cupboard-empty">Failed to load tasks.</div>';
    }
  }

  close() {
    const modal = document.getElementById('cupboardModal');
    const content = document.getElementById('cupboardModalContent');

    if (!modal || !content) {
      this.isOpen = false;
      return;
    }

    content.classList.remove('popup-open-horizontal');
    content.classList.remove('popup-close-horizontal');
    void content.offsetWidth;
    content.classList.add('popup-close-horizontal');

    setTimeout(() => {
      modal.style.display = 'none';
      content.classList.remove('popup-close-horizontal');
      this.isOpen = false;
    }, 180);
  }

  openCreateTaskForm() {
    const form = document.getElementById("taskForm");
    const titleInput = document.getElementById("taskTitleInput");
    const descInput = document.getElementById("taskDescInput");
    const deadlineInput = document.getElementById("taskDeadlineInput");
    const priorityInput = document.getElementById("taskPriorityInput");
    const formTitle = document.getElementById("taskFormTitle");
    const submitBtn = document.getElementById("submitTaskBtn");
    const deleteBtn = document.getElementById("deleteTaskBtn");
    const createdByText = document.getElementById("taskCreatedBy");

    if (titleInput) {
      titleInput.value = "";
      titleInput.disabled = false;
    }

    if (descInput) {
      descInput.value = "";
      descInput.disabled = false;
    }

    if (deadlineInput) {
      deadlineInput.value = "";
      deadlineInput.disabled = false;
    }

    if (priorityInput) {
      priorityInput.value = "MED";
      priorityInput.disabled = false;
    }

    if (formTitle) formTitle.textContent = "Create Personal Task";
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
      form.dataset.mode = "cupboard-create";
      form.style.display = "flex";
    }

    if (window.bulletinBoard) {
      window.bulletinBoard.selectedTaskIndex = -1;
      window.bulletinBoard.isCreateTaskOpen = true;
      window.bulletinBoard.updateCreateTaskLayout();
      window.bulletinBoard.positionTaskForm();
    }
  }

    openExistingTaskForm(task) {
    const form = document.getElementById("taskForm");
    const titleInput = document.getElementById("taskTitleInput");
    const descInput = document.getElementById("taskDescInput");
    const deadlineInput = document.getElementById("taskDeadlineInput");
    const priorityInput = document.getElementById("taskPriorityInput");
    const formTitle = document.getElementById("taskFormTitle");
    const submitBtn = document.getElementById("submitTaskBtn");
    const deleteBtn = document.getElementById("deleteTaskBtn");
    const createdByText = document.getElementById("taskCreatedBy");

    if (!task || !form) return;

    if (window.bulletinBoard) {
      window.bulletinBoard.isCreateTaskOpen = true;
      window.bulletinBoard.updateCreateTaskLayout();
      window.bulletinBoard.selectedTaskIndex = -1;
    }

    if (titleInput) {
      titleInput.value = task.title || "";
      titleInput.disabled = false;
    }

    if (descInput) {
      descInput.value = task.description || "";
      descInput.disabled = false;
    }

    if (deadlineInput) {
      if (task.deadline) {
        const localDate = new Date(task.deadline);
        const pad = (n) => String(n).padStart(2, "0");

        const formatted =
          localDate.getFullYear() +
          "-" +
          pad(localDate.getMonth() + 1) +
          "-" +
          pad(localDate.getDate()) +
          "T" +
          pad(localDate.getHours()) +
          ":" +
          pad(localDate.getMinutes());

        deadlineInput.value = formatted;
      } else {
        deadlineInput.value = "";
      }

      deadlineInput.disabled = false;
    }

    if (priorityInput) {
      priorityInput.value = task.priority || "MED";
      priorityInput.disabled = false;
    }

    if (formTitle) formTitle.textContent = "Edit Task";

    if (submitBtn) {
      submitBtn.textContent = "Save";
      submitBtn.style.display = "block";
    }

    if (deleteBtn) deleteBtn.style.display = "block";

    if (createdByText) {
      createdByText.textContent = `Created by: ${task.created_by_name || "Unknown"}`;
      createdByText.style.display = "block";
    }

    form.dataset.mode = "cupboard-create";
    form.dataset.taskId = task.id;
    form.style.display = "flex";

    if (window.bulletinBoard) {
      window.bulletinBoard.positionTaskForm();
    }
  }

  _renderTasks(tasks) {
    const list = document.getElementById('cupboardTaskList');
    if (!list) return;
    list.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      list.innerHTML = '<div class="cupboard-empty">No tasks in progress. Accept quests from the bulletin board!</div>';
      return;
    }

    const priorityRank = {
      HIGH: 0,
      MED: 1,
      LOW: 2,
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      const aPriority = (a.priority || 'MED').toUpperCase();
      const bPriority = (b.priority || 'MED').toUpperCase();

      const aRank = priorityRank[aPriority] ?? 1;
      const bRank = priorityRank[bPriority] ?? 1;

      if (aRank !== bRank) return aRank - bRank;

      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;

      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    sortedTasks.forEach(task => {
      const card = document.createElement('div');
      const priority = (task.priority || 'MED').toUpperCase();

      card.className = 'cupboard-task-card';

      if (priority === 'HIGH') {
        card.classList.add('cupboard-card-high');
      } else if (priority === 'MED') {
        card.classList.add('cupboard-card-med');
      } else {
        card.classList.add('cupboard-card-low');
      }
      card.dataset.taskId = task.id;

      const memberId = window.gameState?.memberId;
      const isOwnTask = String(task.created_by_member_id) === String(memberId);

      // ADDED: real lifecycle state label
      let statusLabel = '';
      if (task.status === 'completed') {
        statusLabel = 'COMPLETED';
      } else if (task.status === 'in_progress') {
        statusLabel = isOwnTask ? 'OWN TASK • IN PROGRESS' : 'PICKED UP • IN PROGRESS';
      } else {
        statusLabel = isOwnTask ? 'OWN TASK' : 'PICKED UP';
      }

      let deadlineHTML = '';
      if (task.deadline) {
        const dueDate = new Date(task.deadline);

        const pad = (n) => String(n).padStart(2, '0');

        const formattedDeadline =
          `${pad(dueDate.getDate())}/${pad(dueDate.getMonth() + 1)}/${dueDate.getFullYear()} ` +
          `${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`;

        deadlineHTML = `<div class="cupboard-task-deadline">Due: ${formattedDeadline}</div>`;
      }

      let priorityClass = 'cupboard-priority-med';
      if (priority === 'LOW') priorityClass = 'cupboard-priority-low';
      if (priority === 'HIGH') priorityClass = 'cupboard-priority-high';

      const priorityHTML = `
        <div class="cupboard-task-priority ${priorityClass}">
          ${priority}
        </div>
      `;

      const completedButtonHTML =
        task.status === 'completed'
          ? `<button class="cupboard-complete-btn" data-task-id="${task.id}" disabled>DONE</button>`
          : `<button class="cupboard-complete-btn" data-task-id="${task.id}">COMPLETE</button>`;

      card.innerHTML = `
        <div class="cupboard-task-title">${this._escHtml(task.title || '')}</div>
        <div class="cupboard-task-desc">${this._escHtml(task.description || '')}</div>
        ${priorityHTML}
        ${deadlineHTML}
        <div class="cupboard-task-creator">Posted by: ${this._escHtml(task.created_by_name || 'Unknown')}</div>
        <div class="cupboard-task-status">${statusLabel}</div>
        ${completedButtonHTML}
      `;

      // ADDED: keep completed tasks visible but dimmed
      if (task.status === 'completed') {
        card.style.opacity = '0.55';
      }

      list.appendChild(card);

      const completeBtn = card.querySelector('.cupboard-complete-btn');
      if (completeBtn && task.status !== 'completed') {
        completeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this._completeTask(task.id, card);
        });
      }

      card.addEventListener('click', () => {
        this.openExistingTaskForm(task);
      });
    });
  }

  async _completeTask(taskId, cardEl) {
    const memberId = window.gameState?.memberId;
    if (!memberId) return;

    const btn = cardEl.querySelector('.cupboard-complete-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    try {
      await updateTaskById(taskId, { status: 'completed' });
      const XP_PER_TASK = 1;

      window.addTeamXP(XP_PER_TASK);
      await incrementMemberXP(memberId, XP_PER_TASK);

      // CHANGED: do not remove, keep it visible as completed
      const statusEl = cardEl.querySelector('.cupboard-task-status');
      if (statusEl) statusEl.textContent = 'COMPLETED';

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'DONE';
      }

      cardEl.style.opacity = '0.55';

      this._showSuccess(`Quest complete! +${XP_PER_TASK} XP`);
    } catch (err) {
      console.error('[cupboard] Failed to complete task:', err);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'COMPLETE';
      }
    }
  }

  _showSuccess(text) {
    const msg = document.getElementById('cupboardSuccessMsg');
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = 'block';
    clearTimeout(this._successTimer);
    this._successTimer = setTimeout(() => { msg.style.display = 'none'; }, 2500);
  }

  _escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.cupboardModal = new CupboardModal();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cupboardClose')?.addEventListener('click', () => {
    window.cupboardModal.close();
  });

  document.getElementById('cupboardAddTask')?.addEventListener('click', () => {
    window.cupboardModal.openCreateTaskForm();
  });
});