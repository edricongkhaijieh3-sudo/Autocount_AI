"use client";

import { useState, useEffect } from "react";
import { OnboardingChat } from "./onboarding-chat";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch("/api/onboarding");
      if (!res.ok) {
        setChecked(true);
        return;
      }
      const data = await res.json();
      setShowOnboarding(!data.onboardingComplete);
    } catch {
      // If check fails, just show the app
    } finally {
      setChecked(true);
    }
  }

  function handleComplete() {
    setShowOnboarding(false);
  }

  return (
    <>
      {/* Always render children so the app is usable */}
      {checked && children}

      {/* Overlay onboarding on top if needed */}
      {showOnboarding && <OnboardingChat onComplete={handleComplete} />}
    </>
  );
}
