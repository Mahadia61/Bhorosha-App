import { Feather } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import { Button } from '@/components/ui/ui'

export function ErrorState({ title = 'Something went wrong', message, onRetry }: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return <View className="items-center px-6 py-14">
    <Feather name="alert-circle" size={30} color="#F04455" />
    <Text className="mt-3 text-center font-semibold text-ink dark:text-white">{title}</Text>
    <Text className="mt-1 text-center text-sm text-muted">{message}</Text>
    {onRetry ? <Button className="mt-5" onPress={onRetry}>Try again</Button> : null}
  </View>
}
