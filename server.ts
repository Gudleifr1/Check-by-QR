import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerUser, loginUser, updateRole } from './src/server/auth.js';
import { authenticateToken, authorizeRoles } from './src/server/middleware/authMiddleware.js';
import { USER_ROLES } from './src/server/auth.js';
import { PrismaClient } from '@prisma/client';


console.log('Сервер: Загрузка server.ts');

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Раздача статических файлов из папки dist
app.use(express.static(path.join(__dirname, 'dist')));

// Регистрация
app.post('/api/register', async (req, res) => {
  console.log('Получен запрос на регистрацию:', req.body);
  try {
    const { email, password, name } = req.body;
    const result = await registerUser(email, password, name);
    console.log('Успешная регистрация:', { email, name });
    res.json(result);
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  console.log('Получен запрос на вход:', req.body);
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    console.log('Успешный вход:', { email });
    res.json(result);
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});

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
    const updatedUser = await updateRole(Number(id), role);
    res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка при обновлении роли:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Произошла ошибка' });
  }
});



const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 