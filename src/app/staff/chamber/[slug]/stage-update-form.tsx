'use client';

import { useActionState } from 'react';
import { updateChamberStageAction } from './actions';
import { initialUpdateStageActionState } from './stage-update-state';

type StageUpdateFormProps = {
  slug: string;
  currentState: string;
  canEdit: boolean;
  stageOptions: string[];
};

export function StageUpdateForm({ slug, currentState, canEdit, stageOptions }: StageUpdateFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateChamberStageAction,
    initialUpdateStageActionState,
  );

  return (
    <form action={formAction} className='space-y-4'>
      <input type='hidden' name='slug' value={slug} />

      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        {stageOptions.map((nextState) => {
          const isCurrent = currentState === nextState;
          return (
            <button
              key={nextState}
              type='submit'
              name='state'
              value={nextState}
              disabled={!canEdit || isPending}
              className={`relative h-11 rounded-xl border px-4 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isCurrent
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {isCurrent && (
                <span className='mr-2 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 align-middle' />
              )}
              {nextState}
            </button>
          );
        })}
      </div>

      {isPending && (
        <p className='text-xs text-zinc-500'>Saving update…</p>
      )}

      {state.message && (
        <p
          aria-live='polite'
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            state.status === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : state.status === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
