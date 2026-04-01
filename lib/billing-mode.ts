export const TRIAL_DAYS = 7;

export const REQUIRE_ACTIVE_SUBSCRIPTION = true;

export const getInitialSubscriptionStatus = () => {
  return REQUIRE_ACTIVE_SUBSCRIPTION ? "unpaid" : "trialing";
};

export const calculateInitialTrialEndsAt = (fromDate = new Date()) => {
  const trialEndsAt = new Date(fromDate);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  return trialEndsAt;
};

export const shouldBlockSubscriptionAccess = ({
  subscriptionStatus,
  isTrialExpired,
}: {
  subscriptionStatus: string;
  isTrialExpired: boolean;
}) => {
  if (subscriptionStatus === "canceled") {
    return true;
  }

  if (subscriptionStatus === "active") {
    return false;
  }

  if (REQUIRE_ACTIVE_SUBSCRIPTION) {
    return isTrialExpired;
  }

  return subscriptionStatus !== "active" && isTrialExpired;
};
