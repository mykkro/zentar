/* Campaign simulation: no DOM, shared by the browser and deterministic tests. */
const ZentarContent =
  typeof module !== "undefined"
    ? require("./campaign-data.js")
    : { ITEMS: ZENTAR_ITEMS, RECIPES: ZENTAR_RECIPES, SURVEYS: ZENTAR_SURVEYS };
class ZentarGame {
  constructor(random = Math.random) {
    this.random = random;
    this.onEvent = () => {};
    this.reset();
  }
  reset() {
    this.credits = 0;
    this.time = 0;
    this.energy = 0;
    this.won = false;
    this.repaired = false;
    this.surveys = 0;
    this.inventory = {};
    this.machines = {};
    this.job = null;
    this.survey = null;
    this.salvage = null;
    this.salvageCooldown = 0;
    this.calibrated = false;
    this.charging = false;
    this.charge = 0;
    this.protect = true;
    this.paused = false;
    this.rocks = [];
    this.nextRock = 1;
    this.droneTimer = 0;
    this.dirty = true;
    this.log = [
      "TOAST-9 online. The old Ulerium prospectors wanted to destroy the universe. We only need to leave this belt. Start with the hull.",
    ];
  }
  note(text) {
    this.log.unshift(text);
    this.log = this.log.slice(0, 8);
    this.dirty = true;
    this.onEvent({ type: "note", text });
  }
  count(name) {
    return this.machines[name] || 0;
  }
  capacity() {
    return Math.min(
      200,
      40 +
        20 * Math.min(4, this.count("Cargo Pod")) +
        40 * Math.min(2, this.count("Reinforced Cargo Rack")),
    );
  }
  nextCargoUpgrade() {
    return (
      ZentarContent.RECIPES.find(
        (r) => r.storage && this.count(r.name) < r.max,
      ) || null
    );
  }
  energyCapacity() {
    return 60 + 10 * Math.min(4, this.count("Cargo Pod"));
  }
  cargo() {
    return Object.values(this.inventory).reduce((a, b) => a + b, 0);
  }
  amount(name) {
    return this.inventory[name] || 0;
  }
  unlocked(name) {
    return (ZentarContent.ITEMS[name].tier || 0) <= this.surveys;
  }
  has(items) {
    return Object.entries(items).every(([n, q]) => this.amount(n) >= q);
  }
  consume(items) {
    Object.entries(items).forEach(([n, q]) => {
      this.inventory[n] -= q;
      if (!this.inventory[n]) delete this.inventory[n];
    });
    this.dirty = true;
  }
  add(name, q = 1) {
    if (!ZentarContent.ITEMS[name] || this.cargo() + q > this.capacity())
      return false;
    this.inventory[name] = this.amount(name) + q;
    this.dirty = true;
    return true;
  }
  recipeReason(r) {
    if (this.paused || this.won) return "Simulation paused";
    if (r.max && this.count(r.name) >= r.max) return "Build limit reached";
    if (r.unique && this.count(r.name)) return "Already installed";
    if (r.repair && !this.repaired) return "Repair hull first";
    if ((r.tier || 0) > this.surveys) return "Complete survey " + r.tier;
    const missing = (r.requires || []).find((n) => !this.count(n));
    if (missing) return "Requires " + missing;
    if (r.seconds && this.job) return "Processing bay busy";
    if (!this.has(r.ingredients)) return "Missing ingredients";
    if (this.credits < (r.credits || 0))
      return "Need " + r.credits + " credits";
    if (this.energy < (r.energy || 0)) return "Need " + r.energy + " energy";
    const consumed = Object.values(r.ingredients).reduce((a, b) => a + b, 0);
    if (
      this.cargo() - consumed + (r.machine ? 0 : r.quantity) >
      this.capacity()
    )
      return "Cargo full";
    return "";
  }
  craft(name) {
    const r = ZentarContent.RECIPES.find((r) => r.name === name);
    if (!r || this.recipeReason(r)) return false;
    this.consume(r.ingredients);
    this.credits -= r.credits || 0;
    this.energy -= r.energy || 0;
    if (r.machine) {
      this.machines[name] = this.count(name) + 1;
      this.note(name + " installed. " + ZentarContent.ITEMS[name].desc);
    } else if (r.seconds)
      this.job = {
        name,
        output: r.output || name,
        quantity: r.quantity,
        remaining: r.seconds,
        duration: r.seconds,
      };
    else this.add(name, r.quantity);
    this.dirty = true;
    return true;
  }
  repair() {
    if (
      this.paused ||
      this.won ||
      this.repaired ||
      !this.has({ "Iron Plate": 6, Wire: 2 })
    )
      return false;
    this.consume({ "Iron Plate": 6, Wire: 2 });
    this.repaired = true;
    this.note(
      "Hull sealed. Next: build a Drone, then a Scanner. I have promoted myself to chief engineer.",
    );
    return true;
  }
  surveyReason() {
    if (this.paused || this.won) return "Simulation paused";
    if (!this.count("Scanner")) return "Build a Scanner";
    if (this.surveys >= 3) return "All surveys complete";
    if (this.survey) return "Survey in progress";
    const s = ZentarContent.SURVEYS[this.surveys],
      missing = s.requires.find((n) => !this.count(n));
    if (missing) return "Requires " + missing;
    if (this.credits < s.credits) return "Need " + s.credits + " credits";
    return "";
  }
  startSurvey() {
    if (this.surveyReason()) return false;
    const s = ZentarContent.SURVEYS[this.surveys];
    this.credits -= s.credits;
    this.survey = { remaining: s.seconds, duration: s.seconds };
    this.note("Scanning: " + s.name + ". Unlocks " + s.unlock + ".");
    return true;
  }
  reserve(name) {
    if (!this.protect) return 0;
    // Keep useful campaign quantities, not every duplicate indefinitely.
    const limits = {
      "Ice Crystal": 2,
      Ulerite: 10,
      Sunstone: 4,
      "Plasma Orb": 1,
      "Ulerium Ingot": 5,
      "Ion Cube": 2,
      Coolant: 4,
      "Navigation Core": 1,
      "Stable Plasma Core": 1,
      Circuit: 6,
      "Gold Bar": 4,
    };
    if (Object.hasOwn(limits, name))
      return Math.min(limits[name], this.amount(name));
    if (name === "Craponite") return Math.min(10, this.amount(name));
    if (name === "Diamond") return Math.min(3, this.amount(name));
    if (!this.repaired && name === "Iron Plate")
      return Math.min(6, this.amount(name));
    if (!this.repaired && name === "Wire")
      return Math.min(2, this.amount(name));
    return 0;
  }
  sell(name, all = false) {
    if (this.paused || this.won) return 0;
    const free = this.amount(name) - this.reserve(name),
      q = all ? free : Math.min(1, free);
    if (q <= 0) return 0;
    this.consume({ [name]: q });
    this.credits += ZentarContent.ITEMS[name].value * q;
    return q;
  }
  // Explicitly release only the selected stack quantity; global protection stays on.
  releaseCargo(name, quantity) {
    if (
      this.paused ||
      this.won ||
      !Object.hasOwn(ZentarContent.ITEMS, name) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    )
      return 0;
    const q = Math.min(quantity, this.amount(name));
    if (!q) return 0;
    this.consume({ [name]: q });
    this.credits += ZentarContent.ITEMS[name].value * q;
    return q;
  }
  sellAll() {
    let sold = 0;
    Object.keys(this.inventory).forEach((n) => (sold += this.sell(n, true)));
    return sold;
  }
  startSalvage(name) {
    if (
      !Object.hasOwn(ZentarContent.ITEMS, name) ||
      this.paused ||
      this.won ||
      this.salvage ||
      this.salvageCooldown > 0 ||
      !this.unlocked(name) ||
      !ZentarContent.ITEMS[name].rate
    )
      return false;
    this.salvage = { name, remaining: 8 };
    this.dirty = true;
    return true;
  }
  collect(id, drone = false) {
    if (drone && this.cargo() >= this.capacity() - 4) return false;
    if (this.paused || this.won || this.cargo() >= this.capacity())
      return false;
    const rock = this.rocks.find((r) => r.id === id);
    if (!rock) return false;
    this.add(rock.name);
    this.rocks = this.rocks.filter((r) => r.id !== id);
    this.onEvent({ type: "collect", name: rock.name, drone });
    return true;
  }
  calibrate() {
    if (
      this.paused ||
      this.won ||
      !this.count("Warp Drive") ||
      this.surveys < 3 ||
      this.calibrated ||
      this.energy < 10
    )
      return false;
    this.energy -= 10;
    this.calibrated = true;
    this.note(
      "Corridor coordinates locked. Two Ion Cubes and two Coolant will start the final charge.",
    );
    return true;
  }
  startCharge() {
    if (
      this.paused ||
      this.won ||
      !this.calibrated ||
      this.charging ||
      this.charge >= 30 ||
      !this.has({ "Ion Cube": 2, Coolant: 2 })
    )
      return false;
    this.consume({ "Ion Cube": 2, Coolant: 2 });
    this.charging = true;
    this.note(
      "Charging the drive. Reactor energy keeps it stable. Thirty seconds until we can leave.",
    );
    return true;
  }
  launch() {
    if (
      this.paused ||
      this.won ||
      !this.calibrated ||
      this.charge < 30 ||
      !this.count("Warp Drive")
    )
      return false;
    this.won = true;
    this.note(
      "Jump complete. Zentar Haven reached, universe still intact. TOAST-9 thanks Gutalax for a smooth passage and requests a clean crumb tray.",
    );
    this.onEvent({ type: "win" });
    return true;
  }
  update(dt) {
    if (this.paused || this.won) return;
    dt = Math.max(0, Math.min(dt, 1));
    this.time += dt;
    this.energy = Math.min(
      this.energyCapacity(),
      this.energy + 2 * this.count("Reactor") * dt,
    );
    this.salvageCooldown = Math.max(0, this.salvageCooldown - dt);
    if (this.survey) {
      this.survey.remaining -= dt;
      if (this.survey.remaining <= 0) {
        const s = ZentarContent.SURVEYS[this.surveys];
        this.surveys++;
        this.survey = null;
        this.note(s.line);
      }
    }
    if (this.job) {
      this.job.remaining = Math.max(0, this.job.remaining - dt);
      if (
        !this.job.remaining &&
        this.add(this.job.output || this.job.name, this.job.quantity)
      ) {
        this.note(this.job.name + " batch complete.");
        this.job = null;
      }
    }
    if (this.salvage) {
      this.salvage.remaining = Math.max(0, this.salvage.remaining - dt);
      if (!this.salvage.remaining && this.add(this.salvage.name)) {
        this.note("Tractor recovered " + this.salvage.name + ".");
        this.salvage = null;
        this.salvageCooldown = 4;
      }
    }
    if (this.charging) {
      const step = Math.min(dt, this.energy, 30 - this.charge);
      this.energy -= step;
      this.charge += step;
      if (this.charge >= 30) {
        this.charge = 30;
        this.charging = false;
        this.note("Drive charged. The launch switch is yours, captain.");
      }
    }
    this.rocks = this.rocks.filter((r) => (r.age += dt) < r.life);
    Object.entries(ZentarContent.ITEMS).forEach(([name, item]) => {
      if (
        item.rate &&
        this.unlocked(name) &&
        this.rocks.length < 15 &&
        this.random() < item.rate * (1 + 0.4 * this.count("Scanner")) * dt
      ) {
        this.rocks.push({
          id: this.nextRock++,
          name,
          age: 0,
          life: item.life,
          angle: this.random() * Math.PI * 2,
          spin: (this.random() - 0.5) * 90,
        });
      }
    });
    this.droneTimer += dt * this.count("Drone");
    while (this.droneTimer >= 4) {
      this.droneTimer -= 4;
      const target = this.rocks.reduce(
        (a, b) => (!a || b.age / b.life > a.age / a.life ? b : a),
        null,
      );
      if (target) this.collect(target.id, true);
    }
  }
  objectives() {
    return [
      ["Seal the hull", this.repaired, "6 Iron Plates + 2 Wire"],
      [
        "Automate and restore the scanner",
        this.count("Drone") > 0 && this.count("Scanner") > 0,
        "Build a Drone, then a Scanner",
      ],
      [
        "Find the frozen relay",
        this.surveys >= 1,
        "Survey 1 unlocks Ice Crystal",
      ],
      [
        "Restore power and find Ulerite",
        this.count("Reactor") > 0 && this.surveys >= 2,
        "Build a Reactor, then complete survey 2",
      ],
      [
        "Process materials and chart the corridor",
        this.count("Refinery") > 0 &&
          this.count("Fabricator") > 0 &&
          this.surveys >= 3,
        "Build Refinery and Fabricator; complete survey 3",
      ],
      [
        "Assemble the drive",
        this.count("Warp Drive") > 0,
        "Contain plasma, build a Navigation Core and assemble the Warp Drive",
      ],
      [
        "Calibrate, charge and launch",
        this.won,
        "Calibrate; supply 2 Ion Cubes and 2 Coolant; charge for 30 seconds; launch",
      ],
    ];
  }
  serialize() {
    const out = { version: 2 };
    for (const k of [
      "credits",
      "time",
      "energy",
      "won",
      "repaired",
      "surveys",
      "inventory",
      "machines",
      "job",
      "survey",
      "salvage",
      "salvageCooldown",
      "calibrated",
      "charging",
      "charge",
      "protect",
      "log",
    ])
      out[k] = this[k];
    return JSON.parse(JSON.stringify(out));
  }
  load(data) {
    if (!data || typeof data !== "object") return;
    const number = (n, max = 1e9) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.max(0, Math.min(max, n))
        : 0;
    this.credits = number(data.credits);
    this.time = number(data.time);
    this.energy = number(data.energy, 1000);
    const machineNames = new Set(
      ZentarContent.RECIPES.filter((r) => r.machine).map((r) => r.name),
    );
    for (const [name, q] of Object.entries(data.inventory || {}))
      if (
        Object.hasOwn(ZentarContent.ITEMS, name) &&
        !machineNames.has(name) &&
        number(q)
      )
        this.inventory[name] = Math.floor(number(q, 100000));
    for (const [name, q] of Object.entries(data.machines || {}))
      if (machineNames.has(name) && number(q))
        this.machines[name] = Math.floor(number(q, 1000));
    this.repaired = Boolean(
      data.repaired ||
      (data.version !== 2 && Object.keys(this.machines).length),
    );
    this.surveys = Math.floor(number(data.surveys, 3));
    this.won = Boolean(data.won);
    this.calibrated = Boolean(
      data.calibrated && this.count("Warp Drive") && this.surveys === 3,
    );
    this.charge = number(data.charge, 30);
    this.charging = Boolean(
      data.charging && this.calibrated && this.charge < 30,
    );
    this.protect = data.protect !== false;
    if (data.job) {
      const r = ZentarContent.RECIPES.find(
        (r) => r.name === data.job.name && r.seconds,
      );
      if (r)
        this.job = {
          name: r.name,
          output: r.output || r.name,
          quantity: r.quantity,
          remaining: number(data.job.remaining, r.seconds),
          duration: r.seconds,
        };
    }
    if (data.survey && this.surveys < 3) {
      const s = ZentarContent.SURVEYS[this.surveys];
      this.survey = {
        remaining: number(data.survey.remaining, s.seconds),
        duration: s.seconds,
      };
    }
    if (
      data.salvage &&
      Object.hasOwn(ZentarContent.ITEMS, data.salvage.name) &&
      ZentarContent.ITEMS[data.salvage.name].rate &&
      this.unlocked(data.salvage.name)
    )
      this.salvage = {
        name: data.salvage.name,
        remaining: number(data.salvage.remaining, 8),
      };
    this.salvageCooldown = number(data.salvageCooldown, 4);
    this.energy = Math.min(this.energy, this.energyCapacity());
    if (Array.isArray(data.log))
      this.log = data.log
        .filter((t) => typeof t === "string")
        .map((t) => t.slice(0, 300))
        .slice(0, 8);
    if (data.version !== 2 && !this.won)
      this.note(
        "Old cargo and machines recovered. New corridor surveys and drive commissioning are available.",
      );
  }
}
if (typeof module !== "undefined") module.exports = ZentarGame;
