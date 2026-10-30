#!/usr/bin/env python3
# Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
"""DOCUMENTATION CHECK: does the Markdown copy say exactly what the PDF says?

The product documentation exists twice: the PDF (the original) and a Markdown copy that GitHub can show
as a web page. This script makes sure the two never drift apart. It is run on every pull request by
.github/workflows/doc-words.yml; if anything below fails, the pull request shows a red cross.

What it checks:
  1. Words: every word in the PDF appears in the Markdown the same number of times, and nothing extra.
     Only letters and numbers count as words, so punctuation and Markdown symbols (#, |, *, -) are ignored.
     Word ORDER is not compared, because tables split across PDF pages are read in a different order.
     Hyphens and apostrophes split words ("6-day" -> "6", "day"), so a line break after a hyphen
     in the PDF ("6- day") still matches. Capitals matter ("Title Case" is not "title case").
  2. Links: a web link in the Markdown must go to an address the PDF itself links to; a "#..." link
     must point to a heading in the Markdown. Link addresses are not counted as words, so this stops
     anyone hiding text or an unexpected address inside a link.
  3. Pictures: each picture must be a file inside docs/images/ that exists (no pictures from the internet).
     Picture descriptions (the text in ![...]) DO count as words, so none can be added without the PDF.
  4. No raw HTML in the Markdown (HTML could hide text or load things from outside).

Run by hand from the repository folder:
    python3 tools/check_doc_words.py
    python3 tools/check_doc_words.py --pdf other.pdf --md other.md     (any two files)
Needs the PDF reader pypdf, at the exact version pinned in tools/requirements-doc-check.txt
(a different version could read the PDF slightly differently).
Exit code: 0 = all match, 1 = a difference was found, 2 = a file could not be read.
"""
import argparse
import collections
import re
import sys
import unicodedata
from pathlib import Path

import pypdf

REPO = Path(__file__).resolve().parent.parent           # the repository folder (tools/ is one level down)
DEFAULT_PDF = REPO / "docs" / "Taarala_Thota_Product_Documentation.pdf"
DEFAULT_MD = REPO / "docs" / "Taarala_Thota_Product_Documentation.md"
IMAGES_DIR = REPO / "docs" / "images"

WORD = re.compile(r"[^\W_]+")                            # a run of letters and/or digits = one word
IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)\s]*)\)")         # ![description](address)
LINK = re.compile(r"\[([^\]]*)\]\(([^)\s]*)\)")           # [text](address)
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$", re.MULTILINE)
HTML_TAG = re.compile(r"<[A-Za-z!/]")                    # the start of any HTML tag or comment
MAX_SHOWN = 40                                           # how many differences to list before stopping


def normalise(text):
    """Make equivalent characters identical: e.g. the "fi" ligature becomes "f"+"i", curly ' becomes '."""
    text = unicodedata.normalize("NFKC", text)
    return text.replace("’", "'").replace("‘", "'")


def count_words(text):
    return collections.Counter(WORD.findall(normalise(text)))


def read_pdf(path):
    """Return (all text, set of web addresses the PDF links to)."""
    reader = pypdf.PdfReader(str(path))
    text = "\n".join(page.extract_text() for page in reader.pages)
    addresses = set()
    for page in reader.pages:
        for annot in page.get("/Annots") or []:
            annot = annot.get_object()
            action = annot.get("/A")
            if annot.get("/Subtype") == "/Link" and action is not None and "/URI" in action:
                addresses.add(str(action["/URI"]))
    return text, addresses


def github_anchor(heading, seen):
    """The '#...' address GitHub gives a heading: lower case, punctuation removed, spaces become '-'."""
    slug = re.sub(r"[^\w\- ]", "", heading.strip().lower()).replace(" ", "-")
    n = seen[slug]
    seen[slug] += 1
    return slug if n == 0 else f"{slug}-{n}"


def check_links_and_pictures(md_text, md_path, pdf_addresses):
    """Return a list of problems (empty = fine) for checks 2, 3 and 4."""
    problems = []
    seen = collections.Counter()
    anchors = {github_anchor(h, seen) for _, h in HEADING.findall(md_text)}

    for _, src in IMAGE.findall(md_text):
        target = (md_path.parent / src).resolve()
        if "://" in src or src.startswith("//"):
            problems.append(f"picture from the internet is not allowed: {src}")
        elif IMAGES_DIR.resolve() not in target.parents:
            problems.append(f"picture must be inside docs/images/: {src}")
        elif not target.is_file():
            problems.append(f"picture file is missing: {src}")

    for _, href in LINK.findall(IMAGE.sub("", md_text)):
        if href.startswith("#"):
            if href[1:] not in anchors:
                problems.append(f"link to a heading that does not exist: {href}")
        elif href not in pdf_addresses:
            problems.append(f"link address is not one the PDF links to: {href}")

    for line_no, line in enumerate(md_text.splitlines(), 1):
        if HTML_TAG.search(line):
            problems.append(f"raw HTML is not allowed (line {line_no}): {line.strip()[:80]}")
    return problems


def visible_text(md_text):
    """The Markdown as a reader sees it: link and picture addresses removed, link text and descriptions kept."""
    text = IMAGE.sub(lambda m: m.group(1), md_text)
    return LINK.sub(lambda m: m.group(1), text)


def main():
    parser = argparse.ArgumentParser(description="Check that the Markdown documentation has exactly the PDF's words.")
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--md", type=Path, default=DEFAULT_MD)
    args = parser.parse_args()

    try:
        pdf_text, pdf_addresses = read_pdf(args.pdf)
        md_text = args.md.read_text(encoding="utf-8")
    except (OSError, pypdf.errors.PdfReadError) as err:
        print(f"Could not read a file: {err}")
        return 2

    pdf_words, md_words = count_words(pdf_text), count_words(visible_text(md_text))
    print(f"pypdf {pypdf.__version__} · PDF: {sum(pdf_words.values())} words · "
          f"Markdown: {sum(md_words.values())} words")

    failed = False
    only_pdf, only_md = pdf_words - md_words, md_words - pdf_words
    if only_pdf or only_md:
        failed = True
        print("\nThe words do not match. Each line: the word, then how many times it appears in each file.")
        diffs = sorted(set(only_pdf) | set(only_md))
        for word in diffs[:MAX_SHOWN]:
            print(f"  {word!r}: PDF {pdf_words[word]} · Markdown {md_words[word]}")
        if len(diffs) > MAX_SHOWN:
            print(f"  ... and {len(diffs) - MAX_SHOWN} more")

    problems = check_links_and_pictures(md_text, args.md.resolve(), pdf_addresses)
    if problems:
        failed = True
        print("\nLink and picture problems:")
        for p in problems:
            print(f"  {p}")

    if failed:
        print("\nFAILED: update the PDF and the Markdown together, so they say the same thing.")
        return 1
    print("OK: the PDF and the Markdown have exactly the same words; links and pictures are allowed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
