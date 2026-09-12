import { Redirect, Slot } from 'expo-router'
import { useApp } from '@/providers/AppProvider'
export default function ProfessorLayout() { const { ready, profile } = useApp(); if (ready && !profile) return <Redirect href="/welcome" />; return <Slot /> }
