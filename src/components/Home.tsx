import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Navigate } from 'react-router-dom';

interface HomeProps {
  isAuthenticated: boolean;
  user: {
    role: string;
  } | null;
}

const Home: React.FC<HomeProps> = ({ isAuthenticated, user }) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);

  // Если пользователь не авторизован или не админ, перенаправляем на профиль
  if (!isAuthenticated || !user || !(user.role.toLowerCase() === 'admin')) {
    return <Navigate to="/profile" />;
  }

  const generateQRCode = () => {
    // Получаем текущую дату и время
    const now = new Date();
    // Устанавливаем срок действия на конец текущего дня
    const expiry = new Date(now);
    expiry.setHours(23, 59, 59, 999);
    
    // Создаем строку с датой в формате ISO
    const dateStr = now.toISOString();
    // Добавляем случайную соль для дополнительной безопасности
    const salt = Math.random().toString(36).substring(7);
    
    // Создаем QR-код с текущей датой
    setQrValue(`attendance_${dateStr}_${salt}`);
    setQrExpiry(expiry);
  };

  // Автоматически обновляем QR-код каждый день в полночь
  React.useEffect(() => {
    const checkAndRegenerateQR = () => {
      const now = new Date();
      if (qrExpiry && now > qrExpiry) {
        generateQRCode();
      }
    };

    // Проверяем каждую минуту
    const interval = setInterval(checkAndRegenerateQR, 60000);
    return () => clearInterval(interval);
  }, [qrExpiry]);

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Панель администратора
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={generateQRCode}
        sx={{ mb: 2 }}
      >
        Сгенерировать QR-код посещаемости
      </Button>

      {qrValue && qrExpiry && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 2,
            maxWidth: '100%',
            width: '300px'
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            QR-код для отметки посещаемости
          </Typography>
          <QRCodeSVG
            value={qrValue}
            size={256}
            level="H"
            includeMargin
          />
          <Typography variant="body2" color="text.secondary">
            Действителен до: {qrExpiry.toLocaleTimeString()}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Home; 