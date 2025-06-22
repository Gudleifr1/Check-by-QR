export interface QRCodeValidationResult {
  isValid: boolean;
  error?: string;
  date?: Date;
}

export function validateAttendanceQRCode(qrCode: string): QRCodeValidationResult {
  // Проверяем формат QR-кода
  if (!qrCode.startsWith('attendance_')) {
    return {
      isValid: false,
      error: 'Неверный формат QR-кода'
    };
  }

  // Извлекаем дату из QR-кода
  const [, dateStr] = qrCode.split('_');
  const qrDate = new Date(dateStr);

  // Проверяем валидность даты
  if (isNaN(qrDate.getTime())) {
    return {
      isValid: false,
      error: 'Неверный формат даты в QR-коде'
    };
  }

  // Проверяем, что QR-код сгенерирован сегодня
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const qrDay = new Date(qrDate.getFullYear(), qrDate.getMonth(), qrDate.getDate());

  if (qrDay.getTime() !== today.getTime()) {
    return {
      isValid: false,
      error: 'QR-код недействителен. Используйте QR-код, сгенерированный сегодня'
    };
  }

  return {
    isValid: true,
    date: qrDate
  };
} 