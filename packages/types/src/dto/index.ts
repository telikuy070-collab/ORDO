// Shared DTO types - placeholder for future DTOs.
// NOTE: PaginatedResponse lives in packages/types/src/index.ts (single source of truth).
export interface BaseDTO {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}