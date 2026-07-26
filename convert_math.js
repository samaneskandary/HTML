// Convert HTML math expressions in LAPLACE.HTML to LaTeX for KaTeX rendering.
const fs = require('fs');

const ENTITY_MAP = {
  '&#8747;': '\\int ', '&#8734;': '\\infty ', '&#8721;': '\\sum ',
  '&#969;': '\\omega ', '&#963;': '\\sigma ', '&#952;': '\\theta ',
  '&#945;': '\\alpha ', '&#946;': '\\beta ', '&#915;': '\\Gamma ',
  '&#948;': '\\delta ', '&#960;': '\\pi ', '&#8730;': '\\sqrt ',
  '&#8805;': '\\ge ', '&#8804;': '\\le ', '&#8722;': '-', '&#215;': '\\times ',
  '&#183;': '\\cdot ', '&#8242;': "'", '&#8243;': "''",
  '&#8466;': '\\mathcal{L}', '&#8496;': '\\mathcal{F}',
  '&#8711;': '\\nabla ', '&#8706;': '\\partial ',
  '&#8477;': '\\mathbb{R}', '&#8450;': '\\mathbb{C}', '&#8469;': '\\mathbb{N}',
  '&#8834;': '\\subset ', '&#8712;': '\\in ', '&#8594;': '\\to ',
  '&#8592;': '\\leftarrow ', '&#8614;': '\\mapsto ', '&#8658;': '\\Rightarrow ',
  '&#8704;': '\\forall ', '&#8707;': '\\exists ', '&#949;': '\\epsilon ',
  '&#177;': '\\pm ', '&#189;': '\\tfrac{1}{2}', '&#8776;': '\\approx ',
  '&#8226;': '\\bullet ', '&#8230;': '\\dots ', '&#8486;': '\\Omega ',
  '&#965;': '\\upsilon ', '&#964;': '\\tau ', '&#967;': '\\chi ',
  '&#966;': '\\phi ', '&#968;': '\\psi ', '&#956;': '\\mu ', '&#955;': '\\lambda ',
  '&#954;': '\\kappa ', '&#951;': '\\eta ', '&#950;': '\\zeta ', '&#958;': '\\xi ',
  '&#961;': '\\rho ', '&#957;': '\\nu ', '&#8345;': '_n', '&#8320;': '_0',
  '&#8321;': '_1', '&#8322;': '_2', '&#8323;': '_3', '&#178;': '^2', '&#179;': '^3',
  '&#8745;': '\\cap ', '&#8744;': '\\cup ', '&#8869;': '\\perp ',
  '&#8596;': '\\leftrightarrow ', '&#8211;': '-', '&#8212;': '--', '&#8217;': "'",
  '&#160;': ' ', '&nbsp;': ' ', '&#920;': '\\Theta ', '&#931;': '\\Sigma ',
  '&#923;': '\\Lambda ', '&#7528;': 't', '&#239;': '\\hat{\\imath}',
  '&#1064;': '\\hat{\\jmath}', '&#981;': '\\varphi ', '&#850;': '\\circ ',
  '&#8727;': '*', '&#8758;': ':', '&#8764;': '\\sim ', '&#8801;': '\\equiv ',
  '&#8800;': '\\ne ', '&#8593;': '\\uparrow ', '&#8595;': '\\downarrow ',
  '&#8660;': '\\Leftrightarrow ', '&#916;': '\\Delta ', '&#959;': 'o',
  '&#1013;': '\\epsilon ', '&#1014;': '\\varepsilon ', '&#1009;': '\\varrho ',
  '&#977;': '\\vartheta ', '&#978;': '\\varkappa ', '&#974;': '\\varpi ',
  '&#982;': '\\varrho ', '&#928;': '\\Pi ', '&#926;': '\\Xi ', '&#979;': '\\Omicron ',
  '&#710;': '\\hat ', '&#771;': '\\tilde ',
  '&#7522;': '_i',
};

const FUNC_NAMES = ['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan',
  'sinh','cosh','tanh','coth','log','ln','lg','exp','lim','min','max',
  'sup','inf','det','dim','arg','deg','gcd','ker','hom','Re','Im',
  'grad','div','curl','Pr'];

