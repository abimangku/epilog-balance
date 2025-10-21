-- Create clean slate reset function with elevated privileges
CREATE OR REPLACE FUNCTION public.clean_slate_reset()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  journals_deleted INTEGER;
  lines_deleted INTEGER;
  conversations_deleted INTEGER;
  messages_deleted INTEGER;
  suggestions_deleted INTEGER;
BEGIN
  -- Delete in correct order (respecting foreign keys)
  
  -- Delete journal lines first (child records)
  DELETE FROM journal_line;
  GET DIAGNOSTICS lines_deleted = ROW_COUNT;
  
  -- Delete journals (parent records)
  DELETE FROM journal;
  GET DIAGNOSTICS journals_deleted = ROW_COUNT;
  
  -- Delete AI suggestion logs
  DELETE FROM ai_suggestion_log;
  GET DIAGNOSTICS suggestions_deleted = ROW_COUNT;
  
  -- Delete conversation messages (child records)
  DELETE FROM conversation_message;
  GET DIAGNOSTICS messages_deleted = ROW_COUNT;
  
  -- Delete conversations (parent records)
  DELETE FROM conversation;
  GET DIAGNOSTICS conversations_deleted = ROW_COUNT;
  
  -- Return detailed results
  RETURN jsonb_build_object(
    'success', true,
    'journals_deleted', journals_deleted,
    'lines_deleted', lines_deleted,
    'conversations_deleted', conversations_deleted,
    'messages_deleted', messages_deleted,
    'suggestions_deleted', suggestions_deleted
  );
END;
$$;