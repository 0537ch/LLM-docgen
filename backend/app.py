import streamlit as st
from pathlib import Path
from services.ocr_service import OCRService
from services.extraction_service import ExtractionService
from utils.config import Config
from utils.logger import setup_logger
from strategies import StrategyFactory

logger = setup_logger("app")

def format_work_activities(activities):
    """Format work activities for Pasal 2"""
    if not activities:
        return "- Pekerjaan ini belum didefinisikan"

    formatted = []
    for i, activity in enumerate(activities, 1):
        formatted.append(f"{i}. {activity}")
    return '\n'.join(formatted)

def format_rab_items(data):
    """Format items for RAB table"""
    items = data.get("items", [])
    if not items:
        return ""

    lines = []
    lines.append("No\tUraian\tVolume\tSatuan\tHarga Satuan (IDR)\tJumlah Harga (IDR)")

    total = 0
    for i, item in enumerate(items, 1):
        # For now, price is unknown - will be filled by user
        lines.append(f"{i}\t{item.get('name', '')}\t{item.get('quantity', '')}\t{item.get('unit', '')}\t-\t-")

    return '\n'.join(lines)

def format_pasal_3_content(data):
    """Format Pasal 3 content from extracted data with Tabel 3.1"""
    parts = []

    # Add scope description
    if data.get("scope_description"):
        parts.append(data["scope_description"])

    # Add location details paragraph
    if data.get("location_details"):
        parts.append(f"\nDetail lokasi dan jalur pelaksanaan pekerjaan untuk {data.get('project_name', '')} dapat disampaikan sebagai berikut:")
        parts.append(f"\n{data['location_details']}")

    # Add table transition
    items = data.get("items", [])
    if items:
        parts.append("\nDetail material yang terdapat dalam pekerjaan ini wajib memenuhi spesifikasi yang tertuang dalam Tabel 3.1 sebagai berikut:")

        # Create table
        parts.append("\nTabel 3.1 Lingkup Item Pekerjaan")
        parts.append("No.\tUraian\tVolume\tSatuan")

        # Group by category
        material_items = [i for i in items if i.get('category') == 'Material']
        jasa_items = [i for i in items if i.get('category') == 'Jasa']

        if material_items:
            parts.append("A. MATERIAL")
            for i, item in enumerate(material_items, 1):
                parts.append(f"{i}\t{item.get('name', '')}\t{item.get('quantity', '')}\t{item.get('unit', '')}")

        if jasa_items:
            parts.append("B. JASA")
            for i, item in enumerate(jasa_items, 1):
                parts.append(f"{i}\t{item.get('name', '')}\t{item.get('quantity', '')}\t{item.get('unit', '')}")

    return '\n'.join(parts)

