import { useState, useRef, useEffect } from 'react';
import { useConversations, useConversation, useSendMessage } from '@/hooks/useAIChat';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Paperclip, Send, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

export function AIAssistant() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations } = useConversations();
  const { data: messages } = useConversation(selectedConversation);
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

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
        toast({
          title: 'Authentication Required',
          description: 'Please log in to use AI Assistant',
          variant: 'destructive'
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
            if (content) {
              fullContent += content;
              setStreamingContent(fullContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (fullContent) {
        await supabase.from('conversation_message').insert({
          conversation_id: selectedConversation,
          role: 'assistant',
          content: fullContent
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
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversation')
      .insert({ created_by: (await supabase.auth.getUser()).data.user?.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
      return;
    }

    setSelectedConversation(data.id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(Array.from(e.target.files));
      toast({ title: 'Files attached', description: `${e.target.files.length} file(s) ready to upload` });
    }
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
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-lg p-4 bg-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
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
