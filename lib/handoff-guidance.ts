import type { JobStatus } from "@/lib/types/job";

export type HandoffGuidanceTone = "default" | "urgent" | "muted" | "success";

export type GuidanceAction = {
  label: string;
  href: string;
  emphasis?: boolean;
};

export type CustomerHandoffGuidance = {
  heading: string;
  instruction: string;
  actions: GuidanceAction[];
  tone: HandoffGuidanceTone;
  /** Show terminal + exact location prominently (pre-handoff) */
  highlightLocation: boolean;
};

export type LineHolderHandoffGuidance = {
  heading: string;
  instruction: string;
  actions: GuidanceAction[];
  tone: HandoffGuidanceTone;
  highlightLocation: boolean;
};

function terminalPhrase(terminal: string): string {
  const t = terminal?.trim();
  return t ? `Terminal ${t}` : "the terminal";
}

/** Customer tracking — primary “what to do next” (UI only). */
export function getCustomerHandoffGuidance(
  status: JobStatus,
  terminal: string
): CustomerHandoffGuidance | null {
  const term = terminalPhrase(terminal);
  switch (status) {
    case "open":
      return {
        heading: "We’re looking for a Line Holder now",
        instruction:
          "Stay on this page—status updates automatically when someone accepts.",
        actions: [
          { label: "Details", href: "#booking-details", emphasis: true },
          { label: "Contact", href: "#booking-line-holder-contact" },
        ],
        tone: "muted",
        highlightLocation: false,
      };
    case "accepted":
    case "at_airport":
      return {
        heading: "Your Line Holder is heading to the line",
        instruction: `Meet them at ${term} when you’re ready. Progress updates appear here.`,
        actions: [
          { label: "Contact", href: "#booking-line-holder-contact", emphasis: true },
          { label: "Details", href: "#booking-details" },
        ],
        tone: "default",
        highlightLocation: false,
      };
    case "in_line":
      return {
        heading: "No action needed yet",
        instruction:
          "Your Line Holder is holding your place. We’ll tell you when to head over.",
        actions: [
          { label: "Contact", href: "#booking-line-holder-contact", emphasis: true },
          { label: "Details", href: "#booking-details" },
        ],
        tone: "default",
        highlightLocation: false,
      };
    case "near_front":
      return {
        heading: "Head to the line now",
        instruction: `Go to ${term} security line and be ready to take over the spot.`,
        actions: [
          { label: "I’m on my way", href: "#booking-details", emphasis: true },
          { label: "Contact", href: "#booking-line-holder-contact" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "customer_on_the_way":
      return {
        heading: "You’re on the way",
        instruction: "Tap I’m here when you can visually identify your Line Holder.",
        actions: [
          { label: "I’m here", href: "#booking-handoff-guidance", emphasis: true },
          { label: "Contact", href: "#booking-line-holder-contact" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "ready_for_handoff":
    case "qr_generated":
      return {
        heading: "Scan QR or use fallback code",
        instruction:
          "Verify identity in person, then complete QR/code plus proximity check.",
        actions: [
          { label: "Scan QR to complete", href: "#booking-handoff-guidance", emphasis: true },
          { label: "Report issue", href: "#booking-more-actions" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "qr_scanned":
    case "awaiting_dual_confirmation":
      return {
        heading: "Confirm transfer now",
        instruction:
          "Tap that you received your place in line to release payment safely.",
        actions: [
          { label: "Confirm handoff", href: "#booking-confirm-handoff", emphasis: true },
          { label: "Report issue", href: "#booking-more-actions" },
        ],
        tone: "urgent",
        highlightLocation: false,
      };
    case "pending_confirmation":
      return {
        heading: "Take over now",
        instruction:
          "Your Line Holder marked the hold complete—confirm when you’ve taken the spot.",
        actions: [
          { label: "Confirm handoff", href: "#booking-confirm-handoff", emphasis: true },
          { label: "Contact", href: "#booking-line-holder-contact" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "customer_on_the_way":
    case "ready_for_handoff":
    case "qr_generated":
      return {
        heading: "Show QR and verify identity",
        instruction:
          "Use your LineCrew handoff panel to show QR, fallback code, and confirm proximity.",
        actions: [
          { label: "Open handoff panel", href: "#booking-line-holder-actions", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "qr_scanned":
    case "awaiting_dual_confirmation":
      return {
        heading: "Await both confirmations",
        instruction:
          "Ask the customer to confirm received place. You must confirm transfer too.",
        actions: [
          { label: "Open handoff panel", href: "#booking-line-holder-actions", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "urgent",
        highlightLocation: false,
      };
    case "completed":
      return {
        heading: "Booking completed",
        instruction: "Thanks for booking with LineCrew.",
        actions: [
          { label: "Details", href: "#booking-details", emphasis: true },
          { label: "Updates", href: "#booking-activity-timeline" },
        ],
        tone: "success",
        highlightLocation: false,
      };
    case "cancelled":
    case "refunded":
      return {
        heading: "Booking closed",
        instruction: "This booking is no longer active.",
        actions: [{ label: "Details", href: "#booking-details", emphasis: true }],
        tone: "muted",
        highlightLocation: false,
      };
    case "disputed":
    case "issue_flagged":
      return {
        heading: "Under review",
        instruction: "We’re reviewing this booking. Check back for updates.",
        actions: [
          { label: "Details", href: "#booking-details", emphasis: true },
          { label: "Updates", href: "#booking-activity-timeline" },
        ],
        tone: "muted",
        highlightLocation: false,
      };
    default:
      return null;
  }
}

/** Line Holder job detail — execution guidance (UI only). */
export function getLineHolderHandoffGuidance(
  status: JobStatus,
  terminal: string,
  isOpenPreview: boolean
): LineHolderHandoffGuidance | null {
  if (isOpenPreview && status === "open") {
    return {
      heading: "Review this booking",
      instruction:
        "Accept to lock it in—then use status updates so the customer can follow along.",
      actions: [
        { label: "Status", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Details", href: "#booking-details-waiter" },
      ],
      tone: "muted",
      highlightLocation: false,
    };
  }
  const term = terminalPhrase(terminal);
  switch (status) {
    case "accepted":
    case "at_airport":
      return {
        heading: "Head to the requested line",
        instruction: `Go to ${term}, join the queue, and tap the next status when it applies.`,
        actions: [
          { label: "Update status", href: "#booking-line-holder-actions", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "default",
        highlightLocation: true,
      };
    case "in_line":
      return {
        heading: "Hold position and keep updates accurate",
        instruction:
          "Advance status as you move up—the customer tracks you on their phone.",
        actions: [
          { label: "Update status", href: "#booking-line-holder-actions", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "default",
        highlightLocation: false,
      };
    case "near_front":
      return {
        heading: "Prepare for handoff",
        instruction:
          "When the traveler should step in, tap Ready for handoff / Complete booking below.",
        actions: [
          { label: "Ready for handoff", href: "#booking-line-holder-actions", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "urgent",
        highlightLocation: true,
      };
    case "pending_confirmation":
      return {
        heading: "Wait for customer to take over",
        instruction:
          "They confirm on their tracking page. No further status taps until they finish.",
        actions: [
          { label: "Guide", href: "#booking-handoff-guidance", emphasis: true },
          { label: "Contact", href: "#booking-customer-contact" },
        ],
        tone: "urgent",
        highlightLocation: false,
      };
    case "completed":
      return {
        heading: "Booking completed",
        instruction: "Payout follows LineCrew policy after confirmation.",
        actions: [
          { label: "Details", href: "#booking-details-waiter", emphasis: true },
          { label: "Updates", href: "#booking-timeline" },
        ],
        tone: "success",
        highlightLocation: false,
      };
    case "cancelled":
    case "refunded":
      return {
        heading: "Booking closed",
        instruction: "No further status updates for this booking.",
        actions: [{ label: "Details", href: "#booking-details-waiter", emphasis: true }],
        tone: "muted",
        highlightLocation: false,
      };
    case "disputed":
      return {
        heading: "Under review",
        instruction: "Support may reach out if needed.",
        actions: [
          { label: "Details", href: "#booking-details-waiter", emphasis: true },
          { label: "Updates", href: "#booking-timeline" },
        ],
        tone: "muted",
        highlightLocation: false,
      };
    default:
      return null;
  }
}

/** Mobile sticky bar — customer (2 actions, status-aware). */
export function getCustomerStickyActions(
  status: JobStatus,
  hasConfirmHandoff: boolean
): GuidanceAction[] {
  switch (status) {
    case "open":
      return [
        { label: "Details", href: "#booking-details", emphasis: true },
        { label: "Contact", href: "#booking-line-holder-contact" },
      ];
    case "accepted":
    case "at_airport":
    case "in_line":
      return [
        { label: "Contact", href: "#booking-line-holder-contact", emphasis: true },
        { label: "Details", href: "#booking-details" },
      ];
    case "near_front":
    case "customer_on_the_way":
    case "ready_for_handoff":
    case "qr_generated":
      return [
        { label: "I’m on my way", href: "#booking-details", emphasis: true },
        { label: "Contact", href: "#booking-line-holder-contact" },
      ];
    case "qr_scanned":
    case "awaiting_dual_confirmation":
    case "pending_confirmation":
      return [
        {
          label: "Confirm handoff",
          href: hasConfirmHandoff
            ? "#booking-confirm-handoff"
            : "#booking-handoff-guidance",
          emphasis: true,
        },
        { label: "Contact", href: "#booking-line-holder-contact" },
      ];
    case "completed":
    case "cancelled":
    case "disputed":
    case "issue_flagged":
    case "refunded":
      return [
        { label: "Details", href: "#booking-details", emphasis: true },
        { label: "Updates", href: "#booking-activity-timeline" },
      ];
    default:
      return [
        { label: "Track", href: "#booking-progress-track", emphasis: true },
        { label: "Details", href: "#booking-details" },
      ];
  }
}

/** Mobile sticky bar — Line Holder (2 actions). */
export function getLineHolderStickyActions(status: JobStatus): GuidanceAction[] {
  switch (status) {
    case "open":
      return [
        { label: "Status", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Guide", href: "#booking-handoff-guidance" },
      ];
    case "accepted":
    case "at_airport":
    case "in_line":
      return [
        { label: "Update status", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Contact", href: "#booking-customer-contact" },
      ];
    case "near_front":
    case "customer_on_the_way":
    case "ready_for_handoff":
    case "qr_generated":
    case "qr_scanned":
    case "awaiting_dual_confirmation":
      return [
        { label: "Ready for handoff", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Contact", href: "#booking-customer-contact" },
      ];
    case "pending_confirmation":
      return [
        { label: "Status", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Contact", href: "#booking-customer-contact" },
      ];
    case "completed":
    case "cancelled":
    case "disputed":
    case "issue_flagged":
    case "refunded":
      return [
        { label: "Details", href: "#booking-details-waiter", emphasis: true },
        { label: "Updates", href: "#booking-timeline" },
      ];
    default:
      return [
        { label: "Status", href: "#booking-line-holder-actions", emphasis: true },
        { label: "Guide", href: "#booking-handoff-guidance" },
      ];
  }
}
