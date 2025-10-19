import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  showPresets?: boolean;
}

export function DateRangeFilter({ 
  startDate, 
  endDate, 
  onStartChange, 
  onEndChange,
  showPresets = true 
}: DateRangeFilterProps) {
  const today = new Date();
  
  const setPreset = (preset: string) => {
    const end = today.toISOString().split('T')[0];
    let start = '';

    switch (preset) {
      case 'today':
        start = end;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = lastMonth.toISOString().split('T')[0];
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        onEndChange(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        return;
    }

    onStartChange(start);
    if (preset !== 'lastMonth') {
      onEndChange(end);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="startDate" className="text-sm font-medium">Date Range</Label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="startDate" className="text-xs text-muted-foreground">From</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="endDate" className="text-xs text-muted-foreground">To</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {showPresets && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreset('today')}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset('week')}>Last 7 Days</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset('thisMonth')}>This Month</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset('lastMonth')}>Last Month</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset('year')}>This Year</Button>
        </div>
      )}
    </div>
  );
}