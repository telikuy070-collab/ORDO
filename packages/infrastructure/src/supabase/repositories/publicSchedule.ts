import { getSupabaseClient } from '../client';

/** A single published lesson as exposed by the public contract. */
export interface PublicLesson {
  dayOfWeek: number;
  pairNumber: number;
  timeStart: string;
  timeEnd: string;
  weekType: 'all' | 'odd' | 'even';
  lessonType: 'lecture' | 'practice' | 'seminar' | 'lab';
  discipline: string;
  groupCode: string;
  teacherName: string;
  roomNumber: string;
  buildingName: string;
}

export interface PublicSchedule {
  tenant: { id: string; code: string; name: string };
  semester: { id: string; number: number; startDate: string; endDate: string } | null;
  publishedAt: string;
  lessons: PublicLesson[];
}

/**
 * Read-only access to the anonymous timetable contract.
 *
 * The database exposes a single SECURITY DEFINER function for this and keeps
 * every table closed to `anon`, so this repository never selects a table
 * directly. `getByTenantCode` resolves null when the college is unknown or has
 * nothing published, which is also what the endpoint returns for an unknown
 * code so the app cannot be used to probe for existing colleges.
 */
export class SupabasePublicScheduleRepository {
  async getByTenantCode(tenantCode: string): Promise<PublicSchedule | null> {
    const trimmed = tenantCode.trim();
    if (!trimmed) return null;

    const { data, error } = await getSupabaseClient().rpc('get_published_schedule', {
      p_tenant_code: trimmed.toLowerCase(),
    });

    if (error) {
      throw new Error(`Failed to load schedule: ${error.message}`);
    }
    if (!data) return null;

    return data as unknown as PublicSchedule;
  }
}
