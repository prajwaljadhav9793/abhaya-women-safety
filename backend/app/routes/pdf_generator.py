import io
import uuid
from datetime import datetime, timezone, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that adds official running header and footer with dynamic total page count.
    Complies with official executive audit document standards.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()

        # Running Top Header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#581c87"))  # Deep Purple
        self.drawString(18 * mm, 287 * mm, "ABHAYA WOMEN SAFETY INTELLIGENCE PLATFORM")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))  # Slate Gray
        self.drawRightString(192 * mm, 287 * mm, "OFFICIAL SECURITY AUDIT DOSSIER • CONFIDENTIAL")

        # Top Thin Rule
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(18 * mm, 284 * mm, 192 * mm, 284 * mm)

        # Bottom Thin Rule
        self.line(18 * mm, 16 * mm, 192 * mm, 16 * mm)

        # Running Bottom Footer
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(
            18 * mm,
            11.5 * mm,
            "Certified Electronic Record pursuant to Sec 65B, Indian Evidence Act • ABHAYA SafeGov Engine"
        )
        self.drawRightString(
            192 * mm,
            11.5 * mm,
            f"Page {self._pageNumber} of {page_count}"
        )
        self.restoreState()


def get_pdf_styles():
    """Build unified professional typography styles."""
    base = getSampleStyleSheet()
    styles = {}

    styles["DocTitle"] = ParagraphStyle(
        "DocTitle",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#3b0764"),  # Deep Purple
        alignment=TA_LEFT,
        spaceAfter=3,
    )

    styles["DocSubtitle"] = ParagraphStyle(
        "DocSubtitle",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#6b21a8"),
        alignment=TA_LEFT,
        spaceAfter=10,
    )

    styles["SectionHeader"] = ParagraphStyle(
        "SectionHeader",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e1b4b"),
        spaceBefore=8,
        spaceAfter=4,
    )

    styles["BodyText"] = ParagraphStyle(
        "BodyText",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    styles["BodyBold"] = ParagraphStyle(
        "BodyBold",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
    )

    styles["BodySmall"] = ParagraphStyle(
        "BodySmall",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )

    styles["MetaKey"] = ParagraphStyle(
        "MetaKey",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )

    styles["MetaVal"] = ParagraphStyle(
        "MetaVal",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    styles["TableHeader"] = ParagraphStyle(
        "TableHeader",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    styles["TableCell"] = ParagraphStyle(
        "TableCell",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
        alignment=TA_LEFT,
    )

    styles["Narrative"] = ParagraphStyle(
        "Narrative",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_JUSTIFY,
    )

    styles["Badge"] = ParagraphStyle(
        "Badge",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
    )

    styles["NoticeText"] = ParagraphStyle(
        "NoticeText",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
    )

    return styles


def format_dt(dt):
    """Format datetime safely into a human-readable string in UTC and approximate IST."""
    if not dt:
        return "N/A"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return dt
    utc_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    ist_dt = dt + timedelta(hours=5, minutes=30)
    return f"{ist_dt.strftime('%d %b %Y, %I:%M %p IST')} ({utc_str})"


def get_status_style(status_text):
    """Return background and text color for status badges."""
    st = (status_text or "").lower()
    if st in ("verified", "resolved", "completed", "active_protection"):
        return colors.HexColor("#15803d"), colors.HexColor("#f0fdf4")  # Green
    elif st in ("pending", "under_review", "submitted"):
        return colors.HexColor("#b45309"), colors.HexColor("#fffbeb")  # Amber/Yellow
    elif st in ("rejected", "failed", "escalated"):
        return colors.HexColor("#b91c1c"), colors.HexColor("#fef2f2")  # Red
    elif st in ("active", "in_transit"):
        return colors.HexColor("#6b21a8"), colors.HexColor("#faf5ff")  # Purple
    else:
        return colors.HexColor("#475569"), colors.HexColor("#f8fafc")  # Slate


def build_status_badge(status_text, styles):
    """Create a styled status badge block."""
    bg_color, fg_color = get_status_style(status_text)
    badge_style = ParagraphStyle(
        f"badge_{status_text}",
        parent=styles["Badge"],
        textColor=fg_color,
    )
    p = Paragraph(f"<b>{(status_text or 'UNKNOWN').upper()}</b>", badge_style)
    t = Table([[p]], colWidths=[38 * mm], rowHeights=[7 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("CORNERPAD", (0, 0), (-1, -1), 3),
    ]))
    return t


def build_doc_header(title, subtitle, ref_id, user, status_text, styles):
    """Create a standardized executive dossier banner."""
    gen_time = format_dt(datetime.now(timezone.utc))
    status_badge = build_status_badge(status_text, styles)

    left_block = [
        Paragraph(title, styles["DocTitle"]),
        Paragraph(subtitle, styles["DocSubtitle"]),
        Paragraph(f"<b>Reference Dossier ID:</b> {ref_id}", styles["MetaKey"]),
        Paragraph(f"<b>Generated At:</b> {gen_time}", styles["BodySmall"]),
        Paragraph(f"<b>Generated For / Subject:</b> {user.full_name} ({user.email} • {user.phone})", styles["BodySmall"]),
    ]

    header_table = Table([[left_block, status_badge]], colWidths=[134 * mm, 40 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    divider = HRFlowable(
        width="100%",
        thickness=1.5,
        color=colors.HexColor("#7e22ce"),
        spaceBefore=4,
        spaceAfter=10,
    )

    return [header_table, divider]


def build_statutory_footer(styles):
    """Build legal rights & emergency helpline compliance footer block."""
    helplines = (
        "<b>National Emergency Response Support System (ERSS):</b> 112 (Toll-Free, 24x7) | "
        "<b>Women in Distress Helpline:</b> 1091 | "
        "<b>National Commission for Women (NCW):</b> 7827-170-170 | "
        "<b>Cyber Crime Helpline:</b> 1930"
    )

    legal_notice = (
        "<b>STATUTORY LEGAL DISCLOSURE & RIGHT TO ZERO FIR:</b><br/>"
        "Under Section 154 of the Code of Criminal Procedure (CrPC) and Section 173 of the Bharatiya Nagarik "
        "Suraksha Sanhita (BNSS), any victim of a cognizable offence against women is entitled to register a "
        "<b>'Zero FIR'</b> at ANY police station irrespective of jurisdictional boundaries. Refusal to record an "
        "FIR is a punishable offence under Section 166A IPC / Section 199 BNS. This dossier serves as an "
        "electronic record generated by the ABHAYA Platform and is certified for submission to law enforcement "
        "or judicial authorities in accordance with Section 65B of the Indian Evidence Act, 1872."
    )

    box_data = [
        [Paragraph(helplines, styles["NoticeText"])],
        [Spacer(1, 1 * mm)],
        [Paragraph(legal_notice, styles["NoticeText"])],
    ]

    t = Table(box_data, colWidths=[174 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))

    return KeepTogether([
        Spacer(1, 4 * mm),
        Paragraph("<b>STATUTORY NOTICE & EMERGENCY HELPLINES</b>", styles["SectionHeader"]),
        Spacer(1, 1.5 * mm),
        t,
    ])


# =========================================================================
# 1. INDIVIDUAL INCIDENT REPORT PDF
# =========================================================================
def build_incident_pdf(report, user, admin_actions=None):
    """
    Build a comprehensive, legal-grade dossier for a single community or personal incident report.
    Includes GPS telemetry, maps hyperlink, complainant identity, full description narrative,
    evidence chain of custody table, and statutory rights.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-INC-{report.id:05d}-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # 1. Header Banner
    story.extend(build_doc_header(
        title="ABHAYA INCIDENT & HAZARD DOSSIER",
        subtitle=f"Official Evidentiary Record • Case #{report.id}",
        ref_id=ref_id,
        user=user,
        status_text=report.status,
        styles=styles,
    ))

    # 2. Key Metadata Table
    story.append(Paragraph("1. INCIDENT METADATA & TELEMETRY", styles["SectionHeader"]))

    maps_link = (
        f'<a href="https://www.google.com/maps?q={report.lat},{report.lng}" color="#7c3aed">'
        f"<u>Open GPS Coordinates in Google Maps ({report.lat:.5f}, {report.lng:.5f})</u></a>"
        if (report.lat and report.lng) else "Coordinates not captured"
    )

    severity_label = {1: "1 - Minor / Informational", 2: "2 - Moderate Hazard", 3: "3 - High / Threatening", 4: "4 - Critical / Emergency"}.get(report.severity, f"{report.severity} / 4")

    try:
        from app.routes.modules import get_jurisdiction_police_station
        ps_info = get_jurisdiction_police_station(report.lat, report.lng, report.location_label)
    except Exception:
        ps_info = {"name": "Shahupuri Police Station", "address": "Station Road, Near Central Bus Stand, Kolhapur", "phone": "0231-2651033"}

    ps_cell = f"<b>{ps_info.get('name', 'Police Station')}</b><br/><font size=7 color='#64748b'>{ps_info.get('address', '')} • Ph: {ps_info.get('phone', '112')}</font>"

    meta_rows = [
        [
            Paragraph("<b>Report ID:</b>", styles["MetaKey"]),
            Paragraph(f"#{report.id} (DB-REF)", styles["MetaVal"]),
            Paragraph("<b>Category:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{report.category}</b>", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Incident Time:</b>", styles["MetaKey"]),
            Paragraph(format_dt(report.incident_time), styles["MetaVal"]),
            Paragraph("<b>Filing Time:</b>", styles["MetaKey"]),
            Paragraph(format_dt(report.created_at), styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Severity Level:</b>", styles["MetaKey"]),
            Paragraph(severity_label, styles["MetaVal"]),
            Paragraph("<b>Verification Status:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{(report.status or 'PENDING').upper()}</b>", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Location Landmark:</b>", styles["MetaKey"]),
            Paragraph(report.location_label or "Location landmark not specified", styles["MetaVal"]),
            Paragraph("<b>Geospatial Telemetry:</b>", styles["MetaKey"]),
            Paragraph(maps_link, styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Jurisdictional Police:</b>", styles["MetaKey"]),
            Paragraph(ps_cell, styles["MetaVal"]),
            Paragraph("<b>Emergency Desk:</b>", styles["MetaKey"]),
            Paragraph("<b>Dial 112 / 1091 (Women)</b><br/><font size=7 color='#64748b'>Certified Electronic Record</font>", styles["MetaVal"]),
        ],
    ]

    t_meta = Table(meta_rows, colWidths=[36 * mm, 51 * mm, 36 * mm, 51 * mm])
    t_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 4 * mm))

    # 3. Incident Statement / Narrative Box
    story.append(Paragraph("2. FORMAL INCIDENT STATEMENT & EVENT DESCRIPTION", styles["SectionHeader"]))
    narrative_p = Paragraph(report.description or "No descriptive text provided.", styles["Narrative"])
    t_narrative = Table([[narrative_p]], colWidths=[174 * mm])
    t_narrative.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#94a3b8")),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_narrative)
    story.append(Spacer(1, 4 * mm))

    # 4. Review / Administrative Audit Notes
    review_text = getattr(report, "review_reason", None)
    if not review_text and admin_actions:
        first_act = admin_actions[0]
        review_text = getattr(first_act, "reason", None) or getattr(first_act, "new_value", None)

    if review_text:
        story.append(Paragraph("3. OFFICIAL REVIEW & ADMINISTRATIVE AUDIT TRAIL", styles["SectionHeader"]))
        t_review = Table([[Paragraph(f"<b>Administrative Review Finding / Reason:</b><br/>{review_text}", styles["BodyText"])]], colWidths=[174 * mm])
        t_review.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fdf4ff")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#d8b4fe")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_review)
        story.append(Spacer(1, 4 * mm))

    # 5. Evidentiary Attachments Table
    story.append(Paragraph("4. EVIDENTIARY ATTACHMENTS & CHAIN OF CUSTODY", styles["SectionHeader"]))
    ev_list = getattr(report, "evidence", []) or []
    if ev_list:
        ev_headers = [
            Paragraph("<b>#</b>", styles["TableHeader"]),
            Paragraph("<b>File Name</b>", styles["TableHeader"]),
            Paragraph("<b>Format / MIME</b>", styles["TableHeader"]),
            Paragraph("<b>Size</b>", styles["TableHeader"]),
            Paragraph("<b>Uploaded At</b>", styles["TableHeader"]),
            Paragraph("<b>Vault Status</b>", styles["TableHeader"]),
        ]
        ev_rows = [ev_headers]
        for idx, ev in enumerate(ev_list, 1):
            size_kb = f"{(ev.size_bytes or 0) / 1024:.1f} KB" if (ev.size_bytes or 0) < 1024 * 1024 else f"{(ev.size_bytes or 0) / (1024 * 1024):.2f} MB"
            ev_rows.append([
                Paragraph(str(idx), styles["TableCell"]),
                Paragraph(ev.original_name or "Attachment", styles["TableCell"]),
                Paragraph(ev.mime_type or "Unknown", styles["TableCell"]),
                Paragraph(size_kb, styles["TableCell"]),
                Paragraph(format_dt(ev.uploaded_at), styles["TableCell"]),
                Paragraph("<b>ENCRYPTED & PRESERVED</b>", styles["TableCell"]),
            ])
        t_ev = Table(ev_rows, colWidths=[8 * mm, 54 * mm, 32 * mm, 20 * mm, 35 * mm, 25 * mm])
        t_ev.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4c1d95")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t_ev)
    else:
        empty_ev = Paragraph("<i>No digital media files or photographs attached to this filing.</i>", styles["BodySmall"])
        t_empty = Table([[empty_ev]], colWidths=[174 * mm])
        t_empty.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_empty)

    # 6. Legal Rights & Statutory Footer
    story.append(build_statutory_footer(styles))

    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf


# =========================================================================
# 2. INDIVIDUAL SOS EVENT PDF
# =========================================================================
def build_sos_pdf(event, user):
    """
    Build a comprehensive emergency dispatch audit dossier for an individual SOS distress event.
    Contains timestamping, GPS telemetry, Google Maps link, and full multi-channel dispatch table.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-SOS-{event.id:05d}-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # 1. Header Banner
    story.extend(build_doc_header(
        title="EMERGENCY SOS DISPATCH & TELEMETRY AUDIT",
        subtitle=f"Official Rapid Distress Response Dossier • Event #{event.id}",
        ref_id=ref_id,
        user=user,
        status_text=event.status,
        styles=styles,
    ))

    # 2. Distress Telemetry Table
    story.append(Paragraph("1. DISTRESS EVENT TELEMETRY & DISPATCH STATUS", styles["SectionHeader"]))

    maps_link = (
        f'<a href="{event.map_url or f"https://www.google.com/maps?q={event.lat},{event.lng}"}" color="#7c3aed">'
        f"<u>Open Distress Location on Google Maps ({event.lat:.5f}, {event.lng:.5f})</u></a>"
        if (event.lat and event.lng) else "Location unavailable"
    )

    meta_rows = [
        [
            Paragraph("<b>SOS Event ID:</b>", styles["MetaKey"]),
            Paragraph(f"#{event.id}", styles["MetaVal"]),
            Paragraph("<b>Operating Mode:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{(event.mode or 'LIVE').upper()} DISPATCH</b>", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Distress Trigger Time:</b>", styles["MetaKey"]),
            Paragraph(format_dt(event.created_at), styles["MetaVal"]),
            Paragraph("<b>Resolution Time:</b>", styles["MetaKey"]),
            Paragraph(format_dt(event.resolved_at) if event.resolved_at else "Active / Pending Resolution", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Distress Status:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{(event.status or 'ACTIVE').upper()}</b>", styles["MetaVal"]),
            Paragraph("<b>Location Accuracy:</b>", styles["MetaKey"]),
            Paragraph(f"± {event.accuracy:.1f} meters" if event.accuracy else "Standard GPS", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Location Status:</b>", styles["MetaKey"]),
            Paragraph((event.location_status or "captured").capitalize(), styles["MetaVal"]),
            Paragraph("<b>Live Map Telemetry:</b>", styles["MetaKey"]),
            Paragraph(maps_link, styles["MetaVal"]),
        ],
    ]

    t_meta = Table(meta_rows, colWidths=[36 * mm, 51 * mm, 36 * mm, 51 * mm])
    t_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff1f2")),  # Light Rose
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecdd3")),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 4 * mm))

    # 3. Emergency Notes / Context
    if event.note:
        story.append(Paragraph("2. EMERGENCY NOTE / DISTRESS CONTEXT", styles["SectionHeader"]))
        t_note = Table([[Paragraph(event.note, styles["Narrative"])]], colWidths=[174 * mm])
        t_note.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#f43f5e")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_note)
        story.append(Spacer(1, 4 * mm))

    # 4. Emergency Contacts Notification Broadcast Table
    story.append(Paragraph("2. GUARDIAN & EMERGENCY CONTACT NOTIFICATION DISPATCH LOG", styles["SectionHeader"]))
    notifications = getattr(event, "notifications", []) or []

    if notifications:
        notif_headers = [
            Paragraph("<b>#</b>", styles["TableHeader"]),
            Paragraph("<b>Channel</b>", styles["TableHeader"]),
            Paragraph("<b>Recipient</b>", styles["TableHeader"]),
            Paragraph("<b>Delivery Status</b>", styles["TableHeader"]),
            Paragraph("<b>Dispatch Timestamp</b>", styles["TableHeader"]),
            Paragraph("<b>Provider Reference / Notes</b>", styles["TableHeader"]),
        ]
        notif_rows = [notif_headers]
        for idx, n in enumerate(notifications, 1):
            status_desc = n.status.replace("_", " ").title()
            notif_rows.append([
                Paragraph(str(idx), styles["TableCell"]),
                Paragraph(f"<b>{(n.channel or 'SMS').upper()}</b>", styles["TableCell"]),
                Paragraph(n.recipient or "N/A", styles["TableCell"]),
                Paragraph(status_desc, styles["TableCell"]),
                Paragraph(format_dt(n.attempted_at), styles["TableCell"]),
                Paragraph(n.error or n.provider_ref or "Successfully Delivered to Gateway", styles["TableCell"]),
            ])

        t_notif = Table(notif_rows, colWidths=[8 * mm, 22 * mm, 38 * mm, 30 * mm, 36 * mm, 40 * mm])
        t_notif.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#881337")),  # Rose/Wine Red
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#fff1f2")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fda4af")),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t_notif)
    else:
        empty_p = Paragraph("<i>No automated dispatch logs recorded for this event.</i>", styles["BodySmall"])
        t_empty = Table([[empty_p]], colWidths=[174 * mm])
        t_empty.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_empty)

    # 5. Statutory Legal Notice & Helplines
    story.append(build_statutory_footer(styles))

    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf


# =========================================================================
# 3. INDIVIDUAL JOURNEY PDF
# =========================================================================
def build_journey_pdf(journey, user):
    """
    Build a comprehensive commute & travel safety audit dossier for a single journey.
    Documents start/end points, ETA monitoring, safety deviations, and safety surveillance status.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-JRN-{journey.id:05d}-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # 1. Header Banner
    story.extend(build_doc_header(
        title="JOURNEY GUARDIAN COMMUTE AUDIT DOSSIER",
        subtitle=f"Live Transit Surveillance & Deviation Record • Commute #{journey.id}",
        ref_id=ref_id,
        user=user,
        status_text=journey.status,
        styles=styles,
    ))

    # 2. Journey Profile Metadata
    story.append(Paragraph("1. COMMUTE PROFILE & ROUTE SPECIFICATIONS", styles["SectionHeader"]))

    # Duration calculation
    duration_str = "Ongoing"
    if journey.started_at and journey.ended_at:
        diff = journey.ended_at - journey.started_at
        mins = int(diff.total_seconds() // 60)
        secs = int(diff.total_seconds() % 60)
        duration_str = f"{mins} min {secs} sec"

    distance_str = (
        f"{journey.planned_distance_m / 1000:.2f} km ({int(journey.planned_distance_m)} m)"
        if journey.planned_distance_m else "Not calculated"
    )

    meta_rows = [
        [
            Paragraph("<b>Journey ID:</b>", styles["MetaKey"]),
            Paragraph(f"#{journey.id}", styles["MetaVal"]),
            Paragraph("<b>Route Intelligence Type:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{(journey.route_type or 'SAFEST').upper()} PATH</b>", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Commute Started:</b>", styles["MetaKey"]),
            Paragraph(format_dt(journey.started_at), styles["MetaVal"]),
            Paragraph("<b>Commute Completed:</b>", styles["MetaKey"]),
            Paragraph(format_dt(journey.ended_at) if journey.ended_at else "Active in Progress", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Planned Transit Distance:</b>", styles["MetaKey"]),
            Paragraph(distance_str, styles["MetaVal"]),
            Paragraph("<b>Total Elapsed Transit Time:</b>", styles["MetaKey"]),
            Paragraph(duration_str, styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Calculated ETA Time:</b>", styles["MetaKey"]),
            Paragraph(format_dt(journey.eta_at) if journey.eta_at else "Calculated dynamically", styles["MetaVal"]),
            Paragraph("<b>Current Journey Status:</b>", styles["MetaKey"]),
            Paragraph(f"<b>{(journey.status or 'ACTIVE').upper()}</b>", styles["MetaVal"]),
        ],
    ]

    t_meta = Table(meta_rows, colWidths=[38 * mm, 49 * mm, 38 * mm, 49 * mm])
    t_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),  # Light Green
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 4 * mm))

    # 3. Waypoint & Geo-boundary Parameters
    story.append(Paragraph("2. WAYPOINT LOCATIONS & GEO-FENCE PARAMETERS", styles["SectionHeader"]))

    origin_maps = (
        f'<a href="https://www.google.com/maps?q={journey.origin_lat},{journey.origin_lng}" color="#7c3aed">'
        f"<u>Open Origin in Maps ({journey.origin_lat:.4f}, {journey.origin_lng:.4f})</u></a>"
        if (journey.origin_lat and journey.origin_lng) else "Location coordinates saved"
    )

    dest_maps = (
        f'<a href="https://www.google.com/maps?q={journey.dest_lat},{journey.dest_lng}" color="#7c3aed">'
        f"<u>Open Destination in Maps ({journey.dest_lat:.4f}, {journey.dest_lng:.4f})</u></a>"
        if (journey.dest_lat and journey.dest_lng) else "Location coordinates saved"
    )

    waypoint_rows = [
        [
            Paragraph("<b>Departure Point (Origin):</b>", styles["MetaKey"]),
            Paragraph(journey.origin_label or "Start location", styles["MetaVal"]),
            Paragraph("<b>Origin Coordinates:</b>", styles["MetaKey"]),
            Paragraph(origin_maps, styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Arrival Point (Destination):</b>", styles["MetaKey"]),
            Paragraph(journey.dest_label or "Destination location", styles["MetaVal"]),
            Paragraph("<b>Destination Coordinates:</b>", styles["MetaKey"]),
            Paragraph(dest_maps, styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Route Deviation Threshold:</b>", styles["MetaKey"]),
            Paragraph(f"{journey.deviation_threshold_m or 300} meters", styles["MetaVal"]),
            Paragraph("<b>Inactivity Guard Trigger:</b>", styles["MetaKey"]),
            Paragraph(f"{journey.inactivity_threshold_s or 300} seconds (5 min)", styles["MetaVal"]),
        ],
        [
            Paragraph("<b>Auto-Escalation Safeguard:</b>", styles["MetaKey"]),
            Paragraph("Enabled (SOS Trigger upon 3-min timeout)" if journey.escalation_enabled else "Active Monitored", styles["MetaVal"]),
            Paragraph("<b>Recorded Breadcrumb Count:</b>", styles["MetaKey"]),
            Paragraph(f"{len(getattr(journey, 'locations', []) or [])} GPS Waypoints Captured", styles["MetaVal"]),
        ],
    ]

    t_waypoints = Table(waypoint_rows, colWidths=[38 * mm, 49 * mm, 38 * mm, 49 * mm])
    t_waypoints.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_waypoints)
    story.append(Spacer(1, 4 * mm))

    # 4. Statutory Legal Notice & Helplines
    story.append(build_statutory_footer(styles))

    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf


# =========================================================================
# 4. BULK SOS HISTORY REPORT PDF
# =========================================================================
def build_bulk_sos_pdf(events, user):
    """
    Build a comprehensive multi-event SOS History Audit Dossier.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-SOS-HIST-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # Header
    story.extend(build_doc_header(
        title="EMERGENCY SOS DISTRESS LOG & AUDIT REPORT",
        subtitle=f"Comprehensive Historical Log of Distress Events ({len(events)} Total Recorded)",
        ref_id=ref_id,
        user=user,
        status_text="VERIFIED RECORD",
        styles=styles,
    ))

    # Table of SOS Events
    story.append(Paragraph("1. CHRONOLOGICAL DISTRESS DISPATCH HISTORY", styles["SectionHeader"]))

    if events:
        headers = [
            Paragraph("<b>SOS #</b>", styles["TableHeader"]),
            Paragraph("<b>Date / Time</b>", styles["TableHeader"]),
            Paragraph("<b>Mode</b>", styles["TableHeader"]),
            Paragraph("<b>Status</b>", styles["TableHeader"]),
            Paragraph("<b>GPS Telemetry</b>", styles["TableHeader"]),
            Paragraph("<b>Notifications Broadcast</b>", styles["TableHeader"]),
        ]
        table_rows = [headers]

        for e in events:
            loc_str = f"{e.lat:.4f}, {e.lng:.4f}" if (e.lat and e.lng) else (e.location_status or "Unavailable")
            notifs = [f"{n.channel.upper()} to {n.recipient} ({n.status})" for n in getattr(e, "notifications", [])]
            notif_text = "<br/>".join(notifs) if notifs else "None logged"

            table_rows.append([
                Paragraph(f"<b>#{e.id}</b>", styles["TableCell"]),
                Paragraph(format_dt(e.created_at), styles["TableCell"]),
                Paragraph(e.mode.upper(), styles["TableCell"]),
                Paragraph(e.status.upper(), styles["TableCell"]),
                Paragraph(loc_str, styles["TableCell"]),
                Paragraph(notif_text, styles["TableCell"]),
            ])

        t_events = Table(table_rows, colWidths=[12 * mm, 38 * mm, 18 * mm, 18 * mm, 34 * mm, 54 * mm])
        t_events.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#881337")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#fff1f2")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecdd3")),
            ("PADDING", (0, 0), (-1, -1), 3.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t_events)
    else:
        story.append(Paragraph("<i>No emergency SOS distress events recorded for this user profile.</i>", styles["BodySmall"]))

    story.append(build_statutory_footer(styles))
    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf


# =========================================================================
# 5. BULK JOURNEYS REPORT PDF
# =========================================================================
def build_bulk_journeys_pdf(journeys, user):
    """
    Build a comprehensive multi-trip Journey History & Audit Dossier.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-JRN-HIST-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # Header
    story.extend(build_doc_header(
        title="JOURNEY GUARDIAN COMMUTE HISTORY REPORT",
        subtitle=f"Surveillance Audit of Safe Commutes ({len(journeys)} Total Recorded)",
        ref_id=ref_id,
        user=user,
        status_text="VERIFIED RECORD",
        styles=styles,
    ))

    # Table of Journeys
    story.append(Paragraph("1. RECORDED COMMUTES & TRANSIT SUMMARY", styles["SectionHeader"]))

    if journeys:
        headers = [
            Paragraph("<b>#</b>", styles["TableHeader"]),
            Paragraph("<b>Departure Time</b>", styles["TableHeader"]),
            Paragraph("<b>Origin</b>", styles["TableHeader"]),
            Paragraph("<b>Destination</b>", styles["TableHeader"]),
            Paragraph("<b>Route / Distance</b>", styles["TableHeader"]),
            Paragraph("<b>Status</b>", styles["TableHeader"]),
        ]
        table_rows = [headers]

        for j in journeys:
            orig = (j.origin_label or "Start").split(",")[0]
            dest = (j.dest_label or "End").split(",")[0]
            dist_km = f"{j.planned_distance_m / 1000:.1f} km" if j.planned_distance_m else "—"

            table_rows.append([
                Paragraph(f"<b>#{j.id}</b>", styles["TableCell"]),
                Paragraph(format_dt(j.started_at), styles["TableCell"]),
                Paragraph(orig, styles["TableCell"]),
                Paragraph(dest, styles["TableCell"]),
                Paragraph(f"{(j.route_type or 'safe').capitalize()}<br/>{dist_km}", styles["TableCell"]),
                Paragraph(f"<b>{(j.status or 'active').upper()}</b>", styles["TableCell"]),
            ])

        t_journeys = Table(table_rows, colWidths=[10 * mm, 38 * mm, 38 * mm, 38 * mm, 26 * mm, 24 * mm])
        t_journeys.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#065f46")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f0fdf4")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
            ("PADDING", (0, 0), (-1, -1), 3.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t_journeys)
    else:
        story.append(Paragraph("<i>No commute records found for this account.</i>", styles["BodySmall"]))

    story.append(build_statutory_footer(styles))
    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf


# =========================================================================
# 6. MONTHLY SAFETY ACTIVITY SUMMARY PDF
# =========================================================================
def build_monthly_pdf(user, sos_count, journey_count, report_count, days=30):
    """
    Build an executive Monthly Safety Digest and Threat Mitigation Summary.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = get_pdf_styles()
    ref_id = f"ABH-MONTHLY-{uuid.uuid4().hex[:6].upper()}"

    story = []

    # Header
    story.extend(build_doc_header(
        title="MONTHLY SAFETY INTELLIGENCE & ACTIVITY AUDIT",
        subtitle=f"Personal Safety Shield Digest • Past {days} Days Overview",
        ref_id=ref_id,
        user=user,
        status_text="COMPLIANT",
        styles=styles,
    ))

    # Metric Cards Summary
    story.append(Paragraph("1. 30-DAY SAFETY ACTIVITY METRICS", styles["SectionHeader"]))

    card1 = [Paragraph("<b>SOS DISTRESS CALLS</b>", styles["DocSubtitle"]), Paragraph(f"<font size=20><b>{sos_count}</b></font>", styles["DocTitle"]), Paragraph("Recorded in 30 Days", styles["BodySmall"])]
    card2 = [Paragraph("<b>PROTECTED JOURNEYS</b>", styles["DocSubtitle"]), Paragraph(f"<font size=20><b>{journey_count}</b></font>", styles["DocTitle"]), Paragraph("Live Commutes Monitored", styles["BodySmall"])]
    card3 = [Paragraph("<b>COMMUNITY REPORTS</b>", styles["DocSubtitle"]), Paragraph(f"<font size=20><b>{report_count}</b></font>", styles["DocTitle"]), Paragraph("Incidents/Hazards Filed", styles["BodySmall"])]

    t_cards = Table([[card1, card2, card3]], colWidths=[56 * mm, 56 * mm, 56 * mm])
    t_cards.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#fff1f2")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#f5f3ff")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#fecdd3")),
        ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#bbf7d0")),
        ("BOX", (2, 0), (2, 0), 1, colors.HexColor("#ddd6fe")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(t_cards)
    story.append(Spacer(1, 4 * mm))

    # Safety Assessment Analysis
    story.append(Paragraph("2. AUTOMATED SAFETY READINESS & RISK EVALUATION", styles["SectionHeader"]))
    readiness_text = (
        f"<b>Account Holder:</b> {user.full_name}<br/>"
        f"<b>Emergency Circle Status:</b> {len(user.contacts)} Priority Contacts Registered & Synced<br/>"
        f"<b>Location Sharing Permission:</b> {'Active / Permitted' if user.location_sharing_enabled else 'Restricted'}<br/>"
        f"<b>Safety Index:</b> Operational & Active Protection. During the evaluated period, {journey_count} journeys "
        f"were tracked with active deviation guard and {sos_count} emergency SOS events were audited. "
        "All telemetry data has been digitally certified for evidentiary integrity."
    )
    t_eval = Table([[Paragraph(readiness_text, styles["BodyText"])]], colWidths=[174 * mm])
    t_eval.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_eval)

    story.append(build_statutory_footer(styles))
    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf
