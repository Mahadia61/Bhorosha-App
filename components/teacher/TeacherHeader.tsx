import { PageHeader } from '@/components/ui/ui'

export function TeacherHeader({ title, subtitle, eyebrow, showAvatar = false }: { title: string; subtitle?: string; eyebrow?: string; showAvatar?: boolean }) {
  return <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} showAvatar={showAvatar} />
}
