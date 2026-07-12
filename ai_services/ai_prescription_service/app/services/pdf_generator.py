import logging
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.schemas.response_schema import PrescriptionSchema
from app.schemas.request_schema import DoctorMetadata, PatientMetadata
from app.utils.file_handler import ensure_directory_exists

logger = logging.getLogger("prescription_service.pdf")

class PDFGeneratorService:
    def generate_pdf(
        self,
        prescription: PrescriptionSchema,
        output_path: Path,
        doctor: DoctorMetadata,
        patient: PatientMetadata
    ) -> None:
        """
        Generates a premium, highly professional prescription PDF from the structured data.
        """
        logger.info(f"Generating PDF at: {output_path}")
        ensure_directory_exists(output_path.parent)

        # 1. Document Setup (A4 size with 0.75-inch/54pt margins)
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        # 2. Styles Definition
        styles = getSampleStyleSheet()
        
        # Color Palette
        primary_color = colors.HexColor("#1A365D")  # Deep Blue
        secondary_color = colors.HexColor("#2B6CB0") # Medium Blue
        accent_color = colors.HexColor("#E2E8F0")    # Soft gray for dividers
        text_color = colors.HexColor("#2D3748")      # Dark charcoal text
        bg_alt_row = colors.HexColor("#F7FAFC")      # Light gray/blue alternating row
        
        # Create customized styles
        clinic_title_style = ParagraphStyle(
            "ClinicTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=primary_color
        )
        
        doctor_title_style = ParagraphStyle(
            "DoctorTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=primary_color
        )
        
        doctor_meta_style = ParagraphStyle(
            "DoctorMeta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4A5568"),
            alignment=TA_LEFT
        )
        
        doctor_contact_style = ParagraphStyle(
            "DoctorContact",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#718096"),
            alignment=TA_RIGHT
        )
        
        section_heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=secondary_color,
            spaceAfter=6
        )
        
        body_text_style = ParagraphStyle(
            "BodyTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=text_color
        )
        
        bullet_item_style = ParagraphStyle(
            "BulletItem",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=text_color,
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=4
        )

        patient_label_style = ParagraphStyle(
            "PatientLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#2D3748")
        )
        
        patient_val_style = ParagraphStyle(
            "PatientVal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#4A5568")
        )

        # Medication Table Styles
        th_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white
        )
        
        tb_style = ParagraphStyle(
            "TableBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=text_color
        )
        
        tb_bold_style = ParagraphStyle(
            "TableBodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=text_color
        )

        story = []

        # 3. Clinic & Doctor Letterhead
        letterhead_data = [
            [
                Paragraph(doctor.clinic_name.upper(), clinic_title_style),
                Paragraph(f"<b>Tel:</b> {doctor.contact}", doctor_contact_style)
            ],
            [
                Paragraph(f"<b>{doctor.name}</b><br/>{doctor.specialty}<br/>Reg No: {doctor.license_number}", doctor_meta_style),
                Paragraph(f"Date: {patient.date or datetime.now().strftime('%Y-%m-%d')}", doctor_contact_style)
            ]
        ]
        
        # Table takes exact printable width (595 - 54 - 54 = 487pt)
        letterhead_table = Table(letterhead_data, colWidths=[287, 200])
        letterhead_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(letterhead_table)
        
        # Premium horizontal accent line
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=2.5, color=primary_color, spaceBefore=2, spaceAfter=8))
        story.append(Spacer(1, 5))

        # 4. Patient Information Block
        patient_data = [
            [
                Paragraph("Patient Name:", patient_label_style),
                Paragraph(patient.name, patient_val_style),
                Paragraph("Age / Gender:", patient_label_style),
                Paragraph(f"{patient.age} / {patient.gender}", patient_val_style)
            ]
        ]
        patient_table = Table(patient_data, colWidths=[90, 160, 90, 147])
        patient_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), bg_alt_row),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 15))

        # 5. Symptoms and Diagnosis Section
        symptoms_text = ", ".join(prescription.symptoms) if prescription.symptoms else "None reported"
        symptom_diag_data = [
            [Paragraph("<b>Symptoms:</b>", patient_label_style), Paragraph(symptoms_text, body_text_style)],
            [Paragraph("<b>Diagnosis:</b>", patient_label_style), Paragraph(prescription.diagnosis or "General Consultation", body_text_style)]
        ]
        symptom_diag_table = Table(symptom_diag_data, colWidths=[90, 397])
        symptom_diag_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(symptom_diag_table)
        
        # Horizontal thin separator
        story.append(Spacer(1, 5))
        story.append(HRFlowable(width="100%", thickness=0.5, color=accent_color, spaceBefore=4, spaceAfter=12))

        # 6. Medications Section (Rx)
        story.append(Paragraph("Rx (Medications)", section_heading_style))
        story.append(Spacer(1, 5))
        
        if prescription.medications:
            # Table headers
            med_table_data = [[
                Paragraph("#", th_style),
                Paragraph("Medicine Name", th_style),
                Paragraph("Dosage", th_style),
                Paragraph("Frequency", th_style),
                Paragraph("Duration", th_style),
                Paragraph("Instructions", th_style)
            ]]
            
            # Fill medications rows
            for idx, med in enumerate(prescription.medications, start=1):
                med_table_data.append([
                    Paragraph(str(idx), tb_style),
                    Paragraph(f"<b>{med.medicine_name}</b>", tb_bold_style),
                    Paragraph(med.dosage, tb_style),
                    Paragraph(med.frequency, tb_style),
                    Paragraph(med.duration, tb_style),
                    Paragraph(med.instructions or "-", tb_style)
                ])
                
            # Set colWidths: Total 487pt
            # #=20, Name=150, Dosage=60, Freq=80, Dur=60, Inst=117
            med_table = Table(med_table_data, colWidths=[20, 150, 60, 80, 60, 117])
            
            # Stylize the table
            med_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BACKGROUND', (0,0), (-1,0), primary_color),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('BOX', (0,0), (-1,-1), 0.5, primary_color),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_alt_row]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ]))
            story.append(med_table)
        else:
            story.append(Paragraph("No medications prescribed.", body_text_style))
            
        story.append(Spacer(1, 15))

        # 7. General Advice Section
        if prescription.advice:
            story.append(Paragraph("Advice & Instructions", section_heading_style))
            story.append(Spacer(1, 5))
            for item in prescription.advice:
                story.append(Paragraph(f"• {item}", bullet_item_style))
            story.append(Spacer(1, 10))

        # Thin separator before signature
        story.append(HRFlowable(width="100%", thickness=0.5, color=accent_color, spaceBefore=10, spaceAfter=20))

        # 8. Signature Block
        sig_data = [
            ["", Paragraph("____________________________", ParagraphStyle("SigLine", parent=styles["Normal"], alignment=TA_CENTER))],
            ["", Paragraph(f"<b>{doctor.name}</b>", ParagraphStyle("DocName", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, alignment=TA_CENTER))],
            ["", Paragraph("Authorized Signature", ParagraphStyle("AuthSig", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#718096"), alignment=TA_CENTER))]
        ]
        # Align signature block to the right side of the page
        sig_table = Table(sig_data, colWidths=[287, 200])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(sig_table)

        # 9. Build Document
        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.HexColor("#A0AEC0"))
            canvas.drawString(54, 30, "Generated by MediConnect AI Prescription Service (FastAPI Microservice)")
            canvas.drawRightString(doc.pagesize[0]-54, 30, f"Page {doc.page}")
            canvas.restoreState()

        doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
        logger.info("PDF generated successfully.")

pdf_generator = PDFGeneratorService()
