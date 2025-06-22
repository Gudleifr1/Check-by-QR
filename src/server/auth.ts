import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Константы для ролей
export const USER_ROLES = {
  USER: 'USER',
  CURATOR: 'CURATOR',
  ADMIN: 'ADMIN'
} as const;

// Определяем тип для пользователя с включенными группами, чтобы TypeScript корректно его распознал
interface UserWithRelations {
  id: number;
  email: string;
  name: string | null;
  role: string;
  studentGroups: Array<{ groupId: number; group: { id: number; name: string } }>;
  curatedGroups: Array<{ id: number; name: string }>;
}

export async function registerUser(email: string, password: string, name?: string): Promise<{ user: UserWithRelations, token: string }> {
  console.log('Начало registerUser');
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Проверяем, является ли это первым пользователем...');
    const isFirst = await isFirstUser();
    console.log('Количество пользователей в БД после проверки isFirstUser:', isFirst ? '0 (первый)' : 'Больше 0');

    console.log('Создаем нового пользователя с ролью:', isFirst ? USER_ROLES.ADMIN : USER_ROLES.USER);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: isFirst ? USER_ROLES.ADMIN : USER_ROLES.USER,
      },
      include: {
        studentGroups: {
          include: { group: true },
        },
        curatedGroups: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { user: user as UserWithRelations, token };
  } catch (error) {
    console.error('Ошибка в registerUser:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: UserWithRelations, token: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentGroups: {
          include: { group: true },
        },
        curatedGroups: true,
      },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Неверный пароль');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { user: user as UserWithRelations, token };
  } catch (error) {
    console.error('Ошибка в loginUser:', error);
    throw error;
  }
}

export async function updateRole(userId: number, newRole: string) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true }, // Возвращаем только нужные поля
    });
    return user;
  } catch (error) {
    console.error('Ошибка в updateRole:', error);
    throw error;
  }
}

async function isFirstUser(): Promise<boolean> {
  const count = await prisma.user.count();
  console.log(`[isFirstUser] Current user count: ${count}`);
  return count === 0;
} 