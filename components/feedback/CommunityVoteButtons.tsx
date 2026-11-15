import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { services } from '@/lib/services/services'
import type { CommunityVoteState, CommunityVoteTarget, CommunityVoteValue } from '@/lib/types/types'
import { useApp } from '@/providers/AppProvider'

const initialState: CommunityVoteState = { likes: 0, dislikes: 0, currentVote: null }

export function CommunityVoteButtons({
  contentType,
  contentId,
  questionId,
}: {
  contentType: CommunityVoteTarget
  contentId: string
  questionId?: string
}) {
  const { profile } = useApp()
  const [state, setState] = useState(initialState)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setState(initialState)
    setLoaded(false)
    if (!profile) return
    return services.subscribeCommunityVotes(
      contentType,
      contentId,
      next => {
        setState(next)
        setLoaded(true)
      },
      reason => {
        setLoaded(true)
        Alert.alert('Votes unavailable', reason.message)
      },
      questionId,
    )
  }, [contentId, contentType, profile?.id, questionId])

  const vote = async (value: CommunityVoteValue) => {
    if (!profile || saving || !loaded) return
    setSaving(true)
    try {
      await services.toggleCommunityVote(contentType, contentId, value, questionId)
    } catch (reason) {
      Alert.alert('Could not save vote', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Like, ${state.likes}`}
        accessibilityState={{ selected: state.currentVote === 'like', disabled: !loaded || saving }}
        disabled={!loaded || saving}
        onPress={() => { void vote('like') }}
        className="flex-row items-center gap-1"
      >
        <Feather name="thumbs-up" size={15} color={state.currentVote === 'like' ? '#1670F8' : '#64718B'} />
        <Text className={`text-xs ${state.currentVote === 'like' ? 'font-bold text-brand' : 'text-muted'}`}>
          {state.likes}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dislike, ${state.dislikes}`}
        accessibilityState={{ selected: state.currentVote === 'dislike', disabled: !loaded || saving }}
        disabled={!loaded || saving}
        onPress={() => { void vote('dislike') }}
        className="flex-row items-center gap-1"
      >
        <Feather name="thumbs-down" size={15} color={state.currentVote === 'dislike' ? '#E11D48' : '#64718B'} />
        <Text className={`text-xs ${state.currentVote === 'dislike' ? 'font-bold text-rose-600' : 'text-muted'}`}>
          {state.dislikes}
        </Text>
      </Pressable>
    </View>
  )
}
