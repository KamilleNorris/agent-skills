import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "coverage_diff.py"

LCOV_FULL = """SF:src/foo.js
DA:1,1
DA:2,1
DA:3,0
BRDA:5,0,0,1
BRDA:5,0,1,0
end_of_record
"""

LCOV_DROPPED = """SF:src/foo.js
DA:1,1
DA:2,0
DA:3,0
BRDA:5,0,0,1
BRDA:5,0,1,0
end_of_record
"""

GO_FULL = """mode: set
foo.go:1.1,3.2 2 1
foo.go:4.1,6.2 1 1
"""

GO_DROPPED = """mode: set
foo.go:1.1,3.2 2 1
foo.go:4.1,6.2 1 0
"""

GO_MALFORMED = """mode: set
foo.go:1.1,3.2 2 1
this is not a coverage line
"""


def run(before_text, after_text, tmp_path):
    before = tmp_path / "before.out"
    after = tmp_path / "after.out"
    before.write_text(before_text)
    after.write_text(after_text)
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(before), str(after)],
        capture_output=True,
        text=True,
    )


def test_lcov_coverage_held(tmp_path):
    result = run(LCOV_FULL, LCOV_FULL, tmp_path)
    assert result.returncode == 0
    assert "COVERAGE HELD" in result.stdout


def test_lcov_coverage_dropped(tmp_path):
    result = run(LCOV_FULL, LCOV_DROPPED, tmp_path)
    assert result.returncode == 1
    assert "COVERAGE DROPPED" in result.stdout
    assert "src/foo.js:2 (line)" in result.stdout


def test_go_coverage_held(tmp_path):
    result = run(GO_FULL, GO_FULL, tmp_path)
    assert result.returncode == 0
    assert "COVERAGE HELD" in result.stdout


def test_go_coverage_dropped_reports_block_not_line(tmp_path):
    result = run(GO_FULL, GO_DROPPED, tmp_path)
    assert result.returncode == 1
    assert "foo.go:4-6 (block)" in result.stdout
    assert "(line)" not in result.stdout


def test_go_malformed_line_is_a_parse_error(tmp_path):
    result = run(GO_MALFORMED, GO_FULL, tmp_path)
    assert result.returncode == 2
    assert "malformed coverprofile line" in result.stderr


def test_missing_file_is_usage_error(tmp_path):
    before = tmp_path / "before.out"
    before.write_text(LCOV_FULL)
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(before), str(tmp_path / "missing.out")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2
    assert "cannot read" in result.stderr


def test_empty_report_is_parse_error(tmp_path):
    result = run("", LCOV_FULL, tmp_path)
    assert result.returncode == 2
    assert "unrecognized coverage format" in result.stderr


def test_wrong_arg_count_is_usage_error(tmp_path):
    before = tmp_path / "before.out"
    before.write_text(LCOV_FULL)
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(before)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2
