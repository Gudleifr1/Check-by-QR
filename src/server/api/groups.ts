import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { USER_ROLES } from '../auth';

const router = Router();
const prisma = new PrismaClient();

// Создание новой группы (только для админа)
router.post('/', authenticateToken, authorizeRoles([USER_ROLES.ADMIN]), async (req, res) => {
  console.log('Получен запрос на создание группы:', req.body);
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('Ошибка: Название группы пустое или невалидное.');
      return res.status(400).json({ error: 'Название группы не может быть пустым.' });
    }

    const newGroup = await prisma.group.create({
      data: { name: name.trim() },
    });
    console.log('Группа успешно создана:', newGroup);
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Ошибка при создании группы:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при создании группы.' });
  }
});

// Получение списка всех групп (доступно для всех аутентифицированных пользователей)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' }, // Сортировка по алфавиту
      select: { 
        id: true, 
        name: true, 
        curator: { select: { id: true, name: true, email: true } },
        students: { 
          where: { isActive: true },
          select: { 
            userId: true, 
            user: { select: { id: true, email: true, name: true } } 
          }
        }
      }, // Включаем информацию о кураторе и студентах
    });
    res.json(groups);
  } catch (error) {
    console.error('Ошибка при получении списка групп:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при получении списка групп.' });
  }
});

export default router; 