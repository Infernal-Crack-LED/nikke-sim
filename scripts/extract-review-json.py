#!/usr/bin/env python3
"""Rescue the verdict JSON out of a cross-family dispatch log.

The `/code-review` and `/logic-gate` bridges (scripts/kit-autonomy/dispatch-*.sh) normally
write a clean result JSON. When a dispatch instead leaves only a raw session log — the
model narrated its tool calls around the verdict, or the bridge died after the model
answered — this pulls the verdict back out instead of re-spending the dispatch.

The log is a JSON envelope with a `result` string holding the model's full output: tool
call/result blocks followed by the final JSON verdict, usually inside a ```json fence.

    python3 scripts/extract-review-json.py <log-path> <out-path> [--model NAME]

<log-path>   the dispatch session log (e.g. ~/.kimi-code/sessions/<wd>/<session>/agents/
             main/tasks/<task>/output.log), or `-` to read the envelope from stdin
<out-path>   where to write the extracted verdict, e.g.
             scratchpad/gates/<date>-<topic>/result.json
--model      stamp `model` on the verdict. The bridges inject this themselves; set it only
             when rescuing a log the bridge never stamped, and use the CANONICAL name from
             scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md — an off-protocol `model` voids
             the review.
"""

import argparse
import json
import re
import sys


def extract(text: str) -> dict:
    """Return the first parseable JSON object in the model's output."""
    # The output interleaves tool calls with their results; the verdict is what
    # survives once those blocks are dropped.
    text = re.sub(
        r'\n\*\*Tool:.*?\*\*.*?\*\*Tool Result:\*\*.*?````?json.*?````?',
        '',
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r'\n\*\*Tool:.*?\*\*.*?\*\*Tool Result:\*\*.*?```json.*?```',
        '',
        text,
        flags=re.DOTALL,
    )
    # Strip markdown fences around the final JSON block.
    text = re.sub(r'^```json\n', '', text)
    text = re.sub(r'\n```$', '', text)

    dec = json.JSONDecoder()
    start = 0
    while True:
        idx = text.find('{', start)
        if idx < 0:
            raise ValueError('no parseable JSON object in the log')
        try:
            obj, _end = dec.raw_decode(text[idx:])
            return obj
        except json.JSONDecodeError:
            start = idx + 1


def main() -> int:
    ap = argparse.ArgumentParser(
        description='Extract a cross-family review verdict from a dispatch log.'
    )
    ap.add_argument('log_path', help="dispatch session log, or '-' for stdin")
    ap.add_argument('out_path', help='where to write the extracted verdict JSON')
    ap.add_argument(
        '--model',
        default=None,
        help='stamp `model` on the verdict (canonical name — see CROSS-FAMILY-PROTOCOL.md)',
    )
    args = ap.parse_args()

    raw = sys.stdin.read() if args.log_path == '-' else open(args.log_path).read()
    envelope = json.loads(raw)
    if 'result' not in envelope:
        print(
            f'{args.log_path}: no `result` field — not a dispatch envelope',
            file=sys.stderr,
        )
        return 1

    try:
        obj = extract(envelope['result'])
    except ValueError as e:
        print(f'{args.log_path}: {e}', file=sys.stderr)
        return 1

    if args.model:
        obj['model'] = args.model
    with open(args.out_path, 'w') as f:
        json.dump(obj, f, indent=2)
    print(f'wrote {args.out_path} ({len(json.dumps(obj))} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
