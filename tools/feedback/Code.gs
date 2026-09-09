/**
 * The feedback inbox, as a Google Apps Script web app.
 *
 * This is not part of the build. It is pasted into the Apps Script project bound to one Google
 * Sheet and deployed as a web app; the deployment URL becomes the FEEDBACK_ENDPOINT the games are
 * built with. Setup is in `docs/FEEDBACK.md`.
 *
 * It answers one kind of POST, from `src/shared/feedback.ts`:
 *
 *   { kind: 'feedback', game, email, message, elapsed, hp, version, client }
 *       Check it is plausibly a person, append a row to the Feedback tab, and email the owner.
 *
 * A GET is a health check and answers {"ok":true,"service":"feedback"}.
 *
 * ONE ENDPOINT, EVERY GAME. Nothing here knows which games exist: `game` is whatever string the
 * page sends and lands in its own column. Adding a game is passing a new string on the client —
 * there is no list here to keep in step, deliberately, because a list that can be out of date is a
 * game whose feedback silently vanishes.
 *
 * THIS IS A SEPARATE SPREADSHEET AND A SEPARATE SCRIPT FROM THE INVITE GATE, ON PURPOSE. This
 * endpoint is world-writable — it has to be, a stranger with a bug report has no invite — and the
 * gate's is the guest list for every game. Sharing a deployment would mean publishing the gate's
 * URL in every bundle, letting one bug here reach the Codes tab, and letting a flood of feedback
 * burn the daily script quota that the front door of every game depends on.
 *
 * WHY THE BODY ARRIVES AS text/plain: a JSON content-type would make the browser send a CORS
 * preflight, and an Apps Script web app has no way to answer one. `e.postData.contents` is the
 * JSON either way. Same trick as the gate.
 */

/** The spreadsheet this writes to. Leave '' to use the bound sheet. */
var SHEET_ID = '';

/** Where the "you have feedback" note goes. Leave '' for no email — the rows still land. */
var NOTIFY_EMAIL = '';

var FEEDBACK_TAB = 'Feedback';
var BLOCKED_TAB = 'Blocked';

/**
 * Cloudflare Turnstile, off until a secret is set.
 *
 * Empty is the normal state and means no verification happens and no outside call is made — which
 * also keeps this script's authorisation to "your spreadsheet and your Gmail" alone. Setting it
 * turns the check on and adds UrlFetchApp to what the script asks for, so re-authorising is
 * expected the first time. See docs/FEEDBACK.md; the client must be given the matching site key.
 */
var TURNSTILE_SECRET = '';

/**
 * The floor on how long a person takes to write feedback, in seconds.
 *
 * A bot posts the instant it finds the form. Somebody typing a sentence does not. This is the
 * cheapest filter there is and it costs a real visitor nothing — by the time they have typed an
 * email address the clock is long past.
 *
 * IT IS CLIENT-REPORTED AND FORGEABLE, like everything else the browser sends. Read it as "this
 * submission did not even bother to look human", never as proof that one did.
 */
var MIN_SECONDS = 3;

/** Caps. A message past this is cut, not refused: half a bug report beats none. */
var MAX_MESSAGE = 4000;
var MAX_EMAIL = 254;

/**
 * How many rows to accept in one hour before the tab stops growing.
 *
 * Apps Script hands doPost the body and nothing else — no client IP, no headers — so there is no
 * per-visitor rate limit to be had here, only a global one. It is set well above any plausible
 * hour of real feedback and well below anything that would fill a spreadsheet.
 */
var ACCEPT_CAP_PER_HOUR = 60;

/** And how many notification emails, so a flood cannot spend the day's mail quota. */
var EMAIL_CAP_PER_HOUR = 10;

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.kind === 'feedback') return json_(handleFeedback_(body));
    return json_({ ok: false, reason: 'unknown-kind' });
  } catch (err) {
    return json_({ ok: false, reason: 'error', detail: String(err) });
  }
}

/** A GET is only ever a human checking the deployment is alive. */
function doGet() {
  return json_({ ok: true, service: 'feedback' });
}

function handleFeedback_(body) {
  var game = String(body.game || '').slice(0, 60);
  var email = String(body.email || '').trim().slice(0, MAX_EMAIL);
  var message = String(body.message || '').trim().slice(0, MAX_MESSAGE);

  // The honeypot: a field no visitor can see and no visitor can fill. Anything in it is a bot that
  // filled the form by walking its inputs, which is most of them.
  if (String(body.hp || '') !== '') return block_(game, email, 'honeypot', body);

  // Too fast to have been typed.
  if (Number(body.elapsed || 0) < MIN_SECONDS * 1000) return block_(game, email, 'too-fast', body);

  if (!message) return { ok: false, reason: 'no-message' };
  // Deliberately the loosest possible check: something, an @, something, a dot, something. A real
  // address that this rejects is a person turned away for nothing, and the address is unverified
  // either way — it is a reply path, not an identity.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, reason: 'bad-email' };

  if (TURNSTILE_SECRET && !turnstileOk_(body.turnstile)) return block_(game, email, 'turnstile', body);

  var n = bump_('accepted');
  if (n > ACCEPT_CAP_PER_HOUR) {
    // One line, once, rather than a spreadsheet full of somebody's loop.
    if (n === ACCEPT_CAP_PER_HOUR + 1) {
      append_(BLOCKED_TAB, blockedHeader_(), [new Date(), game, '', 'FLOOD — over ' +
        ACCEPT_CAP_PER_HOUR + ' accepted this hour; further rows suppressed until the hour turns',
        '', '', '', '', '']);
    }
    // The visitor is told it worked, because from where they stand it did: they wrote something
    // honest and there is nothing they could do differently. The FLOOD line is the owner's problem.
    return { ok: true };
  }

  var c = body.client || {};
  append_(FEEDBACK_TAB, [
    'when', 'game', 'email', 'message', 'who', 'version',
    'screen', 'timezone (self-reported)', 'language', 'user agent', 'came from', 'handled',
  ], [
    new Date(), game, email, message, String(body.who || ''), String(body.version || ''),
    c.screen || '', c.tz || '', c.lang || '', c.ua || '', c.ref || '', '',
  ]);

  notify_(game, email, message);
  return { ok: true };
}

