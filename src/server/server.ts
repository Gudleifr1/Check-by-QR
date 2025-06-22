import express from 'express';
console.log("Сервер запущен (тестовый лог)!");
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import authRoutes from './api/auth';
import attendanceRoutes from './api/attendance';
import groupsRoutes from './api/groups';
import { authenticateToken, authorizeRoles } from './middleware/authMiddleware';
import { USER_ROLES } from './auth';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Настройка CORS для разработки
app.use(cors({
  origin: ['https://localhost:5173', 'https://192.168.170.140:5173'],
  credentials: true
}));

app.use(express.json());

// Регистрируем маршруты
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/groups', groupsRoutes);

// Получение списка пользователей (только для админа)
app.get('/api/users', authenticateToken, authorizeRoles([USER_ROLES.ADMIN]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(users);
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

// Обновление роли пользователя (только для админа)
app.put('/api/users/:id/role', authenticateToken, authorizeRoles([USER_ROLES.ADMIN]), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(USER_ROLES).includes(role)) {
    return res.status(400).json({ error: 'Неверная роль' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { role: role },
      select: { id: true, email: true, name: true, role: true }, // Возвращаем только нужные поля
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка при обновлении роли:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

const PORT = process.env.PORT || 3000;

// Путь к SSL сертификатам
const certPath = path.join(process.cwd(), 'localhost.pem');
const keyPath = path.join(process.cwd(), 'localhost-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('SSL сертификаты не найдены. Сервер не может быть запущен.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Создаем HTTPS сервер
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`HTTPS Сервер запущен на порту ${PORT}`);
}); 