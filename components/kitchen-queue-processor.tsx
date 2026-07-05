'use client';

import { useEffect, useRef } from 'react';
import { usePosStore } from '@/lib/store';
import { printKitchenTickets } from '@/lib/kitchen-print';

const AUTO_RETRY_INTERVAL_MS = 5000;

export function KitchenQueueProcessor() {
  const kitchenPrintQueue = usePosStore((state) => state.kitchenPrintQueue);
  const setKitchenJobStatus = usePosStore((state) => state.setKitchenJobStatus);
  const dismissKitchenJob = usePosStore((state) => state.dismissKitchenJob);
  const processingRef = useRef(false);

  useEffect(() => {
    const job = kitchenPrintQueue.find((entry) => entry.status === 'pending');
    if (!job || processingRef.current) return;

    processingRef.current = true;
    setKitchenJobStatus(job.id, 'printing');

    let items: any[] = [];
    try {
      items = JSON.parse(job.cartSnapshot) as any[];
    } catch {
      setKitchenJobStatus(job.id, 'failed', 'Invalid queue data');
      processingRef.current = false;
      return;
    }

    void printKitchenTickets(items, { tableNumber: job.tableNumber })
      .then(() => dismissKitchenJob(job.id))
      .catch((error: any) => {
        console.error('[KITCHEN QUEUE] Print failed:', error);
        setKitchenJobStatus(job.id, 'failed', error?.message || 'Print failed');
      })
      .finally(() => {
        processingRef.current = false;
      });
  }, [kitchenPrintQueue, setKitchenJobStatus, dismissKitchenJob]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (processingRef.current) return;

      const { kitchenPrintQueue: queue, retryAllFailedKitchenJobs } = usePosStore.getState();
      const hasFailed = queue.some((job) => job.status === 'failed');
      const isBusy = queue.some((job) => job.status === 'pending' || job.status === 'printing');

      if (hasFailed && !isBusy) {
        retryAllFailedKitchenJobs();
      }
    }, AUTO_RETRY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
