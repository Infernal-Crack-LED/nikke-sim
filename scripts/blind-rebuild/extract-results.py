#!/usr/bin/env python3
"""Extract completed agent outputs into reconstructions/, reviews/, and results/.

Usage: python3 scripts/blind-rebuild/extract-results.py <subagent-dir>

<subagent-dir> may be a single session dir or a parent containing many session
dirs — meta files are discovered recursively. An agent counts as "running" only
if its jsonl was written within ACTIVE_WINDOW seconds, so dead/zombie agents
(meta stuck at status==running with a stale jsonl) do not block new launches.
"""
import json, os, re, sys, glob, time

ACTIVE_WINDOW = 600  # seconds; an agent with no jsonl write this long is stalled

def extract_json(jsonl_path):
    with open(jsonl_path) as f:
        lines = f.readlines()
    for line in reversed(lines):
        line = line.strip()
        if not line: continue
        d = json.loads(line)
        if d.get('type') != 'assistant': continue
        for p in d.get('message', {}).get('parts', []):
            if isinstance(p, dict):
                txt = p.get('text', '')
                if not txt or len(txt) < 50: continue
                m = re.search(r'```json\s*\n(.*?)\n```', txt, re.DOTALL)
                js = m.group(1) if m else (txt[txt.find('{'):txt.rfind('}')+1] if '{' in txt else None)
                if js:
                    try: return json.loads(js)
                    except: continue
    return None

def main():
    subdir = sys.argv[1] if len(sys.argv) > 1 else '.'
    repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    recon_dir = os.path.join(repo, 'scripts/blind-rebuild/reconstructions')
    review_dir = os.path.join(repo, 'scripts/blind-rebuild/reviews')
    result_dir = os.path.join(repo, 'scripts/blind-rebuild/results')
    for d in [recon_dir, review_dir, result_dir]:
        os.makedirs(d, exist_ok=True)

    new = 0
    for meta_path in sorted(glob.glob(os.path.join(subdir, '**', '*.meta.json'), recursive=True)):
        with open(meta_path) as f:
            meta = json.load(f)
        desc = meta.get('description', '')
        if meta.get('status') != 'completed': continue
        m = re.search(r'(?:BLIND(?:\s+v\d+)?|SIGHTED(?:\s+(?:review|v\d+))?|RECONCILE)\s*:\s*(\S+)', desc)
        slug = m.group(1) if m else None
        if not slug: continue
        jsonl = meta_path.replace('.meta.json', '.jsonl')

        if 'RECONCILE' in desc.upper():
            out = os.path.join(result_dir, f'{slug}.json')
            if not os.path.exists(out):
                parsed = extract_json(jsonl)
                if parsed:
                    with open(out, 'w') as f: json.dump(parsed, f, indent=2); f.write('\n')
                    print(f'  ✓ RESULT: {slug} (score={parsed.get("faithfulnessScore","?")}, gotchas={len(parsed.get("gotchas",[]))})')
                    new += 1
        elif 'BLIND' in desc.upper():
            out = os.path.join(recon_dir, f'{slug}.json')
            if not os.path.exists(out):
                parsed = extract_json(jsonl)
                if parsed:
                    with open(out, 'w') as f: json.dump(parsed, f, indent=2); f.write('\n')
                    print(f'  ✓ recon: {slug}'); new += 1
        elif 'SIGHTED' in desc.upper():
            out = os.path.join(review_dir, f'{slug}.review.json')
            if not os.path.exists(out):
                parsed = extract_json(jsonl)
                if parsed:
                    with open(out, 'w') as f: json.dump(parsed, f, indent=2); f.write('\n')
                    print(f'  ✓ review: {slug}'); new += 1

    recons = len([f for f in os.listdir(recon_dir) if f.endswith('.json')])
    reviews = len([f for f in os.listdir(review_dir) if f.endswith('.review.json')])
    results = len([f for f in os.listdir(result_dir) if f.endswith('.json')])
    now = time.time()
    running = 0
    for f in glob.glob(os.path.join(subdir, '**', '*.meta.json'), recursive=True):
        if json.load(open(f)).get('status') != 'running':
            continue
        jl = f.replace('.meta.json', '.jsonl')
        if os.path.exists(jl) and now - os.path.getmtime(jl) < ACTIVE_WINDOW:
            running += 1
    print(f'\nNew: {new} | Recons: {recons}/74 | Reviews: {reviews}/74 | Results: {results}/74 | Running: {running}')

if __name__ == '__main__':
    main()
