'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FormContent from '@/app/components/FormContent';
import { Loader2 } from 'lucide-react';

export default function ApplyPage() {
  const params = useParams();
  const hash = params.hash as string;
  
  const [uid, setUid] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    decodeHash();
  }, [hash]);

  const decodeHash = async () => {
    try {
      const res = await fetch(`/api/sheets?action=decodeHash&hash=${hash}`);
      const data = await res.json();
      
      if (data.error) {
        setError(true);
      } else {
        setUid(data.uid);
        setCompany(data.company);
      }
    } catch (err) {
      setError(true);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Verifying your application link...</p>
        </div>
      </div>
    );
  }

  if (error || !uid || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-4">
            This application link is invalid, expired, or has been tampered with.
          </p>
          <p className="text-sm text-slate-500">
            Please contact your placement coordinator for a valid link.
          </p>
        </div>
      </div>
    );
  }

  return <FormContent uid={uid} company={company} />;
}