import type { Lot } from "./lot";

export type InventoryProps = {
  sku: string;
  lots: readonly Lot[];
};

export type LotAllocation = {
  lotNumber: string;
  quantity: number;
};

export type PlanAllocationInput = {
  quantity: number;
  on: Date;
  allocatedByLot?: readonly LotAllocation[];
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

  planAllocation(input: PlanAllocationInput): LotAllocation[] {
    const { quantity, on, allocatedByLot = [] } = input;

    const allocated = new Map(
      allocatedByLot.map((a) => [a.lotNumber, a.quantity]),
    );

    const candidates = this.lots
      .filter((lot) => lot.isAllocatableOn(on))
      .toSorted((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

    const plan: LotAllocation[] = [];
    let remaining = quantity;

    for (const lot of candidates) {
      if (remaining === 0) break;

      const available = lot.quantity - (allocated.get(lot.lotNumber) ?? 0);
      if (available <= 0) continue;

      const take = Math.min(available, remaining);
      plan.push({ lotNumber: lot.lotNumber, quantity: take });
      remaining -= take;
    }

    return plan;
  }
}
