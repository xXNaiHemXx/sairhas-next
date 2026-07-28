'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkNetwork } from '@/lib/gasClient';

export default function Home() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Failed to parse session');
      }
    }

    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const result = await checkNetwork();
      setIsOnline(result.ok);
    } catch {
      setIsOnline(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    setIsLoggedIn(false);
    setSession(null);
    router.push('/');
  };

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="hero">
          <svg className="hero-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor"/>
          </svg>
          <h1 className="hero-title">สายรหัส</h1>
          <p className="hero-subtitle">ช่องทางสื่อสารแบบไม่ระบุตัวตนระหว่างพี่น้อง APE/TME</p>
        </div>

        <div className="card">
          <p className="body-sm text-center" style={{ marginBottom: '16px' }}>
            กรุณาเข้าสู่ระบบก่อนใช้งาน
          </p>
          <Link href="/login" className="btn btn-primary btn-block" style={{ textAlign: 'center' }}>
            🔑 เข้าสู่ระบบ
          </Link>
        </div>

        <div className="card">
          <div className="net-status">
            <span className={`net-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="chat-header">
        <div className="chat-header-left">
          <span className="text-xl">🔗</span>
          <span className="h2" style={{ fontSize: '1.2rem' }}>สายรหัส APE/TME</span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">{session.role === 'Y2' ? 'พี่ (Y2)' : 'น้อง (Y1)'}</span>
          <button className="btn btn-ghost" onClick={handleLogout} aria-label="ออกจากระบบ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="card">
        <h2 className="h2">👋 สวัสดี, {session.studentId}</h2>
        <p className="body-sm">บทบาท: {session.role === 'Y2' ? 'พี่รหัส (Y2)' : 'น้องรหัส (Y1)'}</p>
      </div>

      {/* Menu Grid */}
      <div className="menu-grid">
        <Link href="/mentor" className="menu-card">
          <div className="menu-icon">👥</div>
          <h3 className="menu-title">Mentor</h3>
          <p className="menu-desc">รายชื่อพี่รหัสและแชท</p>
        </Link>

        <Link href="/board" className="menu-card">
          <div className="menu-icon">📌</div>
          <h3 className="menu-title">กระดานคำใบ้</h3>
          <p className="menu-desc">คำใบ้จากพี่รหัส</p>
        </Link>

        <Link href="/profile" className="menu-card">
          <div className="menu-icon">👤</div>
          <h3 className="menu-title">โปรไฟล์</h3>
          <p className="menu-desc">จัดการข้อมูลส่วนตัว</p>
        </Link>
      </div>

      <div className="card">
        <div className="net-status">
          <span className={`net-dot ${isOnline ? 'online' : 'offline'}`}></span>
          <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
        </div>
      </div>

      <style>{`
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 16px 0;
        }

        .menu-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(232,230,240,.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          transition: all var(--transition);
          text-decoration: none;
          color: var(--fg);
          min-height: 120px;
        }

        .menu-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-strong);
          border-color: var(--primary-strong);
        }

        .menu-card:active { transform: scale(0.97); }
        .menu-icon { font-size: 2.5rem; margin-bottom: 8px; }
        .menu-title { font-size: 1rem; font-weight: 600; margin: 0; }
        .menu-desc { font-size: 0.7rem; color: var(--fg-muted); margin: 4px 0 0; text-align: center; }

        @media (max-width: 480px) {
          .menu-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .menu-card { padding: 16px 12px; min-height: 100px; }
          .menu-icon { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}