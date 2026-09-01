import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'
const icons: Record<string, keyof typeof Feather.glyphMap> = { home: 'home', courses: 'book-open', professors: 'users', profile: 'user' }
export default function TabsLayout() { const { profile,ready }=useApp(); if(ready&&!profile) return <Redirect href="/welcome"/>; return <Tabs screenOptions={({route})=>({headerShown:false,tabBarActiveTintColor:'#4F7EF7',tabBarIcon:({color,size})=><Feather name={icons[route.name] ?? 'circle'} size={size} color={color}/>})}><Tabs.Screen name="home" options={{title:'Home'}}/><Tabs.Screen name="courses" options={{title:'Courses'}}/><Tabs.Screen name="professors" options={{title:'Teachers'}}/><Tabs.Screen name="profile" options={{title:'Profile'}}/></Tabs> }
