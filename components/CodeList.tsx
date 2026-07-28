'use client';

import { useState, useOptimistic } from 'react';
import CodeForm from './CodeForm';
import SkeletonLoader from './SkeletonLoader';

interface Code {
  id: string;
  code: string;
  type: string;
  createdAt: string;
}

export default function CodeList({ initialCodes }: { initialCodes: Code[] }) {
  const [codes, setCodes] = useState(initialCodes);
  const [optimisticCodes, addOptimisticCode] = useOptimistic(
    codes,
    (state, newCode: Code) => [...state, newCode]
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCode = async (code: string, type: string) => {
    const tempId = `temp-${Date.now()}`;
    const newCode = {
      id: tempId,
      code,
      type,
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update
    addOptimisticCode(newCode);
    
    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type }),
      });
      
      if (!response.ok) throw new Error('Failed to add');
      
      const savedCode = await response.json();
      
      // แทนที่ optimistic ด้วยข้อมูลจริง
      setCodes(prev => 
        prev.map(c => c.id === tempId ? savedCode : c)
      );
    } catch (error) {
      // Rollback ถ้าเกิด error
      setCodes(prev => prev.filter(c => c.id !== tempId));
      alert('เกิดข้อผิดพลาดในการเพิ่มรหัส');
    }
  };

  return (
    <div>
      <CodeForm onAdd={handleAddCode} />
      
      <div className="mt-6 space-y-2">
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          optimisticCodes.map((code) => (
            <div key={code.id} className="p-3 border rounded shadow-sm">
              <span className="font-mono">{code.code}</span>
              <span className="ml-3 text-sm text-gray-500">{code.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}