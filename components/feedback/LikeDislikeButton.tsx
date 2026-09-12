import { Feather } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
export function LikeDislikeButton({ liked, count = 0, onPress }: { liked?: boolean; count?: number; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center gap-1"><Feather name={liked ? 'thumbs-up' : 'thumbs-up'} size={16} color={liked ? '#1670F8' : '#64718B'} /><Text className="text-xs text-muted">{count}</Text></Pressable> }
