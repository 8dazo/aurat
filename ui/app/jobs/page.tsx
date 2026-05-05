import { JobBrowser } from "@/components/JobBrowser"

export default function JobsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Job Browser</h1>
      <JobBrowser />
    </div>
  )
}