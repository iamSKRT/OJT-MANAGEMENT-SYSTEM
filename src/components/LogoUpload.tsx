import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, X } from 'lucide-react';

interface LogoUploadProps {
  userId: string;
  currentLogoUrl: string | null;
  onLogoUpdated: (url: string | null) => void;
}

export default function LogoUpload({ userId, currentLogoUrl, onLogoUpdated }: LogoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PNG or JPG file.', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 2MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/logo.${ext}`;

      // Remove old logo if exists
      await supabase.storage.from('company-logos').remove([`${userId}/logo.png`, `${userId}/logo.jpg`, `${userId}/logo.jpeg`]);

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      // Save URL to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onLogoUpdated(publicUrl);
      toast({ title: 'Logo uploaded successfully!' });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Upload failed', description: err?.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await supabase.storage.from('company-logos').remove([`${userId}/logo.png`, `${userId}/logo.jpg`, `${userId}/logo.jpeg`]);
      await supabase.from('profiles').update({ logo_url: null }).eq('user_id', userId);
      onLogoUpdated(null);
      toast({ title: 'Logo removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {currentLogoUrl ? (
        <div className="relative group">
          <img
            src={currentLogoUrl}
            alt="Company logo"
            className="w-14 h-14 rounded-xl object-contain border bg-background p-1"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove logo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <ImagePlus className="w-5 h-5 text-muted-foreground/50" />
        </div>
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs"
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImagePlus className="w-3 h-3 mr-1" />}
          {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-0.5">PNG or JPG, max 2MB</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
