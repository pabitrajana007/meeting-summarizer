"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export function useUpload() {
  const [progress, setProgress] = useState(0);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return api.uploadMeeting(file, setProgress);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  return { ...mutation, progress };
}
