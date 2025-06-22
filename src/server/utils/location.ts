// Константы для проверки местоположения
export const COLLEGE_COORDINATES = {
  latitude: 50.4597,
  longitude: 80.2850
};

export const MAX_DISTANCE = 0.002; // Примерно 200 метров в градусах

export interface LocationCheckResult {
  isNearby: boolean;
  distanceInMeters: number;
  message: string;
}

export function checkLocation(latitude: number, longitude: number): LocationCheckResult {
  const latDiff = Math.abs(latitude - COLLEGE_COORDINATES.latitude);
  const lonDiff = Math.abs(longitude - COLLEGE_COORDINATES.longitude);
  const distanceInMeters = Math.round(Math.max(latDiff, lonDiff) * 111000);
  
  return {
    isNearby: latDiff <= MAX_DISTANCE && lonDiff <= MAX_DISTANCE,
    distanceInMeters,
    message: `Вы находитесь примерно в ${distanceInMeters} метрах от колледжа. Для отметки посещения необходимо находиться не далее 200 метров от здания.`
  };
} 