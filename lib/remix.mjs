// Shared by the static remixer and its exported project. No DOM, Node, or evaluation.
export const REMIX_DEFAULTS = Object.freeze({ title: 'Pocket greenhouse', petal: '#e99b6e', leaf: '#688b54', pace: 1 });
export const REMIX_PACES = Object.freeze([0.8, 1, 1.25]);

export function remixSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected remix settings');
  for (const key of Object.keys(input)) if (!Object.hasOwn(REMIX_DEFAULTS, key)) throw new Error(`Unknown setting: ${key}`);
  const value = { ...REMIX_DEFAULTS, ...input };
  if (typeof value.title !== 'string' || !value.title.trim() || [...value.title].length > 32 || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value.title)) throw new Error('Use a title of 1–32 characters, without control characters');
  for (const key of ['petal', 'leaf']) if (typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key])) throw new Error('Use a six-digit hex color');
  if (!REMIX_PACES.includes(value.pace)) throw new Error('Choose a supported pace');
  return { title: value.title.trim(), petal: value.petal.toLowerCase(), leaf: value.leaf.toLowerCase(), pace: value.pace };
}

export function remixProject(base, input) {
  const settings = remixSettings(input), scale = value => Math.round(value / settings.pace * 1e6) / 1e6;
  return {
    version: base.version, title: settings.title, duration: scale(base.duration), fps: base.fps,
    captions: base.captions.map(cue => ({ ...cue, start: scale(cue.start), end: scale(cue.end) })),
    score: base.score.map(note => ({ ...note, at: scale(note.at), length: scale(note.length) }))
  };
}

export function remixDrawing(trustedDrawing, input) {
  const settings = remixSettings(input);
  if ((trustedDrawing.match(/function drawFrame\(/g) || []).length !== 1) throw new Error('Expected the built-in greenhouse drawing');
  const literal = JSON.stringify(settings, null, 2).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  return `// Change these values, then rebuild your film.\nconst greenhouse = ${literal};\n\n${trustedDrawing.replace('function drawFrame(', 'function drawGreenhouse(')}\n\nfunction drawFrame(scene) {\n  drawGreenhouse({ ...scene, settings: greenhouse });\n}\n`;
}

export function remixFiles({ base, drawing, license }, input, format = 'landscape') {
  if (!['landscape', 'portrait', 'square'].includes(format)) throw new Error('Unknown format');
  return [
    { name: 'my-greenhouse/project.json', data: JSON.stringify(remixProject(base, input), null, 2) + '\n' },
    { name: 'my-greenhouse/draw.js', data: remixDrawing(drawing, input) },
    { name: 'my-greenhouse/LICENSE', data: license },
    { name: 'my-greenhouse/README.md', data: `# Your pocket greenhouse\n\nYour title, colors, timing, and original procedural score travel with this source. The browser remixer is a silent preview; the local player and MP4 include sound.\n\nExtract this ZIP. From a Looplilt checkout, use the actual path to the extracted my-greenhouse folder:\n\n\`\`\`sh\nnode bin/looplilt.mjs build /path/to/my-greenhouse --format ${format} --out greenhouse.html\n\`\`\`\n\nOpen greenhouse.html, press Play, then enable Sound. HTML needs Node.js 22+ only. Once Chromium and FFmpeg/FFprobe are installed:\n\n\`\`\`sh\nnode bin/looplilt.mjs render /path/to/my-greenhouse --format ${format} --out greenhouse.mp4\n\`\`\`\n\nQuote paths containing spaces. On Windows use your Windows path. Outputs are never overwritten; choose a new name when rebuilding.\n\nEdit the greenhouse object at the top of draw.js to change the drawing. If changing pace by hand, also adjust project.json duration, score, and captions; the browser remixer does this for you.\n\nSetup: https://github.com/alaaNfissi/Looplilt#quick-start\n\nThe original drawing and score are by Alaa Nfissi under the included MIT license. Keep that notice with copies of the original code. Your additions remain yours; using the player does not transfer ownership of your film.\n` }
  ];
}
