"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const POLL_MS = 3000;

/** Polls a meeting every 3s until it is done or failed, then stops. */
export function useMeeting(id: string) {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: () => api.getMeeting(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : POLL_MS;
    },
  });
}

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: api.listMeetings,
    // keep the list fresh while anything is still processing
    refetchInterval: (query) =>
      query.state.data?.some((m) => m.status !== "done" && m.status !== "failed") ? POLL_MS : false,
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useRetryMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.retryMeeting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });
}
