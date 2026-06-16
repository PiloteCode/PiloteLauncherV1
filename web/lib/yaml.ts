/**
 * Minimal YAML 1.1 subset parser — enough for our `openapi.yaml`.
 *
 * Supports: block mappings, block sequences, nested indentation, flow mappings `{}`
 * and flow sequences `[]`, single/double-quoted scalars, the `|` and `>` block scalar
 * styles, comments, and scalar coercion (booleans, null, integers, floats). It does NOT
 * implement anchors/aliases, tags, or multi-document streams (none are used in our spec).
 *
 * We ship our own rather than add a dependency; the parser is deterministic and only ever
 * runs over the repo's own checked-in spec file.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

interface Line {
  indent: number;
  content: string;
  raw: string;
}

export function parseYaml(input: string): Json {
  const lines = preprocess(input);
  if (lines.length === 0) return null;
  const [value] = parseBlock(lines, 0, lines[0]!.indent);
  return value;
}

function preprocess(input: string): Line[] {
  const out: Line[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    // Document markers.
    if (rawLine.trim() === '---' || rawLine.trim() === '...') continue;
    const stripped = stripComment(rawLine);
    if (stripped.trim().length === 0) continue;
    const indent = stripped.length - stripped.trimStart().length;
    out.push({ indent, content: stripped.trim(), raw: stripped });
  }
  return out;
}

function stripComment(line: string): string {
  let inS = false;
  let inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD) {
      // A comment must be preceded by whitespace or start the line.
      if (i === 0 || /\s/.test(line[i - 1]!)) return line.slice(0, i);
    }
  }
  return line;
}

/** Parse a block starting at `start` whose items are at indentation `indent`. */
function parseBlock(lines: Line[], start: number, indent: number): [Json, number] {
  const first = lines[start];
  if (!first) return [null, start];

  if (first.content.startsWith('- ') || first.content === '-') {
    return parseSequence(lines, start, indent);
  }
  return parseMapping(lines, start, indent);
}

function parseSequence(lines: Line[], start: number, indent: number): [Json[], number] {
  const arr: Json[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.indent < indent) break;
    if (line.indent > indent) break; // shouldn't happen for well-formed input
    if (!(line.content === '-' || line.content.startsWith('- '))) break;

    const afterDash = line.content === '-' ? '' : line.content.slice(2).trim();

    if (afterDash === '') {
      // Nested block belongs to this item.
      const childIndent = i + 1 < lines.length ? lines[i + 1]!.indent : indent + 2;
      const [val, next] = parseBlock(lines, i + 1, childIndent);
      arr.push(val);
      i = next;
      continue;
    }

    // Inline flow value after the dash ("- { … }" / "- [ … ]").
    if (afterDash.startsWith('{') || afterDash.startsWith('[')) {
      arr.push(parseFlow(afterDash));
      i += 1;
      continue;
    }

    // Inline content after the dash. It may itself be a mapping entry ("- key: v"),
    // in which case the item is a mapping that may continue on following lines.
    const colon = findColon(afterDash);
    if (colon >= 0) {
      // Treat the dash-line as the first entry of a mapping at a virtual indent.
      const virtualIndent = indent + 2;
      const synthetic: Line[] = [
        { indent: virtualIndent, content: afterDash, raw: afterDash },
        ...lines.slice(i + 1),
      ];
      const [val, consumed] = parseMapping(synthetic, 0, virtualIndent);
      arr.push(val);
      // consumed counts within `synthetic`; map back: 1 synthetic line == original line i.
      i = i + consumed; // consumed includes the synthetic first line == line i
      continue;
    }

    // Plain scalar item.
    arr.push(parseScalar(afterDash));
    i += 1;
  }
  return [arr, i];
}

function parseMapping(lines: Line[], start: number, indent: number): [{ [k: string]: Json }, number] {
  const obj: { [k: string]: Json } = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.indent < indent) break;
    if (line.indent > indent) break;
    if (line.content === '-' || line.content.startsWith('- ')) break;

    const colon = findColon(line.content);
    if (colon < 0) {
      // Not a mapping entry at this level; stop.
      break;
    }
    const key = unquoteKey(line.content.slice(0, colon).trim());
    const rest = line.content.slice(colon + 1).trim();

    if (rest === '' || rest === '|' || rest === '>' || /^[|>][+-]?$/.test(rest)) {
      if (rest.startsWith('|') || rest.startsWith('>')) {
        const [scalar, next] = parseBlockScalar(lines, i + 1, indent, rest);
        obj[key] = scalar;
        i = next;
        continue;
      }
      // Nested block (mapping or sequence) on following lines.
      const child = lines[i + 1];
      if (child && child.indent > indent) {
        const [val, next] = parseBlock(lines, i + 1, child.indent);
        obj[key] = val;
        i = next;
        continue;
      }
      // A sequence may be at the SAME indent as the key (common YAML style).
      if (child && child.indent === indent && (child.content === '-' || child.content.startsWith('- '))) {
        const [val, next] = parseSequence(lines, i + 1, indent);
        obj[key] = val;
        i = next;
        continue;
      }
      obj[key] = null;
      i += 1;
      continue;
    }

    obj[key] = parseInlineValue(rest);
    i += 1;
  }
  return [obj, i];
}

