'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChatMessages, sendChatMessage, getMentors } from '@/lib/gasClient';
import { getSession, Session } from '@/lib/session';
import { useToast, ToastContainer } from '@/hooks/useToast';

interface Message {
  id: string;
  from_id: string;
  content: string;
  sent_at: string;
  optimistic?: boolean; // Track if message is optimistic
}

interface Mentor {
  id: string;
  name: string;
  ig: string;
  line: string;
  faculty: string;
  year: string;
  imageUrl?: string;
  pairKey?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { toast, ToastContainer } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sessionData = getSession();
    if (!sessionData) {
      router.push('/login');
      return;
    }
    try {
      setSession(sessionData);
      loadMentors(sessionData);
    } catch (e) {
      console.error('❌ Failed to parse session:', e);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMentors = async (session: Session) => {
    setIsLoading(true);
    try {
          const result = await getMentors();
          if (result.ok && result.mentors) {
            setMentors(result.mentors);
        
            // ถ้าเป็น Y1 ให้เลือกพี่รหัสของตัวเองอัตโนมัติ
            if (session.role === 'Y1') {
              const myPairKey = session.pairKey || '';
              const myMentor = result.mentors.find((m: Mentor) => m.pairKey === myPairKey);
              if (myMentor) {
                setSelectedMentor(myMentor);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error loading mentors:', error);
          toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
          setIsLoading(false);
        }
  };

  const loadMessages = async () => {
    if (!session || !selectedMentor) return;
    
    try {
      const pairKey = session.pairKey || selectedMentor.pairKey || '';
      const result = await getChatMessages(session.studentId, pairKey);
      
      if (result.ok && result.messages) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // โหลดข้อความเมื่อเลือก mentor
  useEffect(() => {
    if (selectedMentor && session) {
      loadMessages();
      
      // Polling ทุก 5 วินาที
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(loadMessages, 5000);
    }
    
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [selectedMentor, session]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || !selectedMentor || isSending) return;

    // Optimistic UI: สร้างข้อความชั่วคราวและเพิ่มทันที
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      id: tempId,
      from_id: session.studentId,
      content: newMessage.trim(),
      sent_at: new Date().toISOString(),
      optimistic: true,
    };

    // เพิ่มข้อความทันที (optimistic)
    setMessages(prev => [...prev, optimisticMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    setIsSending(true);
    try {
      const pairKey = session.pairKey || selectedMentor.pairKey || '';
      const result = await sendChatMessage(session.studentId, pairKey, messageToSend);
      
      if (result.ok && result.message) {
              // แทนที่ optimistic message ด้วยข้อมูลจริง
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === tempId ? { ...result.message, optimistic: false } : msg
                )
              );
              toast.success('ส่งข้อความสำเร็จ');
            } else {
              // Rollback ถ้าเกิด error
              setMessages(prev => prev.filter(msg => msg.id !== tempId));
              toast.error(result.error || 'ส่งข้อความไม่สำเร็จ');
            }
          } catch (error) {
            console.error('❌ Error sending message:', error);
            // Rollback
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            toast.error('เกิดข้อผิดพลาดในการส่งข้อความ');
          } finally {
            setIsSending(false);
          }
  };

  // ฟังก์ชันเลือก mentor (สำหรับ Y2)
  const handleSelectMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setMessages([]);
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

  // ถ้าเป็น Y1 และยังไม่มี selectedMentor
  if (session.role === 'Y1' && !selectedMentor && !isLoading) {
    return (
      <div className="app">
        <header className="chat-header">
          <div className="chat-header-left">
            <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
            <span className="h2" style={{ fontSize: '1.2rem' }}>💬 แชท</span>
          </div>
          <div className="chat-header-right">
            <span className="badge badge-matched">น้อง (Y1)</span>
          </div>
        </header>
        <div className="card text-center">
          <p className="body-sm">ไม่พบพี่รหัสของคุณ</p>
          <p className="body-sm" style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
            กรุณาติดต่อแอดมินเพื่อจับคู่
          </p>
        </div>
      </div>
    );
  }

  // ถ้าเป็น Y2 ให้เลือกว่าแชทกับน้องคนไหน
  if (session.role === 'Y2' && !selectedMentor && !isLoading) {
    return (
      <div className="app">
        <header className="chat-header">
          <div className="chat-header-left">
            <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
            <span className="h2" style={{ fontSize: '1.2rem' }}>💬 เลือกแชท</span>
          </div>
          <div className="chat-header-right">
            <span className="badge badge-matched">พี่ (Y2)</span>
          </div>
        </header>

        {mentors.filter(m => m.id !== session.studentId).length === 0 ? (
          <div className="card text-center">
            <p className="body-sm">ยังไม่มีน้องรหัสให้แชท</p>
          </div>
        ) : (
          mentors
            .filter(m => m.id !== session.studentId)
            .map((mentor) => (
              <div key={mentor.id} className="mentor-card" onClick={() => handleSelectMentor(mentor)}>
                <div className="mentor-avatar">
                  {mentor.imageUrl ? (
                    <img src={mentor.imageUrl} alt={mentor.name} />
                  ) : (
                    <span className="avatar-placeholder">👤</span>
                  )}
                </div>
                <div className="mentor-info">
                  <h3 className="mentor-name">{mentor.name || 'ไม่ระบุชื่อ'}</h3>
                  <p className="mentor-details">{mentor.faculty || 'APE/TME'}</p>
                </div>
                <div className="mentor-action">
                  <span className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                    💬 แชท
                  </span>
                </div>
              </div>
            ))
        )}

        <style>{`
          .mentor-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 16px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            margin-bottom: 10px;
            transition: all var(--transition);
            cursor: pointer;
          }

          .mentor-card:hover {
            border-color: var(--primary-strong);
            box-shadow: var(--shadow);
            transform: translateX(4px);
          }

          .mentor-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
          }

          .mentor-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-placeholder {
            font-size: 1.8rem;
            color: var(--fg-muted);
          }

          .mentor-info {
            flex: 1;
            min-width: 0;
          }

          .mentor-name {
            font-size: 1rem;
            font-weight: 600;
            margin: 0;
          }

          .mentor-details {
            font-size: 0.8rem;
            color: var(--fg-muted);
            margin: 2px 0;
          }

          .mentor-action {
            flex-shrink: 0;
          }
        `}</style>
      </div>
    );
  }

  if (!selectedMentor) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // ===== หน้าแชท =====
  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      <header className="chat-header">
        <div className="chat-header-left">
          <button 
            className="btn btn-ghost" 
            onClick={() => {
              setSelectedMentor(null);
              setMessages([]);
            }}
            style={{ padding: '4px 8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="h2" style={{ fontSize: '1.2rem' }}>
            💬 {selectedMentor.name || 'ไม่ระบุชื่อ'}
          </span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">
            {session.role === 'Y2' ? 'พี่รหัส' : 'น้องรหัส'}
          </span>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages-area">
          {isLoading ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p className="body-sm">กำลังโหลดข้อความ...</p>
            </div>
          ) : messages.length === 0 ? (
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
              placeholder={`พิมพ์ข้อความถึง ${selectedMentor.name}...`}
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
              <ToastContainer toasts={toasts} onRemove={removeToast} />
            </div>
          );
        }