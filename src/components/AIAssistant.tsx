import { useState, useRef, useEffect } from 'react';
import { useConversations, useConversation, useSendMessage } from '@/hooks/useAIChat';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Paperclip, Send, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { toast as toastLegacy } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { SuggestionCard } from './SuggestionCard';
import { AIActionCard } from './AIActionCard';
import { AIProgressIndicator } from './AIProgressIndicator';

export function AIAssistant() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [progressSteps, setProgressSteps] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations } = useConversations();
  const { data: messages } = useConversation(selectedConversation);
  const sendMessage = useSendMessage();

  // Only scroll when messages change, not during streaming
  useEffect(() => {
    if (!isStreaming && messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages, isStreaming]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication Required', {
          description: 'Please log in to use AI Assistant'
        });
        setIsStreaming(false);
        return;
      }

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

      // Call streaming endpoint with user's JWT token
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversationId: selectedConversation,
            message: messageText,
            attachments: attachmentData.length > 0 ? attachmentData : undefined
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
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
              setStreamingContent(fullContent);
            }

            // Parse tool calls for entity creation and suggestions
            if (toolCalls && toolCalls.length > 0) {
              const toolCall = toolCalls[0];
              if (toolCall.function?.name && toolCall.function?.arguments) {
                try {
                  const funcName = toolCall.function.name;
                  const args = JSON.parse(toolCall.function.arguments);
                  
                  // Handle entity creation tool calls
                  if (funcName === 'create_vendor' || funcName === 'create_client' || funcName === 'create_project') {
                    setProgressSteps([{ label: `Creating ${funcName.split('_')[1]}...`, status: 'in_progress' }]);
                    
                    const { data: entityData, error: entityError } = await supabase.functions.invoke(
                      `${funcName}-entity`,
                      { body: args }
                    );
                    
                    setProgressSteps([]);
                    
                    if (!entityError && entityData?.success) {
                      // Show success toast
                      const entityType = funcName.split('_')[1];
                      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Created`, {
                        description: entityData.message,
                      });
                      
                      // Insert action card into chat with success message
                      const actionData: any = {};
                      let actionMessage = '';
                      
                      if (funcName === 'create_vendor') {
                        actionData.vendor_name = entityData.vendor.name;
                        actionData.vendor_code = entityData.vendor.code;
                        actionData.tax_id = entityData.vendor.tax_id;
                        actionData.provides_faktur_pajak = entityData.vendor.provides_faktur_pajak;
                        actionData.subject_to_pph23 = entityData.vendor.subject_to_pph23;
                        actionMessage = `✅ Vendor **${entityData.vendor.name}** (${entityData.vendor.code}) created successfully!`;
                      } else if (funcName === 'create_client') {
                        actionData.client_name = entityData.client.name;
                        actionData.client_code = entityData.client.code;
                        actionData.tax_id = entityData.client.tax_id;
                        actionData.withholds_pph23 = entityData.client.withholds_pph23;
                        actionMessage = `✅ Client **${entityData.client.name}** (${entityData.client.code}) created successfully!`;
                      } else if (funcName === 'create_project') {
                        actionData.project_name = entityData.project.name;
                        actionData.project_code = entityData.project.code;
                        actionData.client_name = args.clientName;
                        actionMessage = `✅ Project **${entityData.project.name}** (${entityData.project.code}) created successfully!`;
                      }
                      
                      await supabase.from('conversation_message').insert({
                        conversation_id: selectedConversation,
                        role: 'assistant',
                        content: actionMessage,
                        metadata: {
                          action_type: `${funcName.split('_')[1]}_created`,
                          action_data: actionData
                        }
                      });
                    } else {
                      toast.error('Failed to Create Entity', {
                        description: entityError?.message || 'An error occurred'
                      });
                    }
                    continue;
                  }
                  
                  // Validate journal entries are balanced
                  if (funcName === 'suggest_journal') {
                    const totalDebit = args.lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
                    const totalCredit = args.lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
                    
                    if (Math.abs(totalDebit - totalCredit) > 0.01) {
                      console.error('Unbalanced journal detected:', { totalDebit, totalCredit, args });
                      continue;
                    }
                  }
                  
                  // Store suggestion data
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
                  console.error('Tool call parsing error:', e, toolCall.function.arguments);
                }
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database with suggestion metadata
      if (fullContent || suggestionData) {
        const metadata: any = {};
        if (suggestionData && suggestionType) {
          metadata.suggestion_type = suggestionType;
          metadata.suggested_data = suggestionData;
          metadata.status = 'pending';
        }

        await supabase.from('conversation_message').insert({
          conversation_id: selectedConversation,
          role: 'assistant',
          content: fullContent || 'Suggestion created',
          metadata: Object.keys(metadata).length > 0 ? metadata : null
        });
      }

      // Refresh messages
      sendMessage.mutate(
        { conversationId: selectedConversation, message: '', attachments: [] },
        {
          onSuccess: () => {
            setStreamingContent('');
          }
        }
      );

    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to send message'
      });
    } finally {
      setIsStreaming(false);
      setProgressSteps([]);
    }
  };

  const handleNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversation')
      .insert({ created_by: (await supabase.auth.getUser()).data.user?.id })
      .select()
      .single();

    if (error) {
      toast.error('Error', { description: 'Failed to create conversation' });
      return;
    }

    setSelectedConversation(data.id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(Array.from(e.target.files));
      toast.success('Files attached', { description: `${e.target.files.length} file(s) ready to upload` });
    }
  };

  const handleApproveSuggestion = async (messageId: string) => {
    const message = messages?.find(m => m.id === messageId);
    if (!message?.metadata?.suggested_data) return;

    // Pre-flight validation
    const suggestionType = message.metadata.suggestion_type;
    const suggestionData = message.metadata.suggested_data;
    
    if (suggestionType === 'invoice') {
      if (!suggestionData.lines?.every((l: any) => l.amount && l.revenue_account_code)) {
        toast.error("Invalid Data", {
          description: "Invoice lines are missing required fields (amount or account code). Please try again.",
        });
        return;
      }
    }
    
    if (suggestionType === 'bill') {
      if (!suggestionData.lines?.every((l: any) => l.amount && l.expense_account_code)) {
        toast.error("Invalid Data", {
          description: "Bill lines are missing required fields (amount or account code). Please try again.",
        });
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Error', { description: 'Authentication required' });
        return;
      }

      const suggestionType = message.metadata.suggestion_type;
      const functionName = `approve-${suggestionType}-suggestion`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messageId,
            conversationId: selectedConversation,
            suggestionData: message.metadata.suggested_data
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Parse validation errors specifically
        if (data.error?.includes('Invalid input') || data.error?.includes('validation') || data.details) {
          const details = data.details 
            ? data.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
            : data.error || 'Check the data format';
            
          toast.error("Validation Error", {
            description: `Data validation failed: ${details}`,
            duration: 8000,
          });
          
          console.error('❌ Validation failed:', data);
          if (data.received) {
            console.error('Data received by backend:', data.received);
          }
          return;
        }
        
        // Handle missing entity errors with recovery
        if (data.error === 'missing_vendor' || data.error === 'missing_client') {
          const entityType = data.error === 'missing_vendor' ? 'vendor' : 'client';
          const entityName = data.vendor_name || data.client_name;
          
          toast.error(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Found`, {
            description: `"${entityName}" doesn't exist. Please ask AI to create it.`,
            action: {
              label: 'Ask AI',
              onClick: () => {
                setInputMessage(`Please create ${entityType} "${entityName}" and then retry the ${suggestionType}.`);
              }
            }
          });
          return;
        }
        throw new Error(data.error || 'Failed to approve suggestion');
      }

      // Enhanced success feedback with detailed information
      const entityInfo = data.invoice || data.bill || data.payment || data.journal;
      const entityNumber = entityInfo?.number || '';
      const entityTotal = entityInfo?.total || data.payment?.amount || 0;
      
      // Show success toast with action button
      toast.success(`${suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1)} Created!`, {
        description: entityNumber 
          ? `${entityNumber} - Rp ${entityTotal.toLocaleString('id-ID')} has been recorded successfully.`
          : `${suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1)} has been created successfully.`,
        duration: 6000,
        action: suggestionType === 'invoice' || suggestionType === 'bill' 
          ? {
              label: 'View',
              onClick: () => window.location.href = `/${suggestionType}s`
            }
          : undefined
      });

      // Refresh messages to show AI follow-up with action card
      sendMessage.mutate({ conversationId: selectedConversation, message: '', attachments: [] });
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to approve suggestion'
      });
    }
  };

  const handleRejectSuggestion = async (messageId: string) => {
    try {
      await supabase
        .from('conversation_message')
        .update({ 
          metadata: { 
            ...messages?.find(m => m.id === messageId)?.metadata,
            status: 'rejected' 
          }
        })
        .eq('id', messageId);

      toast.success('Suggestion rejected');
      sendMessage.mutate({ conversationId: selectedConversation, message: '', attachments: [] });
    } catch (error) {
      toast.error('Error', { description: 'Failed to reject suggestion' });
    }
  };

  const handleCommentOnSuggestion = async (messageId: string, comment: string) => {
    const message = messages?.find(m => m.id === messageId);
    if (!message) return;

    // Send the comment as a new user message with context
    const contextMessage = `[Regarding previous suggestion] ${comment}`;
    setInputMessage(contextMessage);
    await handleSendMessage();
  };

  if (!selectedConversation) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">🤖 AI Accounting Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              I'm your Indonesian accounting expert. I can help you with:
            </p>
            <ul className="space-y-2 text-sm">
              <li>✅ Classifying transactions (COGS vs OPEX, account codes)</li>
              <li>✅ Indonesian tax compliance (PPh 21, PPh 23, PPN)</li>
              <li>✅ Extracting data from invoices and receipts (OCR)</li>
              <li>✅ Suggesting journal entries with proper accounts</li>
              <li>✅ Answering accounting questions</li>
            </ul>
            <div className="pt-4">
              <Button onClick={handleNewConversation} className="w-full" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Start New Conversation
              </Button>
            </div>
            {conversations && conversations.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Recent Conversations</h3>
                <div className="space-y-2">
                  {(conversations || []).slice(0, 5).map(conv => (
                    <Button
                      key={conv.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {conv.title || 'Untitled conversation'}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-2">
        <Button onClick={handleNewConversation} className="w-full" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        <div className="space-y-1">
          {conversations?.map(conv => (
            <Button
              key={conv.id}
              variant={selectedConversation === conv.id ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              onClick={() => setSelectedConversation(conv.id)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span className="truncate">{conv.title || 'New conversation'}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages?.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && msg.metadata?.action_type ? (
                <div className="max-w-[80%]">
                  <div className="mb-2 rounded-lg p-4 bg-muted">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-4 overflow-x-auto">
                              <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-muted/50" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-border" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-muted/30 transition-colors" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2 text-sm" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-1 my-3" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <AIActionCard
                    actionType={msg.metadata.action_type}
                    entityData={msg.metadata.action_data}
                    timestamp={msg.created_at}
                  />
                </div>
              ) : msg.role === 'assistant' && msg.metadata?.suggestion_type ? (
                <div className="max-w-[80%] w-full">
                  {msg.content && (
                    <div className="mb-2 rounded-lg p-4 bg-muted">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="my-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className="bg-muted/50" {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" {...props} />
                            ),
                            tbody: ({ node, ...props }) => (
                              <tbody className="divide-y divide-border" {...props} />
                            ),
                            tr: ({ node, ...props }) => (
                              <tr className="hover:bg-muted/30 transition-colors" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className="px-4 py-2 text-sm" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="list-none space-y-1 my-3" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="leading-relaxed" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-bold" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="my-2 leading-relaxed" {...props} />
                            ),
                            code: ({ node, ...props }) => (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <SuggestionCard
                    type={msg.metadata.suggestion_type}
                    data={msg.metadata.suggested_data}
                    messageId={msg.id}
                    status={msg.metadata.status}
                    onApprove={() => handleApproveSuggestion(msg.id)}
                    onReject={() => handleRejectSuggestion(msg.id)}
                    onComment={(comment) => handleCommentOnSuggestion(msg.id, comment)}
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-4 overflow-x-auto">
                              <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-muted/50" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-border" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-muted/30 transition-colors" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2 text-sm" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-1 my-3" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Streaming message */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                {progressSteps.length > 0 ? (
                  <AIProgressIndicator steps={progressSteps} message="Processing your request..." />
                ) : streamingContent ? (
                  <div className="rounded-lg p-4 bg-muted">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-4 overflow-x-auto">
                              <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-muted/50" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-border" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-muted/30 transition-colors" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2 text-sm" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-1 my-3" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 my-3" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          ),
                        }}
                      >
                        {streamingContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg p-4 bg-muted animate-pulse">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          {attachedFiles.length > 0 && (
            <div className="mb-2 text-sm text-muted-foreground">
              📎 {attachedFiles.length} file(s) attached
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.csv,.xlsx,.xls,image/*"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask about tax rules, upload invoice, or request journal entry..."
              disabled={isStreaming}
            />
            <Button onClick={handleSendMessage} disabled={isStreaming || (!inputMessage.trim() && attachedFiles.length === 0)}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
