// Academic Value Objects
export class SpecialtyCode {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid specialty code format');
    }
    this.value = value.toUpperCase();
  }

  private isValid(code: string): boolean {
    return /^[A-Z0-9]{2,10}$/.test(code);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SpecialtyCode): boolean {
    return this.value === other.value;
  }
}

export class GroupName {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid group name format');
    }
    this.value = value;
  }

  private isValid(name: string): boolean {
    return name.length >= 2 && name.length <= 20;
  }

  toString(): string {
    return this.value;
  }

  equals(other: GroupName): boolean {
    return this.value === other.value;
  }
}

export class AcademicYear {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid academic year format (expected: 2024-2025)');
    }
    this.value = value;
  }

  private isValid(year: string): boolean {
    return /^\d{4}-\d{4}$/.test(year);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AcademicYear): boolean {
    return this.value === other.value;
  }
}