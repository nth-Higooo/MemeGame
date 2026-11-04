# Admin guide

## Before an event

1. Sign in at `/admin/<room-code>` with the event Admin account. Use HTTPS in production. An Admin account is created through the protected bootstrap process; remove/rotate the one-time bootstrap password afterward.
2. In Content Studio, upload original or licensed GIF/WebP/PNG/JPEG files, create and order questions, attach optional images, choose the meme library, and save a preset. Uploads are validated; default maximum is 10 MiB and the server hard cap is 20 MiB.
3. Confirm the preset's mode, round/vote durations, participation and winner scoring, and tie rule. Individual play is supported. Use Dry Run to rehearse both modes; it is isolated in browser memory and does not change live game records.
4. Create a live session from the selected pack and preset. The room receives a shareable code and join QR. Keep the Admin and Judge credentials private.
5. Open `/display/<room-code>` on the projector. The display URL is read-only and should never contain an Admin token. A Judge, if needed, signs in separately at `/judge/<room-code>` with a credential provisioned by Admin.

## Operate a round

- Review the live player list and connection state. Ask players to choose distinct nicknames.
- Start the question/submission phase from Admin. The server controls the deadline; browser clocks only render it. A late action is rejected. Pause/resume applies to the server deadline; it cannot reopen a phase already expired.
- Reveal only when ready. Submission authors and vote totals are privileged Admin information; the projector receives anonymous submissions.
- **Talent Mode:** record the talent/Judge's chosen submission. Confirm the proposed winner before publishing.
- **Community Mode:** start voting after reveal, then close it or wait for the server deadline. The server rejects self-votes and duplicate votes and computes the provisional winner using the preset tie rule. Confirm before publication.
- Use skip/stop only after checking the current round and consequences. Published rounds are immutable. Correct a published score with an audited correction and written reason; do not edit D1 manually.
- Use versioned confirmation dialogs for override/publication. If the state changed while a dialog was open, close it and inspect the new proposal.
- Reconnect Admin after a disconnect and wait for a current state snapshot before issuing controls. The game engine retains authoritative deadlines while Admin is disconnected.

## Recovery

For a timer/checkpoint issue, use the Admin recovery/sync control only after verifying that D1 is healthy and the visible round/version is correct. The recovery path repairs the checkpoint/alarm from durable records; it is not a way to undo a published winner. See [troubleshooting](troubleshooting.md) for incidents and [backup and restore](backup-and-restore.md) for recovery data.
