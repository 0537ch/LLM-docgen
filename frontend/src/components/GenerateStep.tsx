import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ExtractedData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Download, FileText, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';

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

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rabHtml, setRabHtml] = useState<string | null>(null);
  const [rksHtml, setRksHtml] = useState<string | null>(null);

  const rksPreviewHtml = rksHtml ? `<style>p strong{text-align:center!important}p{text-align:justify!important}ol{text-align:left!important}</style>${rksHtml}` : '';

  // Load preview on mount
  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await apiService.previewDocuments(data);
        setRabHtml(result.rab);
        setRksHtml(result.rks);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Preview failed';
        setPreviewError(errorMessage);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [data]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedFiles(null);

    try {
      const result = await apiService.generateDocuments(data);
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
    <div className="p-6 space-y-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Generate Documents</h2>
        </div>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="rab">
              <TabsList className="mb-4">
                <TabsTrigger value="rab">RAB</TabsTrigger>
                <TabsTrigger value="rks">RKS</TabsTrigger>
              </TabsList>

              <TabsContent value="rab">
                <div className="bg-slate-50 rounded-lg p-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  ) : previewError ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                      <p className="text-destructive">{previewError}</p>
                      <Button variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Preview
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="bg-white p-6 shadow-md rounded font-serif text-sm [&_p]:text-center [&_strong]:text-center [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100"
                      dangerouslySetInnerHTML={{ __html: rabHtml || '' }}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rks">
                <div className="bg-slate-50 rounded-lg p-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
                  {previewLoading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  ) : previewError ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                      <p className="text-destructive">{previewError}</p>
                      <Button variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Preview
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="bg-white p-6 shadow-md rounded font-serif text-sm [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100"
                      dangerouslySetInnerHTML={{ __html: rksPreviewHtml }}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Documents
                </>
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