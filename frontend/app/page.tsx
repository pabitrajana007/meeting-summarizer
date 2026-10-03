import { UploadDropzone } from "@/components/upload-dropzone";
import { MeetingList } from "@/components/meeting-list";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Turn meetings into minutes.</h1>
          <p className="max-w-xl text-muted">
            Drop a recording from Zoom, Meet or your phone. You&apos;ll get a transcript, a summary, decisions
            and action items with owners.
          </p>
        </div>
        <UploadDropzone />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Recent meetings</h2>
        <MeetingList />
      </section>
    </div>
  );
}
