import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  uploadAvatar: (image: Blob) => Promise<string | null>
  removeAvatar: () => Promise<string | null>
}

const AVATAR_BUCKET = 'avatars'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return error?.message ?? null
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
          return error.message
        }
        return data.session
          ? null
          : 'Check your email to confirm your account, then sign in.'
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
      uploadAvatar: async (image) => {
        const userId = session?.user.id
        if (!userId) {
          return 'Sign in to upload a profile picture.'
        }
        const path = `${userId}/avatar.jpg`
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, image, { contentType: 'image/jpeg', upsert: true })
        if (uploadError) {
          return uploadError.message
        }
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
        // The version query busts the cache since the path never changes.
        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: `${data.publicUrl}?v=${Date.now()}` },
        })
        return error?.message ?? null
      },
      removeAvatar: async () => {
        const userId = session?.user.id
        if (!userId) {
          return null
        }
        await supabase.storage.from(AVATAR_BUCKET).remove([`${userId}/avatar.jpg`])
        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: null },
        })
        return error?.message ?? null
      },
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
