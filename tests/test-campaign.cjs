const assert = require("node:assert/strict");
const Game = require("../campaign-core.js"),
  { ITEMS, RECIPES } = require("../campaign-data.js");
// No random spawns: the entire campaign must remain reachable through recovery.
const g = new Game(() => 1);
const tick = (n) => {
  for (let i = 0; i < n; i++) g.update(1);
};
function raw(name) {
  assert(g.unlocked(name), name + " locked");
  while (g.salvageCooldown > 0) tick(1);
  assert(g.startSalvage(name), name);
  tick(8);
  assert(!g.salvage, "Recovery blocked by cargo");
}
function credits(amount) {
  while (g.credits < amount) {
    raw("Diamond");
    const p = g.protect;
    g.protect = false;
    assert(g.sell("Diamond") === 1);
    g.protect = p;
  }
}
function energy(amount) {
  assert(!amount || g.count("Reactor"), "No power source");
  while (g.energy < amount) tick(1);
}
function ensure(name, quantity) {
  while (g.amount(name) < quantity) {
    if (ITEMS[name].rate) raw(name);
    else craft(name);
  }
}
function craft(name) {
  const r = RECIPES.find((r) => r.name === name);
  assert(r, name);
  credits(r.credits || 0);
  for (const [n, q] of Object.entries(r.ingredients)) ensure(n, q);
  energy(r.energy || 0);
  assert.equal(g.recipeReason(r), "", name + ": " + g.recipeReason(r));
  assert(g.craft(name));
  if (r.seconds) tick(r.seconds);
  assert(g.cargo() <= g.capacity());
}
assert(!g.startSalvage("Ulerite"));
assert(!g.launch());
assert(!g.calibrate());
ensure("Iron Plate", 6);
ensure("Wire", 2);
assert(g.repair());
craft("Drone");
craft("Scanner");
credits(25);
assert(g.startSurvey());
tick(12);
assert.equal(g.surveys, 1);
craft("Reactor");
credits(75);
assert(g.startSurvey());
tick(18);
assert.equal(g.surveys, 2);
craft("Refinery");
craft("Fabricator");
credits(150);
assert(g.startSurvey());
tick(24);
assert.equal(g.surveys, 3);
craft("Plasma Containment");
craft("Navigation Core");
craft("Coolant");
craft("Stable Plasma Core");
craft("Warp Drive");
assert(!g.won, "Building drive must not win");
assert(!g.launch());
energy(10);
assert(g.calibrate());
ensure("Ion Cube", 2);
ensure("Coolant", 2);
assert(g.startCharge());
tick(10);
const copy = new Game(() => 1);
copy.load(g.serialize());
assert.equal(copy.charge, g.charge);
assert(copy.charging);
g.paused = true;
const snapshot = g.serialize();
tick(10);
assert.deepEqual(g.serialize(), snapshot);
g.paused = false;
tick(20);
assert.equal(g.charge, 30);
assert(g.launch());
assert(g.won);
assert(g.objectives().every((x) => x[1]));
const doneTime = g.time;
tick(10);
assert.equal(g.time, doneTime);
const p = new Game(() => 1);
p.inventory = { Ulerite: 2, Circuit: 1, "Gold Ore": 2, Diamond: 4 };
assert.equal(p.sellAll(), 3);
assert.equal(p.amount("Ulerite"), 2);
assert.equal(p.amount("Circuit"), 1);
assert.equal(p.amount("Diamond"), 3);
p.protect = false;
p.sellAll();
assert.equal(p.cargo(), 0);
const full = new Game(() => 1);
full.inventory = { "Iron Ore": 40 };
assert(full.startSalvage("Gold Ore"));
for (let i = 0; i < 8; i++) full.update(1);
assert(full.salvage);
full.sell("Iron Ore");
full.update(1);
assert.equal(full.amount("Gold Ore"), 1);
assert(!full.salvage);
const old = new Game(() => 1);
old.load({ inventory: { "Iron Ore": 5 }, machines: { Drone: 1 }, credits: 10 });
assert.equal(old.amount("Iron Ore"), 5);
assert.equal(old.count("Drone"), 1);
assert(old.repaired);
assert(!old.won);
const won = new Game();
won.load({ won: true, machines: { "Warp Drive": 1 } });
assert(won.won);
for (const r of RECIPES) {
  assert(ITEMS[r.output || r.name]);
  for (const n of Object.keys(r.ingredients)) assert(ITEMS[n], n);
  for (const n of r.requires || [])
    assert(RECIPES.some((x) => x.machine && x.name === n));
}
console.log(
  "PASS: full zero-spawn campaign from empty cargo to launch; power, gates, surveys, processing, charge/save/resume, pause, protected selling, full-cargo recovery and legacy saves.",
);
console.log(
  "Recovery-only voyage:",
  Math.floor(g.time / 60),
  "minutes; all ingredients acquired via salvage, none injected.",
);

