# LineCrew UX Flows (ASCII)

Date: April 2, 2026

## 1) Public -> Customer signup -> Post first booking -> Payment -> Job posted

```text
[Entry: /]
   |
   v
[Home CTA: Book / Sign in]
   |
   v
[/auth?intent=customer]
   |
   +--> (new user) create account
   |          |
   |          v
   |    [/auth/verify-email]
   |          |
   |          +--> (token invalid/expired) [error state + resend] --+
   |          |                                                     |
   |          +------------------- success -------------------------+
   |
   +--> (existing user) sign in
              |
              v
      [/dashboard/customer]
              |
              v
    [/dashboard/customer/post-job]
              |
              +--> (validation error) [stay on form + fix fields]
              |
              +--> submit -> [Stripe Checkout]
                               |
                               +--> (payment fail/cancel) [return/retry]
                               |
                               +--> success
                                        |
                                        v
                        [/dashboard/customer/job-posted/success]
                                        |
                                        +--> (poll timeout/error)
                                        |       [processing/uncertain state]
                                        |
                                        +--> confirmed
                                                |
                                                v
                         [/dashboard/customer/job-posted/{jobId}]
                                                |
                                                v
                           [/dashboard/customer/jobs/{jobId}]
[Exit: booking is posted and trackable]
```

## 2) Public -> Line Holder signup -> Profile -> Payout -> Browse jobs -> Accept

```text
[Entry: /]
   |
   v
[Home CTA: Become a Line Holder]
   |
   v
[/auth?intent=waiter]
   |
   +--> create/sign in
              |
              v
      [/auth/verify-email] (if needed)
              |
              v
      [/dashboard/waiter]
              |
              +--> setup checklist gate
              |      - profile basics
              |      - service areas
              |      - verification
              |      - payout setup
              |
              +--> incomplete -> [/dashboard/profile] / [/dashboard/waiter/service-areas]
              |                     |
              |                     +--> (save error) [retry + fix]
              |
              +--> complete
                       |
                       v
            [/dashboard/waiter/browse-jobs]
                       |
                       +--> no matches [empty state]
                       |
                       +--> open booking -> [AcceptJobForm]
                                       |
                                       +--> blocked (setup not ready) [warning]
                                       |
                                       +--> accepted
                                                |
                                                v
                                 [/dashboard/waiter/jobs/{jobId}]
[Exit: waiter has accepted a booking]
```

## 3) Customer tracking -> Waiter status updates -> Handoff QR -> Completion confirm

```text
[Entry: Customer opens /dashboard/customer/jobs/{jobId}]
   |
   v
[BookingTrackingLive + progress tracker]
   |
   +<---------------- Waiter updates status -------------------+
   |                                                          |
   |                                      [Waiter page: /dashboard/waiter/jobs/{jobId}]
   |                                                          |
   +----------------------------------------------------------+
   |
   v
[Handoff phase starts]
   |
   +--> WaiterHandoffPanel generates/displays handoff token/QR
   |
   +--> CustomerHandoffPanel scans or pastes token
           |
           +--> (parse/scan fail) [scanner error/hint + retry]
           |
           +--> (verify success)
                    |
                    v
           [CompletionConfirmationPanel]
                    |
                    +--> customer confirms complete
                    |         |
                    |         v
                    |   [Job marked completed]
                    |
                    +--> no action in window -> [auto-complete path]
[Exit: booking completion confirmed]
```

## 4) Line Holder completes job -> Receives payout

```text
[Entry: /dashboard/waiter/jobs/{jobId}]
   |
   v
[Status progression + execution notes]
   |
   +--> optional: request extra time
   |
   v
[Handoff success]
   |
   v
[Job completion state]
   |
   +--> Stripe/manual payout pipeline
   |       |
   |       +--> pending/release window [wait state visible]
   |       |
   |       +--> transfer created/released
   |
   v
[Waiter sees payout status in success/dashboard surfaces]
[Exit: payout completed or pending release]
```

## 5) Admin -> View all jobs -> Manage disputes

```text
[Entry: /admin]
   |
   +--> (not allowlisted/not verified) [redirect/blocked]
   |
   +--> authorized
           |
           v
   [Owner dashboard]
      - ops controls
      - fraud review queue
      - disputed bookings list
           |
           +--> FraudReviewActionButton actions
           |
           +--> JobActionButtons
                  |
                  +--> refund customer
                  +--> pay line holder
                  |
                  +--> (action error) [retry / investigate]
           |
           v
   [Queue updated + outcomes logged]
[Exit: disputes/fraud items processed]
```

## Legend

```text
[]  = screen/state
--> = primary transition
+--> = branch/decision path
<-- = reverse/update feedback loop
```
