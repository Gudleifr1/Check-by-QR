import React from 'react';
// Импорт компонентов Material-UI для компоновки
import { Box } from '@mui/material';

// Компонент-обертка для основного содержимого приложения
// children - дочерние элементы, которые будут отображаться внутри контейнера
const MainContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      sx={{
        maxWidth: 'lg', // Ограничиваем максимальную ширину, как это делает Container (или можно выбрать другое значение)
        mx: 'auto', // Центрируем по горизонтали
        paddingBottom: '56px',
        minHeight: '100vh',
        display: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </Box>
  );
};

export default MainContainer; 