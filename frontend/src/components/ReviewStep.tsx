import React, { useState, useEffect } from 'react';
import type { ExtractedData, Item } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Trash2, Package } from 'lucide-react';

interface ReviewStepProps {
  data: ExtractedData;
  onUpdate: (data: ExtractedData) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, onUpdate }) => {
  const [editedData, setEditedData] = useState<ExtractedData>({
    ...data,
    termin_count: data.termin_count || 1
  });

  // Sync edits to parent immediately
  useEffect(() => {
    onUpdate(editedData);
  }, [editedData, onUpdate]);

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
                <Label>Lokasi</Label>
                <Input
                  value={editedData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Masukkan lokasi"
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Pekerjaan</Label>
                <Input
                  value={editedData.work_type}
                  onChange={(e) => handleInputChange('work_type', e.target.value)}
                  placeholder="Masukkan jenis pekerjaan"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Termin</Label>
              <Input
                type="number"
                min="1"
                max="16"
                value={editedData.termin_count === '' ? '' : (editedData.termin_count || 1)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleInputChange('termin_count', '');
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      handleInputChange('termin_count', num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    handleInputChange('termin_count', '');
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder="1"
              />
              <p className="text-sm text-muted-foreground">
                Setiap termin: {(100 / (editedData.termin_count || 1)).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Work Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Pasal 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editedData.work_activities.map((activity, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Label>Poin 2.{index + 1}</Label>
                  <Textarea
                    value={activity}
                    onChange={(e) => handleActivityChange(index, e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteActivity(index)}
                  className="mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
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
                  <TableHead className="w-16">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.items.map((item, index) => (
                  <TableRow key={item.no}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.no}
                        onChange={(e) => handleItemChange(index, 'no', e.target.value)}
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
                        onChange={(e) => handleItemChange(index, 'volume', e.target.value)}
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
                    <TableCell>
                      <Input
                        value={item.harga_satuan || ''}
                        onChange={(e) => handleItemChange(index, 'harga_satuan', e.target.value)}
                        placeholder="Opsional"
                      />
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
