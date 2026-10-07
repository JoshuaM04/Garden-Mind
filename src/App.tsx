import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { ChatExperience } from './components/ChatExperience'

function App() {
  const [chat, setChat] = useState<{ key: number; id: string | null }>({
    key: 0,
    id: null,
  })
  const openChat = (id: string | null) =>
    setChat((current) => ({ key: current.key + 1, id }))

  return (
    <AppShell onNewChat={() => openChat(null)} onOpenChat={openChat}>
      <ChatExperience initialChatId={chat.id} key={chat.key} />
    </AppShell>
  )
}

export default App
