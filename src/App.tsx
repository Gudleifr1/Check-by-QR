// Импорт необходимых компонентов и утилит из Material-UI
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Импорт пользовательских компонентов
import BottomNav from './components/BottomNav';
import MainContainer from './components/MainContainer';
import Profile from './components/Profile';
import QRScanner from './components/QRScanner';
import Home from './components/Home';
import UserManagement from './components/UserManagement';
import GroupManagement from './components/GroupManagement';
import CuratorAttendance from './components/CuratorAttendance';
import { useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';

// Определяем тип для пользователя
interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  studentGroups?: { groupId: number; group: { id: number; name: string } }[];
  curatedGroups?: { id: number; name: string }[];
}

// Настройка темы приложения
// Здесь вы можете настроить цвета, типографику, отступы и другие параметры темы
const theme = createTheme({
  palette: {
    mode: 'light', // Режим темы ('light' или 'dark')
    primary: {
      main: '#1976d2', // Основной цвет приложения
    },
    secondary: {
      main: '#dc004e', // Вторичный цвет приложения
    },
    // Можно добавить другие цвета и настройки палитры
  },
  // Можно добавить другие настройки темы:
  // typography - для настройки шрифтов
  // spacing - для настройки отступов
  // breakpoints - для настройки точек адаптивности
  // components - для кастомизации компонентов MUI
});

// Корневой компонент приложения
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    const token = localStorage.getItem('authToken');
    if (token) {
      // Здесь можно добавить проверку токена на сервере
      fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          handleLogout();
        }
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, []);

  const handleLogin = (token: string, userData: User) => {
    // Сохраняем токен в localStorage
    localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleScan = async (result: string) => {
    console.log('QR код отсканирован:', result);
    
    if (!isAuthenticated || !user) {
      setNotification({ message: 'Пожалуйста, войдите в систему', type: 'error' });
      setScannerActive(false);
      return;
    }

    // Предварительное уведомление о необходимости геолокации
    setNotification({
      message: 'Для отметки посещения необходимо разрешить доступ к геолокации',
      type: 'info'
    });

    try {
      // Проверяем поддержку геолокации
      if (!navigator.geolocation) {
        throw new Error('Геолокация не поддерживается вашим браузером');
      }

      // Получаем геолокацию с обработкой ошибок разрешения
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              reject(new Error('Для отметки посещения необходимо разрешить доступ к геолокации. Пожалуйста, измените настройки браузера и попробуйте снова.'));
            } else {
              reject(new Error('Ошибка при получении геолокации. Пожалуйста, попробуйте снова.'));
            }
          },
          { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude } = position.coords;

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          qrCode: result,
          userId: user.id,
          location: {
            latitude,
            longitude
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details?.message) {
          throw new Error(data.details.message);
        }
        throw new Error(data.error || 'Ошибка при отметке посещения');
      }

      setNotification({ message: 'Посещение успешно отмечено', type: 'success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';
      setNotification({ 
        message: errorMessage,
        type: 'error' 
      });
      
      // Если ошибка связана с геолокацией, оставляем сканер активным
      if (errorMessage.toLowerCase().includes('геолокаци')) {
        return;
      }
    }

    setScannerActive(false);
  };

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainContainer>
          <Routes>
            <Route 
              path="/" 
              element={
                user && user.role.toLowerCase() === 'admin' ? (
                  <Home isAuthenticated={isAuthenticated} user={user} />
                ) : (
                  <Navigate to="/profile" replace />
                )
              } 
            />
            <Route 
              path="/profile" 
              element={
                <Profile
                  isAuthenticated={isAuthenticated}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                  user={user}
                />
              } 
            />
            {user && user.role === 'ADMIN' && (
              <>
                <Route 
                  path="/users" 
                  element={
                    <UserManagement
                      token={localStorage.getItem('authToken')}
                      currentUserId={user ? user.id : null}
                    />
                  }
                />
                <Route 
                  path="/groups" 
                  element={
                    <GroupManagement
                      token={localStorage.getItem('authToken')}
                    />
                  }
                />
              </>
            )}
            <Route
              path="/curator-attendance"
              element={
                user && user.role === 'CURATOR' ? (
                  <CuratorAttendance token={localStorage.getItem('authToken')} />
                ) : (
                  <Navigate to="/profile" replace />
                )
              }
            />
            <Route 
              path="/scanner" 
              element={
                isAuthenticated ? (
                  scannerActive ? (
                    <QRScanner
                      onScan={handleScan}
                      onClose={() => setScannerActive(false)}
                    />
                  ) : (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                      <h2>Сканер QR-кодов</h2>
                      <button 
                        onClick={() => setScannerActive(true)}
                        style={{
                          padding: '10px 20px',
                          fontSize: '16px',
                          cursor: 'pointer'
                        }}
                      >
                        Включить сканер
        </button>
      </div>
                  )
                ) : (
                  <Navigate to="/profile" replace />
                )
              } 
            />
          </Routes>
        </MainContainer>
        <BottomNav user={user} />
        <Snackbar
          open={!!notification}
          ClickAwayListenerProps={{ mouseEvent: false, touchEvent: false }}
          onClose={() => setNotification(null)}
        >
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification?.type} 
            sx={{ width: '100%' }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </Router>
  );
}

export default App;
