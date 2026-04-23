import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { ExtractedData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Download, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { TerminPreview } from './TerminPreview';

interface GenerateStepProps {
  data: ExtractedData;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<{
    rab?: string;
    rks?: string;
  } | null>(null);

  const [paymentTerms, setPaymentTerms] = useState<Record<string, string>>(
    data.payment_terms || {}
  );

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedFiles(null);

    try {
      const result = await apiService.generateDocuments({
        ...data,
        payment_terms: paymentTerms
      });
      setGeneratedFiles(result.files);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename: string) => {
    const url = apiService.getDownloadURL(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Generate Documents</h2>
        </div>

        {/* Preview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                RAB Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Project:</span>
                <p className="font-medium">{data.project_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Items:</span>
                <p className="font-medium">{data.items.length} items</p>
              </div>
              <div>
                <span className="text-slate-500">Type:</span>
                <p className="font-medium">{data.document_type}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                RKS Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Location:</span>
                <p className="font-medium">{data.location}</p>
              </div>
              <div>
                <span className="text-slate-500">Timeline:</span>
                <p className="font-medium">{data.timeline}</p>
              </div>
              <div>
                <span className="text-slate-500">Activities:</span>
                <p className="font-medium">{data.work_activities.length} activities</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Termin Preview */}
        <TerminPreview
          terminCount={data.termin_count || 1}
          initialValues={data.payment_terms}
          onChange={setPaymentTerms}
        />

        {/* Pasal 2 Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Pasal 2 Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {data.work_activities.map((activity, index) => (
                <p key={index} className="text-slate-700">
                  <span className="font-medium">{index + 1}.</span> {activity}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Documents...
                </>
              ) : (
                'Generate Documents'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Download Section */}
        {generatedFiles && (
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Documents Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {generatedFiles.rab && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">RAB Document</p>
                    <p className="text-xs text-slate-500 truncate">{generatedFiles.rab}</p>
                  </div>
                  <Button onClick={() => handleDownload(generatedFiles.rab!)} size="sm" className="flex-shrink-0">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {generatedFiles.rks && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">RKS Document</p>
                    <p className="text-xs text-slate-500 truncate">{generatedFiles.rks}</p>
                  </div>
                  <Button onClick={() => handleDownload(generatedFiles.rks!)} size="sm" className="flex-shrink-0">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
