/* Browser adapter: the campaign model owns rules; this file owns presentation. */
(() => {
  "use strict";
  const el = (id) => document.getElementById(id),
    game = new ZentarGame(),
    rocks = new Map(),
    SAVE = "zentar-asteroid-miner";
  let started = false,
    hasSave = false;
  const items = ZentarContent.ITEMS,
    recipes = ZentarContent.RECIPES;
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const time = (n) =>
    Math.floor(n / 60) + ":" + String(Math.floor(n) % 60).padStart(2, "0");
  const localize = () => ZentarI18n.applyDOM(document);
  function sprite(name, size = 42) {
    const item = items[name];
    if (item.art)
      return `<img class="sprite item-art" src="media/art/${item.art}.svg" width="${size}" height="${size}" alt="">`;
    const [col, row] = [
      item.sprite.charCodeAt(0) - 65,
      Number(item.sprite[1]) - 1,
    ];
    return `<span class="sprite" style="display:block;width:${size}px;height:${size}px;background-position:${col * 20}% ${row * 20}%"></span>`;
  }
  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    el("toasts").append(t);
    ZentarI18n.applyDOM(t);
    setTimeout(() => t.remove(), 4500);
  }
  function save() {
    if (!started) return;
    try {
      localStorage.setItem(SAVE, JSON.stringify(game.serialize()));
      el("save-status").textContent = "Progress saved locally.";
    } catch {
      el("save-status").textContent =
        "Browser storage unavailable; progress lasts this session.";
    }
    ZentarI18n.applyDOM(el("save-status"));
  }
  try {
    const data = JSON.parse(localStorage.getItem(SAVE));
    game.load(data);
    hasSave = Boolean(
      data &&
      typeof data === "object" &&
      (data.version ||
        data.time ||
        data.credits ||
        data.won ||
        Object.keys(data.inventory || {}).length ||
        Object.keys(data.machines || {}).length),
    );
  } catch {
    toast("No usable save found. Beginning a new voyage.");
  }
  function victory() {
    el("overlay").hidden = false;
    el("overlay").innerHTML =
      `<img class="ending-art" src="media/art/warp.svg" alt="Your ship emerges through a warp corridor"><button class="sci-fi-button language-switch" data-language-switch type="button">English</button><h1>Welcome to Zentar Haven</h1><p>The relay fades behind you. Your repaired ship finally clears the belt. The universe remains reassuringly undestroyed.<br>TOAST-9: &ldquo;I told you we would make it. Please disregard the burned charts.&rdquo;</p><p>Voyage time <b>${time(game.time)}</b> &middot; <b>${Math.floor(game.credits)}</b> credits remaining</p><button class="sci-fi-button" id="play-again">Another voyage</button>`;
    el("play-again").onclick = newGame;
    localize();
  }
  game.onEvent = (event) => {
    if (event.type === "note") toast(event.text);
    if (event.type === "collect")
      soundPlayer.playSound(SOUND_GRAB, event.drone ? 0.02 : 0.05);
    if (event.type === "win") {
      save();
      victory();
    }
  };
  function showSplash() {
    if (started) save();
    started = false;
    el("splash-continue").hidden = !hasSave;
    el("splash-continue").textContent = game.won
      ? "View completed voyage"
      : "Continue voyage";
    el("splash-save").textContent = hasSave
      ? "Saved voyage: " +
        time(game.time) +
        " / " +
        Math.floor(game.credits) +
        " credits"
      : "Your voyage begins with an empty hold and a damaged hull.";
    if (!el("splash").open) el("splash").showModal();
    localize();
    (hasSave ? el("splash-continue") : el("splash-new")).focus();
  }
  function newGame() {
    started = true;
    hasSave = true;
    if (el("splash").open) el("splash").close();
    game.reset();
    rocks.forEach((r) => r.remove());
    rocks.clear();
    el("overlay").hidden = true;
    save();
    render();
  }
  let wasFull = false;
  const missionIds = new Set();
  function action(id, label, disabled, handler) {
    missionIds.add(id);
    const b = document.getElementById(id) || document.createElement("button");
    b.id = id;
    b.className = "sci-fi-button";
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = () => {
      handler();
      save();
      render();
    };
    if (b.parentElement !== el("mission-actions"))
      el("mission-actions").append(b);
  }
  // Compare generated markup, not browser-normalized HTML; this keeps selects open.
  const markupCache = new Map();
  function html(id, markup) {
    if (markupCache.get(id) !== markup) {
      el(id).innerHTML = markup;
      markupCache.set(id, markup);
    }
  }

  function render() {
    el("credits").textContent = Math.floor(game.credits);
    el("time").textContent = time(game.time);
    el("energy").textContent =
      Math.floor(game.energy) + "/" + game.energyCapacity();
    el("pause").textContent = game.paused ? "Resume" : "Pause";
    el("protect").checked = game.protect;
    const objectives = game.objectives(),
      current = objectives.findIndex((x) => !x[1]);
    html(
      "objectives",
      objectives
        .map(
          ([title, done, help], i) =>
            `<li class="${done ? "done" : i === current ? "current" : ""}" title="${help}"><span>${done ? "&#10003;" : i + 1}</span>${title}${i === current ? `<small>${help}</small>` : ""}</li>`,
        )
        .join(""),
    );
    el("toaster-line").textContent = game.log[0] || "TOAST-9 standing by.";
    missionIds.clear();
    if (!game.repaired)
      action(
        "repair",
        "Repair hull (6 plates + 2 wire)",
        !game.has({ "Iron Plate": 6, Wire: 2 }) || game.paused,
        () => game.repair(),
      );
    else if (game.surveys < 3) {
      const s = ZentarContent.SURVEYS[game.surveys],
        reason = game.surveyReason();
      action(
        "survey",
        game.survey
          ? "Surveying..."
          : `Survey ${game.surveys + 1}: ${s.name} (${s.credits} cr)`,
        Boolean(reason),
        () => game.startSurvey(),
      );
      el("mission-actions").lastChild.title = reason || "Unlocks " + s.unlock;
    }
    if (game.count("Warp Drive")) {
      if (!game.calibrated)
        action(
          "calibrate",
          "Calibrate drive (10 energy)",
          game.energy < 10 || game.paused,
          () => game.calibrate(),
        );
      else if (game.charge < 30)
        action(
          "charge",
          game.charging ? "Charging..." : "Charge (2 Ion Cubes + 2 Coolant)",
          game.charging ||
            !game.has({ "Ion Cube": 2, Coolant: 2 }) ||
            game.paused,
          () => game.startCharge(),
        );
      else
        action(
          "launch",
          "LAUNCH TO ZENTAR HAVEN",
          game.paused || game.won,
          () => game.launch(),
        );
    }
    for (const child of [...el("mission-actions").children])
      if (!missionIds.has(child.id)) child.remove();
    const status = [];
    if (game.survey)
      status.push("Survey: " + Math.ceil(game.survey.remaining) + "s");
    if (game.job)
      status.push(
        game.job.name +
          ": " +
          (game.job.remaining
            ? Math.ceil(game.job.remaining) + "s"
            : "waiting for cargo space"),
      );
    if (game.charging || game.charge >= 30)
      status.push(
        "Drive charge: " +
          Math.floor((game.charge / 30) * 100) +
          "%" +
          (game.charging && !game.energy ? " (waiting for reactor)" : ""),
      );
    el("process-status").textContent = game.paused
      ? "Paused. All ship operations are stopped."
      : status.join(" / ") || "Ship systems standing by.";
    el("cargo-count").textContent = game.cargo() + "/" + game.capacity();
    html(
      "inventory",
      Object.keys(items)
        .filter((n) => game.amount(n))
        .map(
          (n) =>
            `<button class="tile" data-item="${n}" title="${n}: ${items[n].value} credits; ${game.reserve(n)} reserved">${sprite(n, 58)}<span class="count">${game.amount(n)}</span>${game.reserve(n) ? '<span class="reserved" aria-label="Reserved">&#128274;</span>' : ""}<span class="tile-name">${n}</span></button>`,
        )
        .join("") ||
        '<p class="muted">Empty cargo. Click an asteroid or use tractor recovery.</p>',
    );
    const upgrade = game.nextCargoUpgrade(),
      upgradeButton = el("build-cargo");
    el("cargo-limit").textContent = "Capacity " + game.capacity() + " / 200";
    el("cargo-upgrade-details").textContent = upgrade
      ? upgrade.name +
        " +" +
        upgrade.cargo +
        " / " +
        game.count(upgrade.name) +
        " of " +
        upgrade.max +
        " built / " +
        Object.entries(upgrade.ingredients)
          .map(([name, q]) => q + " " + name)
          .join(" + ") +
        (upgrade.energy ? " / " + upgrade.energy + " energy" : "")
      : "Maximum cargo expansion installed.";
    upgradeButton.textContent = upgrade
      ? "Build " + upgrade.name
      : "Cargo expansion complete";
    upgradeButton.disabled = !upgrade || Boolean(game.recipeReason(upgrade));
    el("cargo-upgrade-reason").textContent = upgrade
      ? game.recipeReason(upgrade)
      : "";
    const full = game.cargo() >= game.capacity();
    if (full && !wasFull) el("emergency-cargo").open = true;
    wasFull = full;
    const chosen = el("release-item").value;
    const releaseNames = Object.keys(game.inventory).sort(
      (a, b) =>
        Boolean(items[b].rate) - Boolean(items[a].rate) ||
        game.amount(b) - game.amount(a),
    );
    html(
      "release-item",
      releaseNames
        .map(
          (n) =>
            `<option value="${n}" ${n === chosen ? "selected" : ""}>${n} (${game.amount(n)})</option>`,
        )
        .join(""),
    );
    el("release-cargo").disabled =
      !releaseNames.length || game.paused || game.won;
    const crowded = game.cargo() >= game.capacity() * 0.9;
    el("cargo-warning").hidden = !crowded;
    el("cargo-warning").textContent = full
      ? "Cargo full. Use Free cargo space to sell only a chosen quantity."
      : upgrade
        ? "Cargo nearly full. Build the next expansion or sell surplus."
        : "Cargo nearly full. Storage limit reached; sell or process materials.";
    el("cargo-count").classList.toggle("full", crowded);
    const filter = el("recipe-filter").value;
    html(
      "crafting",
      recipes
        .map((r, i) => {
          const reason = game.recipeReason(r);
          if (
            (filter === "ready" && reason) ||
            (filter === "machines" && !r.machine) ||
            (filter === "materials" && r.machine) ||
            (filter === "storage" && !r.storage)
          )
            return "";
          const costs = Object.entries(r.ingredients).map(
            ([n, q]) =>
              `<span class="${game.amount(n) >= q ? "have" : "need"}">${q} ${n}</span>`,
          );
          if (r.energy) costs.push(r.energy + " energy");
          if (r.credits) costs.push(r.credits + " cr");
          return `<button class="recipe ${reason ? "locked" : "ready"}" data-recipe="${i}" ${reason ? "disabled" : ""} title="${escape(reason || "Build " + r.name)}">${sprite(r.output || r.name, 38)}<span><span class="name">${r.name}${r.quantity > 1 ? " x" + r.quantity : ""}</span><span class="ingredients">${costs.join(" / ")}</span><small>${reason ? escape(reason) : r.seconds ? r.seconds + "s processing" : r.machine ? "Install system" : "Craft now"}</small></span></button>`;
        })
        .join(""),
    );
    html(
      "machines",
      Object.keys(game.machines)
        .map(
          (n) =>
            `<div class="system">${sprite(n, 42)}<span>${n} x${game.count(n)}<small>${items[n].desc}</small></span></div>`,
        )
        .join("") || '<p class="muted">No installed systems.</p>',
    );
    html("ship-log", game.log.map((t) => "<p>" + escape(t) + "</p>").join(""));
    const target = el("salvage-target").value;
    html(
      "salvage-target",
      Object.keys(items)
        .filter((n) => items[n].rate && game.unlocked(n))
        .map(
          (n) =>
            `<option value="${n}" ${target === n ? "selected" : ""}>${n}</option>`,
        )
        .join(""),
    );
    el("salvage").disabled = Boolean(
      game.salvage || game.salvageCooldown > 0 || game.paused || game.won,
    );
    el("salvage-status").textContent = game.salvage
      ? game.salvage.name +
        ": " +
        (game.salvage.remaining
          ? Math.ceil(game.salvage.remaining) + "s"
          : "waiting for cargo space")
      : game.salvageCooldown > 0
        ? "Tractor recharge: " + Math.ceil(game.salvageCooldown) + "s"
        : "Guaranteed recovery in 8 seconds. Free; no fuel needed.";
    el("ship-scene").classList.toggle("repaired", game.repaired);
    el("ship-scene").classList.toggle("charged", game.charge >= 30);
    el("ship-state").textContent = game.count("Warp Drive")
      ? "DRIVE INSTALLED"
      : game.repaired
        ? "HULL ONLINE"
        : "HULL BREACH";
    el("relay-scene").hidden = game.surveys === 0 && !game.survey;
    el("relay-scene").src =
      game.surveys === 3 ? "media/art/warp.svg" : "media/art/beacon.svg";
    el("sector-label").textContent = [
      "THE OUTER BELT / STRANDED",
      "FROZEN RELAY / ICE DEPOSITS",
      "VIOLET SEAM / ULERITE",
      "QUIET CORRIDOR / EXIT VECTOR LOCKED",
    ][game.surveys];
    localize();
    game.dirty = false;
  }
  function drawRocks() {
    const live = new Set(game.rocks.map((r) => r.id));
    for (const [id, node] of rocks)
      if (!live.has(id)) {
        node.remove();
        rocks.delete(id);
      }
    const field = el("field"),
      cx = field.clientWidth / 2,
      cy = field.clientHeight / 2,
      reach = Math.hypot(cx, cy);
    for (const r of game.rocks) {
      let node = rocks.get(r.id);
      if (!node) {
        node = document.createElement("button");
        node.className = "rock";
        node.title = r.name;
        node.setAttribute("aria-label", "Mine " + r.name);
        node.innerHTML = sprite(r.name, 64);
        node.onpointerdown = () => {
          if (!game.collect(r.id))
            toast(
              "Cargo full, or game paused. Sell surplus or build a Cargo Pod.",
            );
        };
        node.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            game.collect(r.id);
          }
        };
        ZentarI18n.applyDOM(node);
        field.append(node);
        rocks.set(r.id, node);
      }
      const p = r.age / r.life,
        size = matchMedia("(pointer: coarse)").matches
          ? 48 + p * 48
          : 24 + p * 72,
        rad = 20 + p * reach,
        x = cx + Math.cos(r.angle) * rad,
        y = cy + Math.sin(r.angle) * rad;
      node.style.width = node.style.height = size + "px";
      node.firstChild.style.width = node.firstChild.style.height = "100%";
      node.style.opacity = Math.max(0.25, Math.min(1, p * 5, (1 - p) * 6));
      node.style.transform = `translate(${x - size / 2}px,${y - size / 2}px) rotate(${r.age * r.spin}deg)`;
    }
  }
  el("inventory").addEventListener("click", (e) => {
    const tile = e.target.closest("[data-item]");
    if (tile) {
      if (!game.sell(tile.dataset.item, e.shiftKey))
        toast(
          "Reserved quest cargo. Use Free cargo space to sell a chosen quantity.",
        );
      else soundPlayer.playSound(SOUND_SELL);
      render();
    }
  });
  el("crafting").addEventListener("click", (e) => {
    const b = e.target.closest("[data-recipe]");
    if (b) {
      game.craft(recipes[Number(b.dataset.recipe)].name);
      render();
      save();
    }
  });
  el("release-cargo").onclick = () => {
    const name = el("release-item").value,
      quantity = Number(el("release-quantity").value);
    if (!name || !Number.isSafeInteger(quantity) || quantity < 1) {
      toast("Choose a positive whole quantity.");
      return;
    }
    const amount = Math.min(quantity, game.amount(name));
    if (
      !confirm(
        ZentarI18n.t("Sell selected cargo even if protected?") +
          " " +
          amount +
          " x " +
          ZentarI18n.t(name),
      )
    )
      return;
    if (game.releaseCargo(name, quantity)) {
      toast("Selected cargo sold. Other cargo remains protected.");
      save();
      render();
    }
  };
  el("build-cargo").onclick = () => {
    const upgrade = game.nextCargoUpgrade();
    if (upgrade && game.craft(upgrade.name)) {
      save();
      render();
    }
  };
  el("sell-all").onclick = () => {
    const sold = game.sellAll();
    toast(
      sold
        ? "Sold surplus; protected cargo retained."
        : "Nothing unreserved to sell. Disable protection to release cargo.",
    );
    render();
  };
  el("protect").onchange = () => {
    game.protect = el("protect").checked;
    render();
  };
  el("recipe-filter").onchange = render;
  el("salvage").onclick = () => {
    game.startSalvage(el("salvage-target").value);
    render();
  };
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-tab]")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
        document
          .querySelectorAll(".tab-panel")
          .forEach((n) => (n.hidden = n.id !== b.dataset.tab));
      }),
  );
  el("new-game").onclick = () => {
    if (
      confirm(
        ZentarI18n.t("Start a new voyage? Current progress will be replaced."),
      )
    )
      newGame();
  };
  function pause() {
    if (!started || game.won) return;
    game.paused = !game.paused;
    render();
  }
  el("pause").onclick = pause;
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (!e.repeat && ["p", "P", "Escape"].includes(e.key)) {
      e.preventDefault();
      pause();
    }
  });
  let last = performance.now(),
    sinceRender = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (started) game.update(dt);
    drawRocks();
    sinceRender += dt;
    if (game.dirty || sinceRender > 0.3) {
      render();
      sinceRender = 0;
    }
    requestAnimationFrame(frame);
  }
  // Keep guidance expandable on small screens without hiding play controls.
  const compactScreen = matchMedia(
    "(max-width: 800px), (max-height: 500px) and (max-width: 1000px)",
  );
  function compactGuidance() {
    el("mission-details").open = !compactScreen.matches;
    el("help-details").open = !compactScreen.matches;
  }
  compactGuidance();
  compactScreen.addEventListener("change", compactGuidance);
  render();
  el("splash-new").onclick = () => {
    if (
      hasSave &&
      !game.won &&
      !confirm(
        ZentarI18n.t(
          "Start a new voyage? Your saved progress will be replaced.",
        ),
      )
    )
      return;
    newGame();
  };
  el("splash-continue").onclick = () => {
    started = true;
    el("splash").close();
    game.paused = false;
    if (game.won) victory();
    else {
      el("overlay").hidden = true;
      render();
    }
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-language-switch]")) return;
    ZentarI18n.setLanguage(ZentarI18n.language === "en" ? "cs" : "en");
    // Refresh both live UI and a visible briefing without changing campaign state.
    render();
    if (el("splash").open) showSplash();
    for (const node of rocks.values()) ZentarI18n.applyDOM(node);
    localize();
  });
  el("briefing").onclick = showSplash;
  // A briefing is a deliberate start/resume choice, not an accidental Escape dismissal.
  el("splash").addEventListener("cancel", (e) => e.preventDefault());
  showSplash();
  requestAnimationFrame(frame);
  setInterval(save, 3000);
  window.addEventListener("beforeunload", save);
})();
