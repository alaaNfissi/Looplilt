// Declarative motifs expand to the existing score. This module is safe in Node and browsers.
const ID = /^[a-z][a-z0-9-]{0,47}$/;
function object(value, name, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name + ' must be an object');
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(name + ': unknown field ' + key);
}
function num(value, name, low, high) {
  if (!Number.isFinite(value) || value < low || value > high) throw new Error(name + ' must be between ' + low + ' and ' + high);
}
function list(value, name, max) {
  if (!Array.isArray(value) || value.length > max) throw new Error(name + ' must be an array of at most ' + max + ' items');
}
function id(value, name) { if (typeof value !== 'string' || !ID.test(value)) throw new Error(name + ' must be a lowercase stable identifier'); }
export function expandMusic(music, cues = [], duration = 600) {
  if (music === undefined) return [];
  object(music, 'music', ['bpm', 'patterns', 'tracks']);
  num(music.bpm, 'music.bpm', 20, 300);
  list(music.patterns, 'music.patterns', 128); list(music.tracks, 'music.tracks', 32);
  const patterns = new Map(), tracks = new Set(), notes = [], beatSeconds = 60 / music.bpm;
  for (const pattern of music.patterns) {
    object(pattern, 'pattern', ['id', 'beats', 'notes']); id(pattern.id, 'pattern.id');
    if (patterns.has(pattern.id)) throw new Error('Duplicate pattern: ' + pattern.id);
    num(pattern.beats, 'pattern.beats', .125, 128); list(pattern.notes, 'pattern.notes', 512);
    for (const note of pattern.notes) {
      object(note, 'pattern note', ['beat', 'length', 'pitch', 'gain']);
      num(note.beat, 'note.beat', 0, pattern.beats);
      num(note.length, 'note.length in beats', .02 / beatSeconds, 128);
      if (note.beat + note.length > pattern.beats + 1e-7) throw new Error('Pattern note extends past its pattern');
      num(note.pitch, 'note.pitch', 24, 108); num(note.gain ?? 1, 'note.gain', 0, 1);
    }
    patterns.set(pattern.id, pattern);
  }
  for (const track of music.tracks) {
    object(track, 'track', ['id', 'voice', 'gain', 'pan', 'send', 'clips']); id(track.id, 'track.id');
    if (tracks.has(track.id)) throw new Error('Duplicate track: ' + track.id);
    tracks.add(track.id);
    num(track.gain ?? .2, 'track.gain', 0, 1); num(track.pan ?? 0, 'track.pan', -1, 1); num(track.send ?? .22, 'track.send', 0, 1);
    list(track.clips, 'track.clips', 256);
    for (const clip of track.clips) {
      object(clip, 'clip', ['pattern', 'at', 'repeat', 'transpose']);
      const pattern = patterns.get(clip.pattern);
      if (!pattern) throw new Error('Unknown pattern: ' + clip.pattern);
      let at = clip.at;
      if (at && typeof at === 'object') {
        object(at, 'clip.at', ['cue', 'offset']);
        const cue = cues.find(c => c.id === at.cue);
        if (!cue) throw new Error('Unknown musical cue: ' + at.cue);
        num(at.offset ?? 0, 'cue offset', -600, 600);
        at = cue.at + (at.offset ?? 0);
      }
      num(at, 'clip.at', 0, duration);
      const repeat = clip.repeat ?? 1, transpose = clip.transpose ?? 0;
      num(repeat, 'clip.repeat', 1, 256); num(transpose, 'clip.transpose', -48, 48);
      if (!Number.isInteger(repeat) || !Number.isInteger(transpose)) throw new Error('Repeat and transpose must be integers');
      if (at + repeat * pattern.beats * beatSeconds > duration + 1e-7) throw new Error('Music clip extends past the film');
      if (notes.length + repeat * pattern.notes.length > 10000) throw new Error('Music exceeds 10000 expanded notes');
      for (let r = 0; r < repeat; r++) for (const note of pattern.notes) {
        const pitch = note.pitch + transpose; num(pitch, 'transposed pitch', 24, 108);
        notes.push({ at: at + (r * pattern.beats + note.beat) * beatSeconds, length: note.length * beatSeconds,
          pitch, voice: track.voice ?? 'soft', gain: (track.gain ?? .2) * (note.gain ?? 1), pan: track.pan ?? 0,
          send: track.send ?? .22, track: track.id, pattern: pattern.id });
      }
    }
  }
  return notes;
}
export function scoreFor(project) {
  return [...(project.score ?? []), ...expandMusic(project.music, project.cues, project.duration)];
}
