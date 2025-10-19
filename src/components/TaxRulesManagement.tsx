import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, History } from 'lucide-react';

interface TaxRule {
  id: string;
  rule_type: string;
  entity_type: string | null;
  service_category: string | null;
  rate: number | null;
  threshold_amount: number | null;
  requires_npwp: boolean;
  requires_pkp: boolean;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  description: string | null;
  regulation_reference: string | null;
}

export function TaxRulesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data as TaxRule[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ['tax-rules-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rules_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const createOrUpdateRule = useMutation({
    mutationFn: async (rule: any) => {
      if (editingRule) {
        const { error } = await supabase
          .from('tax_rules')
          .update(rule)
          .eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_rules')
          .insert([rule]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      queryClient.invalidateQueries({ queryKey: ['tax-rules-history'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      toast({
        title: editingRule ? "Rule Updated" : "Rule Created",
        description: "Tax rule has been saved successfully.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rule: Partial<TaxRule> = {
      rule_type: formData.get('rule_type') as string,
      entity_type: formData.get('entity_type') as string || null,
      service_category: formData.get('service_category') as string || null,
      rate: formData.get('rate') ? Number(formData.get('rate')) : null,
      threshold_amount: formData.get('threshold_amount') ? Number(formData.get('threshold_amount')) : null,
      requires_npwp: formData.get('requires_npwp') === 'on',
      requires_pkp: formData.get('requires_pkp') === 'on',
      effective_from: formData.get('effective_from') as string,
      effective_to: formData.get('effective_to') as string || null,
      is_active: formData.get('is_active') === 'on',
      description: formData.get('description') as string || null,
      regulation_reference: formData.get('regulation_reference') as string || null,
    };

    createOrUpdateRule.mutate(rule);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Rules Management</h1>
          <p className="text-muted-foreground">Configure Indonesian tax compliance rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              New Tax Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Tax Rule' : 'Create Tax Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule_type">Rule Type *</Label>
                  <Select name="rule_type" defaultValue={editingRule?.rule_type} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPH23">PPh 23</SelectItem>
                      <SelectItem value="PPN">PPN</SelectItem>
                      <SelectItem value="PPH21">PPh 21</SelectItem>
                      <SelectItem value="PPH22">PPh 22</SelectItem>
                      <SelectItem value="PPH4_2">PPh 4(2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entity_type">Entity Type</Label>
                  <Select name="entity_type" defaultValue={editingRule?.entity_type || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VENDOR">Vendor</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="service_category">Service Category</Label>
                <Input name="service_category" defaultValue={editingRule?.service_category || ''} placeholder="e.g., Consulting, Construction" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate (%)</Label>
                  <Input name="rate" type="number" step="0.01" defaultValue={editingRule?.rate || ''} placeholder="2.00" />
                </div>
                <div>
                  <Label htmlFor="threshold_amount">Threshold Amount (Rp)</Label>
                  <Input name="threshold_amount" type="number" defaultValue={editingRule?.threshold_amount || ''} placeholder="2000000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effective_from">Effective From *</Label>
                  <Input name="effective_from" type="date" defaultValue={editingRule?.effective_from} required />
                </div>
                <div>
                  <Label htmlFor="effective_to">Effective To</Label>
                  <Input name="effective_to" type="date" defaultValue={editingRule?.effective_to || ''} />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea name="description" defaultValue={editingRule?.description || ''} placeholder="Rule description..." />
              </div>

              <div>
                <Label htmlFor="regulation_reference">Regulation Reference</Label>
                <Input name="regulation_reference" defaultValue={editingRule?.regulation_reference || ''} placeholder="PMK No. 141/2015" />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch name="requires_npwp" defaultChecked={editingRule?.requires_npwp} />
                  <Label>Requires NPWP</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch name="requires_pkp" defaultChecked={editingRule?.requires_pkp} />
                  <Label>Requires PKP</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch name="is_active" defaultChecked={editingRule?.is_active ?? true} />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrUpdateRule.isPending}>
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading && <p>Loading tax rules...</p>}
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Badge>{rule.rule_type}</Badge>
                    {rule.entity_type && <Badge variant="outline">{rule.entity_type}</Badge>}
                    {!rule.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </CardTitle>
                  {rule.service_category && (
                    <p className="text-sm text-muted-foreground mt-1">Category: {rule.service_category}</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingRule(rule);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Rate:</span> {rule.rate ? `${rule.rate}%` : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Threshold:</span> {rule.threshold_amount ? `Rp ${rule.threshold_amount.toLocaleString()}` : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Effective:</span> {new Date(rule.effective_from).toLocaleDateString()} - {rule.effective_to ? new Date(rule.effective_to).toLocaleDateString() : 'Ongoing'}
                </div>
                <div>
                  <span className="font-medium">Requirements:</span> {rule.requires_npwp && 'NPWP'} {rule.requires_pkp && 'PKP'}
                </div>
              </div>
              {rule.description && (
                <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
              )}
              {rule.regulation_reference && (
                <p className="mt-1 text-xs text-muted-foreground">Ref: {rule.regulation_reference}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Change History (Last 50)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((entry: any) => (
                <div key={entry.id} className="text-sm border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{entry.change_type}</span>
                    <span className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                  {entry.change_reason && (
                    <p className="text-xs text-muted-foreground mt-1">Reason: {entry.change_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}