/**
 * A turned-away submission, in its own tab.
 *
 * Separate from Feedback for the same reason the gate keeps Refused apart from Signins: the two
 * are read for different reasons. Feedback is a to-do list; this answers "is anything odd
 * happening", and a burst here should be visible at a glance rather than buried among real
 * messages. The message itself is kept — a false positive here is somebody's bug report, and it
 * should be recoverable rather than merely counted.
 */
function block_(game, email, reason, body) {
  var n = bump_('blocked');
  if (n > ACCEPT_CAP_PER_HOUR) {
    if (n === ACCEPT_CAP_PER_HOUR + 1) {
      append_(BLOCKED_TAB, blockedHeader_(), [new Date(), game, '', 'FLOOD — over ' +
        ACCEPT_CAP_PER_HOUR + ' blocked this hour; further rows suppressed until the hour turns',
        '', '', '', '', '']);
    }
    return { ok: true };
  }
  var c = body.client || {};
  append_(BLOCKED_TAB, blockedHeader_(), [
    new Date(), game, email, String(body.message || '').slice(0, MAX_MESSAGE), reason,
    c.screen || '', c.tz || '', c.lang || '', c.ua || '',
  ]);
  // Answered as a success on purpose. A bot told exactly which check it failed is a bot that tries
  // the next thing; there is nothing to be gained by explaining, and a person who somehow trips one
  // of these is better served by an owner who can see the row than by an error they cannot act on.
  return { ok: true };
}

function blockedHeader_() {
  return ['when', 'game', 'email', 'message', 'why',
          'screen', 'timezone (self-reported)', 'language', 'user agent'];
}

/** Count something in the current hour, and return the new count. */
function bump_(what) {
  var cache = CacheService.getScriptCache();
  var key = what + '-' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 3600);
  return n;
}

/**
 * Cloudflare Turnstile, when a secret is configured.
 *
 * Fails CLOSED: a token that cannot be verified is not accepted. That is the opposite of the
 * gate's "endpoint unreachable means the door stays shut" for the same underlying reason — the
 * check is worthless if failing it is a way past it. Turning the check off is emptying the secret,
 * which is a decision, not an outage.
 */
function turnstileOk_(token) {
  if (!token) return false;
  try {
    var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: TURNSTILE_SECRET, response: String(token) },
      muteHttpExceptions: true,
    });
    return JSON.parse(res.getContentText()).success === true;
  } catch (err) {
    return false;
  }
}

/**
 * The note that says there is something to read.
 *
 * Capped per hour of its own accord: a consumer Google account can send on the order of 100 emails
 * a day, and a spammer who got past everything above should not be able to spend them — the rows
 * are the record, the email is only the nudge. `getRemainingDailyQuota` is checked as well so a
 * spent quota is a skipped note rather than an exception that loses the row.
 */
function notify_(game, email, message) {
  if (!NOTIFY_EMAIL) return;
  if (bump_('emailed') > EMAIL_CAP_PER_HOUR) return;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      // The address goes in the subject so the inbox list is already useful, and replying to the
      // note reaches the player rather than yourself.
      subject: 'Feedback · ' + (game || 'unknown') + ' · ' + email,
      replyTo: email,
      body: message + '\n\n— ' + email + '\n' + (book_().getUrl() || ''),
    });
  } catch (err) { /* the row is the record; a failed note is never worth losing it over */ }
}

function book_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

/** Append one row, creating the tab and its header the first time it is used. */
function append_(tabName, header, row) {
  var book = book_();
  var tab = book.getSheetByName(tabName);
  if (!tab) {
    tab = book.insertSheet(tabName);
    tab.appendRow(header);
    tab.setFrozenRows(1);
  }
  tab.appendRow(row);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// The owner's side
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Feedback')
    .addItem('Blocked attempts (last 20)', 'showBlocked')
    .addItem('Send myself a test note', 'testNotify')
    .addToUi();
}

function showBlocked() {
  var ui = SpreadsheetApp.getUi();
  var tab = book_().getSheetByName(BLOCKED_TAB);
  var last = tab ? tab.getLastRow() : 0;
  if (last < 2) { ui.alert('Blocked attempts', 'Nothing has been turned away.', ui.ButtonSet.OK); return; }
  var from = Math.max(2, last - 19);
  var rows = tab.getRange(from, 1, last - from + 1, 5).getValues();
  var lines = rows.map(function (r) {
    return Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), 'd MMM HH:mm') +
      '  ' + (r[1] || '—') + '  [' + (r[4] || '?') + ']  ' + String(r[3] || '').slice(0, 80);
  });
  ui.alert('Blocked attempts (last ' + lines.length + ')', lines.join('\n'), ui.ButtonSet.OK);
}

function testNotify() {
  var ui = SpreadsheetApp.getUi();
  if (!NOTIFY_EMAIL) { ui.alert('Set NOTIFY_EMAIL at the top of the script first.'); return; }
  notify_('test', NOTIFY_EMAIL, 'This is a test note from the feedback script.');
  ui.alert('Sent to ' + NOTIFY_EMAIL + '. If nothing arrives, check the hourly cap and the spam folder.');
}
