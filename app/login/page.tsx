'use client';

import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePosStore, Employee } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Lock, User, Loader2, AlertTriangle, RefreshCcw, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const router = useRouter();
  const { login, isSupabaseConfigured, checkSupabaseConfig, licenseInfo, updateLicenseInfo } = usePosStore();
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [manualKey, setManualKey] = useState('');

  // --- License expiry logic ---
  const checkLicenseExpiry = (overrideExpiresAt?: string) => {
    const expiresAt = overrideExpiresAt ?? licenseInfo?.expiresAt;
    if (!expiresAt) return { isExpired: true, daysRemaining: 0 };

    // Parse the date properly - handle both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DDTHH:MM:SS" formats
    const dateStr = expiresAt.includes('T') ? expiresAt : expiresAt.replace(' ', 'T');
    const expiryDate = new Date(dateStr);
    
    // If date parsing failed, consider it expired
    if (isNaN(expiryDate.getTime())) {
      return { isExpired: true, daysRemaining: 0 };
    }
    
    const now = new Date();
    // Set expiry date to end of day (23:59:59) for comparison
    expiryDate.setHours(23, 59, 59, 999);
    
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpired: diffTime < 0,
      daysRemaining: Math.max(0, daysRemaining)
    };
  };

  const [licenseExpiry, setLicenseExpiry] = useState({ isExpired: false, daysRemaining: 999 });
  const { isExpired, daysRemaining } = licenseExpiry;

  // Recalculate whenever license info changes (but not while syncing)
  useEffect(() => {
    if (!syncing) {
      setLicenseExpiry(checkLicenseExpiry());
    }
  }, [licenseInfo?.expiresAt, licenseInfo?.active, syncing]);

  // --- Verify/activate a license key against the API ---
    const verifyKey = async (key: string, isInitialSync: boolean = false): Promise<boolean> => {
      const machineId = licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`;

      try {
        // Use local API routes which handle external API calls with fallbacks
        const verifyUrl = '/api/verify';
        const activateUrl = '/api/activate';

        // First try verify endpoint
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key, machine_id: machineId })
        });
        const data = await response.json();

        if (data.valid && data.expires_at) {
          const dateStr = data.expires_at.includes('T') ? data.expires_at : data.expires_at.replace(' ', 'T');
          const expiryDate = new Date(dateStr);
          expiryDate.setHours(23, 59, 59, 999);
          const now = new Date();
          const stillExpired = expiryDate < now;

          updateLicenseInfo({
            key: key,
            machineId: machineId,
            active: true,
            expiresAt: data.expires_at,
            renewDate: data.renew_date || new Date().toISOString().replace('T', ' ').split('.')[0],
            activationData: data.activation_data || licenseInfo?.activationData
          });

          setLicenseExpiry(checkLicenseExpiry(data.expires_at));

          if (stillExpired) {
            if (!isInitialSync) setError('License is still expired. Please contact your administrator.');
            return false;
          } else {
            if (!isInitialSync) setError('');
            return true;
          }
        }

        if (data?.error && !isInitialSync) {
          setError(data.error);
        }

        // If verify didn't work, try activate endpoint
        const activateRes = await fetch(activateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key, machine_id: machineId })
        });
        const activateData = await activateRes.json();

        if (activateRes.ok && activateData.success && activateData.expires_at) {
          const dateStr = activateData.expires_at.includes('T') ? activateData.expires_at : activateData.expires_at.replace(' ', 'T');
          const expiryDate = new Date(dateStr);
          expiryDate.setHours(23, 59, 59, 999);
          const now = new Date();
          const stillExpired = expiryDate < now;

          updateLicenseInfo({
            key: key,
            machineId: machineId,
            active: true,
            expiresAt: activateData.expires_at,
            renewDate: activateData.renew_date || new Date().toISOString().replace('T', ' ').split('.')[0],
            activationData: activateData.activation_data
          });

          setLicenseExpiry(checkLicenseExpiry(activateData.expires_at));

          if (stillExpired) {
            if (!isInitialSync) setError('License is expired. Please contact your administrator.');
            return false;
          }
          if (!isInitialSync) setError('');
          return true;
        }

        if (!isInitialSync) {
          setError(activateData?.error || data?.error || 'License verification failed. Please check your key.');
        }
        return false;
      } catch (err) {
        console.error('License verification error:', err);
        if (!isInitialSync) {
          setError('Connection error. Could not reach activation server.');
        }
        return false;
      }
    };

  // --- Refresh button handler ---
  const handleRefreshLicense = async () => {
    const key = licenseInfo?.key || manualKey.trim();
    if (!key) {
      setError('Please enter a license key first.');
      return;
    }
    setLicenseChecking(true);
    setError('');

    const success = await verifyKey(key);
    if (success) {
      const expiresAt = licenseInfo?.expiresAt || '';
      if (expiresAt) {
        const formattedDate = format(new Date(expiresAt.replace(' ', 'T')), 'MMM dd, yyyy');
        alert(`License active until ${formattedDate}! System unlocked.`);
      }
    }

    setLicenseChecking(false);
  };

  // --- Initial sync on mount ---
  useEffect(() => {
    checkSupabaseConfig();
  }, [checkSupabaseConfig]);

  const hasSynced = useRef(false);
  useEffect(() => {
    if (!licenseInfo?.key) {
      setSyncing(false);
      setInitialSyncComplete(true);
      return;
    }
    if (hasSynced.current) return;
    hasSynced.current = true;

    const sync = async () => {
      setError(''); // Clear any previous errors before syncing
      await verifyKey(licenseInfo.key, true); // Pass true for isInitialSync
      setSyncing(false);
      setInitialSyncComplete(true);
    };
    sync();
  }, [licenseInfo?.key]);

  // --- Login handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .ilike('name', name)
          .eq('pin', pin)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Login error:', error);
          throw error;
        }

        if (data) {
          login(data as Employee);
          router.push('/');
          return;
        }
      }

      setError('Invalid name or PIN');
    } catch (err) {
      console.error(err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // --- Has a stored key? ---
  const hasKey = !!licenseInfo?.key;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 ring-1 ring-zinc-200/80">
        <CardHeader className="space-y-2 text-center px-6 pt-8 pb-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            {syncing ? <Loader2 className="h-7 w-7 text-white animate-spin" /> : <Lock className="h-7 w-7 text-white" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Demios POS</CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            {syncing ? 'Checking license status...' : 'Enter your credentials to access the system'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          {syncing ? (
            <div className="py-6 flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm">Verifying activation...</p>
            </div>
          ) : isExpired ? (
            <div className="space-y-3">
              <Alert className="bg-gradient-to-br from-red-50 via-white to-rose-50/30 border-red-200 shadow-lg overflow-hidden p-0 border-l-4 border-l-red-500">
                <div className="p-4 flex gap-3">
                  <div className="shrink-0">
                    <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shadow-inner border border-red-200/50">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="space-y-1 my-auto min-w-0">
                    <AlertTitle className="text-red-950 font-black text-base leading-none">System Locked</AlertTitle>
                    <AlertDescription className="text-red-800 text-xs leading-snug font-medium space-y-1">
                      {licenseInfo?.expiresAt ? (
                        <p>License expired <span className="underline decoration-red-300 font-bold">({format(new Date(licenseInfo.expiresAt.replace(' ', 'T')), 'MMM dd, yyyy')})</span>.</p>
                      ) : (
                        <p>No active license found.</p>
                      )}
                      {licenseInfo?.renewDate && (
                        <p className="opacity-60 italic">Last attempt: {format(new Date(licenseInfo.renewDate.replace(' ', 'T')), 'MMM dd, yyyy')}</p>
                      )}
                      <span className="block pt-1 border-t border-red-100 font-black text-red-600">
                        Contact admin: <a href="https://wa.me/2052957534" target="_blank" className="underline hover:text-red-700 break-all">020 52957534</a>
                      </span>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {/* Show key input if no key is stored */}
              {!hasKey && (
                <div className="space-y-2">
                  <Label htmlFor="license-key" className="text-sm font-semibold text-zinc-700">License Key</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="license-key"
                      placeholder="POS-XXXX-XXXX-XXXX-XXXX"
                      className="pl-10 h-12 text-base rounded-xl border-zinc-200 focus:border-indigo-400 focus:ring-indigo-100 font-mono uppercase"
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              )}

              {error && initialSyncComplete && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 font-bold shadow-sm transition-all group rounded-xl text-sm"
                onClick={handleRefreshLicense}
                disabled={licenseChecking}
              >
                {licenseChecking ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                )}
                {licenseChecking ? 'Verifying...' : (hasKey ? 'Refresh Activation Status' : 'Activate License')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700">Employee Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="name"
                    placeholder="e.g. Administrator"
                    className="pl-10 h-12 text-base rounded-xl border-zinc-200 focus:border-indigo-400 focus:ring-indigo-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-semibold text-zinc-700">PIN Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="pin"
                    type="password"
                    placeholder="••••••"
                    className="pl-10 h-12 text-base rounded-xl border-zinc-200 focus:border-indigo-400 focus:ring-indigo-100"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && initialSyncComplete && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {licenseInfo?.active && !isExpired && daysRemaining >= 0 && daysRemaining <= 7 && (
                <Alert className="bg-gradient-to-br from-amber-50 via-white to-orange-50/30 border-amber-200 shadow-md overflow-hidden p-0 border-l-4 border-l-amber-500">
                  <div className="p-4 flex gap-3">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-inner border border-amber-200/50">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                    <div className="space-y-1 my-auto min-w-0">
                      <AlertTitle className="text-amber-950 font-black text-sm">Renewal Required</AlertTitle>
                      <AlertDescription className="text-amber-800 text-xs leading-tight font-medium space-y-0.5">
                        <p>Expires in <span className="font-black text-amber-600">{daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}</span>.</p>
                        {licenseInfo.renewDate && (
                          <p className="opacity-60 italic">Last verified: {format(new Date(licenseInfo.renewDate.replace(' ', 'T')), 'MMM dd, yyyy')}</p>
                        )}
                        <p>Please contact admin for renewal.</p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
