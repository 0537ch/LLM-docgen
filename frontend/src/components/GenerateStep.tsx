import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ExtractedData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CheckCircle2, RefreshCw, Loader2, FileText, Download } from 'lucide-react';

// number_to_terbilang - duplicated from backend/excel_service.py
function numberToTerbilang(number: number): string {
  if (number === 0) return 'nol rupiah';

  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
  const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
  const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

  function convertChunk(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n === 100) return 'seratus';
    if (n < 1000) {
      const hundreds = Math.floor(n / 100);
      const remainder = n % 100;
      if (hundreds === 1) {
        return 'seratus' + (remainder !== 0 ? ' ' + convertChunk(remainder) : '');
      }
      return units[hundreds] + ' ratus' + (remainder !== 0 ? ' ' + convertChunk(remainder) : '');
    }
    if (n === 1000) return 'seribu';
    if (n < 1000000) return convertChunk(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + convertChunk(n % 1000) : '');
    if (n === 1000000) return 'sejuta';
    if (n < 1000000000) return convertChunk(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + convertChunk(n % 1000000) : '');
    const billions = Math.floor(n / 1000000000);
    const remainder = n % 1000000000;
    return convertChunk(billions) + ' miliar' + (remainder > 0 ? ' ' + convertChunk(remainder) : '');
  }

  const intNum = Math.floor(number);
  return convertChunk(intNum) + ' rupiah';
}

interface GenerateStepProps {
  data: ExtractedData;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<{
    rab?: string;
    rks?: string;
    rab_xlsx?: string;
  } | null>(null);

  // Preview state (RKS only now)
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rksHtml, setRksHtml] = useState<string | null>(null);

  const rksPreviewHtml = rksHtml || '';

  // Load preview on mount (RKS only)
  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await apiService.previewDocuments(data);
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

  // Calculate RAB totals
  const rabTotal = data.items.reduce((sum, item) => {
    const vol = parseFloat(String(item.volume)) || 0;
    const harga = parseFloat(String(item.harga_satuan)) || 0;
    return sum + (vol * harga);
  }, 0);
  const rabPPN = Math.round(rabTotal * 0.11);
  const rabGrandTotal = rabTotal + rabPPN;

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
          <h3 className="text-2xl font-bold">Preview</h3>
        </div>

        {/* Preview Section */}
        <Card>
          <CardHeader>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="rab">
              <TabsList className="mb-4">
                <TabsTrigger value="rab">RAB</TabsTrigger>
                <TabsTrigger value="rks">RKS</TabsTrigger>
              </TabsList>

              <TabsContent value="rab">
                <div className="bg-white rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">NO</TableHead>
                        <TableHead>URAIAN</TableHead>
                        <TableHead className="text-center">VOLUME</TableHead>
                        <TableHead className="text-center">SATUAN</TableHead>
                        <TableHead className="text-right">HARGA SATUAN</TableHead>
                        <TableHead className="text-right">JUMLAH HARGA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item, idx) => {
                        const vol = parseFloat(String(item.volume)) || 0;
                        const harga = parseFloat(String(item.harga_satuan)) || 0;
                        const jumlah = vol * harga;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-center">{idx + 1}</TableCell>
                            <TableCell>{item.uraian || '-'}</TableCell>
                            <TableCell className="text-center">{item.volume || '-'}</TableCell>
                            <TableCell className="text-center">{item.satuan || '-'}</TableCell>
                            <TableCell className="text-right">Rp {harga.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right">Rp {jumlah.toLocaleString('id-ID')}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-medium">
                        <TableCell rowSpan={3} colSpan={4} className="text-left align-top">
                          Terbilang:<br />{numberToTerbilang(rabGrandTotal)}
                        </TableCell>
                        <TableCell colSpan={1} className="text-right">Total</TableCell>
                        <TableCell colSpan={1} className="text-right">Rp {rabTotal.toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={1} className="text-right">PPN (11%)</TableCell>
                        <TableCell colSpan={1} className="text-right">Rp {rabPPN.toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell colSpan={1} className="text-right">Grand Total</TableCell>
                        <TableCell colSpan={1} className="text-right">Rp {rabGrandTotal.toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
              {/* RAB XLSX only (DOCX commented out) */}
              {generatedFiles.rab_xlsx && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">RAB Document</p>
                    <p className="text-xs text-slate-500 truncate">{generatedFiles.rab_xlsx}</p>
                  </div>
                  <Button onClick={() => handleDownload(generatedFiles.rab_xlsx!)} size="sm" className="flex-shrink-0">
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