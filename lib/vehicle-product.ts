import {
  isVehicleCategory,
  normalizeVehicleInventoryStatus,
  normalizeVehiclePlate,
  type VehicleProfile,
} from "@/lib/segment-specialization";

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
};

const parseOptionalInteger = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalBoolean = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Boolean(value);
};

export const normalizeVehicleProfileInput = (
  input: Record<string, unknown>,
): VehicleProfile => ({
  brand: normalizeOptionalText(input.vehicleBrand),
  model: normalizeOptionalText(input.vehicleModel),
  plate: normalizeVehiclePlate(input.vehiclePlate as string | null | undefined) || null,
  chassis: normalizeOptionalText(input.vehicleChassis)?.toUpperCase() || null,
  renavam: normalizeOptionalText(input.vehicleRenavam),
  status: normalizeVehicleInventoryStatus(
    input.vehicleStatus as string | null | undefined,
  ),
  manufactureYear: parseOptionalInteger(input.vehicleManufactureYear),
  modelYear: parseOptionalInteger(input.vehicleModelYear),
  engine: normalizeOptionalText(input.vehicleEngine),
  fuel: normalizeOptionalText(input.vehicleFuel) as VehicleProfile["fuel"],
  airConditioning: parseOptionalBoolean(input.vehicleAirConditioning),
  airbag: parseOptionalBoolean(input.vehicleAirbag),
  steering: normalizeOptionalText(input.vehicleSteering)?.toUpperCase() as VehicleProfile["steering"],
  powerWindows: parseOptionalBoolean(input.vehiclePowerWindows),
  alarm: parseOptionalBoolean(input.vehicleAlarm),
  multimedia: parseOptionalBoolean(input.vehicleMultimedia),
  additionalInfo: normalizeOptionalText(input.vehicleAdditionalInfo),
});

export const validateVehicleProfile = (
  category: string | null | undefined,
  vehicleProfile: VehicleProfile,
) => {
  if (!isVehicleCategory(category)) {
    return null;
  }

  if (
    !vehicleProfile.brand ||
    !vehicleProfile.model ||
    !vehicleProfile.plate ||
    !vehicleProfile.chassis ||
    !vehicleProfile.renavam
  ) {
    return "Veículos exigem marca, modelo, placa, chassi e renavam.";
  }

  return null;
};

export const buildVehicleProductData = (
  category: string | null | undefined,
  vehicleProfile: VehicleProfile,
) => {
  if (!isVehicleCategory(category)) {
    return {
      vehicleBrand: null,
      vehicleModel: null,
      vehiclePlate: null,
      vehicleChassis: null,
      vehicleRenavam: null,
      vehicleStatus: null,
      vehicleManufactureYear: null,
      vehicleModelYear: null,
      vehicleEngine: null,
      vehicleFuel: null,
      vehicleAirConditioning: null,
      vehicleAirbag: null,
      vehicleSteering: null,
      vehiclePowerWindows: null,
      vehicleAlarm: null,
      vehicleMultimedia: null,
      vehicleAdditionalInfo: null,
    };
  }

  return {
    vehicleBrand: vehicleProfile.brand,
    vehicleModel: vehicleProfile.model,
    vehiclePlate: vehicleProfile.plate,
    vehicleChassis: vehicleProfile.chassis,
    vehicleRenavam: vehicleProfile.renavam,
    vehicleStatus: vehicleProfile.status || "DISPONIVEL",
    vehicleManufactureYear: vehicleProfile.manufactureYear,
    vehicleModelYear: vehicleProfile.modelYear,
    vehicleEngine: vehicleProfile.engine,
    vehicleFuel: vehicleProfile.fuel,
    vehicleAirConditioning: vehicleProfile.airConditioning,
    vehicleAirbag: vehicleProfile.airbag,
    vehicleSteering: vehicleProfile.steering,
    vehiclePowerWindows: vehicleProfile.powerWindows,
    vehicleAlarm: vehicleProfile.alarm,
    vehicleMultimedia: vehicleProfile.multimedia,
    vehicleAdditionalInfo: vehicleProfile.additionalInfo,
  };
};

export const buildVehicleDuplicateWhere = (
  companyId: string,
  vehicleProfile: VehicleProfile,
  excludeId?: string,
) => {
  const duplicateChecks = [
    vehicleProfile.plate
      ? { vehiclePlate: vehicleProfile.plate }
      : null,
    vehicleProfile.chassis
      ? { vehicleChassis: vehicleProfile.chassis }
      : null,
    vehicleProfile.renavam
      ? { vehicleRenavam: vehicleProfile.renavam }
      : null,
  ].filter(Boolean);

  if (duplicateChecks.length === 0) {
    return null;
  }

  return {
    companyId,
    OR: duplicateChecks,
    ...(excludeId
      ? {
          NOT: {
            id: excludeId,
          },
        }
      : {}),
  };
};
