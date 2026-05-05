import pytest
from services.excel_service import ExcelService
from openpyxl import load_workbook
from pathlib import Path


def test_add_items_table_creates_correct_headers():
    """Headers should be: NO, URAIAN, VOLUME, SATUAN, HARGA SATUAN, JUMLAH HARGA"""
    service = ExcelService()
    wb = service.create_workbook()
    items = [
        {"uraian": "item 1", "volume": 2, "satuan": "pcs", "harga_satuan": 10000},
        {"uraian": "item 2", "volume": 1, "satuan": "lot", "harga_satuan": 50000},
    ]
    ws = service.add_items_table(wb, items)

    headers = [ws.cell(row=1, column=c).value for c in range(1, 7)]
    assert headers == ["NO", "URAIAN", "VOLUME", "SATUAN", "HARGA SATUAN", "JUMLAH HARGA"]


def test_jumlah_harga_formula():
    """JUMLAH HARGA column should contain =C*D formula"""
    service = ExcelService()
    wb = service.create_workbook()
    items = [
        {"uraian": "item 1", "volume": 2, "satuan": "pcs", "harga_satuan": 10000},
    ]
    ws = service.add_items_table(wb, items)

    # Row 2 = first data row
    assert ws["F2"].value == "=C2*E2"


def test_summary_rows_formulas():
    """Total, PPN, Grand Total rows with correct formulas"""
    service = ExcelService()
    wb = service.create_workbook()
    items = [
        {"uraian": "item 1", "volume": 2, "satuan": "pcs", "harga_satuan": 10000},
    ]
    ws = service.add_items_table(wb, items)

    last_data_row = 2  # 1 header + 1 item

    # Total row
    total_row = last_data_row + 1  # row 3
    assert ws[f"E{total_row}"].value == "Total"
    assert ws[f"F{total_row}"].value == f"=SUM(F2:F{last_data_row})"

    # PPN row
    ppn_row = total_row + 1  # row 4
    assert ws[f"E{ppn_row}"].value == "PPN (11%)"
    assert ws[f"F{ppn_row}"].value == f"=F{total_row}*0.11"

    # Grand Total row
    grand_row = ppn_row + 1  # row 5
    assert ws[f"E{grand_row}"].value == "Grand Total"
    assert ws[f"F{grand_row}"].value == f"=F{total_row}+F{ppn_row}"


def test_generate_output_file():
    """Generate actual XLSX file for manual inspection"""
    items = [
        {"uraian": "Paku", "volume": 5, "satuan": "kg", "harga_satuan": 15000},
        {"uraian": "Semen", "volume": 10, "satuan": "kg", "harga_satuan": 8000},
        {"uraian": "Pasir", "volume": 3, "satuan": "m3", "harga_satuan": 200000},
    ]

    service = ExcelService()
    wb = service.create_workbook()
    service.add_items_table(wb, items)

    output_path = Path(__file__).parent.parent / "output_test"
    output_path.mkdir(exist_ok=True)
    service.save_workbook(wb, str(output_path / "RAB_test.xlsx"))
    print(f"\nSaved to {output_path / 'RAB_test.xlsx'}")