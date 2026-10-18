const assert = require("node:assert/strict");
const i18n = require("../i18n.js"),
  { ITEMS, RECIPES, SURVEYS } = require("../campaign-data.js"),
  Game = require("../campaign-core.js");
const cs = require("../locales/cs.js");
i18n.setLanguage("cs");
for (const name of Object.keys(ITEMS))
  assert.notEqual(i18n.t(name), name, name);
for (const item of Object.values(ITEMS))
  if (item.desc) assert.notEqual(i18n.t(item.desc), item.desc, item.desc);
for (const survey of SURVEYS) {
  assert.notEqual(i18n.t(survey.name), survey.name);
  assert.notEqual(i18n.t(survey.line), survey.line);
}
const game = new Game(() => 1);
for (const [name, , help] of game.objectives()) {
  assert.notEqual(i18n.t(name), name);
  assert.notEqual(i18n.t(help), help);
}
assert(i18n.t("Need 20 energy").includes("20"));
assert.equal(i18n.t(" Credits "), " " + cs.Credits + " ");
const before = game.serialize();
i18n.setLanguage("en");
assert.equal(i18n.t("Iron Ore"), "Iron Ore");
assert.deepEqual(game.serialize(), before);
console.log(
  "PASS: Czech item names, machine descriptions, surveys, objectives, dynamic quantities, whitespace and language-independent state.",
);
