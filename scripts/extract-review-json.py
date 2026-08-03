import json
import re
import sys

log_path = '/Users/maxwellsutton/.kimi-code/sessions/wd_nikke-sim_9848f988114c/session_747a8c2f-3ffb-4da9-a563-1a0b029424ca/agents/main/tasks/bash-vus1xrnn/output.log'
out_path = 'scratchpad/gates/2026-08-02-seo/result-after-fifth-fixes.json'

raw = open(log_path).read()
envelope = json.loads(raw)
text = envelope['result']

# The model output contains tool calls and results; the final JSON verdict is at
# the end after all tool results. Drop the tool-call blocks.
text = re.sub(r'\n\*\*Tool:.*?\*\*.*?\*\*Tool Result:\*\*.*?````?json.*?````?', '', text, flags=re.DOTALL)
text = re.sub(r'\n\*\*Tool:.*?\*\*.*?\*\*Tool Result:\*\*.*?```json.*?```', '', text, flags=re.DOTALL)

# Strip markdown fences around the final JSON block.
text = re.sub(r'^```json\n', '', text)
text = re.sub(r'\n```$', '', text)

# Find the first parseable JSON object.
dec = json.JSONDecoder()
start = 0
obj = None
while True:
    idx = text.find('{', start)
    if idx < 0:
        print('NO JSON FOUND', file=sys.stderr)
        sys.exit(1)
    try:
        obj, end = dec.raw_decode(text[idx:])
        break
    except json.JSONDecodeError:
        start = idx + 1

obj['model'] = 'claude-opus-5'
with open(out_path, 'w') as f:
    json.dump(obj, f, indent=2)
print(f'wrote {out_path} ({len(json.dumps(obj))} bytes)')
