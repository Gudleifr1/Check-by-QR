import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { registerUser } from '../../utils/auth';

interface RegisterFormProps {
  onSuccess: (token: string, user: User) => void;
  onBackClick: () => void;
}

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onBackClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token, user } = await registerUser(email, password, name);
      onSuccess(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        maxWidth: '100%',
      }}
    >
      <Typography variant="h5" component="h2" align="center">
        Регистрация
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Имя"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
      />

      <TextField
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
      />

      <Button type="submit" variant="contained" fullWidth>
        Зарегистрироваться
      </Button>

      <Button onClick={onBackClick} variant="text" fullWidth>
        Назад
      </Button>
    </Box>
  );
};

export default RegisterForm; 