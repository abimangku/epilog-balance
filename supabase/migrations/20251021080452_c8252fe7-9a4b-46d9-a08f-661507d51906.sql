-- Add DELETE policy for conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversation
FOR DELETE
TO public
USING (created_by = auth.uid());

-- Add DELETE policy for conversation messages
CREATE POLICY "Users can delete messages in own conversations"
ON public.conversation_message
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM conversation
    WHERE conversation.id = conversation_message.conversation_id
    AND conversation.created_by = auth.uid()
  )
);

-- Add DELETE policy for AI suggestion logs
CREATE POLICY "Users can delete own suggestion logs"
ON public.ai_suggestion_log
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation
    WHERE conversation.id = ai_suggestion_log.conversation_id
    AND conversation.created_by = auth.uid()
  )
);