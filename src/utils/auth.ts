// Определяем базовый URL API
const getApiUrl = () => {
  // Получаем hostname текущей страницы (без порта)
  const hostname = window.location.hostname;
  
  // Если это localhost или IP-адрес хоста разработки
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Для всех остальных случаев используем текущий hostname
  return `https://${hostname}:5000`;
};

const API_URL = getApiUrl();

// Регистрация пользователя
export async function registerUser(email: string, password: string, name?: string) {
  const response = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка регистрации');
  }

  return response.json();
}

// Авторизация пользователя
export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка входа');
  }

  return response.json();
}

// Проверка JWT токена
export function verifyToken(token: string) {
  return token && token.length > 0;
}