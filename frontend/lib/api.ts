import axios from "axios";
import type { MeetingCreated, MeetingDetail, MeetingListItem } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const http = axios.create({ baseURL: API_URL });

/** Turns FastAPI's {"detail": "..."} errors into readable messages. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (!err.response) return `Can't reach the API at ${API_URL}. Is the backend running?`;
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export const api = {
  listMeetings: async () => (await http.get<MeetingListItem[]>("/meetings")).data,

  getMeeting: async (id: string) => (await http.get<MeetingDetail>(`/meetings/${id}`)).data,

  uploadMeeting: async (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    // axios (unlike fetch) reports upload progress
    const res = await http.post<MeetingCreated>("/meetings", form, {
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
    return res.data;
  },

  deleteMeeting: async (id: string) => {
    await http.delete(`/meetings/${id}`);
  },

  retryMeeting: async (id: string) => (await http.post<MeetingCreated>(`/meetings/${id}/retry`)).data,

  audioUrl: (id: string) => `${API_URL}/meetings/${id}/audio`,
  exportUrl: (id: string) => `${API_URL}/meetings/${id}/export`,
};
