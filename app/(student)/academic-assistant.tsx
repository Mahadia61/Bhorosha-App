import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card } from '@/components/ui/ui'
import { askAcademicAssistant } from '@/lib/services/ai'
import { Screen } from '@/components/ui/ui'

type Message = { role: 'student' | 'assistant'; text: string }

export default function AcademicAssistant() {
  const [question, setQuestion] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)

  const ask = async () => {
    const text = question.trim()
    if (!text || sending) return
    setSending(true)
    setQuestion('')
    setMessages(current => [...current, { role: 'student', text }])
    try {
      const response = await askAcademicAssistant(text, conversationId)
      setConversationId(response.conversationId)
      setMessages(current => [...current, { role: 'assistant', text: response.answer }])
    } catch (reason) {
      Alert.alert('Could not answer question', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between px-5 pt-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center"><Feather name="arrow-left" size={21} color="#172038" /></Pressable>
          <Text className="text-lg font-extrabold text-[#172038] dark:text-white">Academic Assistant</Text>
          <View className="w-10" />
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Card className="mt-5 bg-blue-50 p-4 dark:bg-slate-900">
            <Text className="text-sm font-bold text-brand">Bhorosha Academic Help</Text>
            <Text className="mt-1 text-xs leading-5 text-[#52627A] dark:text-slate-300">Ask about courses, prerequisites, departments, or academic planning. This assistant does not answer general chat questions.</Text>
          </Card>
          {!messages.length ? <Text className="mt-8 text-center text-sm text-muted">Try: “What should I take before Database Systems?”</Text> : messages.map((message, index) => <View key={`${message.role}-${index}`} className={`mt-4 rounded-2xl p-3 ${message.role === 'student' ? 'self-end bg-brand' : 'self-start bg-white dark:bg-slate-900'}`}><Text className={`max-w-[300px] text-sm leading-5 ${message.role === 'student' ? 'text-white' : 'text-[#52627A] dark:text-slate-300'}`}>{message.text}</Text></View>)}
        </ScrollView>
        <View className="border-t border-[#E7EAF0] px-5 pb-3 pt-3 dark:border-slate-800">
          <View className="flex-row items-end gap-2">
            <TextInput value={question} onChangeText={setQuestion} placeholder="Ask an academic question..." placeholderTextColor="#94A3B8" multiline className="max-h-28 flex-1 rounded-2xl bg-white px-4 py-3 text-sm text-[#172038] dark:bg-slate-900 dark:text-white" />
            <Button onPress={() => { void ask() }} disabled={sending || !question.trim()}>{sending ? '...' : 'Ask'}</Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}
