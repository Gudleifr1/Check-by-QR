import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  useEffect(() => {
    // Создаем сканер с более простой конфигурацией
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: 250,
        aspectRatio: 1,
        supportedScanTypes: [],
      },
      false // Не показывать кнопку остановки сканирования
    );

    // Начинаем сканирование
    scanner.render(
      (decodedText) => {
        console.log('QR код успешно отсканирован:', decodedText);
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        // Игнорируем ошибки сканирования, они возникают постоянно при поиске QR-кода
        console.log(error);
      }
    );

    // Очистка при размонтировании
    return () => {
      scanner.clear().catch(error => {
        console.error('Ошибка при очистке сканера:', error);
      });
    };
  }, [onScan]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 2,
        maxWidth: 540,
        mx: 'auto',
        height: '100%',
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Сканирование QR-кода
      </Typography>

      <Box
        sx={{
          width: '100%',
          maxWidth: 500,
          aspectRatio: '1',
          overflow: 'hidden',
          position: 'relative',
          '& #reader': {
            width: '100% !important',
            height: '100% !important',
          },
          '& video': {
            width: '100% !important',
            height: '100% !important',
            objectFit: 'cover',
          },
        }}
      >
        <div id="reader"></div>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        onClick={onClose}
        fullWidth
        sx={{ mt: 2 }}
      >
        Закрыть сканер
      </Button>
    </Box>
  );
};

export default QRScanner; 