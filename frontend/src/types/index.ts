export interface Item {
  no: string | number;
  uraian: string;
  volume: string | number;
  satuan: string;
  harga_satuan?: string | number;
}

export interface ExtractedData {
  project_name: string;
  timeline: string;
  work_type: string;
  scope_description: string;
  work_activities: string[];
  items: Item[];
  termin_count: number | '';
  payment_terms?: Record<string, string>;
  document_type: 'PENGADAAN' | 'PEMELIHARAAN' | 'PADI_UMKM';
  validation_errors?: string[];
}

export interface UploadResponse {
  file_id: string;
  lhp_text: string;
  extracted_data: ExtractedData;
  document_type: string;
}

export interface GenerateResponse {
  success: boolean;
  files: {
    rab?: string;
    rks?: string;
  };
  document_type: string;
}

export interface UploadProgress {
  current_page: number;
  total_pages: number;
  status: 'processing' | 'completed' | 'error';
  message: string;
  phase: 'ocr' | 'ai';
  ai_text?: string;
  ai_progress?: number;  // 0-100 during AI phase
}
