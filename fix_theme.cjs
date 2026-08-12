const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

const replaceRules = [
  // Backgrounds
  [/bg-\[\#0f172a\]/g, 'bg-white'],
  [/bg-slate-900/g, 'bg-white'],
  [/bg-slate-950/g, 'bg-slate-50'],
  [/bg-slate-800/g, 'bg-slate-100'],
  [/bg-slate-800\/50/g, 'bg-slate-50'],
  [/bg-slate-800\/80/g, 'bg-slate-100'],
  [/bg-slate-800\/90/g, 'bg-white'],
  [/bg-\[\#1e293b\]\/80/g, 'bg-slate-100'],
  
  // Borders
  [/border-slate-800/g, 'border-slate-200'],
  [/border-slate-700/g, 'border-slate-300'],
  [/border-slate-800\/80/g, 'border-slate-200'],
  [/border-slate-800\/60/g, 'border-slate-200'],
  [/divide-slate-800\/80/g, 'divide-slate-100'],
  [/divide-slate-800\/60/g, 'divide-slate-100'],
  [/divide-slate-800/g, 'divide-slate-200'],
  
  // Texts
  [/text-white/g, 'text-slate-900'],
  [/text-slate-100/g, 'text-slate-900'],
  [/text-slate-200/g, 'text-slate-800'],
  [/text-slate-300/g, 'text-slate-700'],
  [/text-slate-400/g, 'text-slate-500'],
  [/text-slate-500/g, 'text-slate-400'], 

  // Accent colors -> switch to black/gray where possible except red/green
  [/text-\[\#b8860b\]/g, 'text-slate-900'],
  [/border-\[\#b8860b\]/g, 'border-slate-900'],
  [/border-l-\[\#b8860b\]/g, 'border-l-slate-900'],
  [/border-t-\[\#b8860b\]/g, 'border-t-slate-900'],
  [/bg-\[\#b8860b\]\/10/g, 'bg-slate-100'],
  [/bg-\[\#b8860b\]\/20/g, 'bg-slate-100'],
  [/bg-\[\#b8860b\]\/30/g, 'bg-slate-200'],
  [/bg-\[\#b8860b\]/g, 'bg-slate-900'],
  
  // Amber -> Slate/Black
  [/text-amber-400/g, 'text-slate-900'],
  [/text-amber-300/g, 'text-slate-800'],
  [/bg-amber-500\/10/g, 'bg-slate-100'],
  [/bg-amber-500\/20/g, 'bg-slate-100'],
  [/bg-amber-500\/30/g, 'bg-slate-200'],
  [/border-amber-500\/30/g, 'border-slate-200'],
  [/border-amber-500\/40/g, 'border-slate-300'],
  [/border-amber-400/g, 'border-slate-900'],
  [/from-amber-500/g, 'from-slate-800'],
  [/to-amber-400/g, 'to-slate-900'],
  [/shadow-amber-500\/20/g, 'shadow-slate-200'],
  [/hover:bg-amber-500/g, 'hover:bg-slate-800'],
  
  // Specific rounded corners
  [/rounded-sm/g, 'rounded-2xl'],
  [/rounded-xs/g, 'rounded-xl']
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  replaceRules.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  content = content.replace(/bg-slate-900 text-slate-900/g, 'bg-slate-900 text-white');
  content = content.replace(/bg-slate-100 hover:bg-slate-700 text-slate-900/g, 'bg-slate-900 hover:bg-slate-800 text-white');
  content = content.replace(/bg-slate-100 text-slate-900 font-bold uppercase/g, 'bg-slate-900 text-white font-bold uppercase');
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  if (f !== 'Navbar.tsx' && f !== 'SupabaseAuth.tsx') {
    processFile(path.join(componentsDir, f));
  }
});
console.log("Done updating components.");
