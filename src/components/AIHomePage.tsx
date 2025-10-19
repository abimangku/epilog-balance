import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations, useSendMessage } from '@/hooks/useAIChat';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { 
  ArrowUp, 
  Paperclip, 
  Receipt, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  BarChart3, 
  Upload, 
  DollarSign,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-border/50 bg-background/10 backdrop-blur-sm text-foreground hover:text-foreground hover:bg-background/20 transition-all hover:scale-105"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

export function AIHomePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: conversations } = useConversations();

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    toast({ 
      title: 'File attached', 
      description: `${file.name} ready to process` 
    });
    
    // Auto-populate message
    setMessage(`I've uploaded ${file.name}. Please extract and classify the data.`);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsCreatingConversation(true);

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use AI Assistant',
          variant: 'destructive'
        });
        return;
      }

      // Create or use existing conversation
      let conversationId = conversations?.[0]?.id;
      
      if (!conversationId) {
        const { data, error } = await supabase
          .from('conversation')
          .insert({ created_by: session.user.id })
          .select()
          .single();

        if (error) throw error;
        conversationId = data.id;
      }

      // Navigate to AI Assistant with the conversation
      navigate(`/ai/assistant?conversation=${conversationId}&message=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, hsl(220, 30%, 5%) 0%, hsl(260, 25%, 8%) 50%, hsl(0, 0%, 3%) 100%)',
      }}
    >
      {/* Centered AI Title */}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-foreground drop-shadow-lg mb-2">
            Vibe AI Assistant
          </h1>
          <p className="text-lg text-muted-foreground">
            Your Indonesian accounting expert — powered by AI
          </p>
        </div>
      </div>

      {/* Input Box Section */}
      <div className="w-full max-w-3xl mb-[15vh] px-4">
        <div className="relative bg-background/40 backdrop-blur-md rounded-xl border border-border/50 shadow-2xl">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about invoices, tax compliance, journal entries..."
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-foreground text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground min-h-[48px]"
            )}
            style={{ overflow: 'hidden' }}
          />

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.csv,.xlsx,.xls,image/*"
            className="hidden"
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-between p-3 border-t border-border/30">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFileUpload}
              className="text-foreground hover:bg-accent"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isCreatingConversation}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-lg transition-all",
                  message.trim() && !isCreatingConversation
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-sm">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
          <QuickAction 
            icon={<Receipt className="w-4 h-4" />} 
            label="Create Invoice" 
            onClick={() => handleQuickAction("Help me create a sales invoice")}
          />
          <QuickAction 
            icon={<FileText className="w-4 h-4" />} 
            label="Record Bill" 
            onClick={() => handleQuickAction("I need to record a vendor bill")}
          />
          <QuickAction 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Journal Entry" 
            onClick={() => handleQuickAction("Create a manual journal entry")}
          />
          <QuickAction 
            icon={<HelpCircle className="w-4 h-4" />} 
            label="Tax Question" 
            onClick={() => handleQuickAction("I have a question about Indonesian tax compliance")}
          />
          <QuickAction 
            icon={<BarChart3 className="w-4 h-4" />} 
            label="Analyze Data" 
            onClick={() => handleQuickAction("Show me a financial analysis")}
          />
          <QuickAction 
            icon={<Upload className="w-4 h-4" />} 
            label="Upload Receipt" 
            onClick={handleFileUpload}
          />
          <QuickAction 
            icon={<DollarSign className="w-4 h-4" />} 
            label="Check Balance" 
            onClick={() => handleQuickAction("What's my current cash balance and AR/AP status?")}
          />
          <QuickAction 
            icon={<Shield className="w-4 h-4" />} 
            label="Compliance Check" 
            onClick={() => handleQuickAction("Run a compliance audit on my recent transactions")}
          />
        </div>
      </div>
    </div>
  );
}
