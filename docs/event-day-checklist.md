# Event Day checklist

This is an operator checklist; each unchecked item still needs venue verification. See the detailed [Phase 08 checklist](event-day.md) and [troubleshooting guide](troubleshooting.md).

## One to two days before

- [ ] Confirm a verified deployment URL, HTTPS, account quota, and current Cloudflare billing/Free plan terms.
- [ ] Run `pnpm check`, `pnpm audit --prod --audit-level moderate`, and the Player, Display, Admin, and bounded local QA suites. Never aim the 30/50 browser QA at production.
- [ ] Review/backup the production database and test the encrypted backup can be authenticated and unpacked.
- [ ] Confirm all migrations are applied before release. Record Worker version and rollback instructions.
- [ ] Rehearse the complete Talent and Community modes in Admin Dry Run; verify a live session separately.
- [ ] Verify content rights and test every selected GIF on a phone and projector. Keep files small and use original or licensed memes.
- [ ] Rehearse on venue Wi-Fi using a real iPhone Safari, Android Chrome, Admin device, and projector. Test network loss/reconnect and a tie/empty round.
- [ ] Assign one Admin operator, one display operator, and one network/helper. Keep Judge credentials separate and private.

## 60 minutes before doors

- [ ] Power and connect the laptop, projector, router, and backup hotspot. Disable laptop sleep.
- [ ] Create the live room from the reviewed content pack and preset. Verify mode, question order, scoring, durations, and tie rule.
- [ ] Open `/display/<code>` on the external display, select fullscreen (F), and leave Admin on a separate screen/device.
- [ ] Scan the QR from a guest phone on guest Wi-Fi. Confirm the URL is public HTTPS, not localhost.
- [ ] Log in to Judge separately if used; never show that device on the projector.
- [ ] Keep the room in LOBBY until ready. Ask participants to use unique nicknames and one browser tab.
- [ ] Confirm current quota and a working network fallback. Do not run load tests during the event.

## During each round

- [ ] Read the prompt and mode aloud. Start submissions and monitor progress/deadline.
- [ ] If anything is uncertain, pause before the deadline and wait for a fresh authoritative state after reconnection.
- [ ] Reveal when ready. Check the projector only; avoid sharing Admin's view.
- [ ] Run Talent selection or Community voting as configured. Confirm the proposed result before publication.
- [ ] Check the published winner and score. Record incidents and any reasoned score correction.

## After the event

- [ ] Confirm the final leaderboard and that all rooms are finished.
- [ ] Create an encrypted backup while writes are quiescent; store the file and passphrase separately.
- [ ] Review Cloudflare usage and billing, then archive the event run sheet without secrets or participant reconnect tokens.
- [ ] Rotate/remove temporary credentials and restrict access to result backups.
