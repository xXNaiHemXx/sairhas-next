'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getPairByKey, getThread, sendMessage, 
  pickJunior, getAvailableJuniors, getCountdown 
} from '@/lib/gasClient';

interface PairDashboardProps {
  pairKey: string;
  role: 'Y1' | 'Y2';
  studentId: string;
}

export default function PairDashboard({ pairKey, role, studentId }: PairDashboardProps) {
  const [pair, setPair] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('advice');
  const [availableJuniors, setAvailableJuniors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  const messageTypes = ['advice', 'encourage', 'secret', 'custom'];
  const typeLabels: Record<string, string> = {
    advice: 'คำแนะนำ',
    encourage: 'ให้กำลังใจ',
    secret: 'เคล็ดลับ',
    custom: 'กำหนดเอง'
  };

  // ===== Effects =====
  useEffect(() => {
    isMounted.current = true;
    
    if (pairKey) {
      loadPairData();
      loadCountdown();
      
      // ตั้งค่า Polling ทุก 10 วินาที
      pollingInterval.current = setInterval(() => {
        if (!isSending && isMounted.current) {
          loadMessages();
        }
      }, 10000);
      
      return () => {
        isMounted.current = false;
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
      };
    } else if (role === 'Y2') {
      loadAvailableJuniors();
    }
  }, [pairKey]); // ✅ ใช้ pairKey เท่านั้น

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== Data Loading =====
  const loadPairData = async () => {
    if (!pairKey || !isMounted.current) return;
    const result = await getPairByKey(pairKey);
    if (result.ok && result.pair && isMounted.current) {
      setPair(result.pair);
      await loadMessages();
    }
  };

  // ✅ แก้ไข: ไม่ต้องมี messages ใน dependency
  const loadMessages = useCallback(async () => {
    if (!pairKey || !isMounted.current) return;
    
    try {
      const result = await getThread(pairKey);
      if (result.ok && result.messages && isMounted.current) {
        // ✅ ป้องกันการตั้งค่า messages ซ้ำด้วยการตรวจสอบ id
        setMessages(prev => {
          const currentIds = new Set(prev.map(m => m.id));
          const newMessages = result.messages.filter((m: any) => !currentIds.has(m.id));
          
          if (newMessages.length === 0) {
            // ถ้าไม่มีข้อความใหม่ และยังไม่มีข้อความเลย ให้ใช้ของเดิม
            if (prev.length === 0 && result.messages.length > 0) {
              return result.messages;
            }
            return prev;
          }
          
          const combined = [...prev, ...newMessages];
          return combined.sort((a, b) => 
            new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
          );
        });
        setIsLoadingMessages(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoadingMessages(false);
    }
  }, [pairKey]); // ✅ ใช้ pairKey เท่านั้น

  const loadAvailableJuniors = async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    const result = await getAvailableJuniors();
    if (result.ok && result.juniors && isMounted.current) {
      setAvailableJuniors(result.juniors);
    }
    setIsLoading(false);
  };

  const loadCountdown = async () => {
    if (!pairKey || !isMounted.current) return;
    const result = await getCountdown(pairKey);
    if (result.ok && result.reveal_at && isMounted.current) {
      startCountdown(result.reveal_at);
    }
  };

  const startCountdown = (revealAt: string) => {
    const target = new Date(revealAt).getTime();
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(countdownInterval.current!);
        setIsRevealed(true);
        setCountdown({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0')
      });
    };
    tick();
    countdownInterval.current = setInterval(tick, 1000);
  };

  // ===== Actions =====
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !pairKey || isSending) return;
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tempMessage = {
      id: tempId,
      pair_key: pairKey,
      from_id: studentId,
      content: trimmedMessage,
      type: messageType,
      sent_at: new Date().toISOString(),
      read_at: null,
      isTemp: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setIsSending(true);

    try {
      const result = await sendMessage(pairKey, studentId, trimmedMessage, messageType);
      if (result.ok && result.message && isMounted.current) {
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...result.message, isTemp: false } : msg));
      } else if (isMounted.current) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        alert(result?.error || 'ส่งข้อความไม่สำเร็จ');
      }
    } catch (error) {
      if (isMounted.current) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        alert('เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    } finally {
      if (isMounted.current) setIsSending(false);
    }
  };

  const handlePickJunior = async (y1Id: string) => {
    if (!confirm('ยืนยันการรับน้องคนนี้?')) return;
    setIsLoading(true);
    const result = await pickJunior(studentId, y1Id);
    if (result.ok) {
      alert('รับน้องสำเร็จ! 🎉');
      window.location.reload();
    } else {
      alert(result.error || 'เกิดข้อผิดพลาด');
    }
    setIsLoading(false);
  };

  // ===== Render: Senior Pick Screen =====
  if (!pairKey && role === 'Y2') {
    return (
      <div className="app">
        <div className="card">
          <h2 className="h2" style={{ marginBottom: '4px' }}>👋 สวัสดีพี่รหัส</h2>
          <p className="body-sm">รหัส: <span className="mono">{studentId}</span></p>
        </div>
        
        <h3 className="h3" style={{ marginBottom: '4px' }}>📋 รายชื่อน้องที่รอจับคู่</h3>
        <div className="card flex-1 flex-col" style={{ minHeight: '0' }}>
          <div className="messages-area" style={{ maxHeight: 'none' }}>
            {availableJuniors.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p className="body-sm">ไม่มีน้องที่รอคอย · รอการเพิ่มข้อมูลจากแอดมิน</p>
              </div>
            ) : (
              availableJuniors.map((junior) => (
                <div key={junior.y1_id} className="junior-card">
                  <div className="junior-info">
                    <span className="junior-id mono">{junior.y1_id}</span>
                    <span className="junior-meta">คณะ/สาขา: {junior.core || '—'} · รหัสคู่: {junior.pair_key}</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePickJunior(junior.y1_id)}
                    disabled={isLoading}
                  >
                    เลือก
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="card">
          <button className="btn btn-secondary btn-block" onClick={() => window.location.reload()}>
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // ===== Render: Loading =====
  if (!pair) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '320px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // ===== Render: Wait Screen (Junior) =====
  if (!pair.y1_id && role === 'Y1') {
    return (
      <div className="app">
        <div className="wait-content flex-1 flex-col" style={{ display: 'flex' }}>
          <svg className="wait-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <h3 className="wait-title">รอพี่มาคว้า</h3>
          <p className="wait-desc">ระบบกำลังค้นหาพี่รุ่นที่เข้ากับคุณ<br />คุณจะได้รับแจ้งทันทีเมื่อมีพี่เลือกคุณ</p>
          <div className="card w-full" style={{ maxWidth: '320px' }}>
            <div className="verify-info" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="verify-item">
                <span className="verify-label">บทบาท</span>
                <span className="verify-value"><span className="badge badge-y1">Y1</span> น้อง</span>
              </div>
              <div className="verify-item">
                <span className="verify-label">รหัส</span>
                <span className="verify-value mono">{studentId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <button className="btn btn-secondary btn-block" onClick={() => window.location.reload()}>
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // ===== Render: Chat Screen =====
  const otherPerson = role === 'Y2' ? pair.y1_id : pair.y2_id;
  const roleBadge = role === 'Y2' ? 'badge-y2' : 'badge-y1';
  const roleLabel = role === 'Y2' ? 'Y2' : 'Y1';

  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <span className="pair-badge badge badge-matched">
            <span className={`badge ${roleBadge}`}>{roleLabel}</span>
            <span className="mono">{pairKey}</span>
          </span>
        </div>
        <div className="chat-header-right">
          <div className="countdown">
            <span className="countdown-unit">{countdown.days}</span>
            <span aria-hidden="true">:</span>
            <span className="countdown-unit">{countdown.hours}</span>
            <span aria-hidden="true">:</span>
            <span className="countdown-unit">{countdown.minutes}</span>
            <span aria-hidden="true">:</span>
            <span className="countdown-unit">{countdown.seconds}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => window.location.reload()} aria-label="ออกจากระบบ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Reveal Notice */}
      {isRevealed && (
        <div className="reveal-notice">
          <svg className="reveal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>วันเปิดเผยตัวตนถึงแล้ว! ชื่อจริงและข้อมูลจะถูกแสดง</span>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-area">
        {isLoadingMessages && messages.length === 0 ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`message ${i % 2 === 0 ? 'own' : 'other'}`}>
                <div className="message-bubble">
                  <div className="skeleton skeleton-text short" style={{ width: '60px', height: '16px' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                </div>
                <div className="message-meta">
                  <div className="skeleton skeleton-text short" style={{ width: '80px' }}></div>
                  <div className="skeleton skeleton-text short" style={{ width: '60px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p className="body-sm">ยังไม่มีข้อความ เริ่มพูดคุยกันเลย! 💬</p>
          </div>
        ) : (
          messages.map((msg) => {
  // ✅ แปลงทั้งสองค่าเป็น String และ Trim ก่อนเปรียบเทียบ
  const msgFromId = String(msg.from_id || '').trim();
  const currentStudentId = String(studentId || '').trim();
  
  const isOwn = msgFromId === currentStudentId;
  
  console.log('💬 [Render] msg.from_id:', msgFromId);
  console.log('💬 [Render] studentId:', currentStudentId);
  console.log('💬 [Render] isOwn:', isOwn);
  
  const isTemp = msg.isTemp;
  const typeClass = `type-${msg.type || 'custom'}`;
  const uniqueKey = msg.id || `${msg.sent_at}-${msgFromId}`;
  
  return (
    <div key={uniqueKey} className={`message ${isOwn ? 'own' : 'other'}`}>
                <div className="message-bubble" style={{ opacity: isTemp ? 0.7 : 1 }}>
                  <span className={`message-type ${typeClass}`}>
                    {typeLabels[msg.type] || msg.type || 'custom'}
                  </span>
                  <span>{msg.content}</span>
                </div>
                <div className="message-meta">
                  <span className="mono">{msg.from_id}</span>
                  <span>{new Date(msg.sent_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isTemp && <span>⏳</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="composer card" style={{ margin: 0, borderRadius: '0 0 var(--radius) var(--radius)', boxShadow: 'none', borderTop: '1px solid var(--border)' }}>
        <div className="composer-chips" role="group" aria-label="ประเภทข้อความ">
          {messageTypes.map((type) => (
            <button
              key={type}
              className={`chip ${messageType === type ? 'active' : ''}`}
              onClick={() => setMessageType(type)}
              type="button"
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
        <div className="composer-input-group">
          <input
            type="text"
            className="input-field"
            placeholder="พิมพ์ข้อความ..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
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
  );
}