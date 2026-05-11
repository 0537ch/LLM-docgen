# LLM-RAB-RKS

Indonesian government procurement document generator. Converts LHP (Laporan Hasil Pemeriksaan) PDF → AI extraction → Interactive review → RAB (XLSX) + RKS (DOCX).

**Stack:** FastAPI + React/TypeScript/Vite + shadcn/ui + EasyOCR + Gemini 2.5 Flash + python-docx + openpyxl

---

## Workflow

```
Upload PDF → OCR (EasyOCR, page-by-page, 300 DPI)
         → AI Extraction (Gemini 2.5 Flash, streaming chunks via SSE)
         → Review & Edit (items, work activities, payment termins)
         → Generate (RAB XLSX + RKS DOCX)
```

---

## Tech Stack

### Backend (FastAPI)
- **OCR:** EasyOCR (GPU-accelerated, languages=['id', 'en'])
- **AI:** Gemini 2.5 Flash via `google.generativeai`
- **DOCX:** python-docx (template loading, table generation, placeholder replacement)
- **XLSX:** openpyxl (formula `=C*E`, IDR formatting, Terbilang merged cell)
- **Progress:** Thread-safe `ProgressManager` with `threading.Lock`, dual-phase SSE ("ocr" → "ai")
- **Background:** `threading.Thread` daemon for PDF processing
- **Idempotency:** `_regenerating_files` set prevents double-regeneration (409 Conflict)

### Frontend (React + TypeScript)
- **Build:** Vite
- **UI:** shadcn/ui (Radix UI + Tailwind CSS)
- **SSE:** EventSource with auto-cleanup on unmount
- **DnD:** @dnd-kit for work activity reordering
- **HTTP:** Axios
- **Preview:** mammoth (DOCX → styled HTML)

---

## Architecture

### Backend Structure
```
backend/
├── main.py                        # FastAPI app, endpoints, SSE, background threading
├── services/
│   ├── ocr_service.py              # PDF → images at 300 DPI → EasyOCR text extraction
│   ├── extraction_service.py      # Gemini AI → structured JSON (project_name, items, etc.)
│   ├── docx_service.py             # Template load, table generation, placeholder replace
│   └── excel_service.py            # XLSX workbook, formula =C*E, IDR format, Terbilang
├── strategies/
│   ├── base.py                     # Abstract DocumentStrategy (stateless, data injected)
│   ├── factory.py                  # StrategyFactory.create(doc_type)
│   ├── pengadaan_strategy.py       # PENGADAAN: termin payments, AI work activities
│   ├── pemeliharaan_strategy.py    # PEMELIHARAAN: termin payments, AI work activities
│   └── padiumkm_strategy.py        # PADI_UMKM: fixed 100% payment, hardcoded 2 activities
├── utils/
│   ├── config.py                   # Config class (paths, OCR settings, Gemini model)
│   ├── progress.py                 # ProgressManager (thread-safe, SSE-ready)
│   └── logger.py                   # setup_logger()
└── templates/                      # DOCX templates with {{placeholder}} syntax
```

### Frontend Structure
```
frontend/src/
├── App.tsx                         # 3-step wizard (Upload → Review → Generate)
├── components/
│   ├── UploadStep.tsx               # Drag-drop PDF, SSE progress bar, streaming AI text
│   ├── ReviewStep.tsx              # Edit extracted data, termin config, @dnd-kit activities
│   ├── GenerateStep.tsx            # RAB table + Terbilang, RKS HTML preview, download
│   ├── TerminPreview.tsx           # Editable termin percentages (100% validation)
│   └── Pasal2Drawer.tsx            # Custom AI prompt + jumlah_kegiatan override
├── services/api.ts                 # uploadPDF, subscribeToProgress, generateDocuments, etc.
└── types/index.ts                 # ExtractedData, UploadProgress, Item interfaces
```

---

## Key Features

### Real-time SSE Progress (Dual Phase)
1. **OCR Phase:** Page-by-page progress ("Processing page X/Y")
2. **AI Phase:** Streaming text chunks + progress percentage (0-100)

Backend: `progress_manager.start_upload()` → `update_progress()` → `start_ai_phase()` → `update_ai_chunk()` → `complete_upload()`
Frontend: `EventSource` → `onProgress()` callback → auto-fetch result on "completed"

### Document Types (Strategy Pattern)
| Type | Payment | Work Activities | Template |
|------|---------|-----------------|----------|
| `PENGADAAN` | Termin (auto-split to N termins) | AI-generated, drag-reorder | RAB_pengadaan.docx, RKS_pengadaan.docx |
| `PEMELIHARAAN` | Termin | AI-generated, drag-reorder | shares RAB, RKS_pemeliharaan.docx |
| `PADI_UMKM` | Fixed 100% via padiumkm.id | Hardcoded 2 activities | shares RAB, RKS_padiumkm.docx |

