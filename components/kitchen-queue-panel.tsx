'use client';

import { useEffect, useState } from 'react';
import { ChefHat, RefreshCw, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePosStore, type KitchenQueueJob } from '@/lib/store';
import { format } from 'date-fns';

const TRANSLATIONS = {
  en: {
    kitchenQueue: 'Kitchen Queue',
    pendingPrint: 'Pending kitchen print',
    noJobs: 'No kitchen print jobs',
    items: 'items',
    retry: 'Retry',
    dismiss: 'Dismiss',
    savedToDb: 'Saved to order',
    printing: 'Printing…',
    failed: 'Print failed',
    done: 'Sent to kitchen',
    retryAll: 'Retry failed',
    clearDone: 'Clear completed',
  },
  lo: {
    kitchenQueue: 'ຄິວສົ່ງຄົວ',
    pendingPrint: 'ລໍຖ້າປຣິ້ນໄປຄົວ',
    noJobs: 'ບໍ່ມີລາຍການໃນຄິວ',
    items: 'ລາຍການ',
    retry: 'ລອງໃໝ່',
    dismiss: 'ປິດ',
    savedToDb: 'ບັນທຶກໃນອໍເດີແລ້ວ',
    printing: 'ກຳລັງປຣິ້ນ…',
    failed: 'ປຣິ້ນບໍ່ສຳເລັດ',
    done: 'ສົ່ງຄົວແລ້ວ',
    retryAll: 'ລອງໃໝ່ທີ່ລົ້ມເຫຼວ',
    clearDone: 'ລຶບທີ່ສຳເລັດ',
  },
  th: {
    kitchenQueue: 'คิวส่งครัว',
    pendingPrint: 'รอพิมพ์ไปครัว',
    noJobs: 'ไม่มีรายการในคิว',
    items: 'รายการ',
    retry: 'ลองใหม่',
    dismiss: 'ปิด',
    savedToDb: 'บันทึกในออเดอร์แล้ว',
    printing: 'กำลังพิมพ์…',
    failed: 'พิมพ์ไม่สำเร็จ',
    done: 'ส่งครัวแล้ว',
    retryAll: 'ลองใหม่ที่ล้มเหลว',
    clearDone: 'ลบที่เสร็จแล้ว',
  },
};

function isKitchenJobRetryAnimating(job: KitchenQueueJob) {
  return job.status === 'printing'
    || (job.retryAnimatingUntil != null && Date.now() < job.retryAnimatingUntil);
}

function statusLabel(job: KitchenQueueJob, t: (typeof TRANSLATIONS)['en']) {
  if (isKitchenJobRetryAnimating(job)) return t.printing;
  if (job.status === 'pending') return t.savedToDb;
  if (job.status === 'failed') return t.failed;
  return t.done;
}

function StatusIcon({ job }: { job: KitchenQueueJob }) {
  const { status } = job;
  if (isKitchenJobRetryAnimating(job)) {
    return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
  }
  if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  return <ChefHat className="h-4 w-4 text-orange-600" />;
}

export function KitchenQueueButton() {
  const {
    kitchenPrintQueue,
    retryKitchenJob,
    retryAllFailedKitchenJobs,
    dismissKitchenJob,
    clearCompletedKitchenJobs,
    generalSettings,
  } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const [open, setOpen] = useState(false);
  const [, setAnimationTick] = useState(0);

  // Re-render while retry animation is active so spinner stops after 2s
  useEffect(() => {
    const hasAnimating = kitchenPrintQueue.some(
      (job) => job.retryAnimatingUntil != null && Date.now() < job.retryAnimatingUntil
    );
    if (!hasAnimating) return;
    const timer = window.setInterval(() => {
      setAnimationTick((tick) => tick + 1);
    }, 250);
    return () => window.clearInterval(timer);
  }, [kitchenPrintQueue]);

  const activeCount = kitchenPrintQueue.filter(
    (j) => j.status === 'pending' || j.status === 'printing' || j.status === 'failed'
  ).length;
  const failedCount = kitchenPrintQueue.filter((j) => j.status === 'failed').length;
  const retryAllAnimating = kitchenPrintQueue.some((job) => isKitchenJobRetryAnimating(job));

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative border-orange-300 text-orange-800 hover:bg-orange-50 font-bold"
        onClick={() => setOpen(true)}
        title={t.kitchenQueue}
      >
        <ChefHat className="h-4 w-4 mr-1.5" />
        {t.kitchenQueue}
        {activeCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 bg-orange-50">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-orange-700" />
                <h3 className="font-bold text-zinc-900">{t.kitchenQueue}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {kitchenPrintQueue.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">{t.noJobs}</p>
              ) : (
                kitchenPrintQueue.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-zinc-200 p-3 flex items-start gap-3"
                  >
                    <StatusIcon job={job} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-zinc-900 truncate">{job.label}</div>
                      <div className="text-xs text-zinc-500">
                        {job.itemCount} {t.items} · {format(new Date(job.createdAt), 'HH:mm:ss')}
                      </div>
                      <div className="text-xs mt-0.5 text-zinc-600">{statusLabel(job, t)}</div>
                      {job.lastError && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={job.lastError}>
                          {job.lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {(job.status === 'failed'
                        || (job.status === 'pending' && job.retryAnimatingUntil != null)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isKitchenJobRetryAnimating(job)}
                          onClick={() => retryKitchenJob(job.id)}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isKitchenJobRetryAnimating(job) ? 'animate-spin' : ''}`} />
                          {t.retry}
                        </Button>
                      )}
                      {(job.status === 'done' || job.status === 'failed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => dismissKitchenJob(job.id)}
                        >
                          {t.dismiss}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-200 p-3 flex gap-2 justify-end bg-zinc-50">
              {(failedCount > 0 || retryAllAnimating) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={retryAllAnimating}
                  onClick={() => retryAllFailedKitchenJobs()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${retryAllAnimating ? 'animate-spin' : ''}`} />
                  {t.retryAll}
                </Button>
              )}
              {kitchenPrintQueue.some((j) => j.status === 'done') && (
                <Button variant="outline" size="sm" onClick={() => clearCompletedKitchenJobs()}>
                  {t.clearDone}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
