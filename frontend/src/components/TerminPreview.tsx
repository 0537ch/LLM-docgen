import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface TerminPreviewProps {
  terminCount: number;
  initialValues?: Record<string, string>;
  onChange: (payment_terms: Record<string, string>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const TerminPreview: React.FC<TerminPreviewProps> = ({
  terminCount,
  initialValues,
  onChange,
  onValidationChange
}) => {
  const [percentages, setPercentages] = useState<(number | string)[]>(() => {
    if (initialValues) {
      const values = [];
      for (let i = 1; i <= terminCount; i++) {
        const key = `termin_${i}_percent`;
        values.push(parseFloat(initialValues[key]) || (100 / terminCount));
      }
      return values;
    }
    return Array(terminCount).fill(100 / terminCount);
  });

  // Reset percentages when terminCount changes
  useEffect(() => {
    if (initialValues) {
      const values = [];
      for (let i = 1; i <= terminCount; i++) {
        const key = `termin_${i}_percent`;
        values.push(parseFloat(initialValues[key]) || (100 / terminCount));
      }
      setPercentages(values);
    } else {
      setPercentages(Array(terminCount).fill(100 / terminCount));
    }
  }, [terminCount, initialValues]);

  // Sync to parent only when percentages change (not on mount/terminCount change)
  const isInitialMount = React.useRef(true);
  const prevTerminCountRef = React.useRef(terminCount);

  useEffect(() => {
    // Skip on initial mount or when terminCount just changed
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTerminCountRef.current = terminCount;
      return;
    }

    // Skip if terminCount just changed
    if (prevTerminCountRef.current !== terminCount) {
      prevTerminCountRef.current = terminCount;
      return;
    }

    const payment_terms: Record<string, string> = {};
    for (let i = 0; i < terminCount; i++) {
      const value = percentages[i];
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      payment_terms[`termin_${i + 1}_percent`] = isNaN(numValue) ? '0' : numValue.toFixed(2);
    }
    onChange(payment_terms);
  }, [percentages, terminCount, onChange]);

  const handleChange = (index: number, value: string) => {
    const updated = [...percentages];
    updated[index] = value;
    setPercentages(updated);
  };

  const totalPercentage = percentages.reduce((sum: number, p) => {
    const numValue = typeof p === 'number' ? p : parseFloat(p);
    return sum + (isNaN(numValue) ? 0 : numValue);
  }, 0);

  const isOverLimit = totalPercentage > 100;
  const isUnderLimit = totalPercentage < 100;
  const isValid = totalPercentage === 100;

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isValid);
  }, [totalPercentage, onValidationChange, isValid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Termin Pembayaran</CardTitle>
        <div className={cn(
          "text-sm font-medium",
          isOverLimit || isUnderLimit ? "text-destructive" : "text-muted-foreground"
        )}>
          Total: {totalPercentage.toFixed(2)}%
          {isOverLimit && " (melebihi 100%)"}
          {isUnderLimit && " (kurang dari 100%)"}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Termin</TableHead>
              <TableHead>Persentase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {percentages.map((percent, index) => (
              <TableRow key={index}>
                <TableCell>Termin {index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={percent}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
