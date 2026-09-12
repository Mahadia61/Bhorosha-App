export function backendUrl(): string {
  return process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''
}
