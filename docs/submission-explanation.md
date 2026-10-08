# AI Front Desk

*Design draft — update against the working prototype before submission.*

Parents need quick, trustworthy answers. Staff need fewer repeated questions. This prototype is designed for enrolled families at a fictional childcare center, focusing on everyday questions about closures, illness policies, and meals.

The front desk will answer from staff-published policies and show the supporting text. When information is missing or a request needs staff confirmation, parents can ask staff without repeating their question. A request card inside the conversation separates what the handbook says from what staff still needs to confirm. Saving a request never implies that a service has been approved.

Staff will reply in the same conversation and explicitly publish useful policy updates. That creates the central improvement loop: a question reveals a gap, staff fills it, and the next family gets an immediate answer. Staff can also maintain policies directly.

The planned architecture uses a Next.js application on Vercel, OpenAI GPT-6 Luna for grounded responses, and Neon PostgreSQL for policies, conversations, and requests. Each reviewer gets isolated fictional data and can switch between Parent and Operator views to try the complete loop.

The three-hour scope prioritizes trustworthy answers, clear staff follow-up, and explicit knowledge publication. Live staff presence, email/SMS notifications, and document ingestion are deferred. A parent-selected decision time is optional; it would record when an answer is needed without promising a response deadline.

[Architecture diagram (SVG)](architecture.svg) · [PNG](architecture.png)
