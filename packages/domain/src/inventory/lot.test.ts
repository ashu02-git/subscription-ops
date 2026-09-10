import { Lot } from "./lot";

describe("Lot", () => {
  test("数量が負のロットは生成できない", () => {
    expect(() =>
      Lot.create({
        sku: "SKU-A",
        lotNumber: "LOT-1",
        quantity: -1,
        expiresAt: new Date(),
      }),
    ).toThrow();
  });
});
