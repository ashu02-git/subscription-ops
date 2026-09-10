import type { Lot } from "./lot";

export type InventoryProps = {
  sku: string;
  lots: readonly Lot[];
};

export class Inventory {
  private constructor(
    readonly sku: string,
    private readonly lots: readonly Lot[],
  ) {}

  static of(props: InventoryProps): Inventory {
    const { sku, lots } = props;

    const mismatched = lots.find((lot) => lot.sku !== sku);
    if (mismatched) {
      throw new Error(
        `SKU mismatch: expected ${sku} but got ${mismatched.sku}`,
      );
    }

    const seen = new Set<string>();
    const duplicated = lots.find((lot) => {
      if (seen.has(lot.lotNumber)) return true;
      seen.add(lot.lotNumber);
      return false;
    });
    if (duplicated) {
      throw new Error(`Lot number already exists: ${duplicated.lotNumber}`);
    }

    return new Inventory(sku, [...lots]);
  }

  onHand(): number {
    return this.lots.reduce((sum, lot) => sum + lot.quantity, 0);
  }

  availableOn(on: Date): number {
    return this.lots
      .filter((lot) => lot.isAllocatableOn(on))
      .reduce((sum, lot) => sum + lot.quantity, 0);
  }

  receive(lot: Lot): Inventory {
    return Inventory.of({ sku: this.sku, lots: [...this.lots, lot] });
  }
}
