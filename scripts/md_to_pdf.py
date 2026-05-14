"""
md_to_pdf.py — Convert MEMBER_MANUAL.md + TECHNICAL_MANUAL.md to PDFs.

Uses reportlab + markdown. Produces a single-pass, paginated, professional
PDF with: cover area, page numbers, code blocks, tables, lists.

Usage:
  py scripts/md_to_pdf.py
"""

import os
import re
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Preformatted, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas as canvas_mod

import markdown as md_lib
from xml.etree import ElementTree as ET

ROOT = Path(r"C:\Users\roses\CODE PROJECT")

# ─── Styles ───────────────────────────────────────────────────────────────
STYLES = getSampleStyleSheet()
NAVY = colors.HexColor("#1F3864")
PURPLE = colors.HexColor("#7030A0")
GREY = colors.HexColor("#475569")
LIGHT_GREY = colors.HexColor("#f3f4f6")
BORDER = colors.HexColor("#e4e7ef")

BASE = ParagraphStyle("body", parent=STYLES["BodyText"],
    fontName="Helvetica", fontSize=10, leading=14, textColor=colors.HexColor("#1a2233"),
    spaceAfter=6, alignment=TA_LEFT)

H1 = ParagraphStyle("h1", parent=STYLES["Heading1"], fontName="Helvetica-Bold",
    fontSize=22, leading=26, textColor=NAVY, spaceBefore=12, spaceAfter=10)
H2 = ParagraphStyle("h2", parent=STYLES["Heading2"], fontName="Helvetica-Bold",
    fontSize=16, leading=20, textColor=NAVY, spaceBefore=14, spaceAfter=6)
H3 = ParagraphStyle("h3", parent=STYLES["Heading3"], fontName="Helvetica-Bold",
    fontSize=13, leading=16, textColor=PURPLE, spaceBefore=8, spaceAfter=4)
H4 = ParagraphStyle("h4", parent=STYLES["Heading3"], fontName="Helvetica-Bold",
    fontSize=11, leading=14, textColor=GREY, spaceBefore=6, spaceAfter=3)

CODE = ParagraphStyle("code", parent=BASE, fontName="Courier", fontSize=8,
    leading=11, textColor=colors.HexColor("#1a2233"),
    backColor=LIGHT_GREY, borderColor=BORDER, borderWidth=0.5, borderPadding=6,
    leftIndent=8, rightIndent=8, spaceBefore=6, spaceAfter=8)

LI = ParagraphStyle("li", parent=BASE, leftIndent=18, bulletIndent=8, spaceAfter=3)

MUTED = ParagraphStyle("muted", parent=BASE, fontSize=9, textColor=GREY)


# ─── Footer with page numbers ─────────────────────────────────────────────
class FooterDoc(SimpleDocTemplate):
    def __init__(self, *args, title="", **kw):
        self._title = title
        super().__init__(*args, **kw)

    def afterPage(self):
        c = self.canv
        page = c.getPageNumber()
        c.saveState()
        c.setFont("Helvetica", 8)
        c.setFillColor(GREY)
        # Footer line + page number
        c.line(0.6 * inch, 0.55 * inch, LETTER[0] - 0.6 * inch, 0.55 * inch)
        c.drawString(0.6 * inch, 0.4 * inch, self._title)
        c.drawRightString(LETTER[0] - 0.6 * inch, 0.4 * inch, f"Page {page}")
        c.restoreState()


