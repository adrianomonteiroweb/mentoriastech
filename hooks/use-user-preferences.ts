"use client"

import { useEffect, useState } from "react"

const USER_PREFERENCES_KEY = "adriano:user-preferences"
const USER_PREFERENCES_EVENT = "adriano:user-preferences-change"

export interface UserPreferences {
  showJobFilters: boolean
  showTips: boolean
}

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showJobFilters: true,
  showTips: true,
}

function readUserPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PREFERENCES
  }

  try {
    const rawValue = window.localStorage.getItem(USER_PREFERENCES_KEY)

    if (!rawValue) {
      return DEFAULT_USER_PREFERENCES
    }

    return {
      ...DEFAULT_USER_PREFERENCES,
      ...JSON.parse(rawValue),
    }
  } catch {
    return DEFAULT_USER_PREFERENCES
  }
}

function writeUserPreferences(preferences: UserPreferences) {
  try {
    window.localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
  }

  window.dispatchEvent(new CustomEvent(USER_PREFERENCES_EVENT, { detail: preferences }))
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPreferences(readUserPreferences())
    setHydrated(true)

    function syncPreferences(event: Event) {
      if (event instanceof CustomEvent) {
        setPreferences(event.detail)
        return
      }

      setPreferences(readUserPreferences())
    }

    window.addEventListener("storage", syncPreferences)
    window.addEventListener(USER_PREFERENCES_EVENT, syncPreferences)

    return () => {
      window.removeEventListener("storage", syncPreferences)
      window.removeEventListener(USER_PREFERENCES_EVENT, syncPreferences)
    }
  }, [])

  function updatePreference<Key extends keyof UserPreferences>(
    key: Key,
    value: UserPreferences[Key],
  ) {
    const nextPreferences = {
      ...readUserPreferences(),
      [key]: value,
    }

    setPreferences(nextPreferences)
    writeUserPreferences(nextPreferences)
  }

  return {
    hydrated,
    preferences,
    updatePreference,
  }
}
