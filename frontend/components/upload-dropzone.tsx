"use client";

import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { errorMessage } from "@/lib/api";

const ACCEPT = {
  "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"],
  "video/*": [".mp4", ".mov", ".mkv", ".webm"],
};

export function UploadDropzone() {
  const router = useRouter();
  const upload = useUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    disabled: upload.isPending,
    onDropRejected: () => toast.error("Please drop a single audio or video file."),
    onDropAccepted: ([file]) =>
      upload.mutate(file, {
        onSuccess: ({ id }) => {
          toast.success("Uploaded. Processing has started.");
          router.push(`/meetings/${id}`);
        },
        onError: (err) => toast.error(errorMessage(err)),
      }),
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors
        ${isDragActive ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-accent/60"}
        ${upload.isPending ? "cursor-wait" : ""}`}
    >
      <input {...getInputProps()} />

      {upload.isPending ? (
        <div className="mx-auto max-w-xs space-y-3">
          <Loader2 className="mx-auto size-8 animate-spin text-accent" />
          <p className="font-medium">Uploading… {upload.progress}%</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-accent transition-all" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:scale-105">
            <Upload className="size-5" />
          </div>
          <p className="font-medium">{isDragActive ? "Drop it here" : "Drag a recording here, or click to choose"}</p>
          <p className="text-sm text-muted">MP3, WAV, M4A, MP4, WEBM and more · up to 500 MB</p>
        </div>
      )}
    </div>
  );
}
