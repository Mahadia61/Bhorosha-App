import { Redirect, Slot } from 'expo-router'
import { useApp } from '@/providers/AppProvider'
export default function CourseLayout() { const { ready, profile } = useApp(); if (ready && !profile) return <Redirect href="/welcome" />; return <Slot /> }
