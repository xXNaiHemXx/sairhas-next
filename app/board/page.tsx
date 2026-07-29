'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMyClues, addClue, deleteClue } from '@/lib/apiClient';
import { getSession, Session } from '@/lib/session';

interface Clue {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  position: {
    top: number;
    left: number;
  };
  color: string;
  rotation: number;
}

export default function BoardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [newClue, setNewClue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [myPairKey, setMyPairKey] = useState<string>('');

  useEffect(() => {
    const sessionData = getSession();
    if (!sessionData) {
      router.push('/login');
      return;
    }
    try {
      setSession(sessionData);
      setMyPairKey(sessionData.pairKey || '');
      loadClues(sessionData);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    }
  }, []);

  const loadClues = async (session: Session) => {
    setIsLoading(true);
    try {
      // ✅ เรียก API เฉพาะคำใบ้ของคู่รหัสตัวเอง
      const result = await getMyClues(session.studentId);
      if (result.ok && result.clues) {
        setClues(result.clues);
      } else {
        setClues([]);
      }
    } catch (error) {
      console.error('Failed to load clues:', error);
      setClues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newClue.trim() || !session) return;

    setIsSubmitting(true);
    try {
      // ✅ ส่งคำใบ้ไปยัง GAS
      const result = await addClue(session.studentId, newClue.trim());
      if (result.ok && result.clue) {
        setClues(prev => [...prev, result.clue]);
        setNewClue('');
        alert('📌 เพิ่มคำใบ้ลงกระดานแล้ว!');
      } else {
        alert(result.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเพิ่มคำใบ้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (clueId: string) => {
    if (!confirm('คุณต้องการลบคำใบ้นี้ใช่หรือไม่?')) return;
    
    try {
      const result = await deleteClue(clueId, session!.studentId);
      if (result.ok) {
        setClues(prev => prev.filter(c => c.id !== clueId));
      } else {
        alert(result.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // ✅ ตรวจสอบว่าเป็นพี่รหัส (Y2) เท่านั้นที่เพิ่มคำใบ้ได้
  const canAddClue = session.role === 'Y2';

  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      <header className="chat-header">
        <div className="chat-header-left">
          <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="h2" style={{ fontSize: '1.2rem' }}>📌 กระดานคำใบ้</span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">
            {session.role === 'Y2' ? 'พี่รหัส' : 'น้องรหัส'}
          </span>
          <span className="badge badge-matched" style={{ backgroundColor: '#e3e7f8', color: '#6575ac' }}>
            🔑 {myPairKey}
          </span>
        </div>
      </header>

      {/* ✅ เฉพาะพี่รหัสเท่านั้นที่เพิ่มคำใบ้ได้ */}
      {canAddClue && (
        <div className="card">
          <div className="composer-input-group">
            <input
              type="text"
              className="input-field"
              placeholder="พิมพ์คำใบ้ให้กับน้องรหัสของคุณ..."
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={200}
              disabled={isSubmitting}
            />
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !newClue.trim()}
            >
              {isSubmitting ? '⏳' : '📌'}
            </button>
          </div>
          <p className="input-hint" style={{ marginTop: '8px' }}>
            คำใบ้จะถูกสุ่มไปแปะบนกระดาน โดยเว้นระยะห่างระหว่างคำใบ้
          </p>
        </div>
      )}

      {/* กระดาน */}
      <div className="board-container">
        {isLoading ? (
          <div className="card text-center">
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p className="body-sm">กำลังโหลดกระดาน...</p>
          </div>
        ) : clues.length === 0 ? (
          <div className="card text-center">
            <p className="body-sm">ยังไม่มีคำใบ้ในกระดาน</p>
            {canAddClue && (
              <p className="body-sm" style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
                พิมพ์คำใบ้ด้านบนเพื่อเพิ่มลงกระดาน
              </p>
            )}
            {!canAddClue && (
              <p className="body-sm" style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
                รอพี่รหัสของคุณเพิ่มคำใบ้ในกระดานนะ 😊
              </p>
            )}
          </div>
        ) : (
          <div className="board" ref={boardRef}>
            {clues.map((clue) => (
              <div
                key={clue.id}
                className="clue-note"
                style={{
                  top: `${clue.position.top}%`,
                  left: `${clue.position.left}%`,
                  backgroundColor: clue.color,
                  transform: `rotate(${clue.rotation}deg)`,
                }}
              >
                <p className="clue-content">{clue.content}</p>
                <div className="clue-meta">
                  <span className="clue-author">👤 {clue.authorId}</span>
                  <span className="clue-time">🕐 {formatDate(clue.createdAt)}</span>
                  {clue.authorId === session.studentId && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDelete(clue.id)}
                      style={{ padding: '2px 6px', fontSize: '0.65rem', color: 'var(--error)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .board-container {
          flex: 1;
          min-height: 500px;
          margin-top: 16px;
        }

        .board {
          position: relative;
          width: 100%;
          height: 600px;
          background: var(--surface);
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        .clue-note {
          position: absolute;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-width: 220px;
          min-width: 100px;
          transition: all 0.3s ease;
          cursor: default;
          border: 1px solid rgba(255,255,255,0.5);
        }

        .clue-note:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          z-index: 10;
        }

        .clue-content {
          font-size: 0.9rem;
          margin: 0 0 6px 0;
          word-wrap: break-word;
        }

        .clue-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          font-size: 0.6rem;
          color: rgba(0,0,0,0.5);
        }

        .clue-author {
          font-weight: 600;
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
          min-width: 48px;
        }

        @media (max-width: 480px) {
          .board {
            height: 400px;
          }
          .clue-note {
            max-width: 140px;
            padding: 8px 12px;
          }
          .clue-content {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}