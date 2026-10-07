import { supabase } from './supabase'

export interface SavedChat {
  id: string
  title: string
  updated_at: string
}

export interface SavedMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
  sources: string[] | null
}

export function titleFromMessage(content: string) {
  const text = content.replace(/\s+/g, ' ').trim()
  return text.length > 60 ? `${text.slice(0, 57)}…` : text
}

export async function listChats(): Promise<SavedChat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function loadMessages(chatId: string): Promise<SavedMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources')
    .eq('chat_id', chatId)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SavedMessage[]
}

export async function createChat(title: string): Promise<string> {
  const { data, error } = await supabase
    .from('chats')
    .insert({ title })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.id
}

export async function saveMessage(
  chatId: string,
  message: { role: 'assistant' | 'user'; content: string; sources?: string[] },
) {
  const { error } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: message.role,
    content: message.content,
    sources: message.sources ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
}

export async function deleteChat(chatId: string) {
  const { error } = await supabase.from('chats').delete().eq('id', chatId)

  if (error) {
    throw new Error(error.message)
  }
}
