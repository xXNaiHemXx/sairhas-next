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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // ✅ ใช้ API Route แทน PB โดยตรง
  const loadPartner = async (session: Session) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      console.log('🔍 [Chat] Loading partner for pairKey:', session.pairKey);

      // ✅ เรียก API Route ของเราแทน
      const response = await fetch(`/api/pairs?pairKey=${session.pairKey}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 [Chat] Pair result:', result);

      if (result.ok && result.pair) {
        const pair = result.pair;
        const partnerId = session.role === 'Y2' ? pair.y1Id : pair.y2Id;
        
        setPartner({
          id: partnerId,
          nickname: partnerId, // ใช้รหัสก่อน
          pairKey: session.pairKey,
        });

        // ✅ ลองโหลดชื่อเล่นจาก API
        try {
          const userRes = await fetch(`/api/users/${partnerId}`, {
            signal: abortControllerRef.current.signal,
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.ok && userData.user) {
              setPartner(prev => ({
                ...prev,
                nickname: userData.user.nickname || userData.user.username || partnerId,
              }));
            }
          }
        } catch (userError) {
          console.warn('⚠️ [Chat] Could not load user details:', userError);
        }
      } else {
        console.warn('⚠️ [Chat] No pair found for:', session.pairKey);
        setPartner({
          id: session.role === 'Y2' ? 'Y1' : 'Y2',
          nickname: 'ยังไม่มีคู่รหัส',
          pairKey: session.pairKey,
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ [Chat] Load partner error:', error);
      }
    }
  };

  const loadMessages = async (session: Session) => {
    try {
      const result = await getChatMessages(session.pairKey);
      if (result.ok && result.messages) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('❌ [Chat] Load messages error:', error);
    }
    setIsLoading(false);
  };

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
      console.error('❌ [Chat] Send error:', error);
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

  if (!partner) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px', background: 'var(--error)', borderColor: 'var(--error)' }}>
          <p className="body-sm" style={{ color: 'var(--fg)' }}>❌ ไม่พบคู่รหัส</p>
          <button 
            className="btn btn-primary" 
            onClick={() => session && loadPartner(session)}
            style={{ marginTop: '12px' }}
          >
            🔄 ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      <header className="chat-header">
        <div className="chat-header-left">
          <button 
            className="btn btn-ghost" 
            onClick={() => router.push('/')}
            style={{ padding: '4px 8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
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
              <p className="body-sm">เริ่มพูดคุยกันเลย! 💬</p>
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