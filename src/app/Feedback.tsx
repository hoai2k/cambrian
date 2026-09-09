import { useEffect, useRef, useState } from 'react';
import { ACTIVE_ERA } from '../content';
import { CloseIcon } from './icons';
import { feedbackEnabled, MIN_COMPOSE_MS, sendFeedback, TURNSTILE_KEY } from '../shared/feedback';

/**
 * "Have Feedback?" — the corner of the choose-your-creature screen, and the dialog behind it.
 *
 * WHY HERE. It is the one screen every player passes through, sits at for a few seconds, and comes
 * back to between matches — so it is where somebody who has just been annoyed by something is
 * actually standing. It is deliberately not in the game: nobody stops mid-hunt to write, and a
 * button that can be hit by accident during a match is worse than no button.
 *
 * BOTH GAMES, ONE COMPONENT. `Select.tsx` is shared by the Cambrian and the Devonian, so this
 * mounts once and serves both; `ACTIVE_ERA.id` is what tells their rows apart in the sheet. A third
 * era would be carried along without touching this file.
 *
 * IT DOES NOT EXIST UNCONFIGURED. No endpoint compiled in, no button — see `shared/feedback.ts`.
 *
 * The spam story, in full, because it is the whole reason this is more than a textarea:
 *
 *  - The honeypot below is a real input, positioned off-screen and hidden from assistive
 *    technology, that no visitor can see or tab into. A bot that fills forms by walking their
 *    inputs fills it, and the script drops anything that arrives with it set.
 *  - The clock starts when the dialog opens. Under three seconds is not somebody who typed a
 *    sentence, and Send stays disabled until then anyway, so a person never meets the rule.
 *  - Turnstile is wired but off; see `shared/feedback.ts` for turning it on. Nothing here changes.
 *
 * None of it is a wall. Apps Script cannot see a client IP, so there is no per-visitor rate limit
 * to be had anywhere in this design — the far side caps the whole hour instead. What these three
 * stop is commodity form-spam, which is what actually turns up.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  if (!feedbackEnabled()) return null;
  return (
    <>
      <button className="feedback-button" onClick={() => setOpen(true)}>Have Feedback?</button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}

type State = 'writing' | 'sending' | 'sent' | 'failed';

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opened = useRef(Date.now());
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [state, setState] = useState<State>('writing');
  // Re-renders once when the compose floor passes, so Send can enable itself while they are still
  // typing rather than staying grey until the next keystroke happens to land past it.
  const [, tick] = useState(0);

  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    const t = setTimeout(() => tick((n) => n + 1), MIN_COMPOSE_MS);
    return () => clearTimeout(t);
  }, []);

  const early = Date.now() - opened.current < MIN_COMPOSE_MS;
  const ready = email.trim() !== '' && message.trim() !== '' && !early && state === 'writing';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setState('sending');
    const ok = await sendFeedback({
      game: ACTIVE_ERA.id,
      email: email.trim(),
      message: message.trim(),
      elapsed: Date.now() - opened.current,
      hp,
      turnstile: turnstileToken(),
    });
    setState(ok ? 'sent' : 'failed');
  }

  return (
    <dialog ref={ref} className="tools-dialog feedback-dialog"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <button className="tools-close icon-button" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      <div className="dialog-body">
        <p className="eyebrow">FEEDBACK</p>
        {state === 'sent' ? (
          <>
            <h2>Thank you.</h2>
            <p>It has landed, and it will be read. If it needs an answer you will get one at {email.trim()}.</p>
            <div className="feedback-actions"><button className="ghost" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>Tell us what you think.</h2>
            <p>
              We are always open to suggestions and comments and would love to hear your feedback,
              or of course about any bugs or difficulties you encounter.
            </p>

            <label className="feedback-field">
              <span>Your email</span>
              <input type="email" required value={email} autoComplete="email"
                placeholder="you@example.com" disabled={state === 'sending'}
                onChange={(e) => setEmail(e.target.value)} />
              <small className="dim">So we can reply. It is used for nothing else.</small>
            </label>

            <label className="feedback-field">
              <span>Your message</span>
              <textarea required rows={6} value={message} maxLength={4000}
                disabled={state === 'sending'} placeholder="What happened, or what would you change?"
                onChange={(e) => setMessage(e.target.value)} />
            </label>

            {/* The honeypot. Off-screen rather than display:none — some bots skip what is not
                rendered — and out of the tab order and the accessibility tree, so no visitor,
                sighted or otherwise, can reach it. */}
            <div className="feedback-hp" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input id="feedback-website" name="website" type="text" tabIndex={-1}
                autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>

            {TURNSTILE_KEY && <div className="cf-turnstile" data-sitekey={TURNSTILE_KEY} data-theme="dark" />}

            {state === 'failed' && (
              <p className="feedback-error" role="alert">
                That did not send — the connection or the inbox is having a moment. Try again in a
                minute; nothing you have typed is lost.
              </p>
            )}

            <div className="feedback-actions">
              <button type="button" className="ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="start-button" disabled={!ready}>
                {state === 'sending' ? 'SENDING…' : 'SEND'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

/**
 * Turnstile's answer, when the widget is on the page. It writes into a hidden input of its own
 * making rather than handing anything to React, so this reads the DOM on submit; with no widget
 * there is nothing to read and the script is not checking anyway.
 */
function turnstileToken(): string {
  const el = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
  return el?.value ?? '';
}
