# Admin agenda redesign

Requested UI/behavior for the Juliana admin area:
- Weekly grid Monday-Friday.
- Hour slots from 06:00 through 24:00.
- One click toggles recurring availability/block for a weekday + hour.
- Available slots are green/selectable.
- Manually blocked slots are gray/unavailable.
- Slots already occupied by a real student appointment are gray/occupied and cannot be toggled as a manual block.
- Public clients must only see availability state/date/time, never private block reasons or other clients' data.
- Admin-only mutations remain protected by authentication/server-side authorization.
- Preserve existing appointment records and current payment-gated booking flow.
- Add a Save action if the implementation batches changes; otherwise each toggle must persist safely.
