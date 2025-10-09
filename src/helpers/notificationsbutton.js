"use client";

import handleNotificationSignup from "@/helpers/makenotifications";
import React from "react";

export default function NotificationButton({ showIdNumber }) {
  return (
    <button
      className="addto"
      onClick={() => handleNotificationSignup(showIdNumber)}
    >
      Get notified when the next episode airs!
    </button>
  );
}