### XLSX RAB Export
- Formula `=C*E` (Volume × Harga Satuan per row)
- IDR format: `#,##0` thousand separator
- Autofit columns (URAIAN capped at 50)
- **Terbilang** merged cell (`A{total}:D{grand}`) spanning Total/PPN/Grand Total rows
- Indonesian number-to-words via `number_to_terbilang()` (duplicated in frontend for preview)

### DOCX RKS Generation
- Template-based with `{{placeholder}}` syntax
- `add_items_table()`: 6 columns (NO, URAIAN, VOLUME, SATUAN, HARGA SATUAN, JUMLAH HARGA)
- `add_items_table_no_price()`: 4 columns for Pasal 3 (RKS)
- `add_summary_table()`: merges cells 0-4, adds Total/PPN/Grand Total rows
- `insert_numbered_list()`: "List Number" style (falls back to "1. 2. 3." manual)
- `fill_template()`: handles both text and list placeholders

### Idempotency Protection
`_regenerating_files` set in `main.py`:
```python
if data.file_id in _regenerating_files:
    raise HTTPException(status_code=409, detail="Regeneration already in progress")
_regenerating_files.add(data.file_id)
# ... do work ...
_regenerating_files.discard(data.file_id)
```

### AI Extraction (Two-Phase)
1. `extract_structured_data()` → extracts project_name, items, work_activities, payment_termins, doc_type
2. `generate_work_activities()` → regenerates work activities with lifecycle-aware prompt (separate AI call)

Pasal 2 regeneration via `regenerate_pasal2()` accepts optional `custom_prompt` and `jumlah_kegiatan` override.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload PDF, returns `file_id`, starts background processing |
| `GET` | `/api/upload/progress/{file_id}` | SSE stream: dual-phase "ocr" → "ai" progress |
| `POST` | `/api/upload/result/{file_id}` | Get extraction result (lhp_text, extracted_data, document_type) |
| `POST` | `/api/preview` | Generate HTML preview (RAB table, RKS HTML) |
| `POST` | `/api/generate` | Generate RAB (XLSX) + RKS (DOCX) |
| `GET` | `/api/download/{filename}` | Download generated file |
| `POST` | `/api/regenerate-pasal2` | Regenerate only work activities (with custom prompt + jumlah override) |
| `GET` | `/api/document-types` | List supported document types |

---

## Setup

**Backend:**
```bash
cd backend
# Create .env with GEMINI_API_KEY=your_key_here
python main.py  # http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**Tests:**
```bash
pytest                  # all tests
pytest tests/test_extraction_service.py  # specific file
```

---

## Data Flow

### Upload → Extract
1. `uploadPDF(file)` → `POST /api/upload` → returns `file_id`
2. `subscribeToProgress(fileId, callback)` → `GET /api/upload/progress/{file_id}` (SSE)
3. OCR runs page-by-page, progress via `progress_callback`
4. AI phase streams chunks via `update_ai_chunk()`, progress via `update_ai_progress()`
5. On status="completed", `getUploadResult(fileId)` → structured JSON

### Review → Generate
1. Edit items, work activities (drag-reorder via @dnd-kit), termin percentages
2. `previewDocuments(data)` → `POST /api/preview` → HTML previews
3. `generateDocuments(data)` → `POST /api/generate` → files dict with filenames
4. `getDownloadURL(filename)` → `GET /api/download/{filename}`

---

## Types

### ExtractedData
```typescript
{
  project_name: string;
  timeline: string;
  work_type: string;
  scope_description: string;
  work_activities: string[];
  items: Item[];  // { no, uraian, volume, satuan, harga_satuan }
  termin_count: number | '';
  payment_terms?: Record<string, string>;  // termin_1_percent, termin_1_condition, etc.
  document_type: 'PENGADAAN' | 'PEMELIHARAAN' | 'PADI_UMKM';
}
```

### UploadProgress (SSE)
```typescript
{
  current_page: number;       // OCR: current page
  total_pages: number;        // OCR: total pages
  status: 'processing' | 'completed' | 'error';
  message: string;           // e.g., "Processing page 3/5"
  phase: 'ocr' | 'ai';
  ai_text?: string;          // streaming AI response chunks
  ai_progress?: number;      // 0-100 during AI phase
}
```

---

## Distinguishing Features

- **Terbilang merged cell** in XLSX spanning Total/PPN/Grand Total rows
- **Dual output:** XLSX RAB with formulas + DOCX RKS with template
- **Streaming AI** via SSE chunks (`ai_text` accumulator)
- **Idempotency protection** on Pasal 2 regeneration (409 Conflict)
- **Stateless strategies** — data injected per method call, no instance state
- **Items auto-numbering** — `[{**item, 'NO': i} for i, item in enumerate(...)]`
- **Word List Number style** with manual numbering fallback
- **Document type detection** — PADI_UMKM checked first before general keywords