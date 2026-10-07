import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { ChatExperience } from './components/ChatExperience'

function App() {
  const [chat, setChat] = useState<{ key: number; id: string | null }>({
    key: 0,
    id: null,
  })
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const openChat = (id: string | null) => {
    setActiveChatId(id)
    setChat((current) => ({ key: current.key + 1, id }))
  }

  return (
    <AppShell
      onChatDeleted={(id) => {
        if (id === activeChatId) {
          openChat(null)
        }
      }}
      onNewChat={() => openChat(null)}
      onOpenChat={openChat}
    >
      <ChatExperience
        initialChatId={chat.id}
        key={chat.key}
        onChatCreated={setActiveChatId}
      />
    </AppShell>
  )
}

export default App
