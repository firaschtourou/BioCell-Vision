import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)

# -----------------------
# Helpers
# -----------------------
def safe_text(value, default="N/A"):
    if value is None:
        return default
    v = str(value).strip()
    return v if v else default


def safe_percent(conf):
    if conf is None or conf == "":
        return "N/A"
    try:
        x = float(conf)
        return f"{x:.2f} %"
    except Exception:
        return safe_text(conf)


def try_add_image(elements, image_path, width_cm, height_cm, caption, styles):
    """
    Ajoute une image si elle existe sinon rien (et caption optionnel).
    """
    if not image_path:
        return False

    path = str(image_path).strip()
    if not path or not os.path.exists(path):
        return False

    try:
        if caption:
            elements.append(Paragraph(caption, styles["caption_style"]))
        img = Image(path, width=width_cm * cm, height=height_cm * cm, kind="proportional")
        elements.append(img)
        elements.append(Spacer(1, 10))
        return True
    except Exception:
        if caption:
            elements.append(Paragraph(caption + " (non affichable)", styles["error_style"]))
        return False


def build_kv_table(rows, col1=7 * cm, col2=10.5 * cm, styles=None):
    table = Table(rows, colWidths=[col1, col2])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d6e3f8")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f7fbff")]),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ])
    )
    return table


