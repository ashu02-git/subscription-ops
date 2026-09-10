import { Inventory } from "./inventory";
import { Lot } from "./lot";

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("Inventory", () => {
  test("賞味期限まで14日を切ったロットは出荷可能数に含めない", () => {
    const inventory = Inventory.of({
      sku: "SKU-A",
      lots: [
        Lot.create({
          sku: "SKU-A",
          lotNumber: "LOT-1",
          quantity: 10,
          expiresAt: date("2026-09-15"),
        }),
        Lot.create({
          sku: "SKU-A",
          lotNumber: "LOT-2",
          quantity: 20,
          expiresAt: date("2026-12-01"),
        }),
      ],
    });

    expect(inventory.availableOn(date("2026-09-09"))).toBe(20);
  });

  test("賞味期限までちょうど14日のロットは出荷可能数に含める", () => {
    const inventory = Inventory.of({
      sku: "SKU-A",
      lots: [
        Lot.create({
          sku: "SKU-A",
          lotNumber: "LOT-1",
          quantity: 10,
          expiresAt: date("2026-09-23"),
        }),
      ],
    });

    expect(inventory.availableOn(date("2026-09-09"))).toBe(10);
  });
});
