import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { USER_ROLES } from '../auth';
import { PrismaClient } from '@prisma/client';
import { checkLocation } from '../utils/location';
import { validateAttendanceQRCode } from '../utils/qrcode';
import { checkDuplicateAttendance, createAttendance } from '../services/attendance';
import { logger } from '../../server/utils/logger';

const router = Router();
const prisma = new PrismaClient();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { qrCode, userId, location } = req.body;

    // Проверяем наличие и валидность геолокации
    if (!location || typeof location !== 'object') {
      return res.status(400).json({ error: 'Отсутствуют данные геолокации' });
    }

    if (location.latitude === undefined || location.longitude === undefined) {
      return res.status(400).json({ error: 'Отсутствуют значения координат' });
    }

    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        error: `Некорректные координаты: latitude=${location.latitude}, longitude=${location.longitude}` 
      });
    }

    // Проверяем расстояние до колледжа
    const locationCheck = checkLocation(latitude, longitude);
    if (!locationCheck.isNearby) {
      return res.status(400).json({ 
        error: 'Вы находитесь слишком далеко от колледжа', 
        details: {
          distance: locationCheck.distanceInMeters,
          message: locationCheck.message
        }
      });
    }

    // Проверяем QR-код
    const qrValidation = validateAttendanceQRCode(qrCode);
    if (!qrValidation.isValid) {
      return res.status(400).json({ error: qrValidation.error });
    }

    // Проверяем, не отмечался ли уже студент сегодня
    const duplicateCheck = await checkDuplicateAttendance(userId);
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({ error: 'Вы уже отметились сегодня' });
    }

    // Получаем группу пользователя (если есть)
    let groupId: number | null = null;
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        studentGroups: { where: { isActive: true }, select: { groupId: true } },
        curatedGroups: { select: { id: true } },
      },
    });

    if (userProfile) {
      if (userProfile.role === USER_ROLES.USER && userProfile.studentGroups && userProfile.studentGroups.length > 0) {
        groupId = userProfile.studentGroups[0].groupId;
      } else if (userProfile.role === USER_ROLES.CURATOR && userProfile.curatedGroups && userProfile.curatedGroups.length > 0) {
        groupId = userProfile.curatedGroups[0].id;
      }
    }
    console.log(`[POST /attendance] Определенный groupId для userId ${userId}: ${groupId}`);

    // Создаем новую запись о посещении
    const attendance = await createAttendance(userId, latitude, longitude, groupId);
    
    logger.info('New attendance created', { attendance });
    res.json({ success: true });

  } catch (error) {
    logger.error('Error in attendance processing', { error });
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' 
    });
  }
});

// Эндпоинт для кураторов: получение списка студентов группы и их посещаемости за текущий день
router.get('/curator-group-attendance', authenticateToken, authorizeRoles([USER_ROLES.CURATOR]), async (req: any, res) => {
  try {
    const curatorId = req.user.id;
    const { groupId: selectedGroupId } = req.query; // Получаем ID выбранной группы из запроса

    const whereClause: any = { curatorId: curatorId };
    if (selectedGroupId) {
      whereClause.id = parseInt(selectedGroupId as string); // Добавляем фильтр по ID группы
    }

    // Находим группы, которые курирует данный пользователь (возможно, одну, если передан selectedGroupId)
    const curatedGroups = await prisma.group.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        students: {
          where: { isActive: true }, // Только активные студенты
          select: {
            userId: true,
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (curatedGroups.length === 0) {
      return res.status(404).json({ message: 'Вы не являетесь куратором ни одной группы.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Начало сегодняшнего дня

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Начало завтрашнего дня

    const attendanceData: any[] = [];

    for (const group of curatedGroups) {
      for (const studentGroup of group.students) {
        const attendanceRecord = await prisma.attendance.findFirst({
          where: {
            userId: studentGroup.userId,
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
          select: { date: true },
        });

        attendanceData.push({
          groupId: group.id,
          groupName: group.name,
          studentId: studentGroup.user.id,
          studentEmail: studentGroup.user.email,
          studentName: studentGroup.user.name,
          attendedToday: !!attendanceRecord,
          attendanceTime: attendanceRecord ? attendanceRecord.date : null,
        });
      }
    }

    res.json(attendanceData);
  } catch (error) {
    console.error('Ошибка при получении посещаемости для куратора:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера.' });
  }
});

// Эндпоинт для кураторов: получение исторической посещаемости для всех студентов в их группах
router.get('/curator-group-attendance-history', authenticateToken, authorizeRoles([USER_ROLES.CURATOR]), async (req: any, res) => {
  try {
    const curatorId = req.user.id;
    const { startDate, endDate, groupId, studentId } = req.query; // Получаем параметры фильтрации

    const curatedGroups = await prisma.group.findMany({
      where: { curatorId: curatorId },
      select: {
        id: true,
        name: true,
        students: {
          where: { isActive: true },
          select: {
            userId: true,
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (curatedGroups.length === 0) {
      return res.status(404).json({ message: 'Вы не являетесь куратором ни одной группы.' });
    }

    const studentIdsInCuratedGroups = curatedGroups.flatMap(group =>
      group.students.map(sg => sg.userId)
    );

    const whereClause: any = {
      userId: {
        in: studentIdsInCuratedGroups,
      },
    };

    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lt: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) }; // Включаем весь деньendDate
    }
    if (groupId) {
      whereClause.groupId = parseInt(groupId as string);
    }
    if (studentId) {
      whereClause.userId = parseInt(studentId as string);
    }

    const historicalAttendance = await prisma.attendance.findMany({
      where: whereClause, // Используем сформированный whereClause
      select: {
        userId: true,
        date: true,
        isValid: true,
        user: {
          select: { name: true, email: true },
        },
        group: {
          select: { name: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json(historicalAttendance);
  } catch (error) {
    console.error('Ошибка при получении исторической посещаемости для куратора:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера.' });
  }
});

export default router; 