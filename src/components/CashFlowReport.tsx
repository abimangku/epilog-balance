import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CashFlowData {
  account_code: string;
  account_name: string;
  category: string;
  amount: number;
}

export function CashFlowReport() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const { data: cashFlow, isLoading } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cash_flow', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data as CashFlowData[];
    },
  });

  const handleExportExcel = () => {
    if (!cashFlow) return;

    const worksheet = XLSX.utils.json_to_sheet(
      cashFlow.map(item => ({
        'Account Code': item.account_code,
        'Account Name': item.account_name,
        'Category': item.category,
        'Amount': item.amount,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Flow');
    XLSX.writeFile(workbook, `cash-flow-${startDate}-to-${endDate}.xlsx`);
  };

  const groupedData = cashFlow?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CashFlowData[]>);

  const categoryTotals = Object.entries(groupedData || {}).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + item.amount, 0)
  }));

  const netCashFlow = categoryTotals.reduce((sum, ct) => sum + ct.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Statement</h1>
          <p className="text-muted-foreground">View cash movements by activity category</p>
        </div>
        <Button onClick={handleExportExcel} disabled={!cashFlow || isLoading}>
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading cash flow data...</p>}
          {groupedData && Object.entries(groupedData).map(([category, items]) => {
            const categoryTotal = items.reduce((sum, item) => sum + item.amount, 0);
            
            return (
              <div key={category} className="mb-8">
                <h3 className="font-bold text-lg mb-4 pb-2 border-b">{category}</h3>
                <table className="w-full mb-2">
                  <tbody>
                    {items.map(item => (
                      <tr key={item.account_code} className="border-b">
                        <td className="py-2 text-sm">{item.account_code}</td>
                        <td className="py-2">{item.account_name}</td>
                        <td className="py-2 text-right font-mono">
                          Rp {item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Net Cash from {category}</span>
                  <span className="font-mono">Rp {categoryTotal.toLocaleString()}</span>
                </div>
              </div>
            );
          })}

          {groupedData && Object.keys(groupedData).length > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-primary">
              <div className="flex justify-between text-xl font-bold">
                <span>Net Increase/(Decrease) in Cash</span>
                <span className={`font-mono ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp {netCashFlow.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {!isLoading && (!cashFlow || cashFlow.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No cash flow data for the selected period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}