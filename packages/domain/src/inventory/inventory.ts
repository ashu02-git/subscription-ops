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
    return new Inventory(props.sku, [...props.lots]);
  }

  availableOn(on: Date): number {
    return this.lots
      .filter((lot) => lot.isAllocatableOn(on))
      .reduce((sum, lot) => sum + lot.quantity, 0);
  }
}
