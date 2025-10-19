import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ComplianceIssue {
  id: string;
  issue_type: string;
  severity: string;
  message: string;
  action_required: string | null;
  status: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  detected_at: string;
}

export function ComplianceDashboard() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: issues, isLoading } = useQuery({
    queryKey: ['compliance-issues', severityFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('compliance_issue')
        .select('*')
        .order('detected_at', { ascending: false });

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ComplianceIssue[];
    },
  });

  const resolveIssue = useMutation({
    mutationFn: async (issueId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('compliance_issue')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: userData.user?.id
        })
        .eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-issues'] });
      toast({
        title: "Issue Resolved",
        description: "Compliance issue has been marked as resolved.",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getEntityLink = (issue: ComplianceIssue) => {
    if (!issue.related_entity_type || !issue.related_entity_id) return null;
    
    const baseUrl = issue.related_entity_type === 'vendor_bill' ? '/bills' :
                    issue.related_entity_type === 'sales_invoice' ? '/invoices' :
                    issue.related_entity_type === 'journal' ? '/journals' : null;
    
    return baseUrl ? `${baseUrl}/${issue.related_entity_id}` : null;
  };

  const criticalCount = issues?.filter(i => i.severity === 'critical' && i.status === 'open').length || 0;
  const highCount = issues?.filter(i => i.severity === 'high' && i.status === 'open').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        <p className="text-muted-foreground">Monitor and resolve compliance issues</p>
      </div>

      {criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {criticalCount} critical compliance issue{criticalCount > 1 ? 's' : ''} requiring immediate attention!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issues?.filter(i => i.status === 'open').length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{issues?.filter(i => i.status === 'resolved').length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading && <p>Loading compliance issues...</p>}
        {issues?.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(issue.severity)}>
                      {issue.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{issue.issue_type}</Badge>
                    {issue.status === 'resolved' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium">{issue.message}</p>
                  {issue.action_required && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Action Required:</strong> {issue.action_required}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Detected: {new Date(issue.detected_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getEntityLink(issue) && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={getEntityLink(issue)!}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  )}
                  {issue.status === 'open' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => resolveIssue.mutate(issue.id)}
                      disabled={resolveIssue.isPending}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {issues?.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No compliance issues found. Great job! 🎉
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}