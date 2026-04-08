#!/usr/bin/env python3
"""
Export script: Clean _Draft.md into a pure plain-text version.
Usage: python export_clean.py <project_folder_path>
Example: python .agent/scripts/export_clean.py sample_project
"""

import re
import sys
from pathlib import Path


def clean_draft(input_path: Path, output_path: Path):
    text = input_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    cleaned = []
    skip_next_blank = False

    for line in lines:
        stripped = line.strip()

        # Skip Volume title lines (# Project - Volume 1)
        if re.match(r"^#\s+.+[-—]\s*Volume\s+\d+", stripped, re.IGNORECASE):
            skip_next_blank = True
            continue

        # Skip Chunk title lines (## Chunk N: Title)
        if re.match(r"^#{1,3}\s+Chunk\s+\d+", stripped):
            skip_next_blank = True
            continue

        # Skip separator lines (---, ***, ___)
        if re.match(r"^[-*_]{3,}\s*$", stripped):
            skip_next_blank = True
            continue

        # Skip HTML comments (<!-- DRAFT_END_ANCHOR --> etc.)
        if re.match(r"^<!--.*-->$", stripped):
            skip_next_blank = True
            continue

        # Skip consecutive blank lines after removed markers
        if stripped == "" and skip_next_blank:
            continue

        skip_next_blank = False
        cleaned.append(line)

    # Trim leading/trailing blank lines, add final newline
    result = "\n".join(cleaned).strip() + "\n"

    output_path.write_text(result, encoding="utf-8")
    print(f"Done: {output_path}")
    print(f"  Original: {len(lines)} lines")
    print(f"  Cleaned: {len(cleaned)} lines")
    print(f"  Removed: {len(lines) - len(cleaned)} marker/separator lines")


def main():
    if len(sys.argv) < 2:
        print("Usage: python export_clean.py <project_folder_path>")
        print("Example: python .agent/scripts/export_clean.py sample_project")
        sys.exit(1)

    project_dir = Path(sys.argv[1])
    draft_path = project_dir / "_Draft.md"
    output_path = project_dir / "_Final.txt"

    if not draft_path.exists():
        print(f"Error: {draft_path} not found")
        sys.exit(1)

    clean_draft(draft_path, output_path)


if __name__ == "__main__":
    main()
