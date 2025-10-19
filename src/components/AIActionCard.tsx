import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, FolderKanban, FileText, Receipt, BookOpen, Wallet, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface AIActionCardProps {
  actionType: 'vendor_created' | 'client_created' | 'project_created' | 'bill_created' | 'invoice_created' | 'journal_created' | 'payment_created';
  entityData: any;
  timestamp: string;
}

const actionConfig = {
  vendor_created: {
    icon: Building2,
    title: "Vendor Created",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  client_created: {
    icon: Users,
    title: "Client Created",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  project_created: {
    icon: FolderKanban,
    title: "Project Created",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  bill_created: {
    icon: FileText,
    title: "Bill Recorded",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  invoice_created: {
    icon: Receipt,
    title: "Invoice Created",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  journal_created: {
    icon: BookOpen,
    title: "Journal Entry Posted",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  payment_created: {
    icon: Wallet,
    title: "Payment Recorded",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
};

export function AIActionCard({ actionType, entityData, timestamp }: AIActionCardProps) {
  const navigate = useNavigate();
  const config = actionConfig[actionType];
  const Icon = config.icon;

  const handleView = () => {
    switch (actionType) {
      case 'vendor_created':
        navigate('/vendors');
        break;
      case 'client_created':
        navigate('/clients');
        break;
      case 'project_created':
        navigate('/projects');
        break;
      case 'bill_created':
        navigate('/bills');
        break;
      case 'invoice_created':
        navigate('/invoices');
        break;
      case 'journal_created':
        navigate('/journals');
        break;
      case 'payment_created':
        navigate('/bills');
        break;
    }
  };

  const renderContent = () => {
    switch (actionType) {
      case 'vendor_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.vendor_name} ({entityData.vendor_code})</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                PKP: {entityData.provides_faktur_pajak ? 'Yes' : 'No'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                PPh 23: {entityData.subject_to_pph23 ? 'Yes' : 'No'}
              </Badge>
              {entityData.tax_id && (
                <Badge variant="outline" className="text-xs">
                  NPWP: {entityData.tax_id}
                </Badge>
              )}
            </div>
          </>
        );
      
      case 'client_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.client_name} ({entityData.client_code})</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                Withholds PPh23: {entityData.withholds_pph23 ? 'Yes' : 'No'}
              </Badge>
              {entityData.tax_id && (
                <Badge variant="outline" className="text-xs">
                  NPWP: {entityData.tax_id}
                </Badge>
              )}
            </div>
          </>
        );
      
      case 'project_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.project_name} ({entityData.project_code})</p>
            {entityData.client_name && (
              <p className="text-xs text-muted-foreground mt-1">Client: {entityData.client_name}</p>
            )}
          </>
        );
      
      case 'bill_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.bill_number}</p>
            <p className="text-xs text-muted-foreground">{entityData.vendor_name} - Rp {entityData.total?.toLocaleString('id-ID')}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">{entityData.category}</Badge>
              {entityData.project_name && (
                <Badge variant="outline" className="text-xs">{entityData.project_name}</Badge>
              )}
            </div>
          </>
        );
      
      case 'invoice_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.invoice_number}</p>
            <p className="text-xs text-muted-foreground">{entityData.client_name} - Rp {entityData.total?.toLocaleString('id-ID')}</p>
            {entityData.project_name && (
              <Badge variant="outline" className="text-xs mt-2">{entityData.project_name}</Badge>
            )}
          </>
        );
      
      case 'journal_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.journal_number}</p>
            <p className="text-xs text-muted-foreground">{entityData.description}</p>
            <Badge variant="secondary" className="text-xs mt-2">
              Rp {entityData.total_debit?.toLocaleString('id-ID')}
            </Badge>
          </>
        );
      
      case 'payment_created':
        return (
          <>
            <p className="font-semibold text-sm">{entityData.payment_number}</p>
            <p className="text-xs text-muted-foreground">
              {entityData.vendor_name} - Rp {entityData.amount?.toLocaleString('id-ID')}
            </p>
            {entityData.pph23_withheld > 0 && (
              <Badge variant="outline" className="text-xs mt-2">
                PPh23 Withheld: Rp {entityData.pph23_withheld?.toLocaleString('id-ID')}
              </Badge>
            )}
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={`${config.borderColor} ${config.bgColor} action-card-enter`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${config.color} success-checkmark`} />
            <span className={`text-sm font-semibold ${config.color}`}>{config.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {renderContent()}
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full mt-2"
            onClick={handleView}
          >
            <Icon className="h-3 w-3 mr-1" />
            View {config.title.split(' ')[0]}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
