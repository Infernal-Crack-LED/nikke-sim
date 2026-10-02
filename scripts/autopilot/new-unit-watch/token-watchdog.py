#!/usr/bin/env python3
"""token-watchdog.py — an OUT-OF-BAND ceiling for an unattended Claude Code run.

WHY THIS EXISTS. Every other guardrail in an autonomous setup is IN-BAND: it works by the model reading
an instruction and complying. But a runaway is precisely the state where in-band guidance has already
failed — the model is confidently doing the wrong thing, and more instructions are exactly what it is
already ignoring. When the operator is present they are the out-of-band control. Overnight there is
none, so a single bad thread can consume an entire quota with nothing to stop it.

This is that control. It sits outside the model, reads the run's own stream-json output, sums token
usage, and terminates the process when the budget is spent. The model cannot argue with it.

HOW IT WORKS
    claude -p ... --output-format stream-json --verbose > FIFO &
    python3 token-watchdog.py --pid $! --max-output-tokens N --raw run.jsonl < FIFO

  • sums `usage.output_tokens` across assistant messages (the standard cost proxy; input and cache
    counters are tracked and reported too, but the budget is enforced on output)
  • prints ONE condensed progress line per assistant turn to stdout, so the run log stays readable
    while the full stream is preserved in --raw
  • optional webhook pings at 50% and 80% so the operator can intervene from a phone
  • at 100%: SIGTERM the run, wait --grace seconds, then SIGKILL; exit 9

Exit codes:  0 = stream ended within budget   9 = killed on budget   2 = bad arguments

The webhook URL is read from the environment and NEVER printed or logged.
"""
import argparse, json, os, signal, sys, time, urllib.request


def notify(url, text):
    """Best-effort webhook ping. Never raises, never logs the URL."""
    if not url:
        return
    try:
        req = urllib.request.Request(
            url, data=json.dumps({"content": text}).encode(),
            headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        pass


def kill(pid, grace):
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.time() + grace
    while time.time() < deadline:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return
        time.sleep(0.5)
    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pid", type=int, required=True, help="PID of the claude process to terminate")
    ap.add_argument("--max-output-tokens", type=int, required=True)
    ap.add_argument("--raw", default="", help="write the full stream-json here")
    ap.add_argument("--status", default="", help="write a running status JSON here")
    ap.add_argument("--label", default="autopilot")
    ap.add_argument("--grace", type=int, default=20, help="seconds between SIGTERM and SIGKILL")
    a = ap.parse_args()

    url = os.environ.get("AUTONOMOUS_WEBHOOK", "")
    raw = open(a.raw, "a", buffering=1) if a.raw else None

    out = inp = cache_r = cache_w = 0
    turns = 0
    pinged = set()
    started = time.time()

    def status(state):
        if not a.status:
            return
        try:
            with open(a.status, "w") as fh:
                json.dump({"state": state, "output_tokens": out, "input_tokens": inp,
                           "cache_read": cache_r, "cache_write": cache_w, "turns": turns,
                           "budget": a.max_output_tokens,
                           "pct": round(100 * out / max(a.max_output_tokens, 1), 1),
                           "elapsed_min": round((time.time() - started) / 60, 1)}, fh)
        except Exception:
            pass

    for line in sys.stdin:
        if raw:
            raw.write(line)
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except Exception:
            continue

        u = (ev.get("message") or {}).get("usage") or ev.get("usage") or {}
        if u:
            out += u.get("output_tokens", 0) or 0
            inp += u.get("input_tokens", 0) or 0
            cache_r += u.get("cache_read_input_tokens", 0) or 0
            cache_w += u.get("cache_creation_input_tokens", 0) or 0
            turns += 1
            pct = 100 * out / max(a.max_output_tokens, 1)
            mins = (time.time() - started) / 60
            print(f"[watchdog] turn {turns:>4}  out {out:>9,}  ({pct:5.1f}% of budget)  "
                  f"cache_r {cache_r:>10,}  {mins:6.1f} min", flush=True)
            status("running")

            for mark in (50, 80):
                if pct >= mark and mark not in pinged:
                    pinged.add(mark)
                    notify(url, f"⚠️ {a.label}: {pct:.0f}% of token budget used "
                                f"({out:,}/{a.max_output_tokens:,} output tokens, {turns} turns, "
                                f"{mins:.0f} min elapsed).")

            if out >= a.max_output_tokens:
                msg = (f"🛑 {a.label}: TOKEN BUDGET EXHAUSTED — {out:,} output tokens "
                       f"(limit {a.max_output_tokens:,}) after {turns} turns / {mins:.0f} min. "
                       f"Terminating the run.")
                print(f"[watchdog] {msg}", flush=True)
                notify(url, msg)
                status("killed-budget")
                kill(a.pid, a.grace)
                if raw:
                    raw.close()
                sys.exit(9)

        # surface the final result line in the log
        if ev.get("type") == "result":
            print(f"[watchdog] result: {str(ev.get('result'))[:2000]}", flush=True)

    status("finished")
    print(f"[watchdog] stream ended cleanly — {out:,} output tokens over {turns} turns "
          f"({100 * out / max(a.max_output_tokens, 1):.1f}% of budget)", flush=True)
    if raw:
        raw.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
