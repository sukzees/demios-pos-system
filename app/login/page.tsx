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
import { Lock, User, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Force dynamic rendering to prevent SSR issues with localStorage/persist
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const envLicenseKey = (process.env.NEXT_PUBLIC_POS_LICENSE_KEY || '').trim();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { login, isSupabaseConfigured, checkSupabaseConfig, licenseInfo, updateLicenseInfo } = usePosStore();
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [manualKey, setManualKey] = useState('');

  // Prevent SSR issues by only rendering client-specific content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !envLicenseKey) return;
    if (licenseInfo?.key !== envLicenseKey) {
      updateLicenseInfo({
        key: envLicenseKey,
        machineId: licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`,
        active: licenseInfo?.active || false,
        expiresAt: licenseInfo?.expiresAt || '',
        renewDate: licenseInfo?.renewDate || '',
        activationData: licenseInfo?.activationData || null
      });
    }
  }, [envLicenseKey, isMounted, licenseInfo?.active, licenseInfo?.activationData, licenseInfo?.expiresAt, licenseInfo?.key, licenseInfo?.machineId, licenseInfo?.renewDate, updateLicenseInfo]);

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
  const isLicenseBlocked = isExpired || !licenseInfo?.active;

  const parseLicenseDate = (value?: string) => {
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLicenseDate = (value?: string) => {
    const parsed = parseLicenseDate(value);
    return parsed ? format(parsed, 'MMM dd, yyyy') : null;
  };

  const getLicenseStatus = (data: any) =>
    String(
      data?.status ??
      data?.license_status ??
      data?.activation_data?.status ??
      data?.activationData?.status ??
      ''
    ).trim().toLowerCase();

  // Recalculate whenever license info changes (but not while syncing)
  useEffect(() => {
    if (!syncing) {
      setLicenseExpiry(checkLicenseExpiry());
    }
  }, [licenseInfo?.expiresAt, licenseInfo?.active, syncing]);

  // --- Helper to update license state from API response ---
  const updateFromApiResponse = (key: string, machineId: string, data: any): boolean => {
    const expiresAt = data?.expires_at || data?.expiresAt || '';
    if (!expiresAt) return false;

    const dateStr = expiresAt.includes('T') ? expiresAt : expiresAt.replace(' ', 'T');
    const expiryDate = new Date(dateStr);
    if (isNaN(expiryDate.getTime())) return false;

    expiryDate.setHours(23, 59, 59, 999);
    const status = getLicenseStatus(data);
    const isStatusInactive = ['inactive', 'expired', 'revoked', 'suspended', 'blocked', 'disabled'].includes(status);
    const isStillExpired = expiryDate < new Date() || isStatusInactive;

    updateLicenseInfo({
      key,
      machineId,
      active: !isStillExpired,
      expiresAt,
      renewDate: data.renew_date || data.renewDate || new Date().toISOString().replace('T', ' ').split('.')[0],
      activationData: data.activation_data || data.activationData || data
    });

    setLicenseExpiry(checkLicenseExpiry(expiresAt));
    return !isStillExpired;
  };

  // --- Verify license from local Supabase license_keys only ---
  const verifyKey = async (key: string, isInitialSync: boolean = false): Promise<boolean> => {
    const machineId = licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`;

    try {
      // Check only from local Supabase license_keys
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key, machine_id: machineId })
      });
      const verifyData = await verifyRes.json();
      console.log('License verify response (from local license_keys):', verifyData);

      if (verifyData.valid && verifyData.expires_at) {
        const isValid = updateFromApiResponse(key, machineId, verifyData);
        if (!isValid && !isInitialSync) {
          setError('License is expired. Please contact your administrator.');
        } else if (isValid && !isInitialSync) {
          setError('');
        }
        return isValid;
      }

      if (!isInitialSync) {
        setError(
          verifyData?.error ||
          'License is not available in the local database yet. Please press Refresh License Status.'
        );
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

  // --- Refresh button handler: pull fresh dates from verify-license API -> update license_keys -> verify locally ---
  const handleRefreshLicense = async () => {
    const key = envLicenseKey || licenseInfo?.key || manualKey.trim();
    if (!key) {
      setError('Please enter a license key first.');
      return;
    }
    setLicenseChecking(true);
    setError('');

    try {
      const machineId = licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`;
      const previousExpiresAt = licenseInfo?.expiresAt || '';
      const previousExpiryDate = parseLicenseDate(previousExpiresAt);

      // Step 1: Pull fresh expires_at and renew_date from verify-license API and save to license_keys
      const syncRes = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: key,
          machine_id: machineId,
          force_refresh: true
        })
      });
      const syncData = await syncRes.json().catch(() => ({}));
      console.log('verify-license refresh response:', syncData);

      if (!syncRes.ok) {
        setError(syncData?.error || 'Failed to pull latest license data from verify-license API.');
        setLicenseChecking(false);
        return;
      }

      // Step 2: Verify locally from license_keys after refresh
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key, machine_id: machineId })
      });
      const verifyData = await verifyRes.json();
      console.log('Verify response (from local license_keys):', verifyData);

      if (verifyData.valid && verifyData.expires_at) {
        const isValid = updateFromApiResponse(key, machineId, verifyData);
        if (isValid) {
          const expiresAt = verifyData.expires_at || '';
          if (expiresAt) {
            try {
              const currentExpiryDate = parseLicenseDate(expiresAt);
              const formattedDate = formatLicenseDate(expiresAt);
              const wasExtended = !!(
                currentExpiryDate &&
                (!previousExpiryDate || currentExpiryDate.getTime() > previousExpiryDate.getTime())
              );

              if (wasExtended && formattedDate) {
                alert(`License renewed successfully. New expiry date: ${formattedDate}.`);
              } else if (formattedDate) {
                alert(`License is active until ${formattedDate}, but the expiry date was not extended.`);
              }
            } catch { /* ignore date format error */ }
          }
          setLicenseChecking(false);
          return;
        }
      }

      // Show error
      setError(
        verifyData?.error ||
        syncData?.error ||
        'License is still not available in the local database after refresh.'
      );
    } catch (err) {
      console.error('License refresh error:', err);
      setError('Failed to sync license. Please try again.');
    }

    setLicenseChecking(false);
  };

  // --- Check Activation Status from Supabase ---
  const handleCheckActivationStatus = async () => {
    const key = envLicenseKey || licenseInfo?.key || manualKey.trim();
    if (!key) {
      setError('Please enter a license key first.');
      return;
    }
    setLicenseChecking(true);
    setError('');

    try {
      const machineId = licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`;

      // Check from local Supabase license_keys only
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key, machine_id: machineId })
      });
      const data = await response.json();
      console.log('Check status response (from local license_keys):', data);

      if (data.valid && data.expires_at) {
        const isValid = updateFromApiResponse(key, machineId, data);
        if (isValid) {
          try {
            const formattedDate = format(new Date(data.expires_at.replace(' ', 'T')), 'MMM dd, yyyy');
            alert(`License active until ${formattedDate}! (from local database)`);
          } catch { /* ignore date format error */ }
        } else {
          setError('License found but expired. Try "Refresh License Status" to check the latest status.');
        }
      } else {
        setError(data.error || 'License is not available in the local database yet. Try "Refresh License Status".');
      }
    } catch (err) {
      setError('Failed to check activation status.');
    }

    setLicenseChecking(false);
  };

  // --- Initial local verification on mount ---
  useEffect(() => {
    if (!isMounted) return;
    
    const initConfig = async () => {
      try {
        await checkSupabaseConfig();
      } catch (err) {
        console.error('Failed to check Supabase config:', err);
        setSupabaseError('Failed to connect to database. Please check your connection.');
      }
    };
    initConfig();
  }, [checkSupabaseConfig, isMounted]);

  const hasSynced = useRef(false);
  useEffect(() => {
    if (!isMounted) {
      setSyncing(false);
      setInitialSyncComplete(true);
      return;
    }
    
    // Timeout to prevent infinite loading
    const syncTimeout = setTimeout(() => {
      if (syncing) {
        console.warn('Sync timeout reached, proceeding to login');
        setSyncing(false);
        setInitialSyncComplete(true);
      }
    }, 15000); // 15 second timeout

    if (!(envLicenseKey || licenseInfo?.key)) {
      clearTimeout(syncTimeout);
      setSyncing(false);
      setInitialSyncComplete(true);
      return;
    }
    if (hasSynced.current) {
      clearTimeout(syncTimeout);
      return;
    }
    hasSynced.current = true;

    const sync = async () => {
      setError(''); // Clear any previous errors before syncing
      try {
        // Local-only license gate on page load
        await verifyKey(envLicenseKey || licenseInfo.key, true);
      } catch (err) {
        console.error('Initial sync error:', err);
        // Don't block login on local verification errors - allow user to proceed
      }
      setSyncing(false);
      setInitialSyncComplete(true);
    };
    sync();

    return () => clearTimeout(syncTimeout);
  }, [envLicenseKey, licenseInfo?.key, isMounted]);

  // --- Login handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isExpired || !licenseInfo?.active) {
        setError('License is expired or inactive. Please contact your administrator.');
        return;
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .ilike('name', name)
            .eq('pin', pin)
            .eq('status', 'active')
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No rows returned - credentials not found
              setError('Invalid name or PIN');
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
              console.warn('Supabase connection failed:', error);
              setSupabaseError('Database connection lost. Please try again.');
            } else {
              console.error('Login error:', error);
              setError('Login failed: ' + error.message);
            }
          } else if (data) {
            login(data as Employee);
            router.push('/');
            return;
          }
        } catch (dbError: any) {
          console.warn('Database query failed:', dbError);
          setSupabaseError('Database unavailable. Please try again.');
          setError('Unable to sign in while database is unavailable.');
        }
      } else {
        setSupabaseError('Database not configured.');
        setError('Unable to sign in because database is not configured.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // --- Has a stored key? ---
  const hasKey = !!(envLicenseKey || licenseInfo?.key);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 ring-1 ring-zinc-200/80">
        <CardHeader className="space-y-2 text-center px-6 pt-8 pb-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            {!isMounted || syncing ? <Loader2 className="h-7 w-7 text-white animate-spin" /> : <Lock className="h-7 w-7 text-white" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Demios POS</CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            {!isMounted
              ? 'Loading...'
              : syncing
                ? 'Checking license status...'
                : 'Enter your credentials to access the system'}
          </CardDescription>
          {supabaseError && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              {supabaseError}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-8">
          {!isMounted || syncing ? (
            <div className="py-6 flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm">{!isMounted ? 'Loading...' : 'Verifying activation...'}</p>
            </div>
          ) : (
            <>
              {/* Block login when license is expired or missing */}
              {isLicenseBlocked && (
                <div className="space-y-3 mb-4">
                  <Alert className="bg-gradient-to-br from-amber-50 via-white to-orange-50/30 border-amber-200 shadow-lg overflow-hidden p-0 border-l-4 border-l-amber-500">
                    <div className="p-4 flex gap-3">
                      <div className="shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-inner border border-amber-200/50">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                      <div className="space-y-1 my-auto min-w-0">
                        <AlertTitle className="text-amber-950 font-black text-sm leading-none">verify-license Status Required</AlertTitle>
                        <AlertDescription className="text-amber-800 text-xs leading-snug font-medium">
                          {getLicenseStatus(licenseInfo?.activationData) ? (
                            <p>
                              Current API status: <span className="font-bold uppercase">{getLicenseStatus(licenseInfo?.activationData)}</span>.
                              Sign in is disabled.
                            </p>
                          ) : licenseInfo?.expiresAt ? (
                            <p>verify-license / local `license_keys` reports this license expired on {formatLicenseDate(licenseInfo.expiresAt) || licenseInfo.expiresAt}. Sign in is disabled.</p>
                          ) : (
                            <p>No active license was returned by verify-license or found in local `license_keys`. Sign in is disabled.</p>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                  {hasKey && (
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
                      {licenseChecking ? 'Refreshing...' : 'Refresh License Status'}
                    </Button>
                  )}
                </div>
              )}

              {!isLicenseBlocked && !hasKey && (
                <div className="space-y-2">
                  <Label htmlFor="license-key" className="text-sm font-semibold text-zinc-700">License Key</Label>
                  <Input
                    id="license-key"
                    placeholder="POS-XXXX-XXXX-XXXX-XXXX"
                    className="h-12 text-base rounded-xl border-zinc-200 focus:border-indigo-400 focus:ring-indigo-100 font-mono uppercase"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                  />
                </div>
              )}
              {envLicenseKey && (
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-600 font-mono">
                  License Key: {envLicenseKey}
                </div>
              )}

              {error && initialSyncComplete && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {!isLicenseBlocked && licenseInfo?.active && (
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
                        placeholder="******"
                        className="pl-10 h-12 text-base rounded-xl border-zinc-200 focus:border-indigo-400 focus:ring-indigo-100"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {licenseInfo?.active && daysRemaining >= 0 && daysRemaining <= 7 && (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
