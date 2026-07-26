#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convert HTML math expressions in LAPLACE.HTML to LaTeX for KaTeX rendering."""
import re
import sys

# Map of HTML entities -> LaTeX
ENTITY_MAP = {
    '&#8747;': '\\int ',
    '&#8734;': '\\infty',
    '&#8721;': '\\sum',
    '&#969;': '\\omega',
    '&#963;': '\\sigma',
    '&#952;': '\\theta',
    '&#945;': '\\alpha',
    '&#946;': '\\beta',
    '&#915;': '\\Gamma',
    '&#948;': '\\delta',
    '&#960;': '\\pi',
    '&#8730;': '\\sqrt ',
    '&#8805;': '\\ge',
    '&#8804;': '\\le',
    '&#8722;': '-',
    '&#215;': '\\times',
    '&#183;': '\\cdot',
    '&#8242;': "'",
    '&#8243;': "''",
    '&#8466;': '\\mathcal{L}',
    '&#8711;': '\\nabla',
    '&#8706;': '\\partial',
    '&#8477;': '\\mathbb{R}',
    '&#8450;': '\\mathbb{C}',
    '&#8469;': '\\mathbb{N}',
    '&#8834;': '\\subset',
    '&#8712;': '\\in',
    '&#8594;': '\\to',
    '&#8592;': '\\leftarrow',
    '&#8614;': '\\mapsto',
    '&#8658;': '\\Rightarrow',
    '&#8704;': '\\forall',
    '&#8707;': '\\exists',
    '&#949;': '\\epsilon',
    '&#177;': '\\pm',
    '&#189;': '\\tfrac{1}{2}',
    '&#8776;': '\\approx',
    '&#8226;': '\\bullet',
    '&#8230;': '\\dots',
    '&#8486;': '\\Omega',
    '&#965;': '\\upsilon',
    '&#964;': '\\tau',
    '&#967;': '\\chi',
    '&#966;': '\\phi',
    '&#968;': '\\psi',
    '&#956;': '\\mu',
    '&#955;': '\\lambda',
    '&#954;': '\\kappa',
    '&#951;': '\\eta',
    '&#950;': '\\zeta',
    '&#958;': '\\xi',
    '&#961;': '\\rho',
    '&#957;': '\\nu',
    '&#8345;': '_n',
    '&#8320;': '_0',
    '&#8321;': '_1',
    '&#8322;': '_2',
    '&#8323;': '_3',
    '&#178;': '^2',
    '&#179;': '^3',
    '&#8745;': '\\cap',
    '&#8744;': '\\cup',
    '&#8869;': '\\perp',
    '&#8596;': '\\leftrightarrow',
    '&#8211;': '-',
    '&#8212;': '--',
    '&#8217;': "'",
    '&#160;': ' ',
    '&nbsp;': ' ',
    '&#920;': '\\Theta',
    '&#931;': '\\Sigma',
    '&#923;': '\\Lambda',
    '&#968;': '\\psi',
    '&#7528;': 't',
    '&#239;': '\\hat{\\imath}',
    '&#1064;': '\\hat{\\jmath}',
    '&#981;': '\\varphi',
    '&#8486;': '\\Omega',
    '&#850;': '\\circ',
    '&#8727;': '*',
    '&#8758;': ':',
    '&#8764;': '\\sim',
    '&#8801;': '\\equiv',
    '&#8810;': '\\prec',
    '&#8800;': '\\ne',
    '&#8593;': '\\uparrow',
    '&#8595;': '\\downarrow',
    '&#8657;': '\\Uparrow',
    '&#8658;': '\\Rightarrow',
    '&#8660;': '\\Leftrightarrow',
    '&#8970;': '\\lfloor',
    '&#8971;': '\\rfloor',
    '&#9001;': '\\langle',
    '&#9002;': '\\rangle',
    '&#916;': '\\Delta',
    '&#956;': '\\mu',
    '&#957;': '\\nu',
    '&#958;': '\\xi',
    '&#959;': 'o',
    '&#962;': '\\varsigma',
    '&#964;': '\\tau',
    '&#966;': '\\phi',
    '&#967;': '\\chi',
    '&#968;': '\\psi',
    '&#969;': '\\omega',
    '&#974;': '\\varpi',
    '&#977;': '\\vartheta',
    '&#978;': '\\varkappa',
    '&#981;': '\\varphi',
    '&#982;': '\\varrho',
    '&#1009;': '\\varrho',
    '&#1013;': '\\epsilon',
    '&#1014;': '\\varepsilon',
}

