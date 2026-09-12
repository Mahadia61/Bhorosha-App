import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Field } from '@/components/ui/ui'
import { services } from '@/lib/services/services'
import type { TeacherProfile } from '@/lib/types/types'

const designations = ['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor']

export function TeacherProfileEditor({ teacher, onClose, onSaved }: { teacher?: TeacherProfile; onClose: () => void; onSaved: (teacher: TeacherProfile) => void }) {
  const [name, setName] = useState(teacher?.name ?? '')
  const [department, setDepartment] = useState(teacher?.department ?? '')
  const [designation, setDesignation] = useState(teacher?.designation ?? 'Lecturer')
  const [email, setEmail] = useState(teacher?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true)
    setError('')
    try { onSaved(await services.saveTeacherProfile({ name, department, designation, email }, teacher?.id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save teacher profile.') }
    finally { setSaving(false) }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving) onClose() }}>
    <View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-white p-5 dark:bg-slate-900"><ScrollView keyboardShouldPersistTaps="handled">
      <View className="mb-5 flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand"><Feather name="user-plus" size={20} color="white" /></View><View><Text className="text-xl font-bold text-ink dark:text-white">{teacher ? 'Edit Teacher' : 'Add Teacher Profile'}</Text><Text className="mt-0.5 text-xs text-muted">Create and link a CUET teacher profile</Text></View></View>
      <View className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><View className="mb-3 flex-row items-center gap-2"><Feather name="user" size={17} color="#4F7EF7" /><Text className="font-semibold text-ink dark:text-white">Basic information</Text></View><Field label="Full name" value={name} onChangeText={setName} placeholder="Teacher full name" />
      <Field label="Department" value={department} onChangeText={setDepartment} placeholder="CSE" autoCapitalize="characters" />
      <Text className="mb-2 text-sm font-medium text-ink dark:text-white">Designation</Text>
      <View className="flex-row flex-wrap gap-2">{designations.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: designation === value }} onPress={() => setDesignation(value)} className={`rounded-xl border px-3 py-2 ${designation === value ? 'border-brand bg-blue-50 dark:bg-slate-700' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><Text className="text-sm text-brand">{value}</Text></Pressable>)}</View></View>
      <View className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><View className="mb-3 flex-row items-center gap-2"><Feather name="mail" size={17} color="#4F7EF7" /><Text className="font-semibold text-ink dark:text-white">Contact information</Text></View><Field label="Email (optional)" value={email} onChangeText={setEmail} editable={!teacher?.linkedUserId} keyboardType="email-address" autoCapitalize="none" placeholder="Teacher account email" /></View>
      <Text className="mb-4 text-xs leading-5 text-muted">{teacher?.linkedUserId ? 'Linked to a teacher account. The linked email is fixed.' : 'Courses can be assigned now. Add the teacher account email to link automatically after the teacher verifies that email and signs in. Names are never used to match accounts.'}</Text>
      {error ? <Text accessibilityRole="alert" className="mb-3 text-sm text-rose-600">{error}</Text> : null}
      <Button loading={saving} onPress={save}>{teacher ? 'Save teacher changes' : 'Create teacher profile'}</Button>
      <Button className="mt-3" variant="outline" disabled={saving} onPress={onClose}>Cancel</Button>
    </ScrollView></View></View>
  </Modal>
}

export function TeacherManagement({ search }: { search: string }) {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<TeacherProfile | 'new' | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setTeachers(await services.adminTeacherProfiles()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load teacher profiles.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = teachers.filter(teacher => `${teacher.name} ${teacher.department} ${teacher.email}`.toLowerCase().includes(search.toLowerCase()))
  return <View className="mt-4">
    <Button onPress={() => setEditing('new')}>Add Teacher Profile</Button>
    {loading ? <ActivityIndicator className="mt-4" color="#4F7EF7" /> : error ? <><Empty title="Teachers unavailable" body={error} /><Button variant="outline" onPress={load}>Retry</Button></> : visible.length ? visible.map(teacher => <Card key={teacher.id} className="mt-3">
      <Text className="font-semibold text-ink dark:text-white">{teacher.name}</Text>
      <Text className="mt-1 text-xs text-muted">{teacher.designation} · {teacher.department}</Text>
      <Text className="mt-1 text-xs text-muted">{teacher.email || 'Email not added'}</Text>
      <Text className={`mt-2 text-xs font-semibold ${teacher.linkedUserId ? 'text-emerald-600' : 'text-amber-600'}`}>{teacher.linkedUserId ? 'Linked' : 'Not linked'}{!teacher.linkedUserId && !teacher.email ? ' · Add an email when available' : ''}</Text>
      <Button className="mt-3" variant="outline" onPress={() => setEditing(teacher)}>Edit Teacher</Button>
    </Card>) : <Empty title="No teacher profiles found" body="Add a teacher profile before their first login, then assign courses from the course form." />}
    {editing ? <TeacherProfileEditor teacher={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={teacher => { setTeachers(current => [...current.filter(item => item.id !== teacher.id), teacher].sort((a, b) => a.name.localeCompare(b.name))); setEditing(null) }} /> : null}
  </View>
}
