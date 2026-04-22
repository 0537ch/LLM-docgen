import React, { useState } from 'react';
import type { ExtractedData, Item } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, ArrowRight, Plus, Trash2, Package } from 'lucide-react';

interface ReviewStepProps {
  data: ExtractedData;
  onUpdate: (data: ExtractedData) => void;
  onBack: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, onUpdate, onBack }) => {
  const [editedData, setEditedData] = useState<ExtractedData>(data);

  const handleInputChange = (field: keyof ExtractedData, value: string) => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Review & Edit Data</h2>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Document Type */}
        <Card>
          <CardHeader>
            <CardTitle>Document Type</CardTitle>
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
                <SelectItem value="PEMELIHARAAN">PEMELIHARAAN</SelectItem>
                <SelectItem value="PADI_UMKM">PADI_UMKM</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={editedData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Input
                  value={editedData.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                  placeholder="e.g., 3 bulan"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={editedData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location"
                />
              </div>
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Input
                  value={editedData.work_type}
                  onChange={(e) => handleInputChange('work_type', e.target.value)}
                  placeholder="Enter work type"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Work Activities (Pasal 2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editedData.work_activities.map((activity, index) => (
              <div key={index} className="space-y-2">
                <Label>Activity {index + 1}</Label>
                <Textarea
                  value={activity}
                  onChange={(e) => handleActivityChange(index, e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items (Tabel 3.1)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditedData((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index),
                      }));
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      value={String(item.quantity)}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="Unit"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Specification</Label>
                  <Textarea
                    value={item.specification || ''}
                    onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                    rows={2}
                    placeholder="Technical specifications"
                    className="resize-none"
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditedData((prev) => ({
                  ...prev,
                  items: [...prev.items, { name: '', quantity: '', unit: '', category: 'Material' }],
                }));
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => onUpdate(editedData)} size="lg">
            Next: Generate
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
