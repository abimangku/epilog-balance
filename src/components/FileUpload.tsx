import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { Upload, Loader2, X } from 'lucide-react'

interface FileUploadProps {
  journalId: string
  onUploadComplete?: () => void
}

export default function FileUpload({ journalId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${journalId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('journal-attachments')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('journal_attachment' as any)
        .insert({
          journal_id: journalId,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user.id,
        })

      if (dbError) throw dbError

      toast({ title: 'File uploaded successfully' })
      setSelectedFile(null)
      onUploadComplete?.()
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          disabled={uploading}
        />
        {selectedFile && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedFile(null)}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
