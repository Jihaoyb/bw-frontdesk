# Prototype acceptance checks

These checks capture the agreed implementation baseline. The design interview was completed on October 7, 2026; the checks have not yet been executed against an application.

1. A routine handbook question gets a concise AI answer with an inspectable published source and no staff request.
2. A missing-policy question offers Ask staff. The resulting request retains the conversation and appears in the same demo's operator inbox only after successful saving.
3. A request requiring staff confirmation never becomes an automated service promise. The request card distinguishes known policy from the outstanding decision.
4. Staff can send a follow-up, mark Needs your reply, or send an answer and close. A parent response reopens a closed request. Closure is reversible and does not publish knowledge.
5. An operator reply alone does not improve future automated answers. Explicit publication does. Operators can edit and publish knowledge without an originating request.
6. Staff attribution, timestamps, original questions, and cited policy snapshots survive refresh and later policy edits.
7. Repeated submissions after an uncertain save do not create duplicate requests. A failed save does not claim staff received the request.
8. Parent and Operator views share one session's state. A different browser session cannot read or change that demo through the application. A confirmed reset restores starting data only within its own demo.
9. Outside-office-hours copy does not imply live availability or external notifications. Opening a request does not claim staff has accepted responsibility.
10. Normalized matching counts are labeled accurately and do not claim semantic equivalence.
11. The hosted mobile experience supports the complete parent-to-operator-to-improved-answer loop. The submission explanation stays under one page or the video under two minutes.
12. AI failures preserve the question and offer retry, policy browsing, and staff contact without inventing an answer.
13. AI request limits of 50 per demo session and 500 total per day are enforced on the server, including concurrent requests. Reset does not replenish allowance, and non-AI functionality remains available.
14. The concise written explanation and SVG/PNG architecture diagram match the verified final implementation before submission.

15. A sensitive inquiry (an incident involving a child, a custody or pickup restriction, a billing dispute, a staff complaint) is not answered from policy. It receives a brief acknowledgment and an immediate staff handoff, appears flagged in the operator inbox, and gets no knowledge-update suggestion.
16. The operator view lists every parent question, with or without a staff request, and shows its outcome (answered, clarified, handoff offered, sensitive, failed).

Stretch: if decision time is implemented, a passed time shows missing confirmation without auto-approval or automatic closure. Omit the feature if needed to finish the required loop.
