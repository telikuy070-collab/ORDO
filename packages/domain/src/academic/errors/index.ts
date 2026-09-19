// Academic Errors
export class AcademicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcademicError';
  }
}

export class SpecialtyNotFoundError extends AcademicError {
  constructor(specialtyId: string) {
    super(`Specialty not found: ${specialtyId}`);
    this.name = 'SpecialtyNotFoundError';
  }
}

export class GroupNotFoundError extends AcademicError {
  constructor(groupId: string) {
    super(`Group not found: ${groupId}`);
    this.name = 'GroupNotFoundError';
  }
}

export class SemesterNotFoundError extends AcademicError {
  constructor(semesterId: string) {
    super(`Semester not found: ${semesterId}`);
    this.name = 'SemesterNotFoundError';
  }
}

export class SubjectNotFoundError extends AcademicError {
  constructor(subjectId: string) {
    super(`Subject not found: ${subjectId}`);
    this.name = 'SubjectNotFoundError';
  }
}

export class DuplicateSpecialtyCodeError extends AcademicError {
  constructor(code: string) {
    super(`Specialty code already exists: ${code}`);
    this.name = 'DuplicateSpecialtyCodeError';
  }
}

export class InvalidAcademicYearError extends AcademicError {
  constructor(year: string) {
    super(`Invalid academic year: ${year}`);
    this.name = 'InvalidAcademicYearError';
  }
}