import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Settings, Loader2 } from 'lucide-react';

interface Pasal2DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customPasal2Prompt: string;
  jumlahKegiatan: number | undefined;
  onCustomPromptChange: (value: string) => void;
  onJumlahChange: (value: number | undefined) => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

export function Pasal2Drawer({
  open,
  onOpenChange,
  customPasal2Prompt,
  jumlahKegiatan,
  onCustomPromptChange,
  onJumlahChange,
  onRegenerate,
  isLoading,
}: Pasal2DrawerProps) {
  const handleRegenerate = () => {
    onRegenerate();
    // Don't close - stay open while loading
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="default" className="ml-auto">
          <Settings className="w-4 h-4" />
          Parafrase
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] p-6">
        <SheetHeader>
          <SheetTitle>Customize Pasal 2</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-6">
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">Masukkan prompt anda</Label>
            <Textarea
              id="custom-prompt"
              value={customPasal2Prompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Jika kosong, akan menggunakan prompt default dari sistem.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jumlah-kegiatan">Jumlah kegiatan</Label>
            <Input
              id="jumlah-kegiatan"
              type="number"
              min={1}
              max={20}
              value={jumlahKegiatan ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onJumlahChange(val ? parseInt(val) : undefined);
              }}
              placeholder="Biarkan kosong untuk default"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
