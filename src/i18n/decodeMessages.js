/** Giải mã LOCALE_MESSAGE_SOURCES (vue-i18n AST) → chuỗi / object thuần. */

function decodeInterpolated(items) {
  if (!Array.isArray(items)) return '';
  let out = '';
  for (const part of items) {
    if (part == null) continue;
    if (typeof part === 'string') {
      out += part;
      continue;
    }
    if (typeof part !== 'object') {
      out += String(part);
      continue;
    }
    switch (part.t) {
      case 3:
        if (typeof part.v === 'string') out += part.v;
        else out += decodeMessageNode(part);
        break;
      case 4:
        if (part.k) out += `{${part.k}}`;
        break;
      default:
        out += decodeMessageNode(part);
    }
  }
  return out;
}

function decodeBody(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);

  if (node.t === 1 && Array.isArray(node.c)) {
    return node.c.map((caseNode) => decodeBody(caseNode)).join(' | ');
  }

  if (node.t === 2 || Array.isArray(node.i)) {
    if (typeof node.s === 'string') return node.s;
    if (Array.isArray(node.i)) return decodeInterpolated(node.i);
  }

  if (Array.isArray(node.c)) {
    return node.c.map((caseNode) => decodeBody(caseNode)).join(' | ');
  }

  if (typeof node.s === 'string') return node.s;

  return '';
}

export function decodeMessageNode(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);

  if (node.b) return decodeMessageNode(node.b);

  if (
    node.t === 1 ||
    node.t === 2 ||
    Array.isArray(node.i) ||
    Array.isArray(node.c)
  ) {
    return decodeBody(node);
  }

  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 't' || key === 'i') continue;
    result[key] = decodeMessageNode(value);
  }
  return result;
}

export function decodeAllLocales(sources) {
  const messages = {};
  for (const [locale, tree] of Object.entries(sources)) {
    messages[locale] = decodeMessageNode(tree);
  }
  return messages;
}
