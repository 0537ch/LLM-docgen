import pytest
from services.extraction_service import ExtractionService

def test_extract_project_name():
    service = ExtractionService()
    lhp_text = "LAPORAN HASIL PEMERIKSAAN PERANGKAT RADIO KOMUNIKASI"
    result = service.extract_project_name(lhp_text)
    assert "RADIO KOMUNIKASI" in result or "PERANGKAT" in result

def test_detect_document_type_pengadaan():
    service = ExtractionService()
    text = "PENGADAAN INFRASTRUKTUR FIBER OPTIC"
    doc_type = service.detect_document_type(text)
    assert doc_type == "PENGADAAN"
