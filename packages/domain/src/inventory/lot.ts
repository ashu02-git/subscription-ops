export type LotProps = {
  sku: string;
  lotNumber: string;
  quantity: number;
  expiresAt: Date;
};

const MIN_SHELF_LIFE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export class Lot {
  private constructor(
    readonly sku: string,
    readonly lotNumber: string,
    readonly quantity: number,
    readonly expiresAt: Date,
  ) {}

  static create(props: LotProps): Lot {
    if (props.quantity < 0) throw new Error("quantity must be >= 0");
    return new Lot(props.sku, props.lotNumber, props.quantity, props.expiresAt);
  }

  isAllocatableOn(on: Date): boolean {
    const remainingDays = (this.expiresAt.getTime() - on.getTime()) / DAY_MS;
    return remainingDays >= MIN_SHELF_LIFE_DAYS;
  }
}
