-- Create ai_suggestion_log table for tracking AI suggestions
CREATE TABLE public.ai_suggestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversation(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.conversation_message(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  suggested_data JSONB NOT NULL,
  approved_data JSONB,
  created_entity_id UUID,
  created_entity_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_suggestion_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs from their own conversations
CREATE POLICY "Users can view own suggestion logs"
ON public.ai_suggestion_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation
    WHERE conversation.id = ai_suggestion_log.conversation_id
    AND conversation.created_by = auth.uid()
  )
);

-- Policy: System can insert logs
CREATE POLICY "System can insert suggestion logs"
ON public.ai_suggestion_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation
    WHERE conversation.id = ai_suggestion_log.conversation_id
    AND conversation.created_by = auth.uid()
  )
);

-- Policy: Users can update their own suggestion logs
CREATE POLICY "Users can update own suggestion logs"
ON public.ai_suggestion_log
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation
    WHERE conversation.id = ai_suggestion_log.conversation_id
    AND conversation.created_by = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_ai_suggestion_log_conversation ON public.ai_suggestion_log(conversation_id);
CREATE INDEX idx_ai_suggestion_log_message ON public.ai_suggestion_log(message_id);
CREATE INDEX idx_ai_suggestion_log_status ON public.ai_suggestion_log(status);