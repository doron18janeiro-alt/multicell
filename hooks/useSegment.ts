"use client";

import { useEffect, useMemo, useState } from "react";

export type CompanySegment = "TECH" | "RETAIL" | "AUTO" | "BEAUTY" | "FOOD";

type SessionSegmentSnapshot = {
  id?: string;
  email?: string;
  companyId?: string;
  role?: "ADMIN" | "ATTENDANT";
  fullName?: string | null;
  companyName?: string | null;
  segment?: CompanySegment | null;
};

type UseSegmentOptions = {
  enabled?: boolean;
};

let sessionCache: SessionSegmentSnapshot | null | undefined = undefined;
let sessionPromise: Promise<SessionSegmentSnapshot | null> | null = null;

const identifierLabels: Record<string, string> = {
  TECH: "IMEI/Serial",
  AUTO: "Placa/Chassi",
  RETAIL: "Código de Barras",
  BEAUTY: "Código de Cadastro",
  FOOD: "Código do Item",
};

const normalizeSegment = (
  value: string | null | undefined,
): CompanySegment | null => {
  if (
    value === "TECH" ||
    value === "RETAIL" ||
    value === "AUTO" ||
    value === "BEAUTY" ||
    value === "FOOD"
  ) {
    return value;
  }

  return null;
};

const loadSessionSnapshot = async (force = false) => {
  if (!force && sessionCache !== undefined) {
    return sessionCache;
  }

  if (!force && sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = fetch("/api/auth/session", {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        sessionCache = null;
        return null;
      }

      const payload = await response.json();
      sessionCache = {
        ...payload,
        segment: normalizeSegment(payload?.segment),
      };

      return sessionCache;
    })
    .catch(() => {
      sessionCache = null;
      return null;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
};

export function resetSegmentSessionCache() {
  sessionCache = undefined;
  sessionPromise = null;
}

export function useSegment(options: UseSegmentOptions = {}) {
  const { enabled = true } = options;
  const [session, setSession] = useState<SessionSegmentSnapshot | null | undefined>(
    enabled ? sessionCache : undefined,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    void loadSessionSnapshot().then((snapshot) => {
      if (active) {
        setSession(snapshot);
      }
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  const segment = normalizeSegment(session?.segment);
  const isReady = !enabled || session !== undefined;
  const isAuthenticated = Boolean(session);
  const hasSegment = Boolean(segment);

  const getLabel = useMemo(
    () => (key: string) => {
      if (key === "identifier" || key === "primaryIdentifier") {
        return identifierLabels[segment || "TECH"] || "Identificador";
      }

      return key;
    },
    [segment],
  );

  const showOS = segment === "TECH" || segment === "AUTO";
  const showInventoryGrade = segment === "TECH" || segment === "RETAIL";
  const showServiceSchedule =
    segment === "TECH" || segment === "AUTO" || segment === "BEAUTY";

  return {
    session: session || null,
    segment,
    companyName: session?.companyName || null,
    fullName: session?.fullName || null,
    role: session?.role || null,
    isReady,
    isAuthenticated,
    hasSegment,
    showOS,
    showInventoryGrade,
    showServiceSchedule,
    getLabel,
    refresh: () => loadSessionSnapshot(true),
  };
}
