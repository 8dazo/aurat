export async function generateStaticParams() {
  return [{ id: "__placeholder__" }]
}

import HistoryDetailClient from "./history-detail-client"

export default function HistoryDetailPage() {
  return <HistoryDetailClient />
}