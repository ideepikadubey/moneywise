export interface UnitOption {
  code: string;
  name: string;
  category: "Quantity" | "Packaging" | "Weight" | "Volume" | "Length & Area" | "Time & Service" | "Other";
}

export const UNITS_LIST: UnitOption[] = [
  // Quantity & Counting
  { code: "PCS", name: "PCS - Pieces", category: "Quantity" },
  { code: "NOS", name: "NOS - Numbers", category: "Quantity" },
  { code: "SET", name: "SET - Sets", category: "Quantity" },
  { code: "DOZ", name: "DOZ - Dozens", category: "Quantity" },
  { code: "PRS", name: "PRS - Pairs", category: "Quantity" },

  // Packaging & Containers
  { code: "BOX", name: "BOX - Boxes", category: "Packaging" },
  { code: "CRT", name: "CRT - Carat / Carrot / Crate", category: "Packaging" },
  { code: "PAC", name: "PAC - Packs / Packages", category: "Packaging" },
  { code: "BAG", name: "BAG - Bags", category: "Packaging" },
  { code: "BND", name: "BND - Bundles", category: "Packaging" },
  { code: "BTL", name: "BTL - Bottles", category: "Packaging" },
  { code: "CAN", name: "CAN - Cans", category: "Packaging" },
  { code: "CTN", name: "CTN - Cartons", category: "Packaging" },
  { code: "ROL", name: "ROL - Rolls", category: "Packaging" },
  { code: "TUB", name: "TUB - Tubes", category: "Packaging" },

  // Weight & Mass
  { code: "KG", name: "KG - Kilograms", category: "Weight" },
  { code: "GMS", name: "GMS - Grams", category: "Weight" },
  { code: "QTL", name: "QTL - Quintals", category: "Weight" },
  { code: "TON", name: "TON - Tonnes", category: "Weight" },

  // Volume & Liquid
  { code: "LTR", name: "LTR - Liters", category: "Volume" },
  { code: "ML", name: "ML - Milliliters", category: "Volume" },

  // Length, Distance & Area
  { code: "MTR", name: "MTR - Meters", category: "Length & Area" },
  { code: "FT", name: "FT - Feet", category: "Length & Area" },
  { code: "SQF", name: "SQF - Square Feet", category: "Length & Area" },
  { code: "SQM", name: "SQM - Square Meters", category: "Length & Area" },

  // Time & Service
  { code: "HRS", name: "HRS - Hours", category: "Time & Service" },
  { code: "DAY", name: "DAY - Days", category: "Time & Service" },

  // Custom / Other
  { code: "OTH", name: "OTH - Custom Unit", category: "Other" },
];

export function getUnitLabel(code: string): string {
  const found = UNITS_LIST.find((u) => u.code === code.toUpperCase());
  return found ? found.name : code;
}
