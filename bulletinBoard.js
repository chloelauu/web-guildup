class BulletinBoard {
  constructor({
    worldX,
    worldY,
    width,
    height,
    imageSrc,
    overlayImageSrc,
    interactKey = "e",
  }) {
    this.position = { x: worldX, y: worldY };
    this.width = width;
    this.height = height;
    this.interactKey = interactKey;

    this.image = new Image();
    this.image.src = imageSrc;

    this.overlayImage = new Image();
    this.overlayImage.src = overlayImageSrc || imageSrc;

    this.hoverCreate = false;
    this.hoverClose = false;
    
    this.uiOpenStart = 0;
    this.uiOpenDuration = 360;

    this.isOverlayOpen = false;
    this.playerNear = false;

    this.overlay = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    this.closeButton = {
      x: 0,
      y: 0,
      size: 38,
    };

    this.pressE = {
      width: 104,
      height: 26,
      offsetY: 50,
      textOffsetX: 0,
      textOffsetY: 0,
    };

    this.closeButtonOffset = {
      x: 8,
      y: 8,
    };

    this.createButton = {
      x: 0,
      y: 0,
      width: 186,
      height: 40,
    };

    this.boardTitle = {
      text: "Task Board",
      x: 0,
      y: 0,
      width: 320,
      height: 56,
    };

    this.taskArea = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      gapX: 0,
      gapY: 20,
      cardWidth: 140,
      cardHeight: 126,
      maxPerRow: 3,
      paddingLeft: 160,
      paddingRight: 150,
      paddingTop: 175,
      paddingBottom: 260,
      scrollBarWidth: 16,
      scrollBarPadding: 30,
    };

    this.scrollY = 0;
    this.maxScrollY = 0;
    this.scrollSpeed = 30;

    this.tasks = [];
    this.currentMemberId = null;
    this.currentTeamId = null;
    this.currentMemberName = "";
    this.selectedTaskIndex = -1;
    this.hoveredTaskIndex = -1;

    this.taskImages = [];
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      const fileIndex = String(i).padStart(2, "0");
      img.src = `./img/bulletinboard/task_${fileIndex}.png`;
      this.taskImages.push(img);
    }

    this.emptyTaskImage = new Image();
    this.emptyTaskImage.src = "./img/bulletinboard/task_empty.png";

    this.isCreateTaskOpen = false;

    this.createTaskOverlay = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    this.toastText = '';
    this.toastUntil = 0;
  }

  async syncUser(memberId, teamId, memberName) {
    this.currentMemberId = memberId;
    this.currentTeamId = teamId;
    this.currentMemberName = memberName || "";
    await this.loadTasks();
  }

  async loadTasks() {
    if (!this.currentTeamId) {
      this.tasks = [];
      this.updateOverlayLayout();
      return;
    }

    try {
      const tasks = await fetchTasksByTeam(this.currentTeamId);

      this.tasks = tasks
        .map((task) => ({
          ...task,
          imageIndex:
            typeof task.image_index === "number"
              ? task.image_index
              : typeof task.imageIndex === "number"
              ? task.imageIndex
              : 0,
        }))
        .sort((a, b) => {
          const aHasDeadline = !!a.deadline;
          const bHasDeadline = !!b.deadline;

          if (aHasDeadline && !bHasDeadline) return -1;
          if (!aHasDeadline && bHasDeadline) return 1;

          if (!aHasDeadline && !bHasDeadline) {
            return new Date(b.created_at) - new Date(a.created_at);
          }

          return new Date(a.deadline) - new Date(b.deadline);
        });
    } catch (err) {
      console.error("Failed to load tasks:", err);
      this.tasks = [];
    }

    this.updateOverlayLayout();
  }

  isTaskOwner(task) {
    if (!task) return false;
    return String(task.created_by_member_id) === String(this.currentMemberId);
  }

  async addTask(title, description, deadline, priority) {
    if (!this.currentTeamId || !this.currentMemberId) return;

    const randomImageIndex = Math.floor(Math.random() * this.taskImages.length);

    await createTask({
      teamId: this.currentTeamId,
      memberId: this.currentMemberId,
      memberName: this.currentMemberName,
      memberEmail: gameState.email,
      title,
      description,
      imageIndex: randomImageIndex,
      deadline: deadline,
      priority: priority,
    });

    await this.loadTasks();
  }

  async updateTask(index, title, description, deadline, priority) {
    if (index < 0 || index >= this.tasks.length) return;

    const task = this.tasks[index];
    if (!this.isTaskOwner(task)) return;

    await updateTaskById(task.id, {
      title,
      description,
      deadline,
      priority,
    });

    await this.loadTasks();
  }

  async deleteTask(index) {
    if (index < 0 || index >= this.tasks.length) return;

    const task = this.tasks[index];
    if (!this.isTaskOwner(task)) return;

    await deleteTaskById(task.id);
    await this.loadTasks();
  }

  async acceptTask(index) {
    if (index < 0 || index >= this.tasks.length) return;

    const task = this.tasks[index];

    if (!task) return;
    if (this.isTaskOwner(task)) return;

    // suggested lock
    try {
      const members = await fetchTeamFairness(this.currentTeamId);

      if (Array.isArray(members) && members.length > 0) {
        const availableMembers = members.filter(m => m.mood !== 'overwhelmed');
        const pool = availableMembers.length ? availableMembers : members;

        const suggested = [...pool].sort((a, b) => {
          if ((a.workload_count || 0) !== (b.workload_count || 0)) {
            return (a.workload_count || 0) - (b.workload_count || 0);
          }
          return (a.xp || 0) - (b.xp || 0);
        })[0];

        const currentId = String(this.currentMemberId);
        const suggestedId = String(suggested?.id || '');

        if (suggestedId && currentId !== suggestedId) {
          const proceed = window.confirm(
            `${suggested.member_name} is currently recommended to take this task.\n\nTake anyway?`
          );

          if (!proceed) return;
        }
      }
    } catch (err) {
      console.warn('Suggested lock check failed:', err);
    }

    const acceptedTask = await acceptTaskById(
      task.id,
      this.currentMemberId,
      this.currentMemberName,
      gameState.email
    );

    if (acceptedTask?.created_by_email && typeof sendTaskAcceptedEmail === "function") {
      try {
        await sendTaskAcceptedEmail(acceptedTask);
      } catch (err) {
        console.warn("Task accepted email failed:", err);
      }
    }

    await this.loadTasks();
  }

  update(player, mouse) {
    this.playerNear = this.isPlayerNear(player);

    if (this.isOverlayOpen) {
      this.updateOverlayLayout();
      this.detectHover(mouse);
    } else {
      this.hoveredTaskIndex = -1;
    }

    if (this.isCreateTaskOpen) {
      this.updateCreateTaskLayout();
      this.positionTaskForm();
      this.hoveredTaskIndex = -1;
    }
  }

  drawWorld() {
    if (!this.image.complete) return;

    c.imageSmoothingEnabled = false;

    c.drawImage(
      this.image,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    if (DEBUG) {
      c.save();
      c.strokeStyle = "cyan";
      c.lineWidth = 2;
      c.strokeRect(this.position.x, this.position.y, this.width, this.height);
      c.restore();
    }
  }

  drawPrompt() {
    if (!this.playerNear || this.isOverlayOpen) return;

    const x = this.position.x + this.width / 2 - this.pressE.width / 2;
    const y = this.position.y + this.pressE.offsetY;

    c.save();
    c.fillStyle = "rgba(22, 13, 9, 0.86)";
    c.fillRect(x, y, this.pressE.width, this.pressE.height);
    c.strokeStyle = "#c9ad7a";
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, this.pressE.width - 2, this.pressE.height - 2);
    c.fillStyle = "#f4e6c8";
    c.font = "10px 'Press Start 2P'";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("PRESS E", x + this.pressE.width / 2, y + this.pressE.height / 2 + 1);
    c.restore();
  }

  drawOverlay() {
    if (!this.isOverlayOpen || !this.overlayImage.complete) return;

    c.imageSmoothingEnabled = false;

    c.fillStyle = "rgba(0, 0, 0, 0.74)";
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.drawImage(
      this.overlayImage,
      this.overlay.x,
      this.overlay.y,
      this.overlay.width,
      this.overlay.height
    );

    const uiProgress = this.getUIOpenProgress();

    this.drawBoardTitle(uiProgress);
    this.drawCreateButton(uiProgress);
    this.drawTasks(uiProgress);
    this.drawScrollBar(uiProgress);
    this.drawCreateTaskOverlay();

    if (!this.isCreateTaskOpen) {
      const x = this.closeButton.x;
      const y = this.closeButton.y;
      const s = this.closeButton.size;

      c.save();

      c.fillStyle = "#2b1b12";
      c.fillRect(x, y, s, s);

      c.fillStyle = "#5b4c45";
      c.fillRect(x + 3, y + 3, s - 6, s - 6);

      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(x + 3, y + 3, s - 6, 7);

      c.strokeStyle = "#d2b07c";
      c.lineWidth = 2;
      c.strokeRect(x + 1, y + 1, s - 2, s - 2);

      c.fillStyle = "#f6ead4";
      c.font = "12px 'Press Start 2P'";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("X", x + s / 2, y + s / 2 + 1);

      c.restore();

      c.textAlign = "start";
      c.textBaseline = "alphabetic";

      if (this.hoverClose) {
        c.fillStyle = "rgba(0, 0, 0, 0.35)";
        c.fillRect(x, y, s, s);
      }
    }

    if (DEBUG) {
      c.save();

      c.strokeStyle = "yellow";
      c.lineWidth = 2;
      c.strokeRect(
        this.overlay.x,
        this.overlay.y,
        this.overlay.width,
        this.overlay.height
      );

      c.strokeStyle = "gold";
      c.lineWidth = 2;
      c.strokeRect(
        this.boardTitle.x,
        this.boardTitle.y,
        this.boardTitle.width,
        this.boardTitle.height
      );

      c.strokeStyle = "lime";
      c.lineWidth = 2;
      c.strokeRect(
        this.createButton.x,
        this.createButton.y,
        this.createButton.width,
        this.createButton.height
      );

      c.strokeStyle = "orange";
      c.lineWidth = 2;
      c.strokeRect(
        this.taskArea.x,
        this.taskArea.y,
        this.taskArea.width,
        this.taskArea.height
      );

      c.strokeStyle = "red";
      c.lineWidth = 2;
      c.strokeRect(
        this.closeButton.x,
        this.closeButton.y,
        this.closeButton.size,
        this.closeButton.size
      );

      if (this.isCreateTaskOpen) {
        c.strokeStyle = "deepskyblue";
        c.lineWidth = 2;
        c.strokeRect(
          this.createTaskOverlay.x,
          this.createTaskOverlay.y,
          this.createTaskOverlay.width,
          this.createTaskOverlay.height
        );

        const form = document.getElementById("taskForm");
        if (form && form.style.display !== "none") {
          const formLeft = parseFloat(form.style.left || 0);
          const formTop = parseFloat(form.style.top || 0);
          const formWidth = parseFloat(form.style.width || 0);
          const formHeight = form.offsetHeight || 0;

          c.strokeStyle = "magenta";
          c.lineWidth = 2;
          c.strokeRect(formLeft, formTop, formWidth, formHeight);
        }
      }

      c.restore();
    }

    this._drawToast();
  }

  _drawToast() {
    if (!this.toastText || Date.now() >= this.toastUntil) return;
    const tw = 320, th = 36;
    const tx = canvas.width / 2 - tw / 2;
    const ty = this.overlay.y + this.overlay.height - th - 20;

    c.save();
    c.fillStyle = 'rgba(14, 10, 4, 0.95)';
    c.fillRect(tx, ty, tw, th);
    c.strokeStyle = '#c9a227';
    c.lineWidth = 2;
    c.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);
    c.fillStyle = '#c9a227';
    c.font = "8px 'Press Start 2P'";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(this.toastText, tx + tw / 2, ty + th / 2);
    c.restore();
  }

  drawBoardTitle(progress = 1) {
    const centerX = this.boardTitle.x + this.boardTitle.width / 2;
    const textWidth = this.boardTitle.width;
    const y = this.boardTitle.y;
    const h = this.boardTitle.height;

    const left = centerX - textWidth / 2;
    const right = centerX + textWidth / 2;

    c.save();
    this.applyHorizontalReveal(centerX, y + h / 2, progress);
    c.globalAlpha = progress;

    const band = c.createLinearGradient(left - 40, 0, right + 40, 0);

    band.addColorStop(0.0, "rgba(0,0,0,0.00)");
    band.addColorStop(0.2, "rgba(0,0,0,0.35)");
    band.addColorStop(0.5, "rgba(0,0,0,0.65)");
    band.addColorStop(0.8, "rgba(0,0,0,0.35)");
    band.addColorStop(1.0, "rgba(0,0,0,0.00)");

    c.fillStyle = band;
    c.fillRect(left - 40, y, textWidth + 80, h);

    c.shadowColor = "rgba(0,0,0,0.45)";
    c.shadowOffsetY = 2;

    c.fillStyle = "#f3dfbb";
    c.font = "22px 'Press Start 2P'";
    c.textAlign = "center";
    c.textBaseline = "middle";

    c.fillText(
      this.boardTitle.text,
      centerX,
      y + h / 2 + 1
    );

    c.restore();

    c.textAlign = "start";
    c.textBaseline = "alphabetic";
  }

  drawCreateButton(progress = 1) {
    const x = this.createButton.x;
    const y = this.createButton.y;
    const w = this.createButton.width;
    const h = this.createButton.height;

    c.save();
    this.applyHorizontalReveal(x + w / 2, y + h / 2, progress);
    c.globalAlpha = progress;

    c.fillStyle = "#2b1b12";
    c.fillRect(x, y, w, h);

    c.fillStyle = "#243b63";
    c.fillRect(x + 3, y + 3, w - 6, h - 6);

    c.fillStyle = "rgba(255,255,255,0.16)";
    c.fillRect(x + 3, y + 3, w - 6, 8);

    c.strokeStyle = "#8e6a3d";
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);

    c.strokeStyle = "#d5b27a";
    c.lineWidth = 1;
    c.strokeRect(x + 4, y + 4, w - 8, h - 8);

    const s = 12;
    c.strokeStyle = "#caa56b";
    c.lineWidth = 1.5;

    c.beginPath();
    c.moveTo(x + 8, y + s);
    c.lineTo(x + 8, y + 8);
    c.lineTo(x + s, y + 8);
    c.stroke();

    c.beginPath();
    c.moveTo(x + w - 8, y + s);
    c.lineTo(x + w - 8, y + 8);
    c.lineTo(x + w - s, y + 8);
    c.stroke();

    c.beginPath();
    c.moveTo(x + 8, y + h - s);
    c.lineTo(x + 8, y + h - 8);
    c.lineTo(x + s, y + h - 8);
    c.stroke();

    c.beginPath();
    c.moveTo(x + w - 8, y + h - s);
    c.lineTo(x + w - 8, y + h - 8);
    c.lineTo(x + w - s, y + h - 8);
    c.stroke();

    c.fillStyle = "#f4ead6";
    c.font = "10px 'Press Start 2P'";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("CREATE PICKUP", x + w / 2, y + h / 2 + 1);

    c.restore();

    c.textAlign = "start";
    c.textBaseline = "alphabetic";

    if (this.hoverCreate) {
      c.fillStyle = "rgba(0, 0, 0, 0.28)";
      c.fillRect(x, y, w, h);
    }
  }

  drawTasks(progress = 1) {
    const area = this.taskArea;

    if (this.tasks.length === 0) {
      c.save();
      c.font = "7px 'Press Start 2P'";
      c.fillStyle = '#c9a227';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(
        'No quests available.',
        area.x + area.width / 2,
        area.y + area.height / 2 - 10
      );
      c.font = "6px 'Press Start 2P'";
      c.fillStyle = '#a08a5a';
      c.fillText(
        'Be the first to post one!',
        area.x + area.width / 2,
        area.y + area.height / 2 + 12
      );
      c.textBaseline = 'alphabetic';
      c.restore();
      return;
    }

    // lazy fallback: compute suggested user even if fairness popup was never opened
    if (!window._suggestedMemberId && window.gameState?.teamId && !window._suggestedFetchInFlight) {
      window._suggestedFetchInFlight = true;

      fetchTeamFairness(window.gameState.teamId)
        .then((members) => {
          if (Array.isArray(members) && members.length > 0) {
            const availableMembers = members.filter(m => m.mood !== 'overwhelmed');
            const pool = availableMembers.length ? availableMembers : members;

            const suggested = [...pool].sort((a, b) => {
              if ((a.workload_count || 0) !== (b.workload_count || 0)) {
                return (a.workload_count || 0) - (b.workload_count || 0);
              }
              return (a.xp || 0) - (b.xp || 0);
            })[0];

            window._suggestedMemberName = suggested?.member_name || "";
            window._suggestedMemberId = suggested?.id || "";
          }
        })
        .catch((err) => {
          console.warn("Failed to lazy-load suggested member:", err);
        })
        .finally(() => {
          window._suggestedFetchInFlight = false;
        });
    }

    const startY = area.y - this.scrollY;

    c.save();
    c.beginPath();
    c.rect(area.x, area.y, area.width, area.height);
    c.clip();

    const totalWidth =
      area.maxPerRow * area.cardWidth +
      (area.maxPerRow - 1) * area.gapX;

    const startX = area.x + (area.width - totalWidth) / 2;

    for (let i = 0; i < this.tasks.length; i++) {
      const col = i % area.maxPerRow;
      const row = Math.floor(i / area.maxPerRow);

      const x = startX + col * (area.cardWidth + area.gapX);
      const y = startY + row * (area.cardHeight + area.gapY);

      c.save();
      c.globalAlpha = progress;

      const task = this.tasks[i];
      const taskImage = this.taskImages[
        typeof task.imageIndex === "number" ? task.imageIndex : 0
      ];

      const imageToDraw =
        taskImage && taskImage.complete
          ? taskImage
          : this.emptyTaskImage.complete
          ? this.emptyTaskImage
          : null;

      if (imageToDraw) {
        c.drawImage(imageToDraw, x, y, area.cardWidth, area.cardHeight);

        if (this.hoveredTaskIndex === i) {
          this.drawDarkenedTaskImage(
            imageToDraw,
            x,
            y,
            area.cardWidth,
            area.cardHeight
          );
        }
      }

      const stateBadgeWidth = area.cardWidth;
      const stateBadgeHeight = Math.floor(area.cardHeight * 0.30);
      const stateBadgeX = x + area.cardWidth / 2 - stateBadgeWidth / 2;
      const stateBadgeY = y + 4;

      const suggestedId = window._suggestedMemberId || "";
      const suggestedName = window._suggestedMemberName || "—";
      const isYou = String(suggestedId) === String(window.gameState?.memberId);

      const shortName =
        suggestedName && suggestedName.length > 7
          ? suggestedName.slice(0, 7)
          : suggestedName;

      const suggestLabel = isYou
        ? "RECCO: YOU"
        : `RECCO: ${shortName || "—"}`;

      c.fillStyle = isYou
        ? "rgba(20, 40, 20, 0.85)"
        : "rgba(40, 30, 10, 0.85)";
      c.fillRect(stateBadgeX, stateBadgeY, stateBadgeWidth, stateBadgeHeight);

      c.strokeStyle = isYou ? "#8be38b" : "#c9a227";
      c.lineWidth = 1;
      c.strokeRect(stateBadgeX, stateBadgeY, stateBadgeWidth, stateBadgeHeight);

      const suggestFontSize = Math.max(6, Math.floor(area.cardWidth * 0.090));

      c.fillStyle = isYou ? "#8be38b" : "#ffd166";
      c.font = `${suggestFontSize}px 'Press Start 2P'`;
      c.textAlign = "center";
      c.textBaseline = "middle";

      const textX = x + area.cardWidth / 2;
      const textY = stateBadgeY + stateBadgeHeight / 2 + 1;

      c.fillText(
        suggestLabel,
        textX,
        textY
      );

      const titleFontSize = Math.max(5, Math.floor(area.cardWidth * 0.067));
      const bodyFontSize = Math.max(4, Math.floor(area.cardWidth * 0.055));
      const topPadding = Math.floor(area.cardHeight * 0.25);
      const bodyY = Math.floor(area.cardHeight * 0.42);
      const bodyLineHeight = Math.max(7, Math.floor(area.cardHeight * 0.11));
      const bodyPaddingX = Math.floor(area.cardWidth * 0.13);

      c.fillStyle = "#2e1c12";
      c.font = `${titleFontSize}px 'Press Start 2P'`;
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      // removed title

      // removed description text

      if (task.deadline) {
        const dueDate = new Date(task.deadline);
        const now = new Date();

        let dueLabel = "DUE";

        if (dueDate < now) {
          dueLabel = "OVERDUE";
        } else if ((dueDate - now) < 86400000) {
          dueLabel = "SOON";
        } else {
          dueLabel = "DUE";
        }

        const badgeWidth = Math.floor(area.cardWidth * 0.7);
        const badgeHeight = Math.floor(area.cardHeight * 0.2);
        const badgeX = x + area.cardWidth / 2 - badgeWidth / 2;
        const badgeY = y + area.cardHeight - badgeHeight - Math.floor(area.cardHeight * 0.04);
        const badgeFontSize = Math.max(7, Math.min(11, Math.floor(area.cardWidth * 0.1)));

        c.fillStyle = "rgba(0, 0, 0, 0.72)";
        c.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

        c.strokeStyle = "#caa56b";
        c.lineWidth = 1;
        c.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

        c.fillStyle = dueDate < now
          ? "#ff6b6b"
          : (dueDate - now) < 86400000
          ? "#ffd166"
          : "#8be38b";

        c.font = `${badgeFontSize}px 'Press Start 2P'`;
        c.textAlign = "center";
        c.textBaseline = "middle";

        c.fillText(
          dueLabel,
          x + area.cardWidth / 2,
          badgeY + badgeHeight / 2
        );
      }

      if (DEBUG) {
        c.save();
        c.strokeStyle =
          this.hoveredTaskIndex === i ? "red" : "rgba(255,255,255,0.7)";
        c.lineWidth = 1;
        c.strokeRect(x, y, area.cardWidth, area.cardHeight);
        c.restore();
      }

      c.restore();
    }

    c.restore();
  }

  drawScrollBar() {
    if (!this.isOverlayOpen || this.isCreateTaskOpen) return;

    const area = this.taskArea;
    const trackWidth = area.scrollBarWidth;
    const trackX = area.x + area.width + area.scrollBarPadding;
    const trackY = area.y;
    const trackHeight = area.height;

    const thumbMinHeight = 40;

    let thumbHeight;
    let thumbY;

    if (this.maxScrollY <= 0) {
      // no overflow yet -> show full scrollbar thumb from the start
      thumbHeight = trackHeight - 4;
      thumbY = trackY + 2;
    } else {
      thumbHeight = Math.max(
        thumbMinHeight,
        (trackHeight * trackHeight) / (trackHeight + this.maxScrollY)
      );

      const progress = this.scrollY / this.maxScrollY;
      thumbY = trackY + (trackHeight - thumbHeight) * progress;
    }

    c.save();

    c.fillStyle = "#2b1b12";
    c.fillRect(trackX, trackY, trackWidth, trackHeight);

    c.fillStyle = "#243b63";
    c.fillRect(trackX + 2, trackY + 2, trackWidth - 4, trackHeight - 4);

    c.fillStyle = "rgba(255,255,255,0.10)";
    c.fillRect(trackX + 2, trackY + 2, trackWidth - 4, 7);

    c.strokeStyle = "#8e6a3d";
    c.lineWidth = 2;
    c.strokeRect(trackX + 1, trackY + 1, trackWidth - 2, trackHeight - 2);

    c.strokeStyle = "#d5b27a";
    c.lineWidth = 1;
    c.strokeRect(trackX + 3, trackY + 3, trackWidth - 6, trackHeight - 6);

    c.fillStyle = "#2b1b12";
    c.fillRect(trackX + 1, thumbY, trackWidth - 2, thumbHeight);

    c.fillStyle = "#5b4c45";
    c.fillRect(trackX + 3, thumbY + 3, trackWidth - 6, thumbHeight - 6);

    c.fillStyle = "rgba(255,255,255,0.14)";
    c.fillRect(trackX + 3, thumbY + 3, trackWidth - 6, 6);

    c.strokeStyle = "#d2b07c";
    c.lineWidth = 1.5;
    c.strokeRect(trackX + 2, thumbY + 2, trackWidth - 4, thumbHeight - 4);

    c.restore();
  }
  
  drawDarkenedTaskImage(img, x, y, width, height) {
    const off = document.createElement("canvas");
    off.width = img.width;
    off.height = img.height;

    const offCtx = off.getContext("2d");
    offCtx.imageSmoothingEnabled = false;

    offCtx.drawImage(img, 0, 0);
    offCtx.globalCompositeOperation = "source-atop";
    offCtx.fillStyle = "rgba(37, 24, 18, 0.22)";
    offCtx.fillRect(0, 0, off.width, off.height);

    c.drawImage(off, x, y, width, height);
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(" ");
    let line = "";
    let linesDrawn = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = c.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        c.fillText(line.trim(), x + maxWidth / 2, y);
        line = words[i] + " ";
        y += lineHeight;
        linesDrawn++;

        if (linesDrawn >= maxLines - 1) {
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (linesDrawn < maxLines) {
      c.fillText(line.trim(), x + maxWidth / 2, y);
    }
  }

  updateOverlayLayout() {
    const bg = getBackgroundBounds();

    const maxWidth = bg.width * 0.9;
    const maxHeight = bg.height * 0.9;

    const scale = Math.min(
      maxWidth / this.overlayImage.width,
      maxHeight / this.overlayImage.height
    );

    this.overlay.width = this.overlayImage.width * scale;
    this.overlay.height = this.overlayImage.height * scale;
    this.overlay.x = Math.floor((canvas.width - this.overlay.width) / 2);
    this.overlay.y = Math.floor((canvas.height - this.overlay.height) / 2);

    this.closeButtonOffset.x = 150;
    this.closeButtonOffset.y = 170;

    this.closeButton.x =
      this.overlay.x +
      this.overlay.width -
      this.closeButton.size -
      this.closeButtonOffset.x;

    this.closeButton.y = this.overlay.y + this.closeButtonOffset.y;

    this.boardTitle.width = Math.min(320, this.overlay.width * 0.34);
    this.boardTitle.height = 60;
    
    const taskCenterX = this.taskArea.x + this.taskArea.width / 2;
    this.boardTitle.x = taskCenterX - this.boardTitle.width / 2;
    this.boardTitle.y = this.overlay.y + 170;

    this.createButton.x = taskCenterX - this.createButton.width / 2;
    this.createButton.y = this.overlay.y + this.overlay.height * 0.59;

    const scrollReserve =
      this.taskArea.scrollBarWidth + this.taskArea.scrollBarPadding + 10;

    this.taskArea.x = this.overlay.x + this.taskArea.paddingLeft;
    this.taskArea.y =
      this.overlay.y + this.createButton.height + 20 + this.taskArea.paddingTop;

    this.taskArea.width =
      this.overlay.width -
      this.taskArea.paddingLeft -
      this.taskArea.paddingRight -
      scrollReserve;

    this.taskArea.height =
      this.overlay.height -
      110 -
      this.taskArea.paddingTop -
      this.taskArea.paddingBottom;

    const overlayScaleX = this.overlay.width / this.overlayImage.width;
    const overlayScaleY = this.overlay.height / this.overlayImage.height;
    const overlayScale = Math.min(overlayScaleX, overlayScaleY);

    this.taskArea.cardWidth = Math.max(110, Math.floor(140 * overlayScale));
    this.taskArea.cardHeight = Math.floor(this.taskArea.cardWidth * 0.9);
    this.taskArea.gapY = Math.max(12, Math.floor(18 * overlayScale));

    this.taskArea.maxPerRow = Math.max(
      1,
      Math.floor(this.taskArea.width / (this.taskArea.cardWidth + 10))
    );

    if (this.taskArea.maxPerRow > this.tasks.length && this.tasks.length > 0) {
      this.taskArea.maxPerRow = this.tasks.length;
    }

    if (this.taskArea.maxPerRow < 1) {
      this.taskArea.maxPerRow = 1;
    }

    const usedCardWidth =
      this.taskArea.maxPerRow * this.taskArea.cardWidth;

    const remainingWidth = this.taskArea.width - usedCardWidth;

    const minGapX = Math.floor(10 * overlayScale);
    const maxGapX = Math.floor(24 * overlayScale);

    this.taskArea.gapX =
      this.taskArea.maxPerRow > 1
        ? Math.min(
            maxGapX,
            Math.max(minGapX, remainingWidth / (this.taskArea.maxPerRow - 1))
          )
        : 0;

    const totalRows = Math.ceil(this.tasks.length / this.taskArea.maxPerRow);
    const totalContentHeight =
      totalRows > 0
        ? totalRows * (this.taskArea.cardHeight + this.taskArea.gapY) -
          this.taskArea.gapY
        : 0;
    this.maxScrollY = Math.max(0, totalContentHeight - this.taskArea.height);

    if (this.scrollY > this.maxScrollY) {
      this.scrollY = this.maxScrollY;
    }
  }

  updateCreateTaskLayout() {
    const bg = getBackgroundBounds();

    const maxWidth = bg.width * 0.85;
    const maxHeight = bg.height * 0.85;

    const scale = Math.min(
      maxWidth / this.emptyTaskImage.width,
      maxHeight / this.emptyTaskImage.height
    );

    this.createTaskOverlay.width = this.emptyTaskImage.width * scale;
    this.createTaskOverlay.height = this.emptyTaskImage.height * scale;

    this.createTaskOverlay.x = Math.floor(
      (canvas.width - this.createTaskOverlay.width) / 2
    );

    this.createTaskOverlay.y = Math.floor(
      (canvas.height - this.createTaskOverlay.height) / 2
    );
  }

  drawCreateTaskOverlay() {
    if (!this.isCreateTaskOpen || !this.emptyTaskImage.complete) return;

    c.fillStyle = "rgba(0, 0, 0, 0.65)";
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.drawImage(
      this.emptyTaskImage,
      this.createTaskOverlay.x,
      this.createTaskOverlay.y,
      this.createTaskOverlay.width,
      this.createTaskOverlay.height
    );
  }

  positionTaskForm() {
    const form = document.getElementById("taskForm");
    if (!form || !this.isCreateTaskOpen) return;

    const overlay = this.createTaskOverlay;

    const formWidth = Math.floor(overlay.width * 0.40);
    const formLeft = Math.floor(
      overlay.x + overlay.width * 0.5 - formWidth / 2
    );
    const formTop = Math.floor(overlay.y + overlay.height * 0.3);

    form.style.width = `${formWidth}px`;
    form.style.left = `${formLeft}px`;
    form.style.top = `${formTop}px`;
  }

  detectHover(mouse) {
    this.hoveredTaskIndex = -1;
    this.hoverCreate = false;
    this.hoverClose = false;

    if (!mouse) return;
    if (!this.isOverlayOpen || this.isCreateTaskOpen) return;

    const area = this.taskArea;
    const startY = area.y - this.scrollY;

    const totalWidth =
      area.maxPerRow * area.cardWidth +
      (area.maxPerRow - 1) * area.gapX;

    const startX = area.x + (area.width - totalWidth) / 2;

    for (let i = 0; i < this.tasks.length; i++) {
      const col = i % area.maxPerRow;
      const row = Math.floor(i / area.maxPerRow);

      const x = startX + col * (area.cardWidth + area.gapX);
      const y = startY + row * (area.cardHeight + area.gapY);

      if (
        mouse.x >= x &&
        mouse.x <= x + area.cardWidth &&
        mouse.y >= y &&
        mouse.y <= y + area.cardHeight
      ) {
        this.hoveredTaskIndex = i;
        return;
      }
    }

    if (
      mouse.x >= this.createButton.x &&
      mouse.x <= this.createButton.x + this.createButton.width &&
      mouse.y >= this.createButton.y &&
      mouse.y <= this.createButton.y + this.createButton.height
    ) {
      this.hoverCreate = true;
    }

    if (
      mouse.x >= this.closeButton.x &&
      mouse.x <= this.closeButton.x + this.closeButton.size &&
      mouse.y >= this.closeButton.y &&
      mouse.y <= this.closeButton.y + this.closeButton.size
    ) {
      this.hoverClose = true;
    }
  }

  isPlayerNear(player) {
    const playerCenterX = player.position.x + player.width / 2;
    const playerCenterY = player.position.y + player.height / 2;

    const boardCenterX = this.position.x + this.width / 2;
    const boardCenterY = this.position.y + this.height / 2;

    const dx = playerCenterX - boardCenterX;
    const dy = playerCenterY - boardCenterY;

    const interactDistance = 90;
    return Math.sqrt(dx * dx + dy * dy) < interactDistance;
  }

  tryInteract(player) {
    if (!this.isPlayerNear(player)) return false;

    this.isOverlayOpen = true;
    this.uiOpenStart = performance.now();
    this.updateOverlayLayout();
    this.loadTasks();
    return true;
  }

  tryClose(mouseX, mouseY) {
    if (!this.isOverlayOpen || this.isCreateTaskOpen) return false;

    const inside =
      mouseX >= this.closeButton.x &&
      mouseX <= this.closeButton.x + this.closeButton.size &&
      mouseY >= this.closeButton.y &&
      mouseY <= this.closeButton.y + this.closeButton.size;

    if (inside) {
      this.isOverlayOpen = false;
      this.closeCreateTask();
      return true;
    }

    return false;
  }

  tryOpenCreateTask(mouseX, mouseY) {
    const deadlineInput = document.getElementById("taskDeadlineInput");
    const priorityInput = document.getElementById("taskPriorityInput");

    if (deadlineInput) deadlineInput.value = "";
    if (priorityInput) {
      priorityInput.value = "MED";
      priorityInput.disabled = false;
    }

    const inside =
      mouseX >= this.createButton.x &&
      mouseX <= this.createButton.x + this.createButton.width &&
      mouseY >= this.createButton.y &&
      mouseY <= this.createButton.y + this.createButton.height;

    if (inside) {
      this.selectedTaskIndex = -1;
      this.isCreateTaskOpen = true;
      this.updateCreateTaskLayout();

      const form = document.getElementById("taskForm");
      const titleInput = document.getElementById("taskTitleInput");
      const descInput = document.getElementById("taskDescInput");
      const formTitle = document.getElementById("taskFormTitle");
      const submitBtn = document.getElementById("submitTaskBtn");
      const deleteBtn = document.getElementById("deleteTaskBtn");
      const aiAssistBtn = document.getElementById("aiAssistBtn");
      const createdByText = document.getElementById("taskCreatedBy");

      if (titleInput) titleInput.value = "";
      if (descInput) descInput.value = "";
      if (formTitle) formTitle.textContent = "Create Pickup Task";
      if (submitBtn) submitBtn.textContent = "Submit";
      if (deleteBtn) deleteBtn.style.display = "none";
      if (titleInput) titleInput.disabled = false;
      if (descInput) descInput.disabled = false;
      if (deadlineInput) deadlineInput.disabled = false;
      if (priorityInput) priorityInput.disabled = false;
      if (submitBtn) submitBtn.style.display = "block";
      if (createdByText) {
        createdByText.textContent = "";
        createdByText.style.display = "none";
      }

      if (form) {
        form.dataset.mode = "create";
        form.style.display = "flex";
        this.positionTaskForm();
      }

      return true;
    }

    return false;
  }

  tryOpenExistingTask(mouseX, mouseY) {
    if (!this.isOverlayOpen || this.isCreateTaskOpen) return false;

    const deadlineInput = document.getElementById("taskDeadlineInput");
    const priorityInput = document.getElementById("taskPriorityInput");

    const area = this.taskArea;
    const startY = area.y - this.scrollY;

    const totalWidth =
      area.maxPerRow * area.cardWidth +
      (area.maxPerRow - 1) * area.gapX;

    const startX = area.x + (area.width - totalWidth) / 2;

    for (let i = 0; i < this.tasks.length; i++) {
      const col = i % area.maxPerRow;
      const row = Math.floor(i / area.maxPerRow);

      const x = startX + col * (area.cardWidth + area.gapX);
      const y = startY + row * (area.cardHeight + area.gapY);

      const inside =
        mouseX >= x &&
        mouseX <= x + area.cardWidth &&
        mouseY >= y &&
        mouseY <= y + area.cardHeight;

      if (inside) {
        const task = this.tasks[i];
        const isOwner =
          String(task.created_by_member_id) === String(this.currentMemberId);

        this.selectedTaskIndex = i;
        this.isCreateTaskOpen = true;
        this.updateCreateTaskLayout();

        const form = document.getElementById("taskForm");
        const titleInput = document.getElementById("taskTitleInput");
        const descInput = document.getElementById("taskDescInput");
        const formTitle = document.getElementById("taskFormTitle");
        const submitBtn = document.getElementById("submitTaskBtn");
        const deleteBtn = document.getElementById("deleteTaskBtn");
        const createdByText = document.getElementById("taskCreatedBy");

        if (titleInput) titleInput.value = task.title || "";
        if (descInput) descInput.value = task.description || "";

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
        }

        if (priorityInput) {
          priorityInput.value = task.priority || "MED";
        }

        if (createdByText) {
          createdByText.textContent = `Created by: ${task.created_by_name || "Unknown"}`;
          createdByText.style.display = "block";
        }

        if (isOwner) {
          if (formTitle) formTitle.textContent = "Review Pickup Task";

          if (submitBtn) {
            submitBtn.textContent = "Save";
            submitBtn.style.display = "block";
          }

          if (deleteBtn) deleteBtn.style.display = "block";
          if (aiAssistBtn) aiAssistBtn.style.display = "block";

          if (titleInput) titleInput.disabled = false;
          if (descInput) descInput.disabled = false;
          if (deadlineInput) deadlineInput.disabled = false;
          if (priorityInput) priorityInput.disabled = false;

          if (form) {
            form.dataset.mode = "review";
            form.style.display = "flex";
            this.positionTaskForm();
          }
        } else {
          if (formTitle) formTitle.textContent = "Review Pickup Task";

          if (submitBtn) {
            submitBtn.textContent = "Accept";
            submitBtn.style.display = "block";
          }

          if (deleteBtn) deleteBtn.style.display = "none";
          if (aiAssistBtn) aiAssistBtn.style.display = "none";

          if (titleInput) titleInput.disabled = true;
          if (descInput) descInput.disabled = true;
          if (deadlineInput) deadlineInput.disabled = true;
          if (priorityInput) priorityInput.disabled = true;

          if (form) {
            form.dataset.mode = "accept";
            form.style.display = "flex";
            this.positionTaskForm();
          }
        }

        return true;
      }
    }

    return false;
  }

  getUIOpenProgress() {
    if (!this.isOverlayOpen) return 1;
    if (!this.uiOpenStart) return 1;

    const elapsed = performance.now() - this.uiOpenStart;
    const t = Math.min(1, elapsed / this.uiOpenDuration);

    // ease-out cubic
    return 1 - Math.pow(1 - t, 3);
  }

  applyHorizontalReveal(cx, cy, progress) {
    c.translate(cx, cy);
    c.scale(Math.max(0.001, progress), 1);
    c.translate(-cx, -cy);
  }
  tryCloseCreateTask(mouseX, mouseY) {
    return false;
  }

  closeCreateTask() {
    this.isCreateTaskOpen = false;
    this.selectedTaskIndex = -1;
    this.hoveredTaskIndex = -1;

    const form = document.getElementById("taskForm");
    if (form) {
      form.style.display = "none";
      form.dataset.mode = "create";
    }
  }

  scrollTasks(deltaY) {
    if (!this.isOverlayOpen || this.isCreateTaskOpen) return;

    this.scrollY += deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed;

    if (this.scrollY < 0) this.scrollY = 0;
    if (this.scrollY > this.maxScrollY) this.scrollY = this.maxScrollY;
  }
}