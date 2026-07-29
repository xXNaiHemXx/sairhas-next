'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMentors } from '@/lib/apiClient'; // ✅ เปลี่ยนจาก gasClient เป็น apiClient
import { getSession, clearSession, Session } from '@/lib/session';

interface Mentor {
  id: string;
  studentId: string;
  nickname: string;
  faculty: string;
  ig: string;
  line: string;
  imageUrl?: string;
  pairKey?: string;
  role?: string;
}

export default function MentorPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myMentor, setMyMentor] = useState<Mentor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = getSession();
    if (!sessionData) {
      router.push('/login');
      return;
    }
    setSession(sessionData);
    loadMentors(sessionData);
  }, [router]);

  const loadMentors = async (session: Session) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Calling getMentors API...');
      const result = await getMentors();
      console.log('📄 getMentors result:', result);
      
      if (result.ok && result.mentors) {
        console.log('✅ Mentors loaded:', result.mentors.length);
        setMentors(result.mentors);
        
        // ✅ หาพี่รหัสของตัวเอง (ถ้าเป็น Y1)
        if (session.role === 'Y1') {
          const myPairKey = session.pairKey || '';
          console.log('🔍 Looking for mentor with pairKey:', myPairKey);
          
          const found = result.mentors.find((m: Mentor) => m.pairKey === myPairKey);
          console.log('🔍 Found mentor:', found);
          
          if (found) {
            setMyMentor(found);
          } else {
            console.warn('⚠️ No mentor found with pairKey:', myPairKey);
          }
        }
      } else {
        console.error('❌ Failed to load mentors:', result.error || 'Unknown error');
        setError(result.error || 'ไม่สามารถโหลดรายชื่อพี่รหัสได้');
        setMentors([]);
      }
    } catch (error) {
      console.error('❌ Error loading mentors:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setMentors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChat = (mentorId: string) => {
    if (session?.role === 'Y1') {
      if (!myMentor) {
        alert('⚠️ ไม่พบพี่รหัสของคุณในระบบ');
        return;
      }
      if (mentorId !== myMentor.id) {
        alert('⚠️ คุณสามารถแชทกับพี่รหัสของตัวเองเท่านั้น');
        return;
      }
    }
    router.push(`/chat/${mentorId}`);
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

  return (
    <div className="app" style={{ paddingBottom: '20px' }}>
      <header className="chat-header">
        <div className="chat-header-left">
          <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="h2" style={{ fontSize: '1.2rem' }}>👥 รายชื่อพี่รหัส</span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">{session.role === 'Y2' ? 'พี่ (Y2)' : 'น้อง (Y1)'}</span>
          {session.pairKey && (
            <span className="badge badge-matched" style={{ backgroundColor: '#e3e7f8', color: '#6575ac' }}>
              🔑 {session.pairKey}
            </span>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="card text-center">
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลดรายชื่อ...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ background: 'var(--error)', borderColor: 'var(--error)' }}>
          <p className="body-sm" style={{ color: 'var(--fg)' }}>❌ {error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => session && loadMentors(session)}
            style={{ marginTop: '12px' }}
          >
            🔄 ลองใหม่
          </button>
        </div>
      ) : mentors.length === 0 ? (
        <div className="card text-center">
          <p className="body-sm">ยังไม่มีข้อมูลพี่รหัส</p>
          <p className="body-sm" style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
            กรุณาให้แอดมินเพิ่มข้อมูลพี่รหัสก่อน
          </p>
        </div>
      ) : (
        <>
          {/* ✅ ถ้าเป็น Y1 และมีพี่รหัสของตัวเอง ให้แสดงแยก */}
          {session.role === 'Y1' && myMentor && (
            <div className="card" style={{ borderColor: 'var(--primary-strong)', background: 'var(--primary-50)' }}>
              <p className="body-sm" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                🌟 พี่รหัสของคุณ
              </p>
              <div className="mentor-card" style={{ border: 'none', padding: '8px 0', marginBottom: 0 }}>
                <div className="mentor-avatar">
                  {myMentor.imageUrl ? (
                    <img src={myMentor.imageUrl} alt={myMentor.nickname} />
                  ) : (
                    <span className="avatar-placeholder">👤</span>
                  )}
                </div>
                <div className="mentor-info">
                  <h3 className="mentor-name">{myMentor.nickname || 'ไม่ระบุชื่อ'}</h3>
                  <p className="mentor-details">{myMentor.faculty || 'APE/TME'}</p>
                  <div className="mentor-social">
                    {myMentor.ig && <span>📸 {myMentor.ig}</span>}
                    {myMentor.line && <span>💬 {myMentor.line}</span>}
                  </div>
                </div>
                <div className="mentor-action">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleChat(myMentor.id)}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    💬 แชท
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* รายชื่อพี่รหัสทั้งหมด */}
          {mentors.map((mentor) => {
            const isMyMentor = session.role === 'Y1' && myMentor && mentor.id === myMentor.id;
            
            if (isMyMentor) return null;
            
            const canChat = session.role === 'Y2' || isMyMentor;

            return (
              <div key={mentor.id} className="mentor-card">
                <div className="mentor-avatar">
                  {mentor.imageUrl ? (
                    <img src={mentor.imageUrl} alt={mentor.nickname} />
                  ) : (
                    <span className="avatar-placeholder">👤</span>
                  )}
                </div>
                <div className="mentor-info">
                  <h3 className="mentor-name">{mentor.nickname || 'ไม่ระบุชื่อ'}</h3>
                  <p className="mentor-details">{mentor.faculty || 'APE/TME'}</p>
                  <div className="mentor-social">
                    {mentor.ig && <span>📸 {mentor.ig}</span>}
                    {mentor.line && <span>💬 {mentor.line}</span>}
                  </div>
                </div>
                <div className="mentor-action">
                  {canChat ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleChat(mentor.id)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      แชท
                    </button>
                  ) : (
                    <span className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }}>
                      🔒 ไม่สามารถแชทได้
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
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
        }

        .mentor-card:hover {
          border-color: var(--primary-strong);
          box-shadow: var(--shadow);
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
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .mentor-details {
          font-size: 0.8rem;
          color: var(--fg-muted);
          margin: 2px 0;
        }

        .mentor-social {
          display: flex;
          gap: 12px;
          font-size: 0.75rem;
          color: var(--fg-muted);
          flex-wrap: wrap;
        }

        .mentor-social span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .mentor-action {
          flex-shrink: 0;
        }

        .badge-matched {
          background: #e2f5ee;
          color: #4c9a82;
          border: 1px solid #c5e8dc;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 500;
        }

        .primary-50 {
          background: #f0f9ff;
        }

        @media (max-width: 480px) {
          .mentor-card {
            padding: 12px;
            gap: 12px;
            flex-wrap: wrap;
          }
          .mentor-avatar {
            width: 44px;
            height: 44px;
          }
          .mentor-social {
            flex-direction: column;
            gap: 2px;
          }
          .mentor-action {
            width: 100%;
          }
          .mentor-action button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}                             