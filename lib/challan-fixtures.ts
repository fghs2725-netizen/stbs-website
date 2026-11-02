/**
 * Sample challans for the render test (`npm run test:challan-snapshot`). Invented test data, never
 * shown on the live site: the fixture route refuses to run in production.
 */
import { emptyChallan, emptyParty, type ChallanItem, type ChallanState } from "@/lib/challan";

const item = (n: number, description: string, quantity: number, unit: string, rate = 0, hsn = "", details = ""): ChallanItem =>
  ({ id: `fx${n}`, description, details, hsn, quantity, unit, rate });

const base = (): ChallanState => ({
  ...emptyChallan("2026-11-02"),
  id: "fixture",
  reference: "STBS/DC/2026-27/0007",
  status: "ISSUED",
  client: { ...emptyParty(), name: "Sample Industries Pvt. Ltd.", contactPerson: "Site Manager", addressLine1: "Plot 12, Industrial Area", city: "Kundli", state: "Haryana", pinCode: "131028", phone: "9800000000", gstin: "06ABCDE1234F1Z5" },
  deliverToSame: false,
  deliverTo: { ...emptyParty(), name: "Borewell site, Block C", addressLine1: "Near water tank, Sector 5", city: "Sonipat", state: "Haryana", pinCode: "131001", phone: "9800000001" },
  vehicleNumber: "hr06ab1234",
  driverName: "Driver Name",
  driverPhone: "9800000002",
  invoiceRef: "STBS/INV/0765",
  remarks: "Casing pipes to be unloaded at the rig. Count checked at loading.",
});

const materials = [
  item(1, "uPVC casing pipe 150 mm (6\") CM grade", 40, "m", 520, "3917"),
  item(2, "uPVC ribbed screen pipe 150 mm, slot 1 mm", 12, "m", 610, "3917"),
  item(3, "End cap 150 mm", 1, "Nos", 450, "3917"),
  item(4, "Gravel pack, washed, 3-6 mm", 2, "Trolley", 3500, "2517"),
  item(5, "Bentonite powder for drilling fluid", 6, "Bag", 380, "2508", "50 kg bags, sealed"),
];

export const CHALLAN_FIXTURES: Record<string, ChallanState> = {
  basic: { ...base(), items: materials },
  "with-rates": { ...base(), showRates: true, items: materials },
  draft: { ...base(), reference: "", status: "DRAFT", deliverToSame: true, vehicleNumber: "", driverName: "", driverPhone: "", invoiceRef: "", remarks: "", items: materials.slice(0, 2) },
  cancelled: { ...base(), status: "CANCELLED", cancelledReason: "Vehicle changed; reissued as 0008.", items: materials.slice(0, 3) },
  "many-items": {
    ...base(),
    items: Array.from({ length: 48 }, (_, n) => item(n + 1, n % 7 === 0
      ? `Assorted fittings set ${n + 1}: couplers, reducers, clamps and the sealing compound needed for the joint at depth`
      : `Material line ${n + 1}`, (n % 5) + 1, n % 3 ? "Nos" : "m", 100 + n, n % 4 ? "" : "3917", n % 9 === 0 ? "Checked at loading\nPacked in two bundles" : "")),
  },
};
