import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Snackbar, Alert, TextField, IconButton } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Navigate } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface HomeProps {
  isAuthenticated: boolean;
  user: {
    role: string;
  } | null;
}

const Home: React.FC<HomeProps> = ({ isAuthenticated, user }) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

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

  // Получить координаты устройства
  const handleGetCoords = () => {
    if (!navigator.geolocation) {
      setCoordsError('Геолокация не поддерживается вашим браузером.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setCoordsError(null);
      },
      (error) => {
        setCoordsError('Не удалось получить координаты: ' + error.message);
      }
    );
  };

  // Копировать координаты в буфер обмена
  const handleCopyCoords = () => {
    if (coords) {
      const text = `latitude: ${coords.latitude}, longitude: ${coords.longitude}`;
      navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(true);
      });
    }
  };

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

      <Button
        variant="contained"
        color="secondary"
        onClick={handleGetCoords}
        sx={{ mb: 2 }}
      >
        Показать текущие координаты
      </Button>
      {coords && (
        <Paper elevation={2} sx={{ p: 2, mb: 2, width: '100%', maxWidth: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" gutterBottom>
            Ваши координаты:
          </Typography>
          <TextField
            value={`latitude: ${coords.latitude}, longitude: ${coords.longitude}`}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopyCoords} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              ),
            }}
            variant="outlined"
            size="small"
            fullWidth
          />
          <Button
            variant="outlined"
            color="success"
            size="small"
            sx={{ mt: 1 }}
            onClick={async () => {
              // Отправляем запрос на сервер для обновления координат
              const token = localStorage.getItem('authToken');
              const response = await fetch('/api/update-college-coords', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude })
              });
              if (response.ok) {
                setCopySuccess(true);
              } else {
                setCoordsError('Ошибка при обновлении координат на сервере');
              }
            }}
          >
            Обновить COLLEGE_COORDINATES
          </Button>
        </Paper>
      )}
      {coordsError && (
        <Alert severity="error" sx={{ mb: 2 }}>{coordsError}</Alert>
      )}
      <Snackbar open={copySuccess} autoHideDuration={2000} onClose={() => setCopySuccess(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setCopySuccess(false)} severity="success" sx={{ width: '100%' }}>
          Координаты скопированы!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home; 