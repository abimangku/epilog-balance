import { useState, useRef, useEffect, useCallback } from 'react';
import { useConversation } from '@/hooks/useAIChat';
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
  Shield,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { SuggestionCard } from './SuggestionCard';
import { ScrollArea } from './ui/scroll-area';
import { AIProgressIndicator } from './AIProgressIndicator';

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
  const [message, setMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [progressSteps, setProgressSteps] = useState<Array<{ label: string; status: 'pending' | 'in_progress' | 'complete' }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastStreamUpdateRef = useRef<number>(0);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: messages } = useConversation(selectedConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(Array.from(e.target.files));
      toast({ 
        title: 'Files attached', 
        description: `${e.target.files.length} file(s) ready to upload` 
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    const messageText = message.trim();
    setMessage('');
    adjustHeight(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use AI Assistant',
          variant: 'destructive'
        });
        setIsStreaming(false);
        return;
      }

      // Create conversation if needed
      let conversationId = selectedConversation;
      if (!conversationId) {
        const { data, error } = await supabase
          .from('conversation')
          .insert({ created_by: session.user.id })
          .select()
          .single();

        if (error) throw error;
        conversationId = data.id;
        setSelectedConversation(conversationId);
      }

      // Save user message
      await supabase.from('conversation_message').insert({
        conversation_id: conversationId,
        role: 'user',
        content: messageText
      });

      // Upload files if any
      let attachmentData: any[] = [];
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const { data: parsed } = await supabase.functions.invoke('parse-document', {
            body: { file, transactionType: 'chat' }
          });
          if (parsed) {
            attachmentData.push({
              file_name: file.name,
              extracted_data: parsed.extracted_data
            });
          }
        }
        setAttachedFiles([]);
      }

      // Stream AI response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversationId,
            message: messageText,
            attachments: attachmentData.length > 0 ? attachmentData : undefined
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let fullContent = '';
      let suggestionData: any = null;
      let suggestionType: string | null = null;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
            
            if (content) {
              fullContent += content;
              // Buffer updates for smoother rendering (every 50ms or 15 chars)
              const now = Date.now();
              if (now - lastStreamUpdateRef.current > 50 || fullContent.length % 15 === 0) {
                setStreamingContent(fullContent);
                lastStreamUpdateRef.current = now;
              }
            }

            if (toolCalls && toolCalls.length > 0) {
              const toolCall = toolCalls[0];
              if (toolCall.function?.name && toolCall.function?.arguments) {
                const funcName = toolCall.function.name;
                
                // Show loading indicator for query tools
                if (funcName.startsWith('query_') || funcName === 'calculate_tax_position') {
                  setProgressSteps([
                    { label: '🔍 Querying database', status: 'in_progress' as const },
                    { label: '📊 Analyzing data', status: 'pending' as const },
                    { label: '📝 Preparing report', status: 'pending' as const }
                  ]);
                }
                try {
                  const funcName = toolCall.function.name;
                  const args = JSON.parse(toolCall.function.arguments);
                  
                  if (funcName === 'suggest_journal') {
                    const totalDebit = args.lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
                    const totalCredit = args.lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
                    
                    if (Math.abs(totalDebit - totalCredit) > 0.01) {
                      console.error('Unbalanced journal detected');
                      continue;
                    }
                  }
                  
                  if (funcName === 'suggest_bill') {
                    suggestionType = 'bill';
                    suggestionData = { ...args, due_date: args.date };
                  } else if (funcName === 'suggest_invoice') {
                    suggestionType = 'invoice';
                    suggestionData = { ...args, due_date: args.date };
                  } else if (funcName === 'suggest_journal') {
                    suggestionType = 'journal';
                    suggestionData = args;
                  } else if (funcName === 'suggest_payment') {
                    suggestionType = 'payment';
                    suggestionData = args;
                  }
                } catch (e) {
                  console.error('Tool call parsing error:', e);
                }
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Ensure final buffer flush
      if (fullContent && streamingContent !== fullContent) {
        setStreamingContent(fullContent);
      }

      // Clear progress after completion
      setProgressSteps([]);

      // Validate: Warn if AI responded with text-based journal instead of tool call
      if ((fullContent.includes('Suggested Journal Entry') || 
           fullContent.includes('| Account |') || 
           (fullContent.toLowerCase().includes('suggested') && fullContent.includes('debit') && fullContent.includes('credit'))) && 
          !suggestionData) {
        console.warn('AI responded with text journal instead of tool call');
        toast({
          title: 'Suggestion Format',
          description: 'The AI described the transaction. Please say "create it" or "record it" to get an approval card.',
          variant: 'default'
        });
      }

      // Save assistant message
      if (fullContent || suggestionData) {
        const metadata: any = {};
        if (suggestionData && suggestionType) {
          metadata.suggestion_type = suggestionType;
          metadata.suggested_data = suggestionData;
          metadata.status = 'pending';
        }

        await supabase.from('conversation_message').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent || 'Suggestion created',
          metadata: Object.keys(metadata).length > 0 ? metadata : null
        });
      }

      setStreamingContent('');

    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearChat = () => {
    setSelectedConversation(null);
    setMessage('');
    setStreamingContent('');
    setAttachedFiles([]);
  };

  const handleApproveSuggestion = async (messageId: string) => {
    const message = messages?.find(m => m.id === messageId);
    if (!message?.metadata?.suggested_data) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'Authentication required', variant: 'destructive' });
        return;
      }

      const suggestionType = message.metadata.suggestion_type;
      const functionName = `approve-${suggestionType}-suggestion`;

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messageId,
          suggestionData: message.metadata.suggested_data
        }
      });

      if (error) throw error;

      await supabase.from('conversation_message')
        .update({ metadata: { ...message.metadata, status: 'approved' } })
        .eq('id', messageId);

      toast({ title: 'Success', description: `${suggestionType} approved and created` });
    } catch (error) {
      console.error('Approve error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve',
        variant: 'destructive'
      });
    }
  };

  const handleRejectSuggestion = async (messageId: string) => {
    const message = messages?.find(m => m.id === messageId);
    if (!message) return;

    await supabase.from('conversation_message')
      .update({ metadata: { ...message.metadata, status: 'rejected' } })
      .eq('id', messageId);

    toast({ title: 'Rejected', description: 'Suggestion dismissed' });
  };

  const handleCommentOnSuggestion = async (messageId: string, comment: string) => {
    await supabase.from('conversation_message').insert({
      conversation_id: selectedConversation!,
      role: 'user',
      content: comment
    });

    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasMessages = messages && messages.length > 0;

  return (
    <div
      className="relative w-full min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, hsl(220, 20%, 12%) 0%, hsl(240, 15%, 8%) 100%)',
      }}
    >
      {/* Header - Always visible */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/40">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
          Vibe AI Assistant
        </h1>
        {hasMessages && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="flex items-center gap-2 text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
            New Chat
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      {!hasMessages ? (
        // Empty State - Beautiful Hero
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center mb-12 space-y-3 max-w-2xl">
            <p className="text-xl text-gray-300 font-light">
              Your Indonesian accounting expert — powered by AI
            </p>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Ask questions, upload documents, create entries, or get tax advice
            </p>
          </div>

          {/* Quick Actions */}
          <div className="w-full max-w-3xl mb-8">
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
      ) : (
        // Chat Thread
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'user' ? (
                  <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 max-w-[80%] shadow-lg">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                ) : msg.metadata?.suggestion_type ? (
                  <div className="max-w-[90%]">
                    <SuggestionCard
                      type={msg.metadata.suggestion_type}
                      data={msg.metadata.suggested_data}
                      explanation={msg.content}
                      messageId={msg.id}
                      status={msg.metadata.status}
                      onApprove={() => handleApproveSuggestion(msg.id)}
                      onReject={() => handleRejectSuggestion(msg.id)}
                      onComment={(comment) => handleCommentOnSuggestion(msg.id, comment)}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-2xl px-5 py-3 max-w-[80%] shadow-lg border border-gray-700/40">
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-4 overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-600 border border-gray-600 rounded-lg" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-gray-700/50" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-wider" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-gray-700" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-gray-700/30 transition-colors" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2 text-sm text-gray-300" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold mt-6 mb-3 text-white" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-200" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-1 my-3" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-gray-300 leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-white" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed text-gray-300" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm font-mono text-blue-300" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Progress indicator for tool execution */}
            {progressSteps.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%]">
                  <AIProgressIndicator 
                    steps={progressSteps}
                    message="Processing your request..."
                  />
                </div>
              </div>
            )}

            {/* Streaming indicator */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-2xl px-5 py-3 max-w-[80%] shadow-lg border border-gray-700/40">
                  <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="my-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-600 border border-gray-600 rounded-lg" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-gray-700/50" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-wider" {...props} />
                        ),
                        tbody: ({ node, ...props }) => (
                          <tbody className="divide-y divide-gray-700" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                          <tr className="hover:bg-gray-700/30 transition-colors" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-4 py-2 text-sm text-gray-300" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-xl font-bold mt-6 mb-3 text-white" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-200" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-none space-y-1 my-3" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-gray-300 leading-relaxed" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-white" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="my-2 leading-relaxed text-gray-300" {...props} />
                        ),
                        code: ({ node, ...props }) => (
                          <code className="bg-gray-700/50 px-1.5 py-0.5 rounded text-sm font-mono text-blue-300" {...props} />
                        ),
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Initial loading state */}
            {isStreaming && !streamingContent && progressSteps.length === 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl px-5 py-3 border border-gray-700/40 animate-pulse">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input Box - Always visible at bottom */}
      <div className="w-full border-t border-gray-700/40 bg-gray-900/60 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative bg-gray-800/80 rounded-2xl border border-gray-700/60 shadow-xl">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder={hasMessages ? "Type your message..." : "Ask about invoices, tax compliance, journal entries..."}
              className={cn(
                "w-full px-5 py-3 resize-none border-none text-base",
                "bg-transparent text-white placeholder:text-gray-400",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "min-h-[56px] leading-relaxed"
              )}
              style={{ overflow: 'hidden' }}
              disabled={isStreaming}
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.csv,.xlsx,.xls,image/*"
              className="hidden"
              multiple
            />

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/40">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileUpload}
                className="text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                title="Attach file"
                disabled={isStreaming}
              >
                <Paperclip className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleSendMessage}
                disabled={(!message.trim() && attachedFiles.length === 0) || isStreaming}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
                  (message.trim() || attachedFiles.length > 0) && !isStreaming
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                )}
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
                <span>{isStreaming ? 'Sending...' : 'Send'}</span>
              </Button>
            </div>

            {attachedFiles.length > 0 && (
              <div className="px-4 pb-3 flex gap-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
