-- PHASE 2 & 3: File Upload + Chat Interface Tables

-- Transaction Attachment Table (unified for all transaction types)
CREATE TABLE transaction_attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bill', 'invoice', 'receipt', 'payment', 'journal')),
  transaction_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  extracted_data JSONB, -- OCR extracted data
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Table (for AI chat sessions)
CREATE TABLE conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT, -- auto-generated from first message
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false
);

-- Conversation Message Table
CREATE TABLE conversation_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversation(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB, -- tool calls, attachments, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compliance Issue Table (for audit findings)
CREATE TABLE compliance_issue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT NOT NULL CHECK (issue_type IN ('tax_risk', 'accounting_error', 'documentation', 'data_quality')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  message TEXT NOT NULL,
  action_required TEXT,
  related_entity_type TEXT, -- 'bill', 'payment', 'invoice'
  related_entity_id UUID,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'ignored', 'deferred')),
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE transaction_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_attachment
CREATE POLICY "Users can view all attachments"
  ON transaction_attachment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload attachments"
  ON transaction_attachment FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- RLS Policies for conversation
CREATE POLICY "Users can view own conversations"
  ON conversation FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create conversations"
  ON conversation FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON conversation FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for conversation_message
CREATE POLICY "Users can view messages in own conversations"
  ON conversation_message FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation
      WHERE conversation.id = conversation_message.conversation_id
      AND conversation.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON conversation_message FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation
      WHERE conversation.id = conversation_message.conversation_id
      AND conversation.created_by = auth.uid()
    )
  );

-- RLS Policies for compliance_issue
CREATE POLICY "Users can view compliance issues"
  ON compliance_issue FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can create compliance issues"
  ON compliance_issue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update compliance issues"
  ON compliance_issue FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_transaction_attachment_type ON transaction_attachment(transaction_type);
CREATE INDEX idx_transaction_attachment_entity ON transaction_attachment(transaction_id);
CREATE INDEX idx_conversation_user ON conversation(created_by);
CREATE INDEX idx_conversation_archived ON conversation(archived);
CREATE INDEX idx_conversation_message_conv ON conversation_message(conversation_id);
CREATE INDEX idx_compliance_issue_status ON compliance_issue(status);
CREATE INDEX idx_compliance_issue_severity ON compliance_issue(severity);

-- Create storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transaction-attachments', 'transaction-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transaction-attachments
CREATE POLICY "Users can view transaction attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transaction-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload transaction attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transaction-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_message_timestamp
AFTER INSERT ON conversation_message
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();