'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

interface UpdateTabProps {
  translations: {
    systemUpdate: string;
    currentVersion: string;
    latestVersion: string;
    checkForUpdates: string;
    checking: string;
    updateNow: string;
    updating: string;
    updateAvailable: string;
    upToDate: string;
    updateFailed: string;
    updateSuccess: string;
    updateConfirm: string;
    updateDescription: string;
  };
}

export function UpdateTab({ translations: t }: UpdateTabProps) {
  const [updateStatus, setUpdateStatus] = useState<{
    checking: boolean;
    updating: boolean;
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    error: string | null;
  }>({
    checking: false,
    updating: false,
    currentVersion: '',
    latestVersion: '',
    updateAvailable: false,
    error: null
  });

  const checkForUpdates = async () => {
    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      const response = await fetch('/api/version');
      const data = await response.json();
      
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        currentVersion: data.version,
        latestVersion: data.latestVersion || data.version,
        updateAvailable: data.updateAvailable || false
      }));
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        error: t.updateFailed
      }));
    }
  };

  const performUpdate = async () => {
    if (!confirm(t.updateConfirm)) {
      return;
    }
    
    setUpdateStatus(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const response = await fetch('/api/update', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert(t.updateSuccess);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setUpdateStatus(prev => ({
        ...prev,
        updating: false,
        error: error.message || t.updateFailed
      }));
    }
  };

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
        <CardTitle className="text-zinc-800">{t.systemUpdate}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="text-sm text-zinc-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
          {t.updateDescription}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.currentVersion}</Label>
            <Input 
              value={updateStatus.currentVersion || 'Loading...'} 
              disabled 
              className="bg-zinc-50"
            />
          </div>
          
          {updateStatus.updateAvailable && (
            <div className="space-y-2">
              <Label>{t.latestVersion}</Label>
              <Input 
                value={updateStatus.latestVersion} 
                disabled 
                className="bg-green-50 border-green-200"
              />
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={checkForUpdates}
            disabled={updateStatus.checking || updateStatus.updating}
            className="flex-1 gap-2"
            variant="outline"
          >
            <RefreshCw className={updateStatus.checking ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {updateStatus.checking ? t.checking : t.checkForUpdates}
          </Button>
          
          {updateStatus.updateAvailable && (
            <Button
              onClick={performUpdate}
              disabled={updateStatus.updating || updateStatus.checking}
              className="flex-1 gap-2"
            >
              <RefreshCw className={updateStatus.updating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {updateStatus.updating ? t.updating : t.updateNow}
            </Button>
          )}
        </div>
        
        {updateStatus.error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            {updateStatus.error}
          </div>
        )}
        
        {updateStatus.updateAvailable && !updateStatus.error && (
          <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
            {t.updateAvailable}
          </div>
        )}
        
        {!updateStatus.updateAvailable && updateStatus.currentVersion && !updateStatus.error && (
          <div className="text-zinc-600 text-sm bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            {t.upToDate}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
