'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/session';
import { getChatMessages, sendChatMessage } from '@/lib/apiClient';
import { pb } from '@/lib/pocketbase';

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = getSession();
    if (!sessionData) {
      router.push('/login');
      return;
    }
    setSession(sessionData);
    loadPartner(sessionData);
    loadMessages(sessionData);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPartner = async (session: Session) => {
    try {
      // ✅ หาคู่รหัสจาก PocketBase
      const result = await pb.collection('pairs').getList(1, 1, {
        filter: `pairKey = "${session.pairKey}"`,
      });
      
      const pair = result.items[0];
      if (pair) {
        const partnerId = session.role === 'Y2' ? pair.y1Id : pair.y2Id;
        const user = await pb.collection('users').getOne(partnerId);
        setPartner({
          id: user.id,
          nickname: user.nickname || user.studentId,
          pairKey: session.pairKey,
        });
      }
    } catch (error) {
      console.error('Load partner error:', error);
    }
  };

  const loadMessages = async (session: Session) => {
    const result = await getChatMessages(session.pairKey);
    if (result.ok && result.messages) {
      setMessages(result.messages);
    }
    setIsLoading(false);
  };

  // ✅ Realtime Subscription
  useEffect(() => {
    if (!session) return;

    const pairKey = session.pairKey;

    // Subscribe ฟังข้อความใหม่แบบ Realtime!
    pb.collection('messages').subscribe('*', (e: any) => {
      if (e.record.pairKey === pairKey) {
        setMessages(prev => [...prev, {
          id: e.record.id,
          from_id: e.record.fromId,
          content: e.record.content,
          sent_at: e.record.sentAt,
        }]);
      }
    });

    return () => {
      pb.collection('messages').unsubscribe('*');
    };
  }, [session]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || !partner) return;

    try {
      const result = await sendChatMessage(
        session.studentId,
        session.pairKey,
        newMessage.trim()
      );
      
      if (result.ok && result.message) {
        setMessages(prev => [...prev, result.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  // ... UI (เหมือนเดิม)
}