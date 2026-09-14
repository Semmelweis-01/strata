// Rock palette: pure data plus pure functions. No clock, no randomness, no locale.
// mode is one of 'truecolor' | '256' | 'none'; anything else degrades to no color.

const FALLBACK = { name: 'unknown', rgb: [128, 128, 128], glyph: '?', ascii: '#' };

// 'glyph' is the unicode cell; 'ascii' is the U+0020..U+007E cell used when the
// terminal cannot show unicode. The eight ascii glyphs are DISTINCT on purpose:
// rock identity is core information and must survive the fallback, so collapsing
// them to one character is a data loss, not a style choice.
//   sandstone .   shale :   limestone =   basalt %
//   granite   &   marble *  chert     ~   obsidian @
// Reserved for markers, never for a rock: 'o' fossil, '/' fault and dike,
// '+' floor, '-' title rule, '#' unknown rock.
export const ROCKS = {
  sandstone: { name: 'sandstone', rgb: [214, 182, 122], glyph: '\u2591', ascii: '#' },
  shale:     { name: 'shale',     rgb: [96, 104, 116],  glyph: '\u2592', ascii: '#' },
  limestone: { name: 'limestone', rgb: [223, 220, 202], glyph: '\u2593', ascii: '#' },
  basalt:    { name: 'basalt',    rgb: [64, 68, 82],    glyph: '\u2588', ascii: '#' },
  granite:   { name: 'granite',   rgb: [196, 166, 150], glyph: '\u259A', ascii: '#' },
  marble:    { name: 'marble',    rgb: [238, 234, 227], glyph: '\u259E', ascii: '#' },
  chert:     { name: 'chert',     rgb: [130, 136, 112], glyph: '\u25A4', ascii: '#' },
  obsidian:  { name: 'obsidian',  rgb: [34, 32, 42],    glyph: '\u25A9', ascii: '#' },
};

function toXterm256(rgb) {
  const [r, g, b] = rgb;
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const q = (v) => Math.round((v / 255) * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}

/**
 * SGR foreground sequence for a rock.
 * @param {string} rockId
 * @param {'truecolor'|'256'|'none'} mode
 * @returns {string}
 */
export function rockColor(rockId, mode) {
  const rock = ROCKS[rockId] || FALLBACK;
  const rgb = rock.rgb;
  if (mode === 'truecolor') return '\x1b[38;2;' + rgb[0] + ';' + rgb[1] + ';' + rgb[2] + 'm';
  if (mode === '256') return '\x1b[38;5;' + toXterm256(rgb) + 'm';
  return '';
}

/** SGR reset. Callers must not emit this in 'none' mode. */
export function reset() {
  return '\x1b[0m';
}
