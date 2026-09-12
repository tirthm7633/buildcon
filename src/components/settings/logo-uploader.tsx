"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { updateCompanyLogo } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startTransition] = useTransition();

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const supabase = createClient();
      const path = `logo-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const result = await updateCompanyLogo(data.publicUrl);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Logo updated");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Logo logoUrl={logoUrl} showWordmark={false} className="rounded-lg border border-border p-2" />
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload logo
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
        <p className="mt-1.5 text-xs text-muted-foreground">PNG or SVG, square works best.</p>
      </div>
    </div>
  );
}
