import { Text, View } from 'react-native'
import type { Report } from '@/lib/types/types'
import { Card, Empty } from '@/components/ui/ui'

export function ReportList({ reports, onSelect }: { reports: Report[]; onSelect?: (report: Report) => void }) {
  if (reports.length === 0) return <Empty title="No reports" body="There are no reports to review." />
  return <View className="gap-3">{reports.map(report => <Card key={report.id}><Text onPress={() => onSelect?.(report)} className="font-semibold text-ink dark:text-white">{report.reason}</Text><Text className="mt-1 text-sm text-muted">{report.description || 'No description provided.'}</Text></Card>)}</View>
}
