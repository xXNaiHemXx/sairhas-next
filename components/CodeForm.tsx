'use client';

import { useState } from 'react';

interface CodeFormProps {
  onAdd?: (code: string, type: string) => Promise<void>;
  onSubmit?: (content: string) => void;
  loading?: boolean;
}

export default function CodeForm({ onAdd, onSubmit, loading }: CodeFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (onSubmit) {
      onSubmit(content.trim());
    } else if (onAdd) {
      onAdd(content.trim(), 'text');
    }
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="code-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter code..."
        rows={3}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !content.trim()}>
        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </form>
  );
}
