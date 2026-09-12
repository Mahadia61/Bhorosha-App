import { Text, View } from 'react-native'
import type { Professor } from '@/lib/types/types'
import { Card } from '@/components/ui/ui'

export function TeacherProfile({ teacher }: { teacher: Professor }) {
  return <Card><View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-full bg-brandSoft"><Text className="text-lg font-bold text-brand">{teacher.name.charAt(0).toUpperCase()}</Text></View><View className="flex-1"><Text className="font-bold text-ink dark:text-white">{teacher.name}</Text><Text className="mt-1 text-sm text-muted">{teacher.designation ?? teacher.department}</Text></View></View>{teacher.bio ? <Text className="mt-4 text-sm leading-5 text-muted">{teacher.bio}</Text> : null}</Card>
}
