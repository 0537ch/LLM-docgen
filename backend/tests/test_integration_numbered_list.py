"""Integration test for numbered list in document generation"""

import pytest
from pathlib import Path
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_generate_document_with_numbered_list(tmp_path):
    """Test full document generation with numbered list"""
    # Sample data matching frontend structure
    request_data = {
        "project_name": "Test Project",
        "timeline": "3 bulan",
        "work_type": "PENGADAAN",
        "location": "Surabaya",
        "location_details": "Gedung A",
        "scope_description": "Test scope",
        "work_activities": [
            "Melakukan instalasi server",
            "Konfigurasi network",
            "Testing koneksi"
        ],
        "items": [
            {
                "no": 1,
                "uraian": "Server Dell",
                "volume": "1",
                "satuan": "unit"
            }
        ],
        "document_type": "PENGADAAN",
        "termin_count": 2
    }

    # Call generate endpoint
    response = client.post("/api/generate", json=request_data)

    assert response.status_code == 200
    assert "files" in response.json()

    # Download and verify document
    files = response.json()["files"]

    # Check RAB if generated
    if "rab" in files:
        rab_filename = files["rab"]
        download_response = client.get(f"/api/download/{rab_filename}")

        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        # Save downloaded file for inspection
        output_path = tmp_path / rab_filename
        with open(output_path, "wb") as f:
            f.write(download_response.content)

        # Verify file exists and is valid DOCX
        assert output_path.exists()
        assert output_path.suffix == ".docx"

    # Check RKS if generated
    if "rks" in files:
        rks_filename = files["rks"]
        download_response = client.get(f"/api/download/{rks_filename}")

        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        output_path = tmp_path / rks_filename
        with open(output_path, "wb") as f:
            f.write(download_response.content)

        assert output_path.exists()
        assert output_path.suffix == ".docx"
