import { useState } from 'react';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { GenerateStep } from './components/GenerateStep';
import type { ExtractedData, UploadResponse } from './types';
import { Progress } from './components/ui/progress';
import { Button } from './components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from './lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';

type Step = 1 | 2 | 3;

function App() {
  const [step, setStep] = useState<Step>(1);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleUploadComplete = (response: UploadResponse) => {
    setExtractedData(response.extracted_data);
    setStep(2);
  };

  const handleReset = () => {
    setStep(1);
    setExtractedData(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 z-10 border-b">
        <div className="container mx-auto max-w-6xl px-4 h-full flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            RAB/RKS Generator
          </h2>

          {/* Progress */}
          <div className="mt-2 rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur p-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-sm">
                <span className={cn("font-medium", step >= 1 ? "text-primary" : "text-slate-500")}>
                  1. Upload & Extract
                </span>
                <span className="text-slate-300">→</span>
                <span className={cn("font-medium", step >= 2 ? "text-primary" : "text-slate-500")}>
                  2. Review & Edit
                </span>
                <span className="text-slate-300">→</span>
                <span className={cn("font-medium", step >= 3 ? "text-primary" : "text-slate-500")}>
                  3. Generate & Download
                </span>
              </div>
              <span className="text-sm text-slate-500">Step {step}/3</span>
            </div>
            <Progress value={(step / 3) * 100} className="h-2 mt-2" />
          </div>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main
        className="flex-1 overflow-y-auto mt-[80px]"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        <div className="container mx-auto max-w-6xl px-4 py-4 pb-[100px]">
          <div className="rounded-lg border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
            {step === 1 && <UploadStep onNext={handleUploadComplete} />}

            {step === 2 && extractedData && (
              <ReviewStep
                data={extractedData}
                onUpdate={setExtractedData}
              />
            )}

            {step === 3 && extractedData && (
              <GenerateStep
                data={extractedData}
              />
            )}
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-[80px] z-10">
        <div className="container mx-auto max-w-6xl px-4 h-full flex items-center justify-end gap-3">
          {step === 2 && extractedData && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  const items = extractedData.items;
                  const validItems = items.every(item =>
                    item.uraian.trim() !== '' &&
                    item.volume !== '' &&
                    item.satuan.trim() !== ''
                  );

                  if (!validItems) {
                    setAlertMessage('Mohon lengkapi semua field wajib (No, Uraian, Volume, Satuan)');
                    return;
                  }

                  // Check validation errors
                  if (extractedData.validation_errors && extractedData.validation_errors.length > 0) {
                    setAlertMessage('Mohon perbaiki error berikut:\n' + extractedData.validation_errors.join('\n'));
                    return;
                  }

                  // Validate termin percentage totals to 100%
                  if (extractedData.document_type !== 'PADI_UMKM' && extractedData.payment_terms) {
                    const totalPercent = Object.entries(extractedData.payment_terms).reduce((sum, [key, value]) => {
                      if (key.startsWith('termin_') && key.endsWith('_percent')) {
                        return sum + (parseFloat(value) || 0);
                      }
                      return sum;
                    }, 0);
                    if (totalPercent !== 100) {
                      setAlertMessage(`Total persentase termin harus 100%. Saat ini: ${totalPercent.toFixed(2)}%`);
                      return;
                    }
                  }

                  setStep(3);
                }}
                size="lg"
              >
                Next: Generate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {step === 3 && extractedData && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleReset} size="lg">
                Start Over
              </Button>
            </>
          )}
        </div>
      </footer>

      {/* Alert Dialog */}
      <AlertDialog open={!!alertMessage} onOpenChange={() => setAlertMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Peringatan</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertMessage(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
