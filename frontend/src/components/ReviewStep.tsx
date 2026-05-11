import React, { useState, useEffect } from 'react';
import type { ExtractedData, Item, SortableActivityProps, ReviewStepProps } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Trash2, Package, GripVertical } from 'lucide-react';
import { TerminPreview } from './TerminPreview';
import { Pasal2Drawer } from './Pasal2Drawer';
import { apiService } from '../services/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper function to move array item
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}


function SortableActivity({ activity, index, animationIndex, onUpdate, onDelete }: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: index });

  const isNew = animationIndex !== -1 && index < animationIndex;
  const delay = isNew ? index * 60 : 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : 'opacity 0.4s ease-out, transform 0.4s ease-out',
    opacity: isDragging ? 0.5 : 1,
    animationDelay: isNew ? `${delay}ms` : '0ms',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start ${isNew ? 'animate-slide-in' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded mt-6 border-2 border-blue-500 bg-blue-50"
      >
        <GripVertical className="w-6 h-6 text-blue-600" />
      </div>


      {/* Activity input */}
      <div className="flex-1 space-y-2">
        <Label>Poin 2.{index + 1}</Label>
        <Textarea
          value={activity}
          onChange={(e) => onUpdate(index, e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        className="mt-6"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, fileId, lhpText, onUpdate }) => {
  const [editedData, setEditedData] = useState<ExtractedData>({
    ...data,
    termin_count: data.termin_count || 1
  });
  const [paymentTerms, setPaymentTerms] = useState<Record<string, string>>(data.payment_terms || {});
  const [tempTerminCount, setTempTerminCount] = useState<string>(String(data.termin_count || 1));
  const [isTerminValid, setIsTerminValid] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customPasal2Prompt, setCustomPasal2Prompt] = useState('');
  const [jumlahKegiatan, setJumlahKegiatan] = useState<number | undefined>(undefined);
  const [regenerating, setRegenerating] = useState(false);
  const [animationIndex, setAnimationIndex] = useState<number>(-1);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditedData((prev) => ({
        ...prev,
        work_activities: arrayMove(prev.work_activities, active.id as number, over.id as number)
      }));
    }
  };

  // Sync edits and validation to parent
  useEffect(() => {
    const validationErrors: string[] = [];
    if (editedData.document_type !== 'PADI_UMKM' && !isTerminValid) {
      validationErrors.push('Total persentase termin melebihi 100%');
    }
    const dataToSync = { ...editedData, payment_terms: paymentTerms, validation_errors: validationErrors };
    onUpdate(dataToSync);
  }, [editedData, paymentTerms, isTerminValid, onUpdate]);

  const handleInputChange = (field: keyof ExtractedData, value: string | number) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    setEditedData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleActivityChange = (index: number, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: prev.work_activities.map((act, i) =>
        i === index ? value : act
      ),
    }));
  };

  const handleDeleteActivity = (index: number) => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: prev.work_activities.filter((_, i) => i !== index)
    }));
  };

  const handleAddActivity = () => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: [...prev.work_activities, '']
    }));
  };

  const handleRegeneratePasal2 = async () => {
    if (!fileId) return;
    setRegenerating(true);
    try {
      const result = await apiService.regeneratePasal2({
        file_id: fileId,
        lhp_text: lhpText,
        document_type: editedData.document_type,
        custom_pasal2_prompt: customPasal2Prompt || undefined,
        jumlah_kegiatan: jumlahKegiatan,
      });
      setEditedData((prev) => ({
        ...prev,
        work_activities: result.work_activities,
      }));
      // Close drawer first, then animate after it's hidden
      setDrawerOpen(false);
      setTimeout(() => {
        setAnimationIndex(result.work_activities.length);
        setTimeout(() => setAnimationIndex(-1), 1000);
      }, 300);
      setCustomPasal2Prompt('');
      setJumlahKegiatan(undefined);
    } catch (error) {
      console.error('Failed to regenerate Pasal 2:', error);
      alert('Gagal regenerate Pasal 2. Silakan coba lagi.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteItem = (index: number) => {
    setEditedData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: newItems.map((item, i) => ({ ...item, no: i + 1 }))
      };
    });
  };

  const handleAddItem = () => {
    const newNo = editedData.items.length + 1;
    setEditedData((prev) => ({
      ...prev,
      items: [...prev.items, {
        no: newNo,
        uraian: '',
        volume: '',
        satuan: '',
        harga_satuan: ''
      }],
    }));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold">Review & Edit Data</h3>
        </div>

        {/* Document Type */}
        <Card>
          <CardHeader>
            <CardTitle>Tipe Dokumen</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={editedData.document_type}
              onValueChange={(value) => handleInputChange('document_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENGADAAN">PENGADAAN</SelectItem>
                <SelectItem value="PADI_UMKM">PADI_UMKM</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Proyek</Label>
                <Input
                  value={editedData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  placeholder="Masukkan nama proyek"
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Input
                  value={editedData.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                  placeholder="Contoh: 3 bulan"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Pekerjaan</Label>
                <Input
                  value={editedData.work_type}
                  onChange={(e) => handleInputChange('work_type', e.target.value)}
                  placeholder="Masukkan jenis pekerjaan"
                />
              </div>
            {editedData.document_type !== 'PADI_UMKM' && (
              <div className="space-y-2">
                <Label>Jumlah Termin</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="16"
                    value={tempTerminCount}
                    onChange={(e) => setTempTerminCount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const num = parseInt(tempTerminCount);
                      if (!isNaN(num) && num >= 1 && num <= 16) {
                        handleInputChange('termin_count', num);
                      }
                    }}
                    >
                    Update
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Setiap termin: {(100 / (editedData.termin_count || 1)).toFixed(1)}%
                </p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Termin Preview */}
        {editedData.document_type !== 'PADI_UMKM' && (
          <TerminPreview
            terminCount={editedData.termin_count || 1}
            initialValues={editedData.payment_terms}
            onChange={setPaymentTerms}
            onValidationChange={(isValid) => {
              setIsTerminValid(isValid);
            }}
          />
        )}

        {/* Work Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pasal 2</CardTitle>
              <Pasal2Drawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                customPasal2Prompt={customPasal2Prompt}
                jumlahKegiatan={jumlahKegiatan}
                onCustomPromptChange={setCustomPasal2Prompt}
                onJumlahChange={setJumlahKegiatan}
                onRegenerate={handleRegeneratePasal2}
                isLoading={regenerating}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editedData.work_activities.map((_, index) => index)}
                strategy={verticalListSortingStrategy}
              >
                {editedData.work_activities.map((activity, index) => (
                  <SortableActivity
                    key={index}
                    activity={activity}
                    index={index}
                    animationIndex={animationIndex}
                    onUpdate={handleActivityChange}
                    onDelete={handleDeleteActivity}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddActivity}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Poin
            </Button>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Item (Tabel 3.1)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto max-h-[300px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="w-32">Volume</TableHead>
                  <TableHead className="w-32">Satuan</TableHead>
                  <TableHead className="w-32">Harga Satuan</TableHead>
                  <TableHead className="w-40">Jumlah Harga</TableHead>
                  <TableHead className="w-16">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.items.map((item, index) => (
                  <TableRow key={item.no}>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.no}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          handleItemChange(index, 'no', val);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.uraian}
                        onChange={(e) => handleItemChange(index, 'uraian', e.target.value)}
                        placeholder="Nama item"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.volume}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          handleItemChange(index, 'volume', val);
                        }}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.satuan}
                        onChange={(e) => handleItemChange(index, 'satuan', e.target.value)}
                        placeholder="Unit"
                      />
                    </TableCell>
                    <TableCell className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                      <Input
                        className="pl-8"
                        type="number"
                        value={item.harga_satuan || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          handleItemChange(index, 'harga_satuan', val);
                        }}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="bg-muted/50">
                      {item.volume && item.harga_satuan
                        ? (Number(item.volume) * Number(item.harga_satuan)).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>

          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
