import { Inventory } from "./inventory";
import { Lot, type LotProps } from "./lot";

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

let lotSeq = 0;

function createLot(overrides: Partial<LotProps> = {}): Lot {
  lotSeq += 1;
  return Lot.create({
    sku: "SKU-A",
    lotNumber: `LOT-${lotSeq}`,
    quantity: 10,
    expiresAt: date("2026-12-01"),
    ...overrides,
  });
}

describe("Inventory", () => {
  describe("出荷可能数", () => {
    test("賞味期限まで14日を切ったロットは出荷可能数に含めない", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [
          createLot({ quantity: 10, expiresAt: date("2026-09-15") }),
          createLot({ quantity: 20, expiresAt: date("2026-12-01") }),
        ],
      });

      expect(inventory.availableOn(date("2026-09-09"))).toBe(20);
    });

    test("賞味期限までちょうど14日のロットは出荷可能数に含める", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [createLot({ quantity: 10, expiresAt: date("2026-09-23") })],
      });

      expect(inventory.availableOn(date("2026-09-09"))).toBe(10);
    });
  });

  describe("入荷", () => {
    test("入荷すると物理在庫が増える", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [createLot({ quantity: 10 })],
      });

      const received = inventory.receive(createLot({ quantity: 10 }));

      expect(received.onHand()).toBe(20);
    });

    test("入荷しても元の Inventory は変わらない", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [createLot({ quantity: 10 })],
      });

      inventory.receive(createLot({ quantity: 10 }));

      expect(inventory.onHand()).toBe(10);
    });

    test("異なる SKU のロットは入荷できない", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [createLot()],
      });

      expect(() => inventory.receive(createLot({ sku: "SKU-B" }))).toThrow();
    });

    test("既にある lotNumber のロットは入荷できない", () => {
      const inventory = Inventory.of({
        sku: "SKU-A",
        lots: [createLot({ lotNumber: "LOT-1" })],
      });

      expect(() =>
        inventory.receive(createLot({ lotNumber: "LOT-1" })),
      ).toThrow();
    });
  });

  describe("生成時の不変条件", () => {
    test("異なる SKU のロットを含む Inventory は生成できない", () => {
      expect(() =>
        Inventory.of({
          sku: "SKU-A",
          lots: [createLot({ sku: "SKU-B" })],
        }),
      ).toThrow();
    });

    test("同じ lotNumber のロットを含む Inventory は生成できない", () => {
      expect(() =>
        Inventory.of({
          sku: "SKU-A",
          lots: [
            createLot({ lotNumber: "LOT-1" }),
            createLot({ lotNumber: "LOT-1" }),
          ],
        }),
      ).toThrow();
    });
  });
});
