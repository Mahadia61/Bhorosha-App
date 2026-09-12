import { Text } from 'react-native'
import type { Report } from '@/lib/types/types'
import { Card } from '@/components/ui/ui'

export function ReportDetail({ report }: { report: Report }) {
  return <Card><Text className="text-xs font-bold text-brand">{report.contentType}</Text><Text className="mt-2 text-base font-bold text-ink dark:text-white">{report.reason}</Text><Text className="mt-2 text-sm leading-5 text-muted">{report.description || 'No description provided.'}</Text></Card>
}
