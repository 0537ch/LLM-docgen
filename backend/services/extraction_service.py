import google.generativeai as genai
from typing import Dict, Any, Optional
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger("extraction_service")

class ExtractionService:
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)

    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API with retry logic"""
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    def extract_project_name(self, lhp_text: str) -> str:
        """Extract project name from LHP text"""
        prompt = f"""
Extract the project name from this LHP text. Return only the project name, no explanation.

LHP Text:
{lhp_text[:1000]}
"""
        result = self._call_gemini(prompt)
        return result.strip()

    def detect_document_type(self, text: str) -> str:
        """Detect document type from text"""
        text_lower = text.lower()

        # Check for padiumkm FIRST (before general pengadaan)
        if "padiumkm" in text_lower:
            return "PADI_UMKM"

        type_keywords = {
            "PENGADAAN": ["pengadaan", "procurement", "pembelian"],
            "PEMELIHARAAN": ["pemeliharaan", "maintenance", "perawatan"]
        }

        for doc_type, keywords in type_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return doc_type

        return "PENGADAAN"  # Default

    def extract_structured_data(self, lhp_text: str, doc_type: str) -> Dict[str, Any]:
        """Extract all structured data from LHP"""
        prompt = f"""
You are an expert at extracting structured data from Indonesian government procurement documents (LHP - Laporan Hasil Pemeriksaan).

Extract ALL data needed to generate RAB and RKS documents for {doc_type}.

Return ONLY valid JSON. No markdown, no explanation.

## Required JSON Structure:

{{
  "project_name": "Complete project name from LHP",
  "work_type": "Type of work (e.g., Pengadaan, Pemeliharaan)",
  "timeline": "Duration with start condition",
  "location": "Implementation location",
  "location_details": "Detailed location if available",
  "scope_description": "Brief scope description",
  "items": [
    {{
      "category": "Material or Jasa",
      "name": "Item name (AGGREGATE duplicates - sum quantities if same name appears multiple times)",
      "quantity": "Total quantity as number",
      "unit": "Unit of measurement",
      "specification": "Technical specs if available"
    }}
  ],
  "work_activities": [
    "Activity 1",
    "Activity 2"
  ],
  "payment_termins": [
    {{
      "termin": "I or II or III",
      "percentage": "percentage as string",
      "condition": "payment condition"
    }}
  ]
}}

## Critical Extraction Rules:
1. **Items Table**: Look for "Tabel Lingkup Item Pekerjaan" or similar tables in the LHP - extract from there FIRST
2. **Aggregate Duplicates**: If same item name appears multiple times (e.g., 7 rows of "Radio HT"), combine into ONE row with summed quantity
3. **DO NOT** extract work activity sentences as items - items come from tables, not activity descriptions
4. Work activities come from numbered lists or activity descriptions, NOT from the items table
5. Payment terms: Extract termin structure (I, II, III) with percentages and conditions

## LHP Text to Extract From:
{lhp_text[:4000]}
"""

        try:
            result = self._call_gemini(prompt)
            # Parse JSON from response (handle markdown code blocks)
            import json
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            data = json.loads(result)
            data["document_type"] = doc_type

            # Ensure required fields have defaults
            defaults = {
                "timeline": "",
                "location": "",
                "location_details": "",
                "scope_description": "",
                "work_type": "",
                "work_activities": [],
                "payment_termins": [],
                "items": []
            }

            for key, default_value in defaults.items():
                if key not in data or data[key] is None:
                    data[key] = default_value

            # Add timeline default based on document type
            if not data.get("timeline"):
                data["timeline"] = self._get_default_timeline(doc_type)

            # Add location_details fallback
            if not data.get("location_details") and data.get("location"):
                data["location_details"] = f"di lingkungan {data['location']}"

            # Always regenerate work_activities to ensure proper lifecycle format
            logger.info("Regenerating work activities with lifecycle prompt...")
            data["work_activities"] = self.generate_work_activities(data)
            logger.info(f"Final: {len(data.get('work_activities', []))} work activities")

            return data

        except Exception as e:
            logger.error(f"Failed to parse extraction: {e}")
            raise

    def _get_work_activity_examples(self, doc_type: str) -> str:
        """Get few-shot examples for specific document type"""
        examples = {
            "PENGADAAN": """
Example output for PENGADAAN:
[
  "Melakukan persiapan dan perencanaan pengadaan perangkat termasuk spesifikasi teknis dan koordinasi dengan pihak terkait",
  "Melakukan pengadaan kabel fiber optic beserta peripheral pendukungnya guna membangun fasilitas kabel Fiber Optic koneksi jaringan data 4 (empat) unit QCC di dermaga dikoneksikan ke jaringan data internal PT TPS.",
  "Melakukan pengiriman barang ke lokasi dan pemeriksaan kualitas serta kelengkapan perangkat",
  "Melakukan instalasi dan konfigurasi perangkat serta pengujian fungsionalitas untuk memastikan kesiapan operasional",
  " Melakukan instalasi, splacing, labeling dan uji koneksi (OTDR) seluruh core fiber optic pada panel network terminasi di kade meter yang telah ditentukan disis dermaga, menuju panel network switch di gedung a",
  "Melakukan serah terima pekerjaan dan penyusunan dokumentasi teknis serta laporan pelaksanaan"
]
""",
            "PEMELIHARAAN": """
Example output for PEMELIHARAAN:
[
  "Melakukan inspeksi dan pemeriksaan kondisi perangkat untuk mengidentifikasi kerusakan dan kebutuhan perbaikan",
  "Melakukan perbaikan dan penggantian komponen yang rusak atau aus sesuai standar teknis",
  "Melakukan pengujian dan verifikasi fungsionalitas perangkat setelah perbaikan",
  "Melakukan pemeliharaan berkala untuk memastikan performa optimal dan mencegah kerusakan",
  "Menyusun laporan pemeliharaan yang mencakup detail pekerjaan dan rekomendasi perawatan"
]
"""
        }
        return examples.get(doc_type, examples["PENGADAAN"])

    def _get_default_timeline(self, doc_type: str) -> str:
        """Get default timeline based on document type"""
        timelines = {
            "PENGADAAN": "3 bulan sejak PO terbit",
            "PEMELIHARAAN": "sesuai kontrak"
        }
        return timelines.get(doc_type, "sesuai kesepakatan")

    def generate_work_activities(self, extracted_data: Dict[str, Any]) -> list:
        """Generate detailed work activities list based on extracted data"""
        doc_type = extracted_data.get('document_type', 'PENGADAAN')

        # Get doc-type-specific examples
        examples = self._get_work_activity_examples(doc_type)

        prompt = f"""
You are an expert at writing Indonesian government procurement documents (RKS - Rencana Kerja & Syarat).

Generate a numbered list of detailed work activities (Pasal 2 format) for {doc_type} project.

## Project Data:
- Project: {extracted_data.get('project_name', '')}
- Work Type: {extracted_data.get('work_type', '')}
- Location: {extracted_data.get('location', '')}
- Location Details: {extracted_data.get('location_details', '')}
- Scope: {extracted_data.get('scope_description', '')}

## Items:
{self._format_items_for_prompt(extracted_data.get('items', []))}

## CRITICAL INSTRUCTIONS:

### Reference Examples for {doc_type}:
{examples}

### Requirements:
- Generate 4-6 activities following the pattern above
- Group related items into broader activities (NOT 1 activity per item)
- Follow appropriate phases for {doc_type}
- Include purpose/context in each activity
- Use specific locations when mentioned
- Return ONLY valid JSON array of strings

Generate work activities for this {doc_type} project:
"""

        try:
            result = self._call_gemini(prompt)

            # Parse JSON from response
            import json
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            activities = json.loads(result)

            if not isinstance(activities, list):
                raise ValueError("Activities must be a list")

            logger.info(f"AI generated {len(activities)} work activities")
            for i, activity in enumerate(activities[:3], 1):
                logger.info(f"  {i}. {activity[:80]}...")

            return activities

        except Exception as e:
            logger.error(f"Failed to generate work activities: {e}")
            # Fallback: return basic activity
            return [f"Melakukan pekerjaan {extracted_data.get('work_type', 'tersebut')}"]

    def _format_items_for_prompt(self, items: list) -> str:
        """Format items for prompt"""
        if not items:
            return "Tidak ada item"

        material_items = [i for i in items if i.get('category') == 'Material']
        jasa_items = [i for i in items if i.get('category') == 'Jasa']

        text = ""
        if material_items:
            text += "\nMaterial:\n"
            for item in material_items[:5]:
                text += f"- {item.get('name', '')} ({item.get('quantity', '')} {item.get('unit', '')})\n"

        if jasa_items:
            text += "\nJasa:\n"
            for item in jasa_items[:5]:
                text += f"- {item.get('name', '')} ({item.get('quantity', '')} {item.get('unit', '')})\n"

        return text