def convert_entities(text):
    for ent, latex in ENTITY_MAP.items():
        text = text.replace(ent, latex)
    return text

def convert_sub_sup(text):
    # <sub>X</sub> -> _{X}  (but careful: only when X is more than one char or special)
    text = re.sub(r'<sub>(.*?)</sub>', lambda m: '_{' + m.group(1) + '}', text)
    text = re.sub(r'<sup>(.*?)</sup>', lambda m: '^{' + m.group(1) + '}', text)
    return text

def convert_spans(text):
    # frac span
    pattern_frac = re.compile(
        r'<span class="frac"><span class="num">(.*?)</span><span class="den">(.*?)</span></span>',
        re.DOTALL
    )
    text = pattern_frac.sub(lambda m: '\\frac{' + m.group(1) + '}{' + m.group(2) + '}', text)

    # bigop int
    pattern_int = re.compile(
        r'<span class="bigop int">\s*<span class="lim-top">(.*?)</span>\s*<span class="sym">&#8747;</span>\s*<span class="lim-bot">(.*?)</span>\s*</span>',
        re.DOTALL
    )
    text = pattern_int.sub(lambda m: '\\int_{' + m.group(2) + '}^{' + m.group(1) + '}', text)

    # bigop sum
    pattern_sum = re.compile(
        r'<span class="bigop">\s*<span class="lim-top">(.*?)</span>\s*<span class="sym">&#8721;</span>\s*<span class="lim-bot">(.*?)</span>\s*</span>',
        re.DOTALL
    )
    text = pattern_sum.sub(lambda m: '\\sum_{' + m.group(2) + '}^{' + m.group(1) + '}', text)

    # lop
    text = re.sub(r'<span class="lop">&#8466;</span>', '\\mathcal{L}', text)
    text = re.sub(r'<span class="lop">&#8496;</span>', '\\mathcal{F}', text)

    # generic bigop fallback (just symbol)
    text = re.sub(r'<span class="bigop[^"]*">.*?</span>', '', text, flags=re.DOTALL)

    return text

def clean_whitespace(text):
    # collapse multiple spaces
    text = re.sub(r'[ \t]+', ' ', text)
    text = text.strip()
    return text

def convert_math_content(content):
    """Convert HTML math content to LaTeX."""
    # First, convert spans (frac, bigop, lop)
    content = convert_spans(content)
    # Then sub/sup
    content = convert_sub_sup(content)
    # Then entities
    content = convert_entities(content)
    # Clean whitespace
    content = clean_whitespace(content)
    # Fix spacing around operators
    content = re.sub(r'\s*=\s*', ' = ', content)
    content = re.sub(r'\s+', ' ', content)
    return content

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Convert <div class="math">CONTENT</div> blocks
    def replace_math_div(m):
        content = m.group(1)
        latex = convert_math_content(content)
        return '<div class="math">$$' + latex + '$$</div>'

    # match <div class="math">...</div>  (non-greedy, but allow nested? unlikely)
    html = re.sub(
        r'<div class="math">((?:(?!</div>).)*?)</div>',
        replace_math_div,
        html,
        flags=re.DOTALL
    )

    # Convert <span class="imath">CONTENT</span>
    def replace_imath(m):
        content = m.group(1)
        latex = convert_math_content(content)
        return '<span class="imath">$' + latex + '$</span>'

    html = re.sub(
        r'<span class="imath">((?:(?!</span>).)*?)</span>',
        replace_imath,
        html,
        flags=re.DOTALL
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    print("Done.")

if __name__ == '__main__':
    process_file(sys.argv[1] if len(sys.argv) > 1 else r'D:\Java\hamravesh\HTML\LAPLACE.HTML')
