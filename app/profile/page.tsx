'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProfile, updateProfile } from '@/lib/gasClient'; // ✅ import ฟังก์ชัน

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: '',
    faculty: 'APE/TME',
    year: '',
    bio: '',
    ig: '',
    line: '',
    imageUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (!savedSession) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(savedSession);
      setSession(parsed);
      loadProfile(parsed.studentId);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  // ✅ แก้ไข: ดึงข้อมูลจาก API
  const loadProfile = async (studentId: string) => {
    setIsLoading(true);
    try {
      const result = await getProfile(studentId);
      
      if (result.ok && result.profile) {
        setProfile({
          name: result.profile.name || '',
          faculty: result.profile.faculty || 'APE/TME',
          year: 'ปี 68', // หรือดึงจากที่อื่น
          bio: '',
          ig: result.profile.ig || '',
          line: result.profile.line || '',
          imageUrl: result.profile.imageUrl || '',
        });
      } else {
        // ถ้ายังไม่มีโปรไฟล์ ให้ใช้ค่าว่าง
        setProfile({
          name: '',
          faculty: 'APE/TME',
          year: 'ปี 68',
          bio: '',
          ig: '',
          line: '',
          imageUrl: '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({
        ...prev,
        imageUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // ✅ แก้ไข: บันทึกข้อมูลผ่าน API
  const handleSave = async () => {
    if (!profile.name.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    setIsSaving(true);
    try {
      // ✅ เรียก API updateProfile
      const result = await updateProfile(session.studentId, {
        name: profile.name,
        faculty: profile.faculty,
        ig: profile.ig,
        line: profile.line,
        imageUrl: profile.imageUrl,
      });

      if (result.ok) {
        alert('💾 บันทึกโปรไฟล์สำเร็จ!');
        // ✅ โหลดข้อมูลใหม่
        await loadProfile(session.studentId);
      } else {
        alert(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
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

  return (
    <div className="app">
      <header className="chat-header">
        <div className="chat-header-left">
          <Link href="/" className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="h2" style={{ fontSize: '1.2rem' }}>👤 โปรไฟล์</span>
        </div>
        <div className="chat-header-right">
          <span className="badge badge-matched">{session.role === 'Y2' ? 'พี่ (Y2)' : 'น้อง (Y1)'}</span>
        </div>
      </header>

      {isLoading ? (
        <div className="card text-center">
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="body-sm">กำลังโหลดโปรไฟล์...</p>
        </div>
      ) : (
        <div className="card">
          {/* รูปโปรไฟล์ */}
          <div className="profile-image-container">
            <div 
              className="profile-image"
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                backgroundImage: profile.imageUrl ? `url(${profile.imageUrl})` : 'none',
                backgroundColor: profile.imageUrl ? 'transparent' : 'var(--secondary)',
              }}
            >
              {!profile.imageUrl && (
                <span className="profile-image-placeholder">📷</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <p className="body-sm text-center" style={{ marginTop: '8px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              คลิกเพื่อเปลี่ยนรูป
            </p>
          </div>

          {/* ฟอร์มข้อมูล */}
          <div className="input-group" style={{ marginTop: '16px' }}>
            <label className="input-label">ชื่อ-นามสกุล <span style={{ color: 'var(--error)' }}>*</span></label>
            <input
              type="text"
              className="input-field"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              placeholder="กรอกชื่อ-นามสกุล"
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">รหัสนักศึกษา</label>
            <input
              type="text"
              className="input-field"
              value={session.studentId}
              disabled
              style={{ background: 'var(--bg-soft)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">บทบาท</label>
            <input
              type="text"
              className="input-field"
              value={session.role === 'Y2' ? 'พี่รหัส (Y2)' : 'น้องรหัส (Y1)'}
              disabled
              style={{ background: 'var(--bg-soft)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">คณะ/สาขา</label>
            <input
              type="text"
              className="input-field"
              value={profile.faculty}
              onChange={(e) => setProfile(prev => ({ ...prev, faculty: e.target.value }))}
              placeholder="เช่น APE/TME"
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">ปีการศึกษา</label>
            <input
              type="text"
              className="input-field"
              value={profile.year}
              onChange={(e) => setProfile(prev => ({ ...prev, year: e.target.value }))}
              placeholder="เช่น ปี 68"
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">Instagram</label>
            <input
              type="text"
              className="input-field"
              value={profile.ig}
              onChange={(e) => setProfile(prev => ({ ...prev, ig: e.target.value }))}
              placeholder="@username"
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">LINE ID</label>
            <input
              type="text"
              className="input-field"
              value={profile.line}
              onChange={(e) => setProfile(prev => ({ ...prev, line: e.target.value }))}
              placeholder="line_id"
            />
          </div>

          <div className="input-group" style={{ marginTop: '12px' }}>
            <label className="input-label">เกี่ยวกับฉัน</label>
            <textarea
              className="input-field"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="เล่าเกี่ยวกับตัวเอง..."
              rows={4}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handleSave}
            disabled={isSaving}
            style={{ marginTop: '16px' }}
          >
            {isSaving ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                กำลังบันทึก...
              </>
            ) : (
              '💾 บันทึกโปรไฟล์'
            )}
          </button>
        </div>
      )}

      <style>{`
        .profile-image-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .profile-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background-size: cover;
          background-position: center;
          border: 3px solid var(--border);
          cursor: pointer;
          transition: all var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .profile-image:hover {
          border-color: var(--primary-strong);
          transform: scale(1.02);
        }

        .profile-image-placeholder {
          font-size: 2.5rem;
          color: var(--fg-muted);
        }

        textarea.input-field {
          font-family: var(--font-sans);
        }
      `}</style>
    </div>
  );
}