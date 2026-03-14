'use client';

import { usePosStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from 'lucide-react';

export function TopBar() {
  const { generalSettings, updateGeneralSettings } = usePosStore();

  const handleLanguageChange = (value: 'en' | 'lo' | 'th') => {
    updateGeneralSettings({
      ...generalSettings,
      language: value
    });
  };

  return (
    <div className="h-16 border-b border-zinc-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="hidden lg:block">
        <h1 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
          {generalSettings?.storeName || 'Supabase POS'}
        </h1>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 bg-zinc-50/80 px-3 py-1.5 rounded-xl border border-zinc-100">
          <Languages className="h-4 w-4 text-indigo-500" />
          <Select 
            value={generalSettings?.language || 'en'} 
            onValueChange={(v: any) => handleLanguageChange(v)}
          >
            <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent p-0 text-xs font-bold focus:ring-0">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-zinc-200 shadow-2xl">
              <SelectItem value="en" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇺🇸 English</span>
              </SelectItem>
              <SelectItem value="lo" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇱🇦 ລາວ (Lao)</span>
              </SelectItem>
              <SelectItem value="th" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇹🇭 ไทย (Thai)</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