function parseBlockScalar(
  lines: Line[],
  start: number,
  parentIndent: number,
  header: string,
): [string, number] {
  const folded = header.startsWith('>');
  const collected: string[] = [];
  let i = start;
  let blockIndent = -1;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.indent <= parentIndent && line.content.length > 0) break;
    if (blockIndent < 0) blockIndent = line.indent;
    const text = line.raw.slice(blockIndent);
    collected.push(text);
    i += 1;
  }
  let result: string;
  if (folded) {
    result = collected.join(' ').trim();
  } else {
    result = collected.join('\n');
  }
  return [result, i];
}

// ── value parsing ───────────────────────────────────────────────────────────────

function parseInlineValue(text: string): Json {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    return parseFlow(t);
  }
  return parseScalar(t);
}

function parseFlow(text: string): Json {
  const [value] = parseFlowAt(text, 0);
  return value;
}

function parseFlowAt(text: string, pos: number): [Json, number] {
  let i = skipWs(text, pos);
  const ch = text[i];
  if (ch === '{') {
    const obj: { [k: string]: Json } = {};
    i++;
    i = skipWs(text, i);
    if (text[i] === '}') return [obj, i + 1];
    for (;;) {
      i = skipWs(text, i);
      const [key, ki] = parseFlowScalarToken(text, i, ':');
      i = skipWs(text, ki);
      if (text[i] === ':') i++;
      i = skipWs(text, i);
      const [val, vi] = parseFlowAt(text, i);
      obj[unquoteKey(String(key).trim())] = val;
      i = skipWs(text, vi);
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === '}') return [obj, i + 1];
      break;
    }
    return [obj, i];
  }
  if (ch === '[') {
    const arr: Json[] = [];
    i++;
    i = skipWs(text, i);
    if (text[i] === ']') return [arr, i + 1];
    for (;;) {
      i = skipWs(text, i);
      const [val, vi] = parseFlowAt(text, i);
      arr.push(val);
      i = skipWs(text, vi);
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === ']') return [arr, i + 1];
      break;
    }
    return [arr, i];
  }
  return parseFlowScalarToken(text, i, ',]}');
}

function parseFlowScalarToken(text: string, pos: number, stops: string): [Json, number] {
  let i = skipWs(text, pos);
  const ch = text[i];
  if (ch === '"' || ch === "'") {
    const quote = ch;
    let out = '';
    i++;
    while (i < text.length) {
      const c = text[i]!;
      if (c === '\\' && quote === '"') {
        out += unescape(text[i + 1]);
        i += 2;
        continue;
      }
      if (c === quote) {
        i++;
        break;
      }
      out += c;
      i++;
    }
    return [out, i];
  }
  let start = i;
  while (i < text.length && !stops.includes(text[i]!) && text[i] !== ':') i++;
  const token = text.slice(start, i).trim();
  return [parseScalar(token), i];
}

function parseScalar(token: string): Json {
  if (token.length === 0) return '';
  const ch = token[0];
  if (ch === '"' || ch === "'") {
    return unquoteScalar(token);
  }
  if (token === 'null' || token === '~' || token === 'Null' || token === 'NULL') return null;
  if (token === 'true' || token === 'True' || token === 'TRUE') return true;
  if (token === 'false' || token === 'False' || token === 'FALSE') return false;
  if (/^[-+]?\d+$/.test(token)) {
    const n = Number(token);
    if (Number.isSafeInteger(n)) return n;
  }
  if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(token)) {
    const n = Number(token);
    if (Number.isFinite(n)) return n;
  }
  return token;
}

function unquoteScalar(token: string): string {
  const quote = token[0];
  if (quote === "'") {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  // double-quoted
  let out = '';
  for (let i = 1; i < token.length - 1; i++) {
    if (token[i] === '\\') {
      out += unescape(token[i + 1]);
      i++;
    } else {
      out += token[i];
    }
  }
  return out;
}

function unescape(c: string | undefined): string {
  switch (c) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case '"':
      return '"';
    case '\\':
      return '\\';
    case '0':
      return '\0';
    default:
      return c ?? '';
  }
}

function unquoteKey(key: string): string {
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    return unquoteScalar(key);
  }
  return key;
}

function findColon(content: string): number {
  let inS = false;
  let inD = false;
  let depth = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (!inS && !inD) {
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') depth--;
      else if (c === ':' && depth === 0) {
        // Key/value separator must be followed by space or EOL.
        if (i + 1 >= content.length || content[i + 1] === ' ') return i;
      }
    }
  }
  return -1;
}

function skipWs(text: string, pos: number): number {
  let i = pos;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  return i;
}
