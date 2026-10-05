#!/usr/bin/env python3
"""Diff two coverage reports and list what the second no longer covers.

Usage:
    coverage_diff.py <before> <after>

<before> is coverage for the full suite; <after> is coverage for the full
suite with the flagged test(s) removed. Any line or branch covered in <before>
but not in <after> is a real regression — the removed test was NOT a duplicate.

Supported formats (autodetected per file):
  - lcov            (Jest, Vitest, c8/nyc, coverage.py `coverage lcov`)
  - Go coverprofile (`go test -coverprofile=...`)

Exit codes:
  0  coverage held  — every line/branch covered before is still covered
  1  coverage dropped — see the listed units; the removal was unsafe
  2  usage or parse error
"""

import sys


def _detect(text):
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("mode:"):
            return "go"
        return "lcov"
    return None


def _parse_lcov(text):
    """Return the set of covered units: ('L', file, line) and
    ('B', file, line, block, branch)."""
    covered = set()
    current_file = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("SF:"):
            current_file = line[3:]
        elif line == "end_of_record":
            current_file = None
        elif line.startswith("DA:") and current_file is not None:
            payload = line[3:].split(",")
            if len(payload) >= 2 and _to_int(payload[1]) > 0:
                covered.add(("L", current_file, payload[0]))
        elif line.startswith("BRDA:") and current_file is not None:
            payload = line[5:].split(",")
            if len(payload) >= 4 and payload[3] != "-" and _to_int(payload[3]) > 0:
                covered.add(("B", current_file, payload[0], payload[1], payload[2]))
    return covered


def _parse_go(text, path):
    """Return the set of covered blocks: ('G', file, 'startLine-endLine')."""
    covered = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("mode:"):
            continue
        try:
            location, _stmts, count = line.rsplit(" ", 2)
            file_part, span = location.rsplit(":", 1)
            start, end = span.split(",")
            start_line = start.split(".")[0]
            end_line = end.split(".")[0]
        except ValueError:
            _fail(f"malformed coverprofile line in {path}: {line!r}")
        if _to_int(count) > 0:
            covered.add(("G", file_part, f"{start_line}-{end_line}"))
    return covered


def _to_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0


def _fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(2)


def _load(path):
    try:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
    except OSError as error:
        _fail(f"cannot read {path}: {error}")
    fmt = _detect(text)
    if fmt == "lcov":
        covered = _parse_lcov(text)
    elif fmt == "go":
        covered = _parse_go(text, path)
    else:
        _fail(f"unrecognized coverage format in {path}")
    if not covered:
        _fail(f"no covered lines parsed from {path} — wrong file or empty report?")
    return covered


def _describe(unit):
    kind = unit[0]
    if kind == "L":
        return f"{unit[1]}:{unit[2]} (line)"
    if kind == "G":
        return f"{unit[1]}:{unit[2]} (block)"
    return f"{unit[1]}:{unit[2]} branch block {unit[3]}/{unit[4]}"


_KIND_LABELS = {"L": "line", "G": "block", "B": "branch"}


def _summarize_counts(units):
    counts = {}
    for unit in units:
        counts[unit[0]] = counts.get(unit[0], 0) + 1
    parts = []
    for kind in ("L", "G", "B"):
        if kind in counts:
            n = counts[kind]
            label = _KIND_LABELS[kind]
            parts.append(f"{n} {label}{'s' if n != 1 else ''}")
    return ", ".join(parts)


def main(argv):
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    before = _load(argv[1])
    after = _load(argv[2])
    lost = before - after
    if not lost:
        print(
            f"COVERAGE HELD — every unit covered before is still covered "
            f"({_summarize_counts(before)} checked)."
        )
        return 0
    print(f"COVERAGE DROPPED — {len(lost)} unit(s) no longer covered:")
    for unit in sorted(lost):
        print(f"  {_describe(unit)}")
    print(
        "\nThese were uniquely covered by the removed test(s) — it was NOT a "
        "duplicate. Restore it and downgrade the verdict to keep."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
