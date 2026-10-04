/**
 * components/camerlob/FileQueue.tsx
 * The queue below the drop zone: a toolbar, then one FileCard per file.
 *
 * DESIGN DECISIONS (recorded so a later change does not undo them)
 * ------------------------------------------------------------------------
 * 1. THE TOOLBAR ONLY APPEARS WHEN THERE IS SOMETHING TO MANAGE. An empty queue
 *    showing "Clear all · Add more" would offer two controls that do nothing.
 *
 * 2. "ADD MORE" RE-OPENS THE DROP ZONE RATHER THAN OPENING A DIALOG. The brief
 *    avoids modals outright (UI-UX-PRINCIPLES 11.2: inline, not modals), and the
 *    drop zone is two hundred pixels above it, so the user is scrolled right back
 *    to the thing they are extending. It clicks the drop zone's own hidden input
 *    via a shared id, which means the OS file picker is the same one the zone
 *    would have opened — no second code path, no second set of accept rules.
 *
 * 3. "CLEAR ALL" IS A TEXT BUTTON, NOT A PRIMARY ONE. It is destructive, but it
 *    is also trivially reversible by re-dropping, and a filled aqua button here
 *    would out-shout the Convert button that is the reason the user is on this
 *    page. It asks for confirmation only when the queue holds more than five
 *    files, because below that the mistake is cheap and a dialog would be worse
 *    than the mistake.
 *
 * 4. THE LIST IS AN ANNOUNCED REGION. `aria-live="polite"` on the <ul> means a
 *    screen reader hears "5 files queued" as files arrive without the per-file
 *    name spam that a live region on every row would produce.
 */

'use client';

import { AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import { FileCard } from '@/components/camerlob/FileCard';
import { FILE_INPUT_ID } from '@/components/camerlob/UploadZone';
import { MAX_FILES } from '@/lib/constants/limits';
import { cn } from '@/lib/utils/cn';
import { useFileQueue } from '@/hooks/useFileQueue';
import { useConversionStore } from '@/store/conversionStore';

const CONFIRM_THRESHOLD = 5;

export function FileQueue() {
  const queue = useFileQueue();
  const jobs = useConversionStore((state) => state.files);
  const [confirming, setConfirming] = React.useState(false);

  const addMore = React.useCallback(() => {
    const input = document.getElementById(FILE_INPUT_ID);
    if (input instanceof HTMLInputElement) {
      input.click();
      return;
    }
    // The input is unmounted while formats are unchosen; fall back to the zone.
    document.getElementById('camerlob-upload-zone')?.scrollIntoView({ block: 'center' });
  }, []);

  const clearAll = React.useCallback(() => {
    if (jobs.length > CONFIRM_THRESHOLD && !confirming) {
      setConfirming(true);
      return;
    }
    queue.clearAll();
    setConfirming(false);
  }, [confirming, jobs.length, queue]);

  if (jobs.length === 0) return null;

  return (
    <section aria-labelledby="queue-heading" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="queue-heading" className="label-mono-sm">
          Queue
        </h3>

        <div className="flex items-center gap-1">
          {confirming ? (
            <>
              <span className="font-mono text-[11px] text-text-tertiary">Clear {jobs.length}?</span>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-error transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400 enabled:hover:bg-error/10"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400 enabled:hover:text-text-primary"
              >
                No
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={clearAll}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary',
                  'transition-colors duration-150 ease-camerlob-out',
                  'enabled:hover:bg-error/10 enabled:hover:text-error',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                )}
              >
                <Trash2 aria-hidden="true" className="size-3" strokeWidth={1.75} />
                Clear all
              </button>

              <button
                type="button"
                onClick={addMore}
                disabled={queue.isFull}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border border-aqua-500/40 px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-aqua-400',
                  'transition-colors duration-150 ease-camerlob-out',
                  'enabled:hover:border-aqua-500/70 enabled:hover:bg-aqua-500/10',
                  'disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-disabled',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua-400'
                )}
              >
                <Plus aria-hidden="true" className="size-3" strokeWidth={1.75} />
                Add more
                {queue.isFull ? ` (${MAX_FILES}/${MAX_FILES})` : ''}
              </button>
            </>
          )}
        </div>
      </div>

      <ul aria-live="polite" className="mt-3 flex flex-col gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {jobs.map((job, index) => (
            <FileCard key={job.id} job={job} index={index} onRemove={queue.removeFile} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