// Paid work is never discarded when another collection fills the cargo bay.
const pending = new Game(() => 1);
pending.machines = { Reactor: 1, Refinery: 1 };
pending.surveys = 2;
pending.energy = 60;
pending.inventory = { "Ice Crystal": 1, Redball: 1 };
assert(pending.craft("Coolant"));
assert.equal(pending.energy, 57);
pending.inventory = { "Iron Ore": 40 };
for (let i = 0; i < 3; i++) pending.update(1);
assert(pending.job);
assert.equal(pending.job.remaining, 0);
const waiting = new Game(() => 1);
waiting.load(pending.serialize());
assert(waiting.job);
assert.equal(waiting.amount("Coolant"), 0);
waiting.sell("Iron Ore");
waiting.update(1);
assert(waiting.job);
waiting.sell("Iron Ore");
waiting.update(1);
assert.equal(waiting.amount("Coolant"), 2);
assert(!waiting.job);
const frozen = new Game(() => 1);
assert(frozen.startSalvage("Iron Ore"));
frozen.paused = true;
frozen.update(1);
assert.equal(frozen.salvage.remaining, 8);
assert(!g.launch());
console.log(
  "PASS: full-cargo processing output and save/resume; paused salvage; duplicate launch protection.",
);

const synth = new Game(() => 1);
synth.machines = { Reactor: 1, Refinery: 1 };
synth.surveys = 2;
synth.energy = 40;
synth.inventory = { Craponite: 10 };
assert(synth.craft("Synthesize Ulerium"));
assert.equal(synth.amount("Craponite"), 0);
assert.equal(synth.energy, 20);
const resumedSynth = new Game(() => 1);
resumedSynth.load(synth.serialize());
for (let i = 0; i < 8; i++) resumedSynth.update(1);
assert.equal(resumedSynth.amount("Ulerium Ingot"), 1);
assert.equal(resumedSynth.amount("Synthesize Ulerium"), 0);
const reserve = new Game(() => 1);
reserve.inventory = { Craponite: 15 };
assert.equal(reserve.sellAll(), 5);
assert.equal(reserve.amount("Craponite"), 10);
const gated = new Game(() => 1);
gated.inventory = { Craponite: 10 };
assert(!gated.craft("Synthesize Ulerium"));
console.log(
  "PASS: optional Craponite synthesis, station/tier gates, energy cost, saved job output and surplus reservation.",
);

const storage = new Game(() => 1);
assert.equal(storage.capacity(), 40);
storage.inventory = { "Iron Plate": 4, "Iron Ore": 36 };
assert.equal(storage.cargo(), 40);
assert(storage.craft("Cargo Pod"));
assert.equal(storage.capacity(), 60);
assert.equal(storage.cargo(), 36);
for (let i = 1; i < 4; i++) {
  storage.inventory = { "Iron Plate": 4 };
  assert(storage.craft("Cargo Pod"));
}
assert.equal(storage.capacity(), 120);
assert.equal(storage.energyCapacity(), 100);
storage.inventory = { "Iron Plate": 4 };
assert(!storage.craft("Cargo Pod"));
assert.equal(storage.nextCargoUpgrade().name, "Reinforced Cargo Rack");
assert(!storage.craft("Reinforced Cargo Rack"));
storage.surveys = 2;
storage.machines.Fabricator = 1;
for (let i = 0; i < 2; i++) {
  storage.inventory = { "Iron Plate": 6, Circuit: 2 };
  storage.energy = 15;
  assert(storage.craft("Reinforced Cargo Rack"));
}
assert.equal(storage.capacity(), 200);
assert.equal(storage.nextCargoUpgrade(), null);
assert(!storage.craft("Reinforced Cargo Rack"));
const storageCopy = new Game(() => 1);
storageCopy.load(storage.serialize());
assert.equal(storageCopy.capacity(), 200);
const oldStorage = new Game();
oldStorage.load({
  machines: { "Cargo Pod": 15 },
  inventory: { "Iron Ore": 150 },
});
assert.equal(oldStorage.capacity(), 120);
assert.equal(oldStorage.amount("Iron Ore"), 150);
assert(!oldStorage.craft("Cargo Pod"));
console.log(
  "PASS: full-hold expansion, four pod/two rack limits, power/tier gates, 200-slot cap and saved/legacy cargo preservation.",
);

const blocked = new Game(() => 1);
blocked.inventory = { Ulerite: 40 };
assert.equal(blocked.reserve("Ulerite"), 10);
assert.equal(blocked.sellAll(), 30);
assert.equal(blocked.amount("Ulerite"), 10);
blocked.inventory = {
  "Navigation Core": 1,
  "Stable Plasma Core": 1,
  Circuit: 6,
};
assert.equal(blocked.releaseCargo("Circuit", 2), 2);
assert.equal(blocked.amount("Circuit"), 4);
assert.equal(blocked.amount("Navigation Core"), 1);
assert(blocked.protect);
assert.equal(blocked.releaseCargo("Circuit", -1), 0);
assert.equal(blocked.releaseCargo("Circuit", NaN), 0);
assert.equal(blocked.releaseCargo("Circuit", 1.5), 0);
blocked.paused = true;
assert.equal(blocked.releaseCargo("Circuit", 1), 0);
blocked.paused = false;
assert.equal(blocked.releaseCargo("Circuit", 99), 4);
const buffer = new Game(() => 1);
buffer.inventory = { "Iron Ore": 36 };
buffer.rocks = [{ id: 1, name: "Gold Ore", age: 0, life: 10 }];
assert(!buffer.collect(1, true));
assert(buffer.collect(1, false));
assert.equal(buffer.cargo(), 37);
console.log(
  "PASS: bounded protection, selective emergency sale, invalid quantities, pause and four-slot drone buffer.",
);
