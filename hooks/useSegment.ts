"use client";

import { useEffect, useMemo, useState } from "react";

export type CompanySegment =
  | "TECH"
  | "RETAIL"
  | "AUTO"
  | "BEAUTY"
  | "FOOD"
  | "FASHION";

export type SegmentLabels = {
  identifier: string;
  entityName: string;
  action: string;
};

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

const DEFAULT_SEGMENT: CompanySegment = "TECH";

export const SEGMENT_LABELS: Record<CompanySegment, SegmentLabels> = {
  TECH: {
    identifier: "IMEI/Serial",
    entityName: "Aparelho",
    action: "Ordem de Serviço",
  },
  AUTO: {
    identifier: "Placa/Chassi",
    entityName: "Veículo",
    action: "Checklist/O.S.",
  },
  RETAIL: {
    identifier: "Cód. Barras/SKU",
    entityName: "Produto",
    action: "Venda Direta",
  },
  BEAUTY: {
    identifier: "CPF Cliente",
    entityName: "Procedimento",
    action: "Agendamento",
  },
  FOOD: {
    identifier: "Código do Item",
    entityName: "Item",
    action: "Pedido / Balcão",
  },
  FASHION: {
    identifier: "Cód. Barras/SKU",
    entityName: "Produto",
    action: "Venda Direta",
  },
};

const normalizeSegment = (
  value: string | null | undefined,
): CompanySegment | null => {
  if (
    value === "TECH" ||
    value === "RETAIL" ||
    value === "AUTO" ||
    value === "BEAUTY" ||
    value === "FOOD" ||
    value === "FASHION"
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
  const labels = SEGMENT_LABELS[segment || DEFAULT_SEGMENT];

  const getLabel = useMemo(
    () => (key: string) => {
      if (key === "primaryIdentifier") {
        return labels.identifier;
      }

      if (key in labels) {
        return labels[key as keyof SegmentLabels];
      }

      return key;
    },
    [labels],
  );

  const hasServiceOrder = segment === "TECH" || segment === "AUTO";
  const hasInventoryGrade = segment === "RETAIL" || segment === "FASHION";
  const hasScheduling = segment === "BEAUTY";
  const showOS = hasServiceOrder;
  const showInventoryGrade = hasInventoryGrade;
  const showServiceSchedule = hasScheduling;

  return {
    session: session || null,
    segment,
    labels,
    companyName: session?.companyName || null,
    fullName: session?.fullName || null,
    role: session?.role || null,
    isReady,
    isAuthenticated,
    hasSegment,
    hasServiceOrder,
    hasInventoryGrade,
    hasScheduling,
    showOS,
    showInventoryGrade,
    showServiceSchedule,
    getLabel,
    refresh: () => loadSessionSnapshot(true),
  };
}
