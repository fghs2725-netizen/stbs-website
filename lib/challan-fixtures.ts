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

/** The challan that showed the gap: twelve short lines, no site, no remarks. One page, signatures included. */
const twelve = [
  item(1, "PVC Pipe 225mm 10kg Pressure", 84, "mtr"),
  item(2, "Reducer Socket. Socket. Endcap", 2, "nos"),
  item(3, "300mm Borewell Labour", 95, "mtr"),
  item(4, "3inch HDPE Delivery Pipe", 51, "mtr"),
  item(5, "3 Core Copper Cable 6mm", 130, "mtr"),
  item(6, "Plate Pipe etc.", 1, "nos"),
  item(7, "SS Nipple. Flench Welding. Ript", 1, "nos"),
  item(8, "15HP Submersible Pump", 1, "nos"),
  item(9, "Pump Lock etc.", 1, "nos"),
  item(10, "Starter Panel Fully Automatic", 1, "nos", 0, "", "Make as per site"),
  item(11, "Capti cleaning and labour", 1, "nos"),
  item(12, "Cartage of Machine & Material", 1, "nos"),
];

/** Everything that makes the header and closing tall at once, to keep the estimates honest. */
const crowded = (): ChallanState => ({
  ...base(),
  showRates: true,
  client: { ...base().client, name: "Haryana State Industrial and Infrastructure Development Corporation Ltd.", addressLine1: "Plot 12-14, Phase II, Industrial Model Township, near the old water works", addressLine2: "Behind the Mahila Thana, opposite the HSIIDC office" },
  deliverTo: { ...base().deliverTo, name: "Tubewell No. 4, Village Bahalgarh, Panchayat land behind the school", addressLine2: "Approach road from the GT Road side, second left after the canal bridge" },
  ewayBill: "1812 3456 7890",
  quotationRef: "STBS/QT/2026-27/0042",
  remarks: "Casing pipes to be unloaded at the rig. Count checked at loading.\nThe gravel pack is to be kept covered on site until it is used, and any shortfall reported the same day.\nReceiver to check the pump serial number against the invoice before signing.",
});

export const CHALLAN_FIXTURES: Record<string, ChallanState> = {
  basic: { ...base(), items: materials },
  "with-rates": { ...base(), showRates: true, items: materials },
  draft: { ...base(), reference: "", status: "DRAFT", deliverToSame: true, vehicleNumber: "", driverName: "", driverPhone: "", invoiceRef: "", remarks: "", items: materials.slice(0, 2) },
  cancelled: { ...base(), status: "CANCELLED", cancelledReason: "Vehicle changed; reissued as 0008.", items: materials.slice(0, 3) },
  "twelve-items": {
    ...base(), reference: "", status: "DRAFT", deliverToSame: true, driverName: "", driverPhone: "", invoiceRef: "Draft invoice", remarks: "",
    client: { ...emptyParty(), name: "MS Lion engineering consultant pvt. Ltd.", addressLine1: "Rail coach factory", city: "Sonipat", state: "Haryana", pinCode: "131001" },
    vehicleNumber: "HR10AU8237", items: twelve,
  },
  crowded: {
    ...crowded(),
    items: Array.from({ length: 34 }, (_, n) => item(n + 1, n % 4 === 0
      ? `Assorted fittings set ${n + 1}: couplers, reducers, clamps, the sealing compound and the PVC SOLVENT CEMENT needed at depth`
      : `UPVC CASING PIPE 150MM CM GRADE LOT ${n + 1}`, (n % 5) + 1, n % 3 ? "Nos" : "m", 100 + n, "3917", n % 5 === 0 ? "Checked at loading\nPacked in two bundles, tagged with the site name" : "")),
  },
  "many-items": {
    ...base(),
    items: Array.from({ length: 48 }, (_, n) => item(n + 1, n % 7 === 0
      ? `Assorted fittings set ${n + 1}: couplers, reducers, clamps and the sealing compound needed for the joint at depth`
      : `Material line ${n + 1}`, (n % 5) + 1, n % 3 ? "Nos" : "m", 100 + n, n % 4 ? "" : "3917", n % 9 === 0 ? "Checked at loading\nPacked in two bundles" : "")),
  },
};