# ─── Inline markdown converter (bold/italic/code/links) ───────────────────
INLINE_PATTERNS = [
    (re.compile(r"`([^`]+)`"),     r'<font name="Courier" backColor="#f3f4f6" color="#1a2233">\1</font>'),
    (re.compile(r"\*\*([^*]+)\*\*"), r'<b>\1</b>'),
    (re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)"), r'<i>\1</i>'),
    (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<link href="\2" color="#7030A0"><u>\1</u></link>'),
]

def inline_md(text):
    """Apply inline markdown to a string for reportlab Paragraph."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Restore HTML-like inline structure
    for pat, rep in INLINE_PATTERNS:
        text = pat.sub(rep, text)
    return text


# ─── Convert a markdown file to a list of reportlab flowables ─────────────
def md_to_flowables(md_text):
    """Walk the markdown line-by-line and yield Paragraphs / Tables / Spacers."""
    out = []
    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        # ── Headers
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            text = inline_md(m.group(2).strip())
            style = [H1, H2, H3, H4][min(level - 1, 3)]
            if level == 1:
                out.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4))
            out.append(Paragraph(text, style))
            i += 1
            continue

        # ── Horizontal rule
        if re.match(r"^---+\s*$", line):
            out.append(Spacer(1, 4))
            out.append(HRFlowable(width="100%", thickness=0.4, color=BORDER))
            out.append(Spacer(1, 4))
            i += 1
            continue

        # ── Fenced code block
        if line.startswith("```"):
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            code_text = "\n".join(code_lines)
            # Truncate excessively long lines for safety
            code_text = code_text.replace("\t", "  ")
            out.append(Preformatted(code_text, CODE))
            continue

        # ── Tables (header row | sep row | data rows ...)
        if "|" in line and i + 1 < len(lines) and re.match(r"^[\s|:\-]+$", lines[i + 1]):
            header = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2
            rows = [header]
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            # Render
            table_data = [[Paragraph(inline_md(c), BASE) for c in row] for row in rows]
            t = Table(table_data, hAlign="LEFT", colWidths=None, repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            out.append(t)
            out.append(Spacer(1, 8))
            continue

        # ── Bulleted list
        if re.match(r"^\s*[-*+]\s+", line):
            # Consume the whole list
            list_lines = []
            while i < len(lines) and re.match(r"^\s*[-*+]\s+", lines[i]):
                content = re.sub(r"^\s*[-*+]\s+", "", lines[i])
                list_lines.append(content)
                i += 1
            for item in list_lines:
                out.append(Paragraph("• " + inline_md(item), LI))
            out.append(Spacer(1, 4))
            continue

        # ── Numbered list
        if re.match(r"^\s*\d+\.\s+", line):
            list_lines = []
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                m2 = re.match(r"^\s*(\d+)\.\s+(.*)$", lines[i])
                list_lines.append(f"{m2.group(1)}. {m2.group(2)}")
                i += 1
            for item in list_lines:
                out.append(Paragraph(inline_md(item), LI))
            out.append(Spacer(1, 4))
            continue

        # ── Blockquote
        if line.startswith("> "):
            quote_lines = []
            while i < len(lines) and lines[i].startswith("> "):
                quote_lines.append(lines[i][2:])
                i += 1
            text = inline_md(" ".join(quote_lines))
            out.append(Paragraph(text, ParagraphStyle("blockquote", parent=BASE,
                leftIndent=16, fontStyle="italic", textColor=GREY,
                borderColor=NAVY, borderWidth=0, leading=14)))
            out.append(Spacer(1, 4))
            continue

        # ── Empty line
        if not line.strip():
            out.append(Spacer(1, 4))
            i += 1
            continue

        # ── Default: paragraph
        # Coalesce wrapped paragraph lines
        para_lines = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(
                ("#", "-", "*", "+", ">", "|", "```", "---")) and not re.match(r"^\s*\d+\.\s+", lines[i]):
            para_lines.append(lines[i])
            i += 1
        text = inline_md(" ".join(para_lines))
        out.append(Paragraph(text, BASE))

    return out


# ─── Build a PDF ──────────────────────────────────────────────────────────
def build_pdf(md_path: Path, pdf_path: Path, doc_title: str, doc_subtitle: str):
    md_text = md_path.read_text(encoding="utf-8")
    flowables = []

    # Cover
    flowables.append(Spacer(1, 0.4 * inch))
    flowables.append(Paragraph(
        f'<font color="#1F3864"><b>{doc_title}</b></font>',
        ParagraphStyle("title", parent=H1, fontSize=28, leading=34, alignment=TA_LEFT)
    ))
    flowables.append(Spacer(1, 0.08 * inch))
    flowables.append(Paragraph(
        f'<font color="#475569">{doc_subtitle}</font>',
        ParagraphStyle("subtitle", parent=H2, fontSize=13, textColor=GREY, leading=16, alignment=TA_LEFT)
    ))
    flowables.append(Spacer(1, 0.08 * inch))
    flowables.append(HRFlowable(width="100%", thickness=2, color=PURPLE, spaceAfter=4))
    flowables.append(Spacer(1, 0.18 * inch))

    # Body
    flowables.extend(md_to_flowables(md_text))

    doc = FooterDoc(
        str(pdf_path),
        pagesize=LETTER,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title=doc_title,
    )
    doc.build(flowables)
    size = pdf_path.stat().st_size
    print(f"  [OK] {pdf_path.name}  ({size/1024:.1f} KB)")


# ─── Main ─────────────────────────────────────────────────────────────────
def main():
    print("Generating PDFs from markdown sources…")
    build_pdf(
        ROOT / "MEMBER_MANUAL.md",
        ROOT / "MEMBER_MANUAL.pdf",
        "Marketing Planner — User Guide",
        "For team members · ICC of Texas",
    )
    build_pdf(
        ROOT / "TECHNICAL_MANUAL.md",
        ROOT / "TECHNICAL_MANUAL.pdf",
        "Marketing Planner — Technical Manual",
        "Architecture, hosting, security · ICC of Texas",
    )
    if (ROOT / "COVERAGE_ANALYSIS.md").exists():
        build_pdf(
            ROOT / "COVERAGE_ANALYSIS.md",
            ROOT / "COVERAGE_ANALYSIS.pdf",
            "Marketing Coordinator → Website Coverage",
            "Side-by-side mapping · ICC of Texas",
        )
    print("Done.")


if __name__ == "__main__":
    main()
