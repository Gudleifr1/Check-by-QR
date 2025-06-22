import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Импорт компонентов Material-UI для нижней навигации
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
// Импорт иконок для пунктов меню
import { Home, Person } from '@mui/icons-material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PeopleIcon from '@mui/icons-material/People'; // Импортируем иконку для управления пользователями
import GroupsIcon from '@mui/icons-material/Groups'; // Импортируем иконку для управления группами
import EventNoteIcon from '@mui/icons-material/EventNote'; // Импортируем иконку для посещаемости

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
}

interface BottomNavProps {
  user: User | null;
}

// Компонент нижней навигации
const BottomNav: React.FC<BottomNavProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем текущее значение на основе пути
  const getCurrentValue = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/profile':
        return 1;
      case '/scanner':
        return 2;
      case '/users': // Добавляем новый маршрут
        return 3; 
      case '/groups':
        return 4;
      case '/curator-attendance': // Добавляем новый маршрут для куратора
        return 5;
      default:
        return 0;
    }
  };

  const handleChange = (_: any, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/profile');
        break;
      case 2:
        navigate('/scanner');
        break;
      case 3:
        navigate('/users'); // Добавляем навигацию для нового маршрута
        break;
      case 4:
        navigate('/groups');
        break;
      case 5: // Добавляем навигацию для посещаемости куратора
        navigate('/curator-attendance');
        break;
      // case 4: // Для будущих настроек
      //   navigate('/settings');
      //   break;
    }
  };

  return (
    // Paper добавляет эффект "поднятия" компонента и тень
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      {/* BottomNavigation - компонент нижней навигации */}
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels // Показывать подписи к иконкам
      >
        {/* 
          Здесь определяются пункты меню
          - label: текст пункта
          - icon: иконка пункта
          При добавлении новых разделов, добавляйте новые BottomNavigationAction
        */}
        <BottomNavigationAction label="Главная" icon={<Home />} />
        <BottomNavigationAction label="Профиль" icon={<Person />} />
        <BottomNavigationAction label="Сканер" icon={<QrCodeScannerIcon />} />
        {/* Условный рендеринг для администратора */}
        {user && user.role === 'ADMIN' && (
          <BottomNavigationAction label="Пользователи" icon={<PeopleIcon />} />
        )}
        {user && user.role === 'ADMIN' && (
          <BottomNavigationAction label="Группы" icon={<GroupsIcon />} />
        )}
        {user && user.role === 'CURATOR' && (
          <BottomNavigationAction label="Посещаемость" icon={<EventNoteIcon />} />
        )}
        {/* <BottomNavigationAction label="Настройки" icon={<Settings />} /> */}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav; 