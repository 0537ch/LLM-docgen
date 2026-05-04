import React, { useState, useRef } from 'react';
import { apiService } from '../services/api';
import type { UploadResponse, UploadProgress } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle2,Brain } from 'lucide-react';

interface UploadStepProps {
  onNext: (data: UploadResponse) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onNext }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const resultFetchedRef = useRef(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    resultFetchedRef.current = false;

    try {
      // Start upload
      const uploadResult = await apiService.uploadPDF(file);

      // Subscribe to SSE stream
      const cleanup = apiService.subscribeToProgress(uploadResult.file_id, (progressData) => {
        setProgress(progressData);

        if (progressData.status === 'completed' && !resultFetchedRef.current) {
          resultFetchedRef.current = true;
          // Fetch result
          apiService.getUploadResult(uploadResult.file_id).then((result) => {
            onNext(result);
            setLoading(false);
            cleanup();
          }).catch((err) => {
            setError(err.message || 'Failed to get result');
            setLoading(false);
            cleanup();
          });
        } else if (progressData.status === 'error') {
          setError(progressData.message);
          setLoading(false);
          cleanup();
        }
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!progress || !progress.current_page || !progress.total_pages || progress.total_pages === 0) return 0;
    return Math.round((progress.current_page / progress.total_pages) * 100);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Laporan Hasil Pemeriksaan 
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-300 hover:border-slate-400'
              } ${loading && 'opacity-50 pointer-events-none'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {file ? (
                    <>
                      <FileText className="w-12 h-12 text-primary" />
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400" />
                      <p className="text-slate-600">
                        <span className="font-medium text-primary">Click to upload</span>
                        {' '}or drag and drop
                      </p>
                      <p className="text-sm text-slate-500">PDF files only</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Progress */}
            {loading && progress && (
              <div className="space-y-4">
                {/* OCR Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {progress.phase === 'ai' ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          OCR Processing Complete
                        </span>
                      ) : (
                        progress.message
                      )}
                    </span>
                    <span className="font-medium">
                      {progress.phase === 'ai' ? '100%' : `${getProgressPercentage()}%`}
                    </span>
                  </div>
                  <Progress
                    value={progress.phase === 'ai' ? 100 : getProgressPercentage()}
                    className={progress.phase === 'ai' ? 'h-2' : 'h-2'}
                  />
                </div>

                {/* AI Progress Bar (only during AI phase) */}
                {progress.phase === 'ai' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-2">
                        <Brain className="w-4 h-4 animate-pulse" />
                        Extracting data with AI...
                      </span>
                      <span className="font-medium">
                        {progress.ai_progress || 0}%
                      </span>
                    </div>
                    <Progress value={progress.ai_progress || 0} className="h-2" />

                    {/* AI Streaming Display */}
                    {progress.ai_text && (
                      <div className="bg-slate-950 text-slate-50 rounded-lg p-4 max-h-[40vh] overflow-y-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {progress.ai_text}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Completion Message */}
                {progress.status === 'completed' && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Extraction complete!
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Extract Data'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
