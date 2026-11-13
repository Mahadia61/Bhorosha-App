import { Image, Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Card } from '@/components/ui/ui'

export function ProfileIdentityCard({
  name,
  email,
  role,
  detail,
  photoUrl,
}: {
  name: string
  email: string
  role: string
  detail?: string
  photoUrl?: string
}) {
  return (
    <Card className="mt-5">
      <View className="flex-row items-center gap-4">
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            className="h-16 w-16 rounded-full bg-slate-200"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand">
            <Text className="text-2xl font-bold text-white">
              {name.trim().charAt(0).toUpperCase() || role.charAt(0)}
            </Text>
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-semibold text-ink dark:text-white">
            {name}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">{email}</Text>
          <Text className="mt-1 text-xs font-semibold uppercase text-brand">
            {role}{detail ? ` · ${detail}` : ''}
          </Text>
        </View>
      </View>
    </Card>
  )
}

export function ProfileActionRow({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap
  title: string
  subtitle?: string
  danger?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center border-b border-line px-4 py-4 last:border-b-0 dark:border-slate-800"
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${danger ? 'bg-rose-100 dark:bg-rose-950' : 'bg-blue-100 dark:bg-slate-800'}`}
      >
        <Feather
          name={icon}
          size={19}
          color={danger ? '#EF4444' : '#1670F8'}
        />
      </View>
      <View className="ml-4 min-w-0 flex-1">
        <Text
          className={`text-sm font-semibold ${danger ? 'text-rose-500' : 'text-ink dark:text-white'}`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-xs text-muted">{subtitle}</Text>
        ) : null}
      </View>
      <Feather
        name="chevron-right"
        size={20}
        color={danger ? '#EF4444' : '#64748B'}
      />
    </Pressable>
  )
}
