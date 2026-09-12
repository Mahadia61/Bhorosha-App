import { Text } from 'react-native'
import { Card } from '@/components/ui/ui'
export function AdviceCard({ title, text }: { title: string; text: string }) { return <Card><Text className="font-bold text-ink dark:text-white">{title}</Text><Text className="mt-2 text-sm leading-5 text-muted">{text}</Text></Card> }
