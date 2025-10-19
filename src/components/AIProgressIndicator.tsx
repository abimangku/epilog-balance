import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface ProgressStep {
  label: string;
  status: 'pending' | 'in_progress' | 'complete';
}

interface AIProgressIndicatorProps {
  steps: ProgressStep[];
  message?: string;
}

export function AIProgressIndicator({ steps, message }: AIProgressIndicatorProps) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 mt-0.5" />
          <div className="flex-1 space-y-2">
            {message && (
              <p className="text-sm font-medium text-blue-900">{message}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {steps.map((step, index) => (
                <Badge
                  key={index}
                  variant={step.status === 'complete' ? 'default' : 'secondary'}
                  className={`text-xs ${
                    step.status === 'in_progress' ? 'animate-pulse' : ''
                  }`}
                >
                  {step.status === 'complete' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {step.status === 'in_progress' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {step.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {step.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
