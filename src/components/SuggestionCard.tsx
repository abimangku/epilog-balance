import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, MessageSquare, FileText, Receipt, CreditCard, BookOpen } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface BillSuggestion {
  vendor_id?: string;
  vendor_name: string;
  vendor_code?: string;
  date: string;
  due_date: string;
  category: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  project_id?: string;
  project_name?: string;
  faktur_pajak_number?: string;
  lines: Array<{
    description: string;
    expense_account_code: string;
    expense_account_name: string;
    quantity: number;
    unit_price: number;
    amount: number;
    project_code?: string;
  }>;
}

interface InvoiceSuggestion {
  client_id?: string;
  client_name: string;
  client_code?: string;
  date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  project_id?: string;
  project_name?: string;
  faktur_pajak_number?: string;
  lines: Array<{
    description: string;
    revenue_account_code: string;
    revenue_account_name: string;
    quantity: number;
    unit_price: number;
    amount: number;
    project_id?: string;
  }>;
}

interface JournalSuggestion {
  date: string;
  description: string;
  period: string;
  lines: Array<{
    account_code: string;
    account_name: string;
    description: string;
    debit: number;
    credit: number;
    project_code?: string;
  }>;
}

interface PaymentSuggestion {
  bill_id: string;
  bill_number: string;
  vendor_name: string;
  date: string;
  amount: number;
  pph23_withheld: number;
  bank_account_code: string;
  bank_account_name: string;
  description?: string;
}

interface SuggestionCardProps {
  type: 'bill' | 'invoice' | 'journal' | 'payment';
  data: BillSuggestion | InvoiceSuggestion | JournalSuggestion | PaymentSuggestion;
  explanation?: string;
  messageId: string;
  status?: 'pending' | 'approved' | 'rejected';
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onComment: (text: string) => Promise<void>;
}

