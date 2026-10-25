"""Convert a LaTeX-style grantha (\\chapter, \\dnsub, \\twolineshloka, \\onelineshloka, \\gadyam)
into the site's JSON format.  Usage:  python3 tools/tex2json.py texts/naradiya-shiksha  naradiya  "नारदीयशिक्षा" "नारदः" "शिक्षाग्रन्थः" """
import json, re, sys, glob, os

def clean(s):
    s = re.sub(r'%.*', '', s)
    s = re.sub(r'\\nextShloka\{\\ddanda\}', '', s)
    s = re.sub(r'\\textbf\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\[a-zA-Z]+\{?\}?', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def convert(folder):
    sections = []
    for f in sorted(glob.glob(os.path.join(folder, '*.tex'))):
        src = open(f, encoding='utf-8').read()
        src = '\n'.join(l for l in src.split('\n') if not l.strip().startswith('%'))
        tok = re.compile(r'\\chapter\{([^}]*)\}|\\dnsub\{([^}]*)\}|\\twolineshloka\{([^}]*)\}\s*\{([^}]*)\}'
                         r'|\\threelineshloka\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}|\\onelineshloka\{([^}]*)\}|\\gadyam\{((?:[^{}]|\{[^{}]*\})*)\}|\\(?:resetShloka|closesub|closesection|cleardoublepage)|([^\\\n][^\n]*)')
        n = 0; kh = 0
        for m in tok.finditer(src):
            ch, sub, a, b, t1, t2, t3, one, gad, plain = m.groups()
            if ch:
                sections.append({'name': ch.strip(), 'seq': []}); kh = 0
            elif sub:
                kh += 1; n = 0
                sections[-1]['seq'].append({'t': 'kh', 'text': sub.strip()})
            elif a is not None:
                n += 1
                sections[-1]['seq'].append({'t': 'sl', 's': f'{kh}.{n}', 'text': clean(a) + ' ।\n' + clean(b) + ' ॥ ' + str(n) + ' ॥'})
            elif t1 is not None:
                n += 1
                sections[-1]['seq'].append({'t': 'sl', 's': f'{kh}.{n}', 'text': clean(t1) + ' ।\n' + clean(t2) + ' ।\n' + clean(t3) + ' ॥ ' + str(n) + ' ॥'})
            elif one is not None or gad is not None:
                n += 1
                sections[-1]['seq'].append({'t': 'sl', 's': f'{kh}.{n}', 'k': 'prose' if gad else '', 'text': clean(one or gad) + ' ॥ ' + str(n) + ' ॥'})
            elif plain and clean(plain):
                sections[-1]['seq'].append({'t': 'line', 'k': 'prose', 'text': clean(plain)})
    return sections

if __name__ == '__main__':
    folder, gid, title, author, kind = sys.argv[1:6]
    secs = convert(folder)
    g = {'id': gid, 'title': title, 'author': author, 'kind': kind, 'source': 'தட்டச்சு: vaishvanaran', 'sections': secs}
    rows = lambda S: ',\n'.join(json.dumps(it, ensure_ascii=False) for it in S['seq'])
    head = {k: g[k] for k in ('id', 'title', 'author', 'kind', 'source')}
    txt = json.dumps(head, ensure_ascii=False)[:-1] + ',"sections":[\n' + ',\n'.join(
        '{"name":%s,"seq":[\n%s\n]}' % (json.dumps(S['name'], ensure_ascii=False), rows(S)) for S in secs) + '\n]}\n'
    json.loads(txt)
    open(f'data/{gid}.json', 'w', encoding='utf-8').write(txt)
    idx = json.load(open('data/index.json', encoding='utf-8'))
    idx = [x for x in idx if x['id'] != gid] + [{'id': gid, 'title': title, 'author': author, 'kind': kind,
            'units': sum(1 for S in secs for x in S['seq'] if x['t'] in ('unit', 'sl'))}]
    json.dump(idx, open('data/index.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(gid, [(S['name'], sum(1 for x in S['seq'] if x['t'] == 'sl')) for S in secs])
