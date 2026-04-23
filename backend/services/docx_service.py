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

    def replace_placeholders(self, doc: Document, replacements: Dict[str, Any], list_placeholders: List[str] = None) -> None:
        """Replace placeholders in document while preserving formatting

        Args:
            doc: Document object
            replacements: Dict of placeholder names to values (strings or lists)
            list_placeholders: List of placeholder keys that should be formatted as numbered lists
        """
        if list_placeholders is None:
            list_placeholders = []

        logger.info(f"Replacing placeholders: {list(replacements.keys())}")
        logger.info(f"List placeholders: {list_placeholders}")
        replaced_count = 0

        # Handle list-type placeholders first
        for list_key in list_placeholders:
            if list_key in replacements:
                placeholder = f"{{{{{list_key}}}}}"
                value = replacements[list_key]

                if isinstance(value, list):
                    self.insert_numbered_list(doc, value, placeholder)
                    replaced_count += 1
                else:
                    logger.warning(f"List placeholder '{list_key}' received non-list value: {type(value)}")

        # Handle normal text placeholders (skip list placeholders)
        for paragraph in doc.paragraphs:
            for key, value in replacements.items():
                if key in list_placeholders:
                    continue  # Already handled

                placeholder = f"{{{{{key}}}}}"
                if placeholder in paragraph.text:
                    self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                    logger.info(f"Replaced placeholder: {placeholder}")
                    replaced_count += 1

        # Also check tables for normal placeholders
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            if key in list_placeholders:
                                continue  # Already handled

                            placeholder = f"{{{{{key}}}}}"
                            if placeholder in paragraph.text:
                                self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                                logger.info(f"Replaced placeholder in table: {placeholder}")
                                replaced_count += 1

        logger.info(f"Total placeholders replaced: {replaced_count}")

    def _replace_text_in_paragraph(self, paragraph, old_text, new_text):
        """Replace text in paragraph while preserving formatting"""
        for run in paragraph.runs:
            if old_text in run.text:
                run.text = run.text.replace(old_text, new_text)

    def fill_template(self, doc: Document, data: Dict[str, Any], list_placeholders: List[str] = None) -> Document:
        """Fill template with extracted data

        Args:
            doc: Document object
            data: Dict of placeholder names to values
            list_placeholders: List of keys that should be formatted as numbered lists
        """
        if list_placeholders is None:
            list_placeholders = []

        # Convert all values to strings except list placeholders
        replacements = {}
        for key, value in data.items():
            if key in list_placeholders:
                # Keep as-is (should be list)
                replacements[key] = value
            else:
                # Convert to string, None -> empty string
                replacements[key] = str(value) if value is not None else ""

        self.replace_placeholders(doc, replacements, list_placeholders)
        return doc


    def save_document(self, doc: Document, output_path: str) -> None:
        """Save document to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving document to: {output_path}")
        doc.save(str(output_path))
    
    def insert_numbered_list(self, doc: Document, activities: List[str], placeholder: str) -> None:
        """Insert work activities as Word numbered list at placeholder position

        Args:
            doc: Document object
            activities: List of activity strings (no manual numbering)
            placeholder: Placeholder text to find (e.g., "{{pasal2_content}}")

        Behavior:
            - Finds paragraph containing placeholder
            - Inserts each activity as separate paragraph with "List Number" style
            - Deletes placeholder paragraph
            - Falls back to manual numbering if "List Number" style missing
        """
        if not activities:
            logger.warning("No activities to insert")
            return

        # Find placeholder paragraph
        placeholder_paragraph = None
        for paragraph in doc.paragraphs:
            if placeholder in paragraph.text:
                placeholder_paragraph = paragraph
                logger.info(f"Found placeholder '{placeholder}'")
                break

        if not placeholder_paragraph:
            logger.warning(f"Placeholder '{placeholder}' not found")
            return

        # Check if "List Number" style exists
        style_name = "List Number"
        style_exists = any(s.name == style_name for s in doc.styles)

        # Get placeholder position (insertion point)
        placeholder_element = placeholder_paragraph._element

        # Store placeholder formatting for copying
        placeholder_alignment = placeholder_paragraph.alignment
        placeholder_paragraph_format = placeholder_paragraph.paragraph_format

        # Get font from placeholder (use first run if available)
        placeholder_font = None
        if placeholder_paragraph.runs:
            placeholder_font = placeholder_paragraph.runs[0].font

        # Insert each activity as numbered paragraph
        for activity in activities:
            if not activity.strip():
                continue

            # Create new paragraph
            new_para = doc.add_paragraph(activity)

            # Copy placeholder formatting
            new_para.alignment = placeholder_alignment

            # Copy paragraph format (line spacing, etc.)
            if placeholder_paragraph_format:
                new_para.paragraph_format.line_spacing = placeholder_paragraph_format.line_spacing
                new_para.paragraph_format.space_before = placeholder_paragraph_format.space_before
                new_para.paragraph_format.space_after = placeholder_paragraph_format.space_after

            # Copy font formatting
            if placeholder_font and new_para.runs:
                new_font = new_para.runs[0].font
                new_font.name = placeholder_font.name
                new_font.size = placeholder_font.size
                new_font.bold = placeholder_font.bold
                new_font.italic = placeholder_font.italic

            # Apply numbering style or fallback
            if style_exists:
                try:
                    new_para.style = style_name
                except Exception as e:
                    logger.warning(f"Failed to apply style: {e}, using manual numbering")
                    # Add manual numbering as fallback
                    new_para.text = f"{doc.paragraphs.index(new_para) + 1}. {activity}"
            else:
                # Manual numbering fallback
                new_para.text = f"{doc.paragraphs.index(new_para) + 1}. {activity}"
                logger.warning(f"Style '{style_name}' not found, using manual numbering")

            # Move paragraph to placeholder position
            new_para_element = new_para._element
            placeholder_element.addnext(new_para_element)

        # Remove placeholder paragraph
        placeholder_paragraph.text = ""
        logger.info(f"Inserted {len(activities)} activities as numbered list")