export function SuggestionCard({
  type,
  data,
  explanation,
  messageId,
  status = 'pending',
  onApprove,
  onReject,
  onComment
}: SuggestionCardProps) {
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    setIsLoading(true);
    try {
      await onComment(comment);
      setComment('');
      setIsCommenting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'bill': return <Receipt className="h-5 w-5" />;
      case 'invoice': return <FileText className="h-5 w-5" />;
      case 'journal': return <BookOpen className="h-5 w-5" />;
      case 'payment': return <CreditCard className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'bill': return 'Suggested Vendor Bill';
      case 'invoice': return 'Suggested Sales Invoice';
      case 'journal': return 'Suggested Journal Entry';
      case 'payment': return 'Suggested Payment';
    }
  };

  const getStatusBadge = () => {
    if (status === 'approved') {
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  return (
    <Card className="my-4 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-lg">{getTitle()}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        {explanation && (
          <CardDescription className="mt-2">{explanation}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {type === 'bill' && (
          <BillPreview data={data as BillSuggestion} />
        )}
        {type === 'invoice' && (
          <InvoicePreview data={data as InvoiceSuggestion} />
        )}
        {type === 'journal' && (
          <JournalPreview data={data as JournalSuggestion} />
        )}
        {type === 'payment' && (
          <PaymentPreview data={data as PaymentSuggestion} />
        )}
      </CardContent>

      {status === 'pending' && (
        <CardFooter className="flex flex-col gap-3">
          {!isCommenting ? (
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                disabled={isLoading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => setIsCommenting(true)}
                variant="outline"
                disabled={isLoading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide feedback or corrections..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitComment}
                  disabled={isLoading || !comment.trim()}
                  size="sm"
                >
                  Send Comment
                </Button>
                <Button
                  onClick={() => {
                    setIsCommenting(false);
                    setComment('');
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function BillPreview({ data }: { data: BillSuggestion }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-muted-foreground">Vendor:</span>
          <p className="font-medium">{data.vendor_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Category:</span>
          <p className="font-medium">{data.category}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Date:</span>
          <p className="font-medium">{data.date}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Due Date:</span>
          <p className="font-medium">{data.due_date}</p>
        </div>
      </div>

      {data.project_name && (
        <div>
          <span className="text-muted-foreground">Project:</span>
          <p className="font-medium">{data.project_name}</p>
        </div>
      )}

      {data.faktur_pajak_number && (
        <div>
          <span className="text-muted-foreground">Faktur Pajak:</span>
          <p className="font-medium">{data.faktur_pajak_number}</p>
        </div>
      )}

      <Separator />

      <div>
        <p className="font-medium mb-2">Line Items:</p>
        <div className="space-y-2">
          {data.lines.map((line, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-primary/20">
              <p className="font-medium">{line.description}</p>
              <p className="text-xs text-muted-foreground">
                {line.expense_account_code} - {line.expense_account_name}
              </p>
              <p className="text-xs">
                {line.quantity} × {formatCurrency(line.unit_price)} = {formatCurrency(line.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-medium">{formatCurrency(data.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">PPN 11%:</span>
          <span className="font-medium">{formatCurrency(data.vat_amount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ data }: { data: InvoiceSuggestion }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-muted-foreground">Client:</span>
          <p className="font-medium">{data.client_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Date:</span>
          <p className="font-medium">{data.date}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Due Date:</span>
          <p className="font-medium">{data.due_date}</p>
        </div>
      </div>

      {data.project_name && (
        <div>
          <span className="text-muted-foreground">Project:</span>
          <p className="font-medium">{data.project_name}</p>
        </div>
      )}

      {data.faktur_pajak_number && (
        <div>
          <span className="text-muted-foreground">Faktur Pajak:</span>
          <p className="font-medium">{data.faktur_pajak_number}</p>
        </div>
      )}

      <Separator />

      <div>
        <p className="font-medium mb-2">Line Items:</p>
        <div className="space-y-2">
          {data.lines.map((line, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-primary/20">
              <p className="font-medium">{line.description}</p>
              <p className="text-xs text-muted-foreground">
                {line.revenue_account_code} - {line.revenue_account_name}
              </p>
              <p className="text-xs">
                {line.quantity} × {formatCurrency(line.unit_price)} = {formatCurrency(line.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-medium">{formatCurrency(data.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">PPN 11%:</span>
          <span className="font-medium">{formatCurrency(data.vat_amount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

function JournalPreview({ data }: { data: JournalSuggestion }) {
  const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const difference = Math.abs(totalDebit - totalCredit);

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-muted-foreground">Date:</span>
          <p className="font-medium">{data.date}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Period:</span>
          <p className="font-medium">{data.period}</p>
        </div>
      </div>

      <div>
        <span className="text-muted-foreground">Description:</span>
        <p className="font-medium">{data.description}</p>
      </div>

      <Separator />

      <div>
        <p className="font-medium mb-2">Journal Lines:</p>
        <div className="space-y-2">
          {data.lines.map((line, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-primary/20">
              <p className="font-medium">{line.account_code} - {line.account_name}</p>
              {line.description && (
                <p className="text-xs text-muted-foreground">{line.description}</p>
              )}
              <div className="flex gap-4 text-xs mt-1">
                <span>Debit: {formatCurrency(line.debit || 0)}</span>
                <span>Credit: {formatCurrency(line.credit || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="font-medium">Total Debit:</span>
          <span className="font-medium">{formatCurrency(totalDebit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Total Credit:</span>
          <span className="font-medium">{formatCurrency(totalCredit)}</span>
        </div>
      </div>

      {!isBalanced && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>Journal is not balanced!</span>
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            Difference: {formatCurrency(difference)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Debits: {formatCurrency(totalDebit)} | Credits: {formatCurrency(totalCredit)}
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentPreview({ data }: { data: PaymentSuggestion }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-muted-foreground">Bill:</span>
          <p className="font-medium">{data.bill_number}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Vendor:</span>
          <p className="font-medium">{data.vendor_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Payment Date:</span>
          <p className="font-medium">{data.date}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Bank Account:</span>
          <p className="font-medium">{data.bank_account_name}</p>
          <p className="text-xs text-muted-foreground">{data.bank_account_code}</p>
        </div>
      </div>

      {data.description && (
        <div>
          <span className="text-muted-foreground">Description:</span>
          <p className="font-medium">{data.description}</p>
        </div>
      )}

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment Amount:</span>
          <span className="font-medium">{formatCurrency(data.amount)}</span>
        </div>
        {data.pph23_withheld > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">PPh 23 Withheld:</span>
            <span className="font-medium">{formatCurrency(data.pph23_withheld)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Net Payment:</span>
          <span>{formatCurrency(data.amount - data.pph23_withheld)}</span>
        </div>
      </div>
    </div>
  );
}