# -----------------------
# PDF
# -----------------------
def generate_analysis_report_pdf(output_path: str, report_data: dict):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.2 * cm,
        leftMargin=1.2 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
        title="BioCell Vision - Rapport d'analyse",
        author="BioCell Vision",
    )

    styles = getSampleStyleSheet()

    # Palette clinique blanc/bleu
    CLINIC_BLUE = colors.HexColor("#0b3d91")
    CLINIC_BLUE_2 = colors.HexColor("#1565c0")
    LINE = colors.HexColor("#d9e6fb")
    BG_LIGHT = colors.HexColor("#f7fbff")
    TEXT_DARK = colors.HexColor("#1f2a37")
    GREY = colors.HexColor("#6b7280")

    badge_ok = colors.HexColor("#e8f5e9")      # green light
    badge_warn = colors.HexColor("#fff3e0")    # orange light
    badge_blue = colors.HexColor("#e3f2fd")    # blue light

    title_style = ParagraphStyle(
        "title_style",
        parent=styles["Heading1"],
        alignment=TA_CENTER,
        fontSize=17,
        leading=20,
        textColor=CLINIC_BLUE,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "subtitle_style",
        parent=styles["BodyText"],
        alignment=TA_CENTER,
        fontSize=10.5,
        leading=13,
        textColor=GREY,
        spaceAfter=12,
    )

    section_style = ParagraphStyle(
        "section_style",
        parent=styles["Heading2"],
        alignment=TA_LEFT,
        fontSize=12,
        leading=15,
        textColor=CLINIC_BLUE_2,
        spaceBefore=10,
        spaceAfter=6,
    )

    caption_style = ParagraphStyle(
        "caption_style",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=11,
        textColor=GREY,
        spaceBefore=6,
        spaceAfter=3,
    )

    error_style = ParagraphStyle(
        "error_style",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=11,
        textColor=colors.red,
        spaceBefore=6,
        spaceAfter=3,
    )

    small_style = ParagraphStyle(
        "small_style",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=11,
        textColor=TEXT_DARK,
    )

    # Store extra in styles dict for helper usage
    styles_dict = {
        "caption_style": caption_style,
        "error_style": error_style,
        "small_style": small_style,
    }

    elements = []

    # Header avec logo (si fourni)
    company_logo = report_data.get("company_logo_path")
    elements.append(Paragraph("BioCell Vision", title_style))
    if company_logo and os.path.exists(company_logo):
        try:
            elements.insert(1, Image(company_logo, width=3.2 * cm, height=1.2 * cm, kind="proportional"))
        except Exception:
            pass
    elements.append(Paragraph("Rapport d'analyse biologique (généré automatiquement)", subtitle_style))
    elements.append(Spacer(1, 6))

    # Synthèse clinique
    predicted_class = safe_text(report_data.get("predicted_class"))
    global_state = safe_text(report_data.get("global_state"))
    confidence = report_data.get("confidence")

    gs = str(global_state).strip().lower()
    if gs == "normale":
        badge_label = "État global : Normale"
        badge_bg = badge_ok
    elif gs == "anormale":
        badge_label = "État global : Anormale"
        badge_bg = badge_warn
    else:
        badge_label = f"État global : {global_state}"
        badge_bg = badge_blue

    elements.append(Paragraph("Synthèse clinique", section_style))

    # ✅ Correction: on ne chain pas .setStyle sur Table(...)
    synth_table = Table(
        [
            [
                Paragraph(f"<b>Classe prédite</b> : {predicted_class}", small_style),
                Paragraph(badge_label, small_style),
                Paragraph(f"<b>Confiance</b> : {safe_percent(confidence)}", small_style),
            ]
        ],
        colWidths=[6.0 * cm, 6.8 * cm, 6.9 * cm],
    )
    synth_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.8, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 7),
            # Optionnel : fond couleur badge dans cellule 1 colonne 1
            ("BACKGROUND", (1, 0), (1, 0), badge_bg),
        ])
    )
    elements.append(synth_table)

    elements.append(Spacer(1, 12))

    # KV tables
    general_info = [
        ["ID Analyse", safe_text(report_data.get("analyse_id"))],
        ["Date analyse", safe_text(report_data.get("analyse_date"))],
        ["Client", safe_text(report_data.get("client_name"))],
        ["Type analyse", safe_text(report_data.get("analysis_type"))],
        ["Paramètres", safe_text(report_data.get("parameters"))],
        ["Notes", safe_text(report_data.get("notes"))],
        ["Nom image originale", safe_text(report_data.get("original_image_name"))],
        ["Statut analyse", safe_text(report_data.get("analysis_status"))],
    ]

    user_info = [
        ["Biologiste", safe_text(report_data.get("biologist_name"))],
        ["Email biologiste", safe_text(report_data.get("biologist_email"))],
        ["ID biologiste", safe_text(report_data.get("biologist_id"))],
    ]

    result_info = [
        ["ID Résultat", safe_text(report_data.get("result_id"))],
        ["Classe prédite", safe_text(report_data.get("predicted_class"))],
        ["État global", safe_text(report_data.get("global_state"))],
        ["Confiance", safe_percent(report_data.get("confidence"))],
        ["Cellules totales", safe_text(report_data.get("total_cells"))],
        ["Cellules normales", safe_text(report_data.get("normal_cells"))],
        ["Cellules anormales", safe_text(report_data.get("abnormal_cells"))],
        ["Explication AI", safe_text(report_data.get("ai_explanation"))],
        ["Conclusion courte", safe_text(report_data.get("short_conclusion"))],
        ["Version modèle", safe_text(report_data.get("model_version"))],
        ["Statut résultat", safe_text(report_data.get("result_status"))],
        ["Validation biologiste", safe_text(report_data.get("validation_status"))],
        ["Commentaire biologiste", safe_text(report_data.get("biologist_comment"))],
    ]

    elements.append(Paragraph("Informations générales", section_style))
    elements.append(build_kv_table(general_info))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("Informations biologiste", section_style))
    elements.append(build_kv_table(user_info))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("Résultats IA", section_style))
    elements.append(build_kv_table(result_info))
    elements.append(Spacer(1, 12))

    # Cellules : tableau enrichi + tri anomalies d’abord
    predicted_cells = report_data.get("predicted_cells", [])
    if isinstance(predicted_cells, list) and predicted_cells:
        elements.append(Paragraph("Détail des cellules détectées", section_style))

        def cell_key(c):
            if not isinstance(c, dict):
                return (1, 999999)
            state = str(c.get("state") or "")
            # Anormale en premier
            is_anom_sort = 0 if state == "Anormale" else 1
            return (is_anom_sort, c.get("id") or 0)

        try:
            cells_sorted = sorted(predicted_cells, key=cell_key)
        except Exception:
            cells_sorted = predicted_cells

        max_cells_to_show = int(report_data.get("max_cells_to_show", 40))
        shown = cells_sorted[:max_cells_to_show]

        header = ["#", "Label", "État", "Type anomalie", "Conf. cellule"]
        rows = [header]

        for i, item in enumerate(shown, start=1):
            if not isinstance(item, dict):
                continue
            label = safe_text(item.get("label"), "N/A")
            state = safe_text(item.get("state"), "N/A")
            anomaly_type = safe_text(item.get("anomaly_type"), "")
            conf = item.get("anomaly_confidence")
            conf_str = safe_percent(conf) if conf is not None else "N/A"

            rows.append([str(i), label, state, anomaly_type or "—", conf_str])

        table = Table(rows, colWidths=[1.0 * cm, 4.0 * cm, 2.1 * cm, 5.0 * cm, 3.0 * cm])
        table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf3ff")),
                ("TEXTCOLOR", (0, 0), (-1, 0), CLINIC_BLUE),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ])
        )
        elements.append(table)

        if len(predicted_cells) > max_cells_to_show:
            elements.append(Paragraph(
                f"(Affichage limité à {max_cells_to_show} cellules. Total détecté : {len(predicted_cells)})",
                small_style
            ))
        elements.append(Spacer(1, 12))
    else:
        elements.append(Paragraph("Aucune cellule détectée / donnée indisponible.", small_style))

    # Images : original + annotée + isolées (échantillon)
    elements.append(Paragraph("Images et visualisations", section_style))

    try_add_image(
        elements,
        report_data.get("original_image_full_path"),
        width_cm=12.5,
        height_cm=8.0,
        caption="Image originale",
        styles=styles_dict,
    )

    try_add_image(
        elements,
        report_data.get("annotated_image_full_path"),
        width_cm=12.5,
        height_cm=8.0,
        caption="Image annotée (IA)",
        styles=styles_dict,
    )

    isolated_imgs = report_data.get("isolated_cells_images", [])
    elements.append(Paragraph("Cellules isolées (échantillon)", section_style))

    if isinstance(isolated_imgs, list) and len(isolated_imgs) > 0:
        max_isolated = int(report_data.get("max_isolated_images", 6))
        isolated_imgs = [p for p in isolated_imgs if p and os.path.exists(p)][:max_isolated]

        if isolated_imgs:
            cols = 3
            rows_imgs = []
            for p in isolated_imgs:
                try:
                    img = Image(p, width=4.1 * cm, height=3.0 * cm, kind="proportional")
                except Exception:
                    img = Paragraph("N/A", small_style)
                rows_imgs.append(img)

            grid = []
            for i in range(0, len(rows_imgs), cols):
                row = rows_imgs[i:i + cols]
                while len(row) < cols:
                    row.append(Paragraph("N/A", small_style))
                grid.append(row)

            t = Table(grid, colWidths=[5.2 * cm] * cols)
            t.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("Aucune image de cellules isolées valide.", small_style))
    else:
        elements.append(Paragraph("Aucune image de cellules isolées disponible.", small_style))

    elements.append(Spacer(1, 14))
    elements.append(Paragraph(
        "Rapport généré automatiquement par <b>BioCell Vision</b>. "
        "Toute validation finale reste sous la responsabilité du biologiste.",
        styles["BodyText"]
    ))

    doc.build(elements)