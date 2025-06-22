import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
//import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser } from '../auth'; // Импортируем существующие функции

const router = Router();
const prisma = new PrismaClient();

// Middleware для проверки токена
const verifyToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// Проверка токена
router.get('/verify-token', verifyToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentGroups: { include: { group: true } },
        curatedGroups: { select: { id: true, name: true } },
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser(email, password, name); // Используем функцию из auth.ts
    res.json(result);
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password); // Используем функцию из auth.ts
    res.json(result);
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

// Обновление группы пользователя/куратора
router.put('/profile/group', verifyToken, async (req: any, res) => {
  const { groupId } = req.body;
  const userId = req.user.userId;

  if (!groupId) {
    return res.status(400).json({ error: 'ID группы обязателен.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    if (user.role === 'USER') {
      // Пользователь-студент присоединяется к группе
      await prisma.studentGroup.upsert({
        where: { userId_groupId: { userId: userId, groupId: groupId } },
        update: { isActive: true },
        create: { userId: userId, groupId: groupId },
      });
      // Отсоединяем от других групп, если был присоединен
      await prisma.studentGroup.updateMany({
        where: {
          userId: userId,
          NOT: { groupId: groupId }
        },
        data: { isActive: false }
      });
    } else if (user.role === 'CURATOR') {
      // Куратор назначает себя куратором группы
      await prisma.group.update({
        where: { id: groupId },
        data: { curator: { connect: { id: userId } } },
      });
      // Отсоединяем от других групп, если был присоединен
      await prisma.group.updateMany({
        where: {
          curatorId: userId,
          NOT: { id: groupId }
        },
        data: { curatorId: null }
      });
    } else {
      return res.status(403).json({ error: 'Ваша роль не позволяет присоединяться к группам или курировать их.' });
    }

    // Перезагружаем пользователя с обновленными связями
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentGroups: { include: { group: true } },
        curatedGroups: { select: { id: true, name: true } },
      },
    });

    res.json({ message: 'Группа успешно обновлена.', user: updatedUser });
  } catch (error) {
    console.error('Ошибка при обновлении группы профиля:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера.' });
  }
});

export default router; 