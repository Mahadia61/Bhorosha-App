import { PageHeader } from '@/components/ui/ui'

export function TeacherHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
}
