"use client";

import React, { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';

const ChatNotificationsContext = createContext<{ count: number; setCount: Dispatch<SetStateAction<number>> } | undefined>(undefined);

export function ChatNotificationsProvider({ children, count: controlledCount, setCount: controlledSetCount }: { children: ReactNode; count?: number; setCount?: Dispatch<SetStateAction<number>> }) {
  const [localCount, setLocalCount] = useState<number>(controlledCount ?? 0);

  // Keep local in sync when controlled
  React.useEffect(() => {
    if (typeof controlledCount === 'number') setLocalCount(controlledCount);
  }, [controlledCount]);

  const value = controlledSetCount ? { count: controlledCount ?? localCount, setCount: controlledSetCount } : { count: localCount, setCount: setLocalCount };

  return (
    <ChatNotificationsContext.Provider value={value}>
      {children}
    </ChatNotificationsContext.Provider>
  );
}

export function useChatNotifications() {
  const ctx = useContext(ChatNotificationsContext);
  if (!ctx) throw new Error('useChatNotifications must be used within ChatNotificationsProvider');
  return ctx;
}

export default ChatNotificationsContext;