# Page config
st.set_page_config(
    page_title=Config.APP_TITLE,
    page_icon="",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'step' not in st.session_state:
    st.session_state.step = 1
if 'extracted_data' not in st.session_state:
    st.session_state.extracted_data = None
if 'lhp_text' not in st.session_state:
    st.session_state.lhp_text = None
if 'termin_list' not in st.session_state:
    st.session_state.termin_list = [{'percentage': '', 'condition': ''}]

def page_1_upload_extract():
    st.title("Upload LHP and Extract Data")

    # File uploader
    uploaded_file = st.file_uploader(
        "Upload LHP PDF",
        type=['pdf'],
        help="Upload Laporan Hasil Pemeriksaan (LHP) PDF file"
    )

    if uploaded_file:
        # Save uploaded file
        pdf_path = Path("temp_upload.pdf")
        with open(pdf_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        st.success(f"Uploaded: {uploaded_file.name}")

        # Extract button
        if st.button("Extract Data", type="primary"):
            with st.spinner("Extracting text with OCR..."):
                try:
                    # OCR
                    ocr_service = OCRService()
                    lhp_text = ocr_service.extract_text(str(pdf_path))
                    st.session_state.lhp_text = lhp_text

                    # Extract
                    extraction_service = ExtractionService()
                    doc_type = extraction_service.detect_document_type(lhp_text)

                    with st.spinner("Extracting structured data with AI..."):
                        extracted_data = extraction_service.extract_structured_data(
                            lhp_text, doc_type
                        )
                        st.session_state.extracted_data = extracted_data

                    st.success("✅ Extraction complete!")
                    # Reset termin list for new extraction
                    st.session_state.termin_list = [{'percentage': '', 'condition': ''}]
                    st.session_state.step = 2
                    st.rerun()

                except Exception as e:
                    st.error(f"Error: {str(e)}")
                    logger.error(f"Extraction error: {e}")

def page_2_review_edit():
    st.title("Review and Edit Extracted Data")

    if not st.session_state.extracted_data:
        st.warning("No data extracted. Please upload LHP first.")
        if st.button("Back to Upload"):
            st.session_state.step = 1
            st.rerun()
        return

    data = st.session_state.extracted_data

    # Document type
    with st.expander("Document Type", expanded=True):
        doc_type = st.selectbox(
            "Document Type",
            Config.DOC_TYPES,
            index=Config.DOC_TYPES.index(data.get("document_type", "PENGADAAN")),
            key="doc_type"
        )

    # Basic Information
    with st.expander("Basic Information", expanded=True):
        col1, col2 = st.columns(2)

        with col1:
            project_name = st.text_input(
                "Nama Pekerjaan",
                value=data.get("project_name", ""),
                key="project_name"
            )

            timeline = st.text_input(
                "Waktu Pelaksanaan",
                value=data.get("timeline", ""),
                key="timeline"
            )

        with col2:
            # Get strategy for document type
            strategy = StrategyFactory.create(doc_type)
            payment_config = strategy.get_payment_config()

            # Show info for fixed payment types (PADI_UMKM)
            if payment_config['fixed_payment']:
                st.info(f"Pembayaran: {payment_config['fixed_payment']}")
            else:
                # Show termin inputs (respect show_termins flag)
                if payment_config['show_termins']:
                    # Initialize termin list in session state
                    if 'termin_list' not in st.session_state:
                        payment_terms = data.get("payment_terms") or {}
                        if payment_terms:
                            # Convert existing termins to list format
                            termin_list = []
                            termin_keys = sorted(
                                [k for k in payment_terms.keys() if k.startswith('termin_') and k.endswith('_percent')],
                                key=lambda x: int(x.split('_')[1])
                            )
                            for key in termin_keys:
                                termin_num = key.split('_')[1]
                                termin_list.append({
                                    'percentage': payment_terms.get(f'termin_{termin_num}_percent', ''),
                                    'condition': payment_terms.get(f'termin_{termin_num}_condition', '')
                                })
                            if not termin_list:
                                termin_list = [{'percentage': '', 'condition': ''}]
                            st.session_state.termin_list = termin_list
                        else:
                            st.session_state.termin_list = [{'percentage': '', 'condition': ''}]

                st.markdown("**Pembayaran (Termin)**")

                # Display each termin
                for i, termin in enumerate(st.session_state.termin_list):
                    with st.container():
                        col_a, col_b, col_c = st.columns([2, 3, 1])

                        with col_a:
                            st.session_state.termin_list[i]['percentage'] = st.text_input(
                                f"Termin {i+1} (%)",
                                value=termin['percentage'],
                                key=f"termin_{i}_percentage"
                            )

                        with col_b:
                            st.session_state.termin_list[i]['condition'] = st.text_input(
                                "Syarat",
                                value=termin['condition'],
                                key=f"termin_{i}_condition",
                                help="Contoh: setelah BAST-I"
                            )

                        with col_c:
                            st.write("")
                            st.write("")
                            # Show delete button (respect allow_multiple flag)
                            if len(st.session_state.termin_list) > 1 and payment_config['allow_multiple']:
                                if st.button("Hapus", key=f"delete_termin_{i}"):
                                    st.session_state.termin_list.pop(i)
                                    st.rerun()

                    st.markdown("")

                # Add termin button (respect allow_multiple flag)
                if payment_config['allow_multiple']:
                    if st.button("Tambah Termin", key="add_termin"):
                        st.session_state.termin_list.append({'percentage': '', 'condition': ''})
                        st.rerun()

    # Work Activities
    with st.expander("Work Activities (Pasal 2)"):
        work_activities = data.get("work_activities", [])
        if work_activities:
            for i, activity in enumerate(work_activities):
                st.text_area(
                    f"Activity {i+1}",
                    value=activity,
                    key=f"activity_{i}",
                    height=100
                )
        else:
            st.info("No work activities extracted")

    # Items
    with st.expander("Items (Tabel 3.1)"):
        items = data.get("items", [])

        if items:
            for i, item in enumerate(items):
                with st.expander(f"Item {i+1}", expanded=False):
                    col1, col2, col3 = st.columns(3)

                    with col1:
                        st.text_input("Name", value=item.get("name", ""), key=f"item_{i}_name")
                    with col2:
                        st.text_input("Quantity", value=str(item.get("quantity", "")), key=f"item_{i}_qty")
                    with col3:
                        st.text_input("Unit", value=item.get("unit", ""), key=f"item_{i}_unit")

                    st.text_area(
                        "Specification",
                        value=item.get("specification", ""),
                        key=f"item_{i}_spec",
                        height=100
                    )
        else:
            st.info("No items extracted")

    # Paraphrase options
    with st.expander("AI Paraphrasing"):
        if st.button("Generate Paraphrase Options", key="paraphrase_btn"):
            with st.spinner("Generating paraphrased alternatives..."):
                try:
                    from services.paraphrase_service import ParaphraseService

                    paraphrase_service = ParaphraseService()

                    # Example: Paraphrase payment terms
                    payment_text = f"Termin I {termin1}%, Termin II {termin2}%"
                    options = paraphrase_service.paraphrase_section(payment_text, "payment_terms")

                    st.session_state.paraphrase_options = options

                except Exception as e:
                    st.error(f"Error generating paraphrases: {str(e)}")

    if 'paraphrase_options' in st.session_state:
        st.markdown("**Cara Pembayaran - Alternative Wording:**")

        for i, option in enumerate(st.session_state.paraphrase_options):
            if st.radio(
                f"Option {i+1}",
                [f"Use this", ""],
                horizontal=True,
                key=f"paraphrase_{i}"
            ) == "Use this":
                st.success(f"Selected: {option}")

    # Navigation
    st.markdown("---")
    col1, col2 = st.columns(2)

    with col1:
        if st.button("← Back", key="back_to_upload"):
            st.session_state.step = 1
            st.rerun()

    with col2:
        if st.button("Next: Generate →", type="primary", key="to_generate"):
            st.session_state.extracted_data["project_name"] = project_name
            st.session_state.extracted_data["timeline"] = timeline
            st.session_state.extracted_data["document_type"] = doc_type  # Update doc_type from user selection

            # Use strategy to determine if we save payment terms
            strategy = StrategyFactory.create(doc_type)
            payment_config = strategy.get_payment_config()

            # Only save payment terms if strategy allows termins
            if payment_config['show_termins']:
                termins_dict = {}
                for i, termin in enumerate(st.session_state.termin_list, 1):
                    termins_dict[f'termin_{i}_percent'] = termin['percentage']
                    termins_dict[f'termin_{i}_condition'] = termin['condition']
                st.session_state.extracted_data["payment_terms"] = termins_dict

            st.session_state.step = 3
            st.rerun()

def page_3_generate_download():
    st.title("Generate and Download Documents")

    if not st.session_state.extracted_data:
        st.warning("No data available. Please upload and extract data first.")
        if st.button("Start Over"):
            st.session_state.step = 1
            st.rerun()
        return

    data = st.session_state.extracted_data
    doc_type = st.session_state.get("doc_type", data.get("document_type", "PENGADAAN"))

    # Initialize generated files in session state
    if 'generated_rab_path' not in st.session_state:
        st.session_state.generated_rab_path = None
    if 'generated_rks_path' not in st.session_state:
        st.session_state.generated_rks_path = None

    # Format data for template
    from datetime import datetime

    strategy = StrategyFactory.create(doc_type)

    template_data = {
        "project_name": data.get("project_name", ""),
        "timeline": data.get("timeline", ""),
        "work_type": data.get("work_type", ""),
        "date": datetime.now().strftime("%d %B %Y"),
    }

    # Use strategy for Pasal 2 - work activities
    template_data["pasal2_content"] = strategy.format_work_activities(
        data.get("work_activities", []),
        data  # Pass data for placeholder replacement (e.g., work_type)
    )

    # Use strategy for Pasal 10 - payment (only if strategy provides it)
    payment_content = strategy.format_payment_content(data)
    if payment_content:
        template_data["pasal10_content"] = payment_content

    # Items table for RAB (text-based for RAB template)
    template_data["rab_items_table"] = format_rab_items(data)

    # Debug: log template data keys
    import json
    logger.info(f"Template data keys: {list(template_data.keys())}")
    logger.info(f"Pasal 2 content: {template_data.get('pasal_2_content', '')[:100]}...")

    # Preview
    st.markdown("### Document Preview")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**RAB**")
        st.info(f"Rencana Anggaran Biaya - {doc_type}")
        st.text(f"Project: {data.get('project_name', '')}")
        st.text(f"Items: {len(data.get('items', []))}")

    with col2:
        st.markdown("**RKS**")
        st.info(f"Rencana Kerja & Syarat - {doc_type}")
        st.text(f"Location: {data.get('location', '')}")
        st.text(f"Timeline: {data.get('timeline', '')}")

    # Pasal 2 preview
    with st.expander("Pasal 2 Content Preview"):
        st.text_area("Pasal 2", value=template_data["pasal2_content"], height=200)

    # Generate button
    st.markdown("---")

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        if st.button("Generate Documents", type="primary", key="generate_docs"):
            with st.spinner("Generating RAB and RKS documents..."):
                try:
                    from services.docx_service import DOCXService
                    from pathlib import Path

                    docx_service = DOCXService()
                    output_dir = Path(Config.OUTPUT_DIR)
                    output_dir.mkdir(exist_ok=True)

                    # Generate RAB
                    try:
                        rab_base = strategy.get_template_name("RAB")
                        rab_doc = docx_service.load_template(rab_base, "RAB")

                        # Add items table to RAB at placeholder position FIRST
                        items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
                        rab_table = docx_service.add_items_table(rab_doc, items_with_numbers, "Tabel Rencana Anggaran Biaya", placeholder="{{items_table}}")

                        # Add summary rows (Total, PPN, Grand Total) to RAB table
                        docx_service.add_summary_table(rab_doc, rab_table, ppn_percent=11)

                        # Then fill the rest of the template (but remove rab_items_table since we use table instead)
                        template_data_for_rab = {k: v for k, v in template_data.items() if k != "rab_items_table"}
                        rab_doc = docx_service.fill_template(rab_doc, template_data_for_rab)

                        rab_path = output_dir / f"RAB_{data.get('project_name', 'project').replace(' ', '_')}.docx"
                        docx_service.save_document(rab_doc, str(rab_path))

                        st.session_state.generated_rab_path = str(rab_path)
                        st.success(f"RAB generated: {rab_path.name}")
                    except FileNotFoundError:
                        st.warning(f"RAB template for {doc_type} not found")

                    # Generate RKS
                    try:
                        rks_base = strategy.get_template_name("RKS")
                        rks_doc = docx_service.load_template(rks_base, "RKS")

                        # Add items table to RKS at Pasal 3 placeholder position FIRST
                        items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
                        docx_service.add_items_table(rks_doc, items_with_numbers, "Tabel 3.1 Lingkup Item Pekerjaan", placeholder="{{pasal3_content}}")

                        # Then fill the rest of the template
                        rks_doc = docx_service.fill_template(rks_doc, template_data)

                        rks_path = output_dir / f"RKS_{data.get('project_name', 'project').replace(' ', '_')}.docx"
                        docx_service.save_document(rks_doc, str(rks_path))

                        st.session_state.generated_rks_path = str(rks_path)
                        st.success(f"RKS generated: {rks_path.name}")
                    except FileNotFoundError:
                        st.warning(f"RKS template for {doc_type} not found")

                except Exception as e:
                    st.error(f"Error generating documents: {str(e)}")
                    logger.error(f"Generation error: {e}")

    # Download section - always show if files exist
    st.markdown("---")
    st.markdown("### Download Documents")

    col1, col2 = st.columns(2)

    with col1:
        if st.session_state.generated_rab_path:
            try:
                with open(st.session_state.generated_rab_path, "rb") as f:
                    st.download_button(
                        label="Download RAB",
                        data=f.read(),
                        file_name=st.session_state.generated_rab_path.split("\\")[-1],
                        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
            except Exception as e:
                st.error(f"Error loading RAB: {e}")

    with col2:
        if st.session_state.generated_rks_path:
            try:
                with open(st.session_state.generated_rks_path, "rb") as f:
                    st.download_button(
                        label="Download RKS",
                        data=f.read(),
                        file_name=st.session_state.generated_rks_path.split("\\")[-1],
                        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
            except Exception as e:
                st.error(f"Error loading RKS: {e}")

    # Start over button
    st.markdown("---")
    if st.button("Start Over", key="start_over"):
        # Clear session state
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()

def main():
    # Sidebar
    with st.sidebar:
        st.title("RAB/RKS Generator")
        st.progress(st.session_state.step / 3, f"Step {st.session_state.step}/3")

        st.markdown("---")
        st.markdown("### Workflow Steps")
        st.markdown("1. Upload & Extract")
        st.markdown("2. Review & Edit")
        st.markdown("3. Generate & Download")

    # Main content
    if st.session_state.step == 1:
        page_1_upload_extract()
    elif st.session_state.step == 2:
        page_2_review_edit()
    elif st.session_state.step == 3:
        page_3_generate_download()

if __name__ == "__main__":
    main()
