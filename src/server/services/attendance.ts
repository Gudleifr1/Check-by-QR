import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingAttendance?: any;
}

export async function checkDuplicateAttendance(userId: number): Promise<DuplicateCheckResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      userId: userId,
      date: {
        gte: today,
        lt: tomorrow
      }
    },
    orderBy: {
      date: 'desc'
    }
  });

  return {
    isDuplicate: !!existingAttendance,
    existingAttendance
  };
}

export async function createAttendance(userId: number, latitude: number, longitude: number, groupId: number | null = null) {
  return prisma.attendance.create({
    data: {
      userId,
      date: new Date(),
      latitude,
      longitude,
      groupId,
      createdAt: new Date()
    }
  });
} 