// Mechanical migration of the original storefront CSS to the React route CSS.
// Scope every selector so legacy rules cannot leak into nested store pages.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = process.cwd();
const source = readFileSync(path.join(root, "public/zeropop-storefront.html"), "utf8");
const match = source.match(/<style>([\s\S]*?)<\/style>/i);
if (!match) throw new Error("Original ZEROPOP CSS not found");
const scope = ".zeropop-native-storefront";
const css = postcss.parse(match[1]);
css.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  rule.selectors = rule.selectors.map((selector) => {
    if (selector.startsWith(":root")) return selector.replace(":root", scope);
    if (selector.startsWith("html")) return selector.replace(/^html/, scope);
    if (selector.startsWith("body")) return selector.replace(/^body/, scope);
    return `${scope} ${selector}`;
  });
});
const target = path.join(root, "app/(store)/index.css");
const current = readFileSync(target, "utf8");
const existing = current.split("/* BEGIN EXPORTED ZEROPOP REFERENCE CSS */")[0].trimEnd();
const adjustments = current.split("/* END EXPORTED ZEROPOP REFERENCE CSS */")[1] ?? "";
const generated = `\n\n/* BEGIN EXPORTED ZEROPOP REFERENCE CSS */\n${css.toString()}\n/* END EXPORTED ZEROPOP REFERENCE CSS */\n`;
writeFileSync(target, existing + generated + adjustments);
console.log("Scoped original storefront styles into index.css");
