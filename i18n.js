/* Translate presentation only: item IDs, recipes and saves are language-independent. */
const ZentarI18n = (() => {
  const cs =
    typeof module !== "undefined" ? require("./locales/cs.js") : ZENTAR_CS;
  let language =
    typeof navigator !== "undefined" && navigator.language.startsWith("cs")
      ? "cs"
      : "en";
  try {
    const saved = localStorage.getItem("zentar-language");
    if (saved === "en" || saved === "cs") language = saved;
  } catch {}
  const normalize = (text) => text.replace(/\s+/g, " ").trim();
  const keys = Object.keys(cs).sort((a, b) => b.length - a.length);
  const quote = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fragments = new RegExp(
    "(?<![\\p{L}\\p{N}_])(?:" +
      keys.map(quote).join("|") +
      ")(?![\\p{L}\\p{N}_])",
    "gu",
  );
  function t(text) {
    if (language !== "cs") return text;
    const clean = normalize(text);
    if (Object.hasOwn(cs, clean))
      return text.match(/^\s*/)[0] + cs[clean] + text.match(/\s*$/)[0];
    // Dynamic quantities and names reuse catalog fragments in one pass.
    return text.replace(fragments, (key) => cs[key]);
  }
  const textCache = new WeakMap(),
    attributeCache = new WeakMap();
  function applyDOM(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (
        !node.textContent.trim() ||
        node.parentElement?.closest("script,style,[data-language-switch]")
      )
        continue;
      let meta = textCache.get(node);
      if (!meta || node.textContent !== meta.display)
        meta = { source: node.textContent };
      meta.display = t(meta.source);
      node.textContent = meta.display;
      textCache.set(node, meta);
    }
    const attributes = [...root.querySelectorAll("[title],[aria-label],[alt]")];
    if (root.nodeType === 1 && root.matches("[title],[aria-label],[alt]"))
      attributes.unshift(root);
    for (const element of attributes) {
      const values = attributeCache.get(element) || {};
      for (const name of ["title", "aria-label", "alt"]) {
        if (!element.hasAttribute(name)) continue;
        const current = element.getAttribute(name);
        let meta = values[name];
        if (!meta || current !== meta.display) meta = { source: current };
        meta.display = t(meta.source);
        element.setAttribute(name, meta.display);
        values[name] = meta;
      }
      attributeCache.set(element, values);
    }
    document.documentElement.lang = language;
    document.title = t("Zentar - Escape the Belt");
    document.querySelectorAll("[data-language-switch]").forEach((b) => {
      b.textContent = language === "en" ? "\u010cesky" : "English";
      b.setAttribute(
        "aria-label",
        language === "en"
          ? "Switch to Czech"
          : "P\u0159epnout do angli\u010dtiny",
      );
    });
  }
  function setLanguage(value) {
    language = value === "cs" ? "cs" : "en";
    try {
      localStorage.setItem("zentar-language", language);
    } catch {}
  }
  return {
    t,
    applyDOM,
    setLanguage,
    get language() {
      return language;
    },
  };
})();
if (typeof module !== "undefined") module.exports = ZentarI18n;
