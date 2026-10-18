// Reproducible, one-time export of the original storefront's procedural SVG art.
// The React storefront consumes only the generated SVG files and JSON catalogue.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const source = readFileSync(path.join(root, "public/zeropop-storefront.html"), "utf8");
const start = source.indexOf("let n=0;");
const end = source.indexOf("const CATS=", start);
if (start < 0 || end < 0) throw new Error("Original ZEROPOP art definitions not found");

const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context, { timeout: 1000 });
const products = vm.runInContext("PD.map(({n,c,pr,o,ty,v,pal,t,s,sub,bd,r,l,col,bg,z,id})=>({name:n,category:c,price:pr,originalPrice:o,type:ty,variant:v,palette:pal,title:t,native:s,subtitle:sub,badge:bd,rating:r,language:l||null,color:col||null,background:bg||null,sizes:z||null,id}))", context, { timeout: 1000 });
const artDir = path.join(root, "public/brand/store-art");
mkdirSync(artDir, { recursive: true });

const defs = `<defs><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .8 0"/></filter><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1a0a04" flood-opacity=".4"/></filter><linearGradient id="wl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDE3C8"/><stop offset="1" stop-color="#D5C49C"/></linearGradient><clipPath id="cc"><circle cx="200" cy="240" r="55"/></clipPath><clipPath id="cm"><rect x="115" y="235" width="170" height="125"/></clipPath></defs>`;
for (const product of products) {
  const artwork = vm.runInContext(`S(PD[${product.id}])`, context, { timeout: 1000 });
  const svg = artwork.replace(/^(<svg)([^>]*>)/, `$1 xmlns="http://www.w3.org/2000/svg"$2${defs}`);
  writeFileSync(path.join(artDir, `${product.id}.svg`), svg);
}

for (const id of [8, 10, 11, 12, 14]) {
  const poster = vm.runInContext(`P(PL[PD[${id}].pal],PD[${id}].v,PD[${id}].t,PD[${id}].s)`, context, { timeout: 1000 });
  writeFileSync(path.join(artDir, `poster-${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">${defs}${poster}</svg>`);
}

writeFileSync(path.join(root, "lib/zeropop-products.json"), `${JSON.stringify(products, null, 2)}\n`);
console.log(`Exported ${products.length} product artworks and five hero posters.`);
