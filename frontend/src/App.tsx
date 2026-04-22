import { useState } from 'react';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { GenerateStep } from './components/GenerateStep';
import type { ExtractedData, UploadResponse } from './types';
import { Progress } from './components/ui/progress';
import { cn } from './lib/utils';

type Step = 1 | 2 | 3;

function App() {
  const [step, setStep] = useState<Step>(1);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleUploadComplete = (response: UploadResponse) => {
    setExtractedData(response.extracted_data);
    setStep(2);
  };

  const handleReviewUpdate = (data: ExtractedData) => {
    setExtractedData(data);
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setExtractedData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            RAB/RKS Generator
          </h1>
        </header>

        {/* Progress */}
        <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <span className={cn(
                "text-sm font-medium",
                step >= 1 ? "text-primary" : "text-slate-500"
              )}>
                1. Upload & Extract
              </span>
              <span className="text-slate-300">→</span>
              <span className={cn(
                "text-sm font-medium",
                step >= 2 ? "text-primary" : "text-slate-500"
              )}>
                2. Review & Edit
              </span>
              <span className="text-slate-300">→</span>
              <span className={cn(
                "text-sm font-medium",
                step >= 3 ? "text-primary" : "text-slate-500"
              )}>
                3. Generate & Download
              </span>
            </div>
            <span className="text-sm text-slate-500">
              Step {step}/3
            </span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Main Content */}
        <main className="rounded-lg border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
          {step === 1 && <UploadStep onNext={handleUploadComplete} />}

          {step === 2 && extractedData && (
            <ReviewStep
              key={extractedData.project_name}
              data={extractedData}
              onUpdate={handleReviewUpdate}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && extractedData && (
            <GenerateStep
              data={extractedData}
              onBack={() => setStep(2)}
              onReset={handleReset}
            />
          )}
        </main>

      </div>
    </div>
  );
}

export default App;
