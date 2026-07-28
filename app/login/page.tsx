'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { verifyStudentId, checkNetwork } from '@/lib/gasClient';

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const parseStudentId = (id: string) => {
    const s = String(id ?? '').trim().replace(/\D/g, '');
    if (s.length === 11) {
      return {
        year: s.slice(0, 2),
        core: s.slice(2, 8),
        suffix: s.slice(8, 11),
        pairKey: s.slice(8, 11),
        role: s.startsWith('68') ? 'Y2' : s.startsWith('69') ? 'Y1' : null,
        full: s
      };
    }
    if (s.length === 13) {
      return {
        year: s.slice(0, 2),
        core: s.slice(2, 8),
        variable: s.slice(8, 10),
        suffix: s.slice(10, 13),
        pairKey: s.slice(10, 13),
        role: s.startsWith('68') ? 'Y2' : s.startsWith('69') ? 'Y1' : null,
        full: s
      };
    }
    return null;
  };

  const handleLoginClick = () => {
    const digits = studentId.replace(/\D/g, '');
    if (digits.length !== 11) {
      setError('กรุณากรอกรหัสนักศึกษาให้ครบ 11 หลัก');
      inputRef.current?.focus();
      return;
    }

    const parsed = parseStudentId(digits);
    if (!parsed || !parsed.role) {
      setError('รหัสไม่ถูกต้อง (ต้องขึ้นต้นด้วย 68 หรือ 69)');
      inputRef.current?.focus();
      return;
    }

    setParsedData(parsed);
    setShowConfirmPopup(true);
    setError('');
  };

  const handleConfirmLogin = async () => {
    setShowConfirmPopup(false);
    setIsLoading(true);
    setError('');

    try {
      const result = await verifyStudentId(studentId);
      
      if (!result.ok) {
        setError(result.error || 'เกิดข้อผิดพลาด');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Login result:', result);

      let role: 'Y1' | 'Y2' | null = null;
      let pairKey = '';

      if (result.pair) {
        role = result.pair.y2_id === studentId ? 'Y2' : 'Y1';
        pairKey = result.pair.pair_key || '';
        console.log('✅ Found pair:', result.pair);
        console.log('✅ Role:', role, 'PairKey:', pairKey);
      } else if (result.parsed) {
        role = result.parsed.role;
        pairKey = result.parsed.pairKey || '';
        console.log('✅ Parsed student:', result.parsed);
        console.log('✅ Role:', role, 'PairKey:', pairKey);
      }

      if (!role) {
        setError('ไม่พบข้อมูลนักศึกษา');
        setIsLoading(false);
        return;
      }

      // ✅ บันทึก session พร้อม pairKey
      const session = {
        studentId: studentId,
        role: role,
        pairKey: pairKey, // ✅ ต้องมีค่านี้!
      };

      console.log('💾 Saving session:', session);
      localStorage.setItem('session', JSON.stringify(session));
      router.push('/');
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    setIsLoading(false);
  };

  const handleCancelLogin = () => {
    setShowConfirmPopup(false);
    setStudentId('');
    setParsedData(null);
    inputRef.current?.focus();
  };

  const isLoginDisabled = isLoading || studentId.replace(/\D/g, '').length < 11;

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
        <div className="input-group">
          <label className="input-label" htmlFor="studentIdInput">รหัสนักศึกษา 11 หลัก</label>
          <input
            ref={inputRef}
            type="text"
            id="studentIdInput"
            className="input-field"
            inputMode="numeric"
            maxLength={11}
            placeholder="เช่น 68070507606"
            value={studentId}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 11);
              setStudentId(value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
            disabled={isLoading}
            autoFocus
          />
          <p className="input-hint">รหัสปี 68 = พี่ (Y2) · รหัสปี 69 = น้อง (Y1)</p>
        </div>

        {error && (
          <div className="card" style={{ padding: '12px', background: 'var(--error)', borderColor: 'var(--error)', marginTop: '8px' }}>
            <p className="body-sm" style={{ color: 'var(--fg)' }}>{error}</p>
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={handleLoginClick}
          disabled={isLoginDisabled}
          style={{ marginTop: '16px' }}
        >
          {isLoading ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
              กำลังดำเนินการ...
            </>
          ) : (
            '🔑 เข้าสู่ระบบ'
          )}
        </button>

        <p className="body-sm text-center" style={{ marginTop: '12px' }}>
          เข้าสู่ระบบ = ยอมรับเงื่อนไขการใช้งาน · ข้อมูลไม่เปิดเผยตัวตนจนถึงวันเปิดเผย
        </p>
      </div>

      <div className="card">
        <div className="net-status">
          <span className={`net-dot ${isOnline ? 'online' : 'offline'}`}></span>
          <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
        </div>
      </div>

      {showConfirmPopup && parsedData && (
        <div className="popup-overlay" onClick={handleCancelLogin}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <span className="popup-icon">🔍</span>
              <h3 className="popup-title">ยืนยันรหัสนักศึกษา</h3>
            </div>
            
            <div className="popup-body">
              <p className="popup-desc">กรุณาตรวจสอบข้อมูลก่อนเข้าสู่ระบบ</p>
              
              <div className="popup-info-grid">
                <div className="popup-info-item">
                  <span className="popup-info-label">รหัสเต็ม</span>
                  <span className="popup-info-value mono">{parsedData.full}</span>
                </div>
                <div className="popup-info-item">
                  <span className="popup-info-label">บทบาท</span>
                  <span className="popup-info-value">
                    <span className={`badge ${parsedData.role === 'Y2' ? 'badge-y2' : 'badge-y1'}`}>
                      {parsedData.role}
                    </span>
                    {' '}{parsedData.role === 'Y2' ? 'พี่ (Y2)' : 'น้อง (Y1)'}
                  </span>
                </div>
                <div className="popup-info-item">
                  <span className="popup-info-label">รหัสคู่ (Pair Key)</span>
                  <span className="popup-info-value mono">{parsedData.pairKey}</span>
                </div>
                <div className="popup-info-item">
                  <span className="popup-info-label">คณะ/สาขา</span>
                  <span className="popup-info-value mono">{parsedData.core}</span>
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button className="popup-btn popup-btn-secondary" onClick={handleCancelLogin} disabled={isLoading}>
                แก้ไข
              </button>
              <button className="popup-btn popup-btn-primary" onClick={handleConfirmLogin} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  'ยืนยันเข้าสู่ระบบ ✅'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.25s ease;
        }

        .popup-card {
          background: var(--surface-solid);
          border-radius: var(--radius);
          max-width: 440px;
          width: 100%;
          padding: 28px 24px 24px;
          box-shadow: var(--shadow-strong);
          border: 1px solid var(--border);
          animation: slideUp 0.3s ease;
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .popup-icon { font-size: 28px; }
        .popup-title { font-size: 1.2rem; font-weight: 700; color: var(--fg); }

        .popup-body { display: flex; flex-direction: column; gap: 16px; }
        .popup-desc { font-size: 0.9rem; color: var(--fg-muted); margin: 0; }

        .popup-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .popup-info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          background: var(--bg-soft);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .popup-info-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--fg-muted);
          font-weight: 600;
        }

        .popup-info-value {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--fg);
        }

        .popup-footer {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .popup-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.9rem;
          transition: all var(--transition);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
        }

        .popup-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .popup-btn-primary {
          background: linear-gradient(100deg, #aebce8, #f4c7b5);
          color: #fff;
          border: 1px solid rgba(141, 159, 219, 0.25);
          box-shadow: 0 8px 20px rgba(155, 165, 220, 0.18);
        }

        .popup-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 26px rgba(155, 165, 220, 0.26);
        }

        .popup-btn-secondary {
          background: #f5f4fa;
          color: var(--fg);
          border: 1px solid var(--border);
        }

        .popup-btn-secondary:hover:not(:disabled) { background: #eeedf7; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 480px) {
          .popup-card { padding: 20px 16px; }
          .popup-info-grid { grid-template-columns: 1fr; }
          .popup-footer { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}