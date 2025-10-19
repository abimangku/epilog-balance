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
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full border-gray-700 bg-gray-800/60 backdrop-blur-sm text-gray-200 hover:text-white hover:bg-gray-700/80 hover:border-gray-600 transition-all hover:scale-105 shadow-sm"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
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
      className="relative w-full min-h-screen flex flex-col items-center px-4 py-8"
      style={{
        background: 'linear-gradient(180deg, hsl(220, 20%, 12%) 0%, hsl(240, 15%, 8%) 100%)',
      }}
    >
      {/* Centered AI Title */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="text-center mb-12 space-y-3 max-w-2xl">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
            Vibe AI Assistant
          </h1>
          <p className="text-xl text-gray-300 font-light">
            Your Indonesian accounting expert — powered by AI
          </p>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Ask questions, upload documents, create entries, or get tax advice
          </p>
        </div>
      </div>

      {/* Input Box Section */}
      <div className="w-full max-w-4xl mb-12">
        <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl transition-all hover:border-gray-600/60">
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
              "w-full px-6 py-4 resize-none border-none text-base",
              "bg-transparent text-white placeholder:text-gray-400",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "min-h-[56px] leading-relaxed"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/40">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFileUpload}
              className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isCreatingConversation}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
                message.trim() && !isCreatingConversation
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              <ArrowUp className="w-5 h-5" />
              <span>Send</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <p className="text-center text-sm text-gray-400 mb-4 font-medium">Quick actions</p>
          <div className="flex items-center justify-center flex-wrap gap-3">
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
    </div>
  );
}