function convertEntities(text) {
  for (const [ent, latex] of Object.entries(ENTITY_MAP)) {
    text = text.split(ent).join(latex);
  }
  // Combining circumflex (hat) applies to preceding char: T&#770; -> \hat{T}
  text = text.replace(/(.)&#770;/g, '\\hat{$1}');
  // Remove any leftover combining hat with no preceding char
  text = text.replace(/&#770;/g, '');
  return text;
}

function convertSubSup(text) {
  text = text.replace(/<sub>(.*?)<\/sub>/g, (_, c) => '_{' + c + '}');
  text = text.replace(/<sup>(.*?)<\/sup>/g, (_, c) => '^{' + c + '}');
  return text;
}

function convertSpans(text) {
  text = text.replace(
    /<span class="frac"><span class="num">(.*?)<\/span><span class="den">(.*?)<\/span><\/span>/gs,
    (_, n, d) => '\\frac{' + n + '}{' + d + '}'
  );
  text = text.replace(
    /<span class="bigop int">\s*<span class="lim-top">(.*?)<\/span>\s*<span class="sym">&#8747;<\/span>\s*<span class="lim-bot">(.*?)<\/span>\s*<\/span>/gs,
    (_, top, bot) => '\\int_{' + bot + '}^{' + top + '}'
  );
  text = text.replace(
    /<span class="bigop">\s*<span class="lim-top">(.*?)<\/span>\s*<span class="sym">&#8721;<\/span>\s*<span class="lim-bot">(.*?)<\/span>\s*<\/span>/gs,
    (_, top, bot) => '\\sum_{' + bot + '}^{' + top + '}'
  );
  text = text.replace(/<span class="lop">&#8466;<\/span>/g, '\\mathcal{L}');
  text = text.replace(/<span class="lop">&#8496;<\/span>/g, '\\mathcal{F}');
  text = text.replace(/<span class="bigop[^"]*">[\s\S]*?<\/span>/g, '');
  return text;
}

function escapeLiteralBraces(text) {
  // Escape literal { and } from original HTML (Laplace braces, set notation)
  // but NOT braces that are arguments to LaTeX commands (\sqrt{...}) or already escaped (\{ \}).
  let result = '';
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      result += ch + text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '{') {
      let j = i - 1;
      while (j >= 0 && /[a-zA-Z]/.test(text[j])) j--;
      if (j >= 0 && text[j] === '\\') {
        result += '{';
        depth++;
      } else {
        result += '\\{';
      }
      i++;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) { result += '}'; depth--; }
      else { result += '\\}'; }
      i++;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

function convertFuncNames(text) {
  // grad, div, curl need \operatorname{} (not standard \grad etc.)
  ['grad', 'div', 'curl'].forEach(fn => {
    const re = new RegExp('(?<![a-zA-Z\\\\])' + fn + '(?=[\\(_\\s])', 'g');
    text = text.replace(re, '\\operatorname{' + fn + '}');
  });
  // Other function names use \fn form (KaTeX supports \sin, \cos, \lim, \Re, \Im, etc.)
  const stdFns = FUNC_NAMES.filter(f => !['grad', 'div', 'curl'].includes(f));
  for (const fn of stdFns) {
    const re = new RegExp('(?<![a-zA-Z\\\\])' + fn + '(?=[\\(_\\s])', 'g');
    text = text.replace(re, '\\' + fn);
  }
  return text;
}

function wrapTextKeywords(text) {
  text = text.replace(/(^|\s)if(?=\s)/g, '$1\\text{if}\\quad ');
  text = text.replace(/(^|\s)then(?=\s)/g, '$1\\quad \\text{then}\\quad ');
  text = text.replace(/(^|\s)where(?=\s)/g, '$1\\text{where}\\quad ');
  text = text.replace(/(^|\s)for(?=\s)/g, '$1\\text{for}\\quad ');
  text = text.replace(/(^|\s)and(?=\s)/g, '$1\\text{and} ');
  text = text.replace(/(^|\s)or(?=\s)/g, '$1\\text{or} ');
  text = text.replace(/(^|\s)let(?=\s)/g, '$1\\text{let} ');
  return text;
}

function convertSlashFractions(text) {
  // Convert clear "A / B" patterns to \frac{A}{B} for simple cases.
  let prev, iter = 0;
  do {
    prev = text;
    // paren / paren
    text = text.replace(/\(\s*([^()]+?)\s*\)\s*\/\s*\(\s*([^()]+?)\s*\)/g, '\\frac{$1}{$2}');
    // bracket / token  (e.g. [...] / h)
    text = text.replace(/\[\s*([^[\]]+?)\s*\]\s*\/\s*([a-zA-Z0-9]+(?:\^[a-zA-Z0-9{}]+)?)/g, '\\frac{$1}{$2}');
    // token / paren  (token = letters/digits possibly with ^expr, no spaces)
    text = text.replace(/(^|[^a-zA-Z0-9\\])([a-zA-Z0-9]+(?:\^[a-zA-Z0-9{}]+)?)\s*\/\s*\(\s*([^()]+?)\s*\)/g, '$1\\frac{$2}{$3}');
    // paren / token
    text = text.replace(/\(\s*([^()]+?)\s*\)\s*\/\s*([a-zA-Z0-9]+(?:\^[a-zA-Z0-9{}]+)?)/g, '\\frac{$1}{$2}');
    // \word X / \word Y  (e.g. \partial T / \partial t)
    text = text.replace(/(\\[a-zA-Z]+\s+[a-zA-Z])\s*\/\s*(\\[a-zA-Z]+\s+[a-zA-Z])/g, '\\frac{$1}{$2}');
    iter++;
  } while (text !== prev && iter < 10);
  return text;
}

function cleanWhitespace(text) {
  text = text.replace(/[ \t]+/g, ' ');
  return text.trim();
}

function breakLongFormulas(content) {
  // Break long formulas at top-level = signs AND \mapsto into aligned blocks.
  // Rule: LHS &= RHS1 on the first line; subsequent = signs go to new lines with &=.
  // Add \\[6pt] for vertical spacing between lines.
  if (/\\begin\{/.test(content)) return content;
  if (/\\text\{if\}/.test(content)) return content;
  // Find top-level = and \mapsto positions
  const breaks = [];
  let depth = 0;
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; i++; continue; }
    if (depth === 0 && ch === '=') {
      const prev = content[i-1], next = content[i+1];
      if (next !== '=' && prev !== '=' && prev !== '<' && prev !== '>' && prev !== '!' && prev !== ':') {
        breaks.push({idx: i, sep: '='});
      }
      i++; continue;
    }
    if (depth === 0 && ch === '\\' && content.substr(i, 7) === '\\mapsto') {
      breaks.push({idx: i, sep: '\\mapsto', end: i + 7});
      i += 7; continue;
    }
    i++;
  }
  // Only break if there are 2+ break points
  if (breaks.length < 2) return content;
  const parts = [];
  let prev = 0;
  for (const b of breaks) {
    parts.push(content.substring(prev, b.idx).trim());
    prev = (b.end !== undefined) ? b.end : b.idx + 1;
  }
  parts.push(content.substring(prev).trim());
  // First line: P0 &= P1 ; subsequent lines: &= P2, &= P3, ...
  let result = '\\begin{aligned}\n' + parts[0] + ' ' + breaks[0].sep + ' ' + parts[1];
  for (let k = 2; k < parts.length; k++) {
    result += ' \\\\[10pt]\n&' + breaks[k-1].sep + ' ' + parts[k];
  }
  result += '\n\\end{aligned}';
  return result;
}

function convertMathContent(content) {
  content = escapeLiteralBraces(content);
  content = convertSpans(content);
  content = convertSubSup(content);
  content = convertEntities(content);
  content = convertFuncNames(content);
  content = wrapTextKeywords(content);
  content = convertSlashFractions(content);
  content = cleanWhitespace(content);
  // tidy spacing around = and arrows (avoid HTML tag attributes)
  content = content.replace(/(?<!"|\w)\s*=\s*(?!"|\w)/g, ' = ');
  content = content.replace(/\s*\\mapsto\s*/g, ' \\;\\;\\mapsto\\;\\; ');
  content = content.replace(/\s*\\to\s*/g, ' \\to ');
  content = content.replace(/\s+/g, ' ');
  content = content.trim();
  // Break long formulas at top-level = signs
  content = breakLongFormulas(content);
  return content;
}

function replaceImathSpans(html) {
  const OPEN = '<span class="imath">';
  let result = '';
  let i = 0;
  while (i < html.length) {
    const openIdx = html.indexOf(OPEN, i);
    if (openIdx === -1) { result += html.substring(i); break; }
    result += html.substring(i, openIdx);
    const contentStart = openIdx + OPEN.length;
    let depth = 1, j = contentStart;
    while (j < html.length && depth > 0) {
      if (html.substr(j, 6) === '<span ') {
        depth++;
        const gt = html.indexOf('>', j);
        j = (gt === -1) ? html.length : gt + 1;
      } else if (html.substr(j, 7) === '</span>') {
        depth--;
        if (depth === 0) break;
        j += 7;
      } else { j++; }
    }
    const content = html.substring(contentStart, j);
    let c = convertMathContent(content);
    if (/^\$[^\$]/.test(c) && /[^\$]\$$/.test(c)) {
      result += '<span class="imath">' + c + '</span>';
    } else {
      result += '<span class="imath">$' + c + '$</span>';
    }
    i = j + 7;
  }
  return result;
}

function processFile(path) {
  let html = fs.readFileSync(path, 'utf-8');
  html = html.replace(
    /<div class="math">((?:(?!<\/div>).)*?)<\/div>/gs,
    (_, content) => {
      let c = convertMathContent(content);
      if (/^\$\$/.test(c) && /\$\$$/.test(c)) {
        return '<div class="math">' + c + '</div>';
      }
      return '<div class="math">$$' + c + '$$</div>';
    }
  );
  html = replaceImathSpans(html);
  // Convert aligned (without &) to gathered (centered lines)
  html = html.replace(/\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}/g, (_, body) => {
    if (!body.includes('&')) return '\\begin{gathered}' + body + '\\end{gathered}';
    return '\\begin{aligned}' + body + '\\end{aligned}';
  });
  fs.writeFileSync(path, html, 'utf-8');
  console.log('Done.');
}

const path = process.argv[2] || 'D:\\Java\\hamravesh\\HTML\\LAPLACE.HTML';
processFile(path);
