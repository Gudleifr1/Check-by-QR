import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, FormControl, InputLabel, Select, MenuItem, LinearProgress, Alert } from '@mui/material';
import { API_URL } from '../config';

interface Group {
  id: number;
  name: string;
}

interface StudentGroup {
  groupId: number;
  group: Group;
  isActive: boolean;
}

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  studentGroups?: StudentGroup[];
  curatedGroups?: Group[];
}

interface ProfileProps {
  isAuthenticated: boolean;
  onLogin: (token: string, user: User) => void;
  onLogout: () => void;
  user: User | null;
}

const Profile: React.FC<ProfileProps> = ({ isAuthenticated, onLogin, onLogout, user }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchGroups = async () => {
        setLoadingGroups(true);
        setGroupError(null);
        try {
          const token = localStorage.getItem('authToken');
          if (!token) {
            throw new Error('Токен авторизации не найден.');
          }
          const response = await fetch(`${API_URL}/groups`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Не удалось загрузить группы.');
          }
          const data = await response.json();
          setAvailableGroups(data);
        } catch (err: any) {
          setGroupError(err.message);
        } finally {
          setLoadingGroups(false);
        }
      };
      fetchGroups();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      if (user.role === 'USER' && user.studentGroups && user.studentGroups.length > 0) {
        setSelectedGroupId(user.studentGroups[0].groupId);
      } else if (user.role === 'CURATOR' && user.curatedGroups && user.curatedGroups.length > 0) {
        setSelectedGroupId(user.curatedGroups[0].id);
      } else {
        setSelectedGroupId(''); // Сброс, если нет групп
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegistering ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...(isRegistering && { name }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Произошла ошибка');
      }

      onLogin(data.token, data.user);
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  };

  const handleGroupChange = async (event: any) => {
    const newGroupId = event.target.value;
    setSelectedGroupId(newGroupId);
    setGroupError(null);
    setGroupSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден.');
      }

      const response = await fetch(`${API_URL}/auth/profile/group`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId: newGroupId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить группу.');
      }

      if (data.user) {
        onLogin(token, data.user); // Обновляем пользователя в App.tsx
        setGroupSuccess('Группа успешно обновлена!');
        setTimeout(() => setGroupSuccess(null), 3000);
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Произошла ошибка при обновлении группы.');
    }
  };

  if (isAuthenticated && user) {
    return (
      <Box sx={{ p: 3, maxWidth: 440, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Профиль
          </Typography>
          <Typography variant="body1" gutterBottom>
            Email: {user.email}
          </Typography>
          {user.name && (
            <Typography variant="body1" gutterBottom>
              Имя: {user.name}
            </Typography>
          )}
          <Typography variant="body1" gutterBottom>
            Роль: {user.role}
          </Typography>

          {(user.role === 'USER' || user.role === 'CURATOR') && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>
                Выбрать группу:
              </Typography>
              {loadingGroups && <LinearProgress sx={{ my: 1 }} />}
              {groupError && <Alert severity="error" sx={{ my: 1 }}>{groupError}</Alert>}
              {groupSuccess && <Alert severity="success" sx={{ my: 1 }}>{groupSuccess}</Alert>}
              <FormControl fullWidth margin="normal" disabled={loadingGroups}>
                <InputLabel id="group-select-label">Группа</InputLabel>
                <Select
                  labelId="group-select-label"
                  value={selectedGroupId}
                  onChange={handleGroupChange}
                  label="Группа"
                >
                  <MenuItem value="">Нет</MenuItem>
                  {availableGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {user.role === 'USER' && user.studentGroups && user.studentGroups.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>
                Состоит в группах:
              </Typography>
              {user.studentGroups.filter(sg => sg.isActive).map(sg => (
                <Typography variant="body2" key={sg.groupId}>
                  - {sg.group.name}
                </Typography>
              ))}
            </Box>
          )}

          {user.role === 'CURATOR' && user.curatedGroups && user.curatedGroups.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>
                Курируемые группы:
              </Typography>
              {user.curatedGroups.map(group => (
                <Typography variant="body2" key={group.id}>
                  - {group.name}
                </Typography>
              ))}
            </Box>
          )}

          <Button
            variant="contained"
            color="secondary"
            onClick={onLogout}
            fullWidth
            sx={{ mt: 2 }}
          >
            Выйти
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 440, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {isRegistering ? 'Регистрация' : 'Вход'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          {isRegistering && (
            <TextField
              label="Имя"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
            />
          )}
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            {isRegistering ? 'Зарегистрироваться' : 'Войти'}
          </Button>
          <Button
            variant="text"
            onClick={() => setIsRegistering(!isRegistering)}
            fullWidth
            sx={{ mt: 1 }}
          >
            {isRegistering
              ? 'Уже есть аккаунт? Войти'
              : 'Нет аккаунта? Зарегистрироваться'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Profile; 