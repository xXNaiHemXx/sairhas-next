'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChatMessages, sendChatMessage, getMyPair } from '@/lib/gasClient';
import { getSession, Session } from '@/lib/session';
import { useToast, ToastContainer } from '@/hooks/useToast';

interface Message {
  id: string;
  from_id: string;
  content: string;
  sent_at: string;
  optimistic?: boolean;
}

interface Partner {
  id: string;
  nickname: string;  // ✅ เปลี่ยนเป็น nickname
  faculty: string;
  imageUrl?: string;
  pairKey: string;
  role: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { addToast, removeToast, toasts } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sessionData = getSession();
    console.log('🔍 [Chat] Session:', sessionData);
    
    if (!sessionData) {
      router.push('/login');
      return;
    }
    
    setSession(sessionData);
    loadPartner(sessionData);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ โหลดคู่รหัสของตัวเอง
  const loadPartner = async (session: Session) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyPair(session.studentId);
      console.log('🔍 [Chat] getMyPair result:', result);
      
      if (result.ok && result.partner) {
        setPartner(result.partner);
      } else {
        setError(result.error || 'ไม่พบคู่รหัสของคุณ');
      }
    } catch (error) {
      console.error('❌ Error loading partner:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ โหลดข้อความ
  const loadMessages = async () => {
    if (!session || !partner) return;
    
    try {
      const pairKey = session.pairKey || partner.pairKey || '';
      const result = await getChatMessages(session.studentId, pairKey);
      
      if (result.ok && result.messages) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // โหลดข้อความเมื่อมี partner
  useEffect(() => {
    if (partner && session) {
      loadMessages();
      
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(loadMessages, 5000);
    }
    
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [partner, session]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || !partner || isSending) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const optimisticMessage: Message = {
      id: tempId,
      from_id: session.studentId,
      content: newMessage.trim(),
      sent_at: new Date().toISOString(),
      optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const pairKey = session.pairKey || partner.pairKey || '';
      const result = await sendChatMessage(session.studentId, pairKey, messageToSend);
      
      if (result.ok && result.message) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...result.message, optimistic: false } : msg
          )
        );
        addToast('ส่งข้อความสำเร็จ', 'success');
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        addToast(result.error || 'ส่งข้อความไม่สำเร็จ', 'error');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      addToast('เกิดข้อผิดพลาดในการส่งข้อความ', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (!session) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px', background: 'var(--error)', borderColor: 'var(--error)' }}>
          <p className="body-sm" style={{ color: 'var(--fg)' }}>❌ {error || 'ไม่พบคู่รหัส'}</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '12px' }}>
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // ===== หน้าแชท =====
  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      <header className="chat-header">
        <div className="chat-header-left">
          <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="h2" style={{ fontSize: '1.2rem' }}>
            💬 {partner.nickname || partner.id}
          </span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">
            {session.role === 'Y2' ? 'พี่รหัส' : 'น้องรหัส'}
          </span>
          <span className="badge badge-matched" style={{ backgroundColor: '#e3e7f8', color: '#6575ac' }}>
            🔑 {partner.pairKey}
          </span>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p className="body-sm">เริ่มพูดคุยกับ {partner.nickname || partner.id} กันเลย! 💬</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.from_id === session.studentId;
              return (
                <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'}`}>
                  <div className="message-bubble">
                    <span>{msg.content}</span>
                  </div>
                  <div className="message-meta">
                    <span>{new Date(msg.sent_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="composer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <div className="composer-input-group">
            <input
              type="text"
              className="input-field"
              placeholder={`พิมพ์ข้อความถึง ${partner.nickname || partner.id}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              maxLength={500}
              disabled={isSending}
            />
            <button
              className="btn btn-primary"
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 180px);
          min-height: 400px;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
        }

        .message {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 85%;
          animation: fadeIn .18s ease;
        }

        .message.own {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message.other {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: white;
        }

        .message.own .message-bubble {
          background: var(--primary);
          color: white;
          border-color: var(--primary-strong);
          border-bottom-right-radius: 4px;
        }

        .message.other .message-bubble {
          background: white;
          border-bottom-left-radius: 4px;
        }

        .message-meta {
          font-size: 0.65rem;
          color: var(--fg-muted);
        }

        .message.own .message-meta {
          text-align: right;
        }

        .composer-input-group {
          display: flex;
          gap: 8px;
        }

        .composer-input-group .input-field {
          flex: 1;
          min-width: 0;
        }

        .composer-input-group .btn {
          flex-shrink: 0;
        }

        .empty-state {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          color: var(--fg-muted);
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .chat-container {
            height: calc(100vh - 160px);
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}