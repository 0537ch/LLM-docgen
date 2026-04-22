from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from pathlib import Path
from typing import Dict, Any, List
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger("docx_service")

class DOCXService:
    def __init__(self):
        self.templates_dir = Path(Config.TEMPLATES_DIR)

    def load_template(self, doc_type: str, template_type: str) -> Document:
        """Load DOCX template"""
        template_path = self.templates_dir / f"{template_type}_{doc_type.lower()}.docx"

        if not template_path.exists():
            # Try alternative naming
            template_path = self.templates_dir / f"{doc_type}_{template_type}.docx"

        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        logger.info(f"Loading template: {template_path.name}")
        return Document(str(template_path))

    def add_items_table(self, doc: Document, items: List[Dict], table_title: str = '', placeholder: str = None) -> 'docx.table.Table':
        """Add items table with actual DOCX table structure

        Args:
            doc: Document object
            items: List of item dictionaries
            table_title: Optional title for the table
            placeholder: If provided, find this placeholder and insert table there instead of at end

        Returns:
            The created table object
        """
        if not items:
            logger.warning("No items to add to table")
            return

        # Find insertion point if placeholder specified
        placeholder_paragraph = None

        if placeholder:
            for paragraph in doc.paragraphs:
                if placeholder in paragraph.text:
                    placeholder_paragraph = paragraph
                    logger.info(f"Found placeholder '{placeholder}'")
                    break

        # Create table using python-docx API
        table = doc.add_table(rows=1, cols=5)
        # Try to set Table Grid style, but don't fail if it doesn't exist
        try:
            table.style = 'Table Grid'
            logger.info(f"Successfully set table style to 'Table Grid'")
        except KeyError as e:
            logger.warning(f"Table Grid style not found in template: {e}. Using default style.")
            # List available styles for debugging
            available_styles = [s.name for s in doc.styles]
            logger.info(f"Available table styles in template: {available_styles[:10]}")  # First 10

        # Enable autofit for table
        table.allow_autofit = True

        # Add headers
        headers = ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
            for paragraph in header_cells[i].paragraphs:
                paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
                paragraph.paragraph_format.line_spacing = 1.0
                for run in paragraph.runs:
                    run.bold = False

        # Add data rows
        for idx, item in enumerate(items, start=1):
            row_cells = table.add_row().cells

            # NO
            row_cells[0].text = str(item.get('NO', idx))
            row_cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[0].paragraphs[0].paragraph_format.line_spacing = 1.0

            # URAIAN
            uraian = item.get('uraian', item.get('name', item.get('Deskripsi', item.get('URAIAN', ''))))
            row_cells[1].text = str(uraian)
            for paragraph in row_cells[1].paragraphs:
                paragraph.paragraph_format.line_spacing = 1.0

            # VOLUME
            volume = item.get('volume', item.get('quantity', item.get('Volume', item.get('VOLUME', ''))))
            row_cells[2].text = str(volume)
            row_cells[2].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[2].paragraphs[0].paragraph_format.line_spacing = 1.0

            # SATUAN
            satuan = item.get('satuan', item.get('unit', item.get('Satuan', item.get('SATUAN', ''))))
            row_cells[3].text = str(satuan)
            row_cells[3].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[3].paragraphs[0].paragraph_format.line_spacing = 1.0

            # HARGA SATUAN
            harga = item.get('harga_satuan', item.get('price', item.get('Harga', item.get('HARGA', ''))))
            harga_text = str(harga) if harga else '-'
            row_cells[4].text = harga_text
            row_cells[4].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[4].paragraphs[0].paragraph_format.line_spacing = 1.0

        # Move table to placeholder position if specified
        if placeholder_paragraph:
            # Get table element
            table_element = table._element

            # Insert table element after placeholder paragraph
            placeholder_paragraph._element.addnext(table_element)

            # Clear placeholder text but keep paragraph
            placeholder_paragraph.text = ""
            logger.info(f"Moved table to placeholder position")
        else:
            logger.info("Appended table to end of document")

        logger.info(f"Added table with {len(items)} rows")
        return table

    def add_summary_table(self, doc: Document, table: 'docx.table.Table', ppn_percent: int = 11) -> None:
        """Add summary rows (Total, PPN, Grand Total) to the items table

        Args:
            doc: Document object
            table: The items table to add summary to
            ppn_percent: PPN percentage (default 11%)
        """
        # Calculate total from existing rows
        total = 0
        for row in table.rows[1:]:  # Skip header row
            try:
                # Jumlah Harga is in column 4 (0-indexed)
                jumlah_text = row.cells[4].text.strip()
                if jumlah_text and jumlah_text != '-':
                    # Remove non-numeric characters (dots, commas, etc)
                    jumlah_clean = ''.join(c for c in jumlah_text if c.isdigit())
                    if jumlah_clean:
                        total += int(jumlah_clean)
            except (ValueError, IndexError):
                continue

        # Calculate PPN and Grand Total
        ppn = int(total * ppn_percent / 100)
        grand_total = total + ppn

        # Add Total row
        total_row = table.add_row()
        total_row.cells[0].merge(total_row.cells[3])  # Merge first 4 cells
        total_row.cells[0].text = "Total"
        total_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        total_row.cells[0].paragraphs[0].runs[0].bold = True
        total_row.cells[4].text = f"Rp {total:,}".replace(',', '.')
        total_row.cells[4].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Add PPN row
        ppn_row = table.add_row()
        ppn_row.cells[0].merge(ppn_row.cells[3])
        ppn_row.cells[0].text = f"PPN ({ppn_percent}%)"
        ppn_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        ppn_row.cells[0].paragraphs[0].runs[0].bold = True
        ppn_row.cells[4].text = f"Rp {ppn:,}".replace(',', '.')
        ppn_row.cells[4].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Add Grand Total row
        grand_row = table.add_row()
        grand_row.cells[0].merge(grand_row.cells[3])
        grand_row.cells[0].text = "Grand Total"
        grand_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        grand_row.cells[0].paragraphs[0].runs[0].bold = True
        grand_row.cells[4].text = f"Rp {grand_total:,}".replace(',', '.')
        grand_row.cells[4].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        logger.info(f"Added summary: Total={total}, PPN={ppn}, Grand Total={grand_total}")

    def replace_placeholders(self, doc: Document, replacements: Dict[str, str]) -> None:
        """Replace placeholders in document while preserving formatting"""
        logger.info(f"Replacing placeholders: {list(replacements.keys())}")
        replaced_count = 0

        for paragraph in doc.paragraphs:
            for key, value in replacements.items():
                placeholder = f"{{{{{key}}}}}"
                if placeholder in paragraph.text:
                    # Preserve formatting by replacing in runs
                    self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                    logger.info(f"Replaced placeholder: {placeholder}")
                    replaced_count += 1

        # Also check tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            placeholder = f"{{{{{key}}}}}"
                            if placeholder in paragraph.text:
                                self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                                logger.info(f"Replaced placeholder in table: {placeholder}")
                                replaced_count += 1

        logger.info(f"Total placeholders replaced: {replaced_count}")

        # Also check tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            placeholder = f"{{{{{key}}}}}"
                            if placeholder in paragraph.text:
                                self._replace_text_in_paragraph(paragraph, placeholder, str(value))

    def _replace_text_in_paragraph(self, paragraph, old_text, new_text):
        """Replace text in paragraph while preserving formatting"""
        for run in paragraph.runs:
            if old_text in run.text:
                run.text = run.text.replace(old_text, new_text)

    def fill_template(self, doc: Document, data: Dict[str, Any]) -> Document:
        """Fill template with extracted data"""
        # Use all data fields for replacement
        replacements = {key: str(value) if value is not None else ""
                      for key, value in data.items()}

        self.replace_placeholders(doc, replacements)
        return doc

    def save_document(self, doc: Document, output_path: str) -> None:
        """Save document to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving document to: {output_path}")
        doc.save(str(output_path))
