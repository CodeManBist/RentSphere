// Refund Message Templates

const REFUND_MESSAGES = {
  guest_cancelled: {
    title: "Booking Cancelled",
    message: "Your booking has been cancelled. Your payment will be refunded within 24 working hours.",
    icon: "fa-solid fa-circle-info",
  },
  host_cancelled: {
    title: "Host Cancelled Booking",
    message: "The host has cancelled your booking. Your full payment will be refunded within 24 working hours.",
    icon: "fa-solid fa-circle-exclamation",
  },
  host_rejected: {
    title: "Booking Request Declined",
    message:
      "The host was unable to accept your booking request. Your payment will be refunded within 24 working hours.",
    icon: "fa-solid fa-circle-xmark",
  },
  refund_processing: {
    title: "Refund Processing",
    message: "Your refund is being processed and will be credited to your account within 24 working hours.",
    icon: "fa-solid fa-spinner",
  },
  refund_completed: {
    title: "Refund Completed",
    message: "Your refund has been processed successfully.",
    icon: "fa-solid fa-circle-check",
  },
}

/**
 * Get refund message for a booking
 */
function getRefundMessage(booking) {
  if (!booking.cancellation || booking.cancellation.cancelledBy === null) {
    return null
  }

  const { cancelledBy, refundStatus } = booking.cancellation

  // Check refund status first
  if (refundStatus === "completed") {
    return REFUND_MESSAGES.refund_completed
  }

  if (refundStatus === "processing") {
    return REFUND_MESSAGES.refund_processing
  }

  // Check who cancelled
  if (booking.status === "rejected") {
    return REFUND_MESSAGES.host_rejected
  }

  if (cancelledBy === "host") {
    return REFUND_MESSAGES.host_cancelled
  }

  if (cancelledBy === "guest") {
    return REFUND_MESSAGES.guest_cancelled
  }

  return null
}

/**
 * Get cancellation policy message
 */
function getCancellationPolicyMessage(policy) {
  const policies = {
    flexible: "Free cancellation up to 24 hours before check-in. Full refund minus service fee.",
    moderate: "Free cancellation up to 5 days before check-in. 50% refund for cancellations up to 24 hours before.",
    strict: "50% refund up to 7 days before check-in. No refund within 7 days of check-in.",
  }

  return policies[policy] || policies.moderate
}

module.exports = {
  REFUND_MESSAGES,
  getRefundMessage,
  getCancellationPolicyMessage,
}
