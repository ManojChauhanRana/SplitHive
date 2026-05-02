import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../services/auth';

export const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setCheckingSession(false);
        return;
      }

      const user = data.session?.user;
      if (!user) {
        setError('This invite link is invalid or has expired. Please open the invitation email again.');
        setCheckingSession(false);
        return;
      }

      const existingFullName =
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

      setFullName(existingFullName);
      setCheckingSession(false);
    };

    hydrateSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: fullName.trim(),
        },
      });

      if (updateError) throw updateError;

      await AuthService.ensureProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            SplitHive
          </h1>
          <p className="text-gray-400">Complete your invitation to join the hive.</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
          {checkingSession ? (
            <div className="text-sm text-gray-400">Validating your invitation...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                autoFocus
              />

              <Input
                label="Set Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                Complete Invitation
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
