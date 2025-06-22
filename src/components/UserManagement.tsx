import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Alert,
} from '@mui/material';

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
}

interface UserManagementProps {
  token: string | null;
  currentUserId: number | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ token, currentUserId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!token) {
      setError('Токен не найден. Пожалуйста, войдите.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось получить список пользователей.');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!token) {
      setError('Токен не найден. Пожалуйста, войдите.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить роль пользователя.');
      }

      const updatedUser = await response.json();
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === userId ? updatedUser : user))
      );
      setSuccess(`Роль пользователя ${updatedUser.email} обновлена на ${updatedUser.role}`);
      setError(null); // Очистить предыдущие ошибки
      setTimeout(() => setSuccess(null), 3000); // Скрыть сообщение об успехе через 3 секунды
    } catch (err: any) {
      setError(err.message);
      setSuccess(null); // Очистить предыдущие сообщения об успехе
    }
  };

  if (loading) {
    return <Typography>Загрузка пользователей...</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Управление пользователями
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name || 'N/A'}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <FormControl variant="outlined" size="small">
                    <InputLabel id={`role-select-label-${user.id}`}>Роль</InputLabel>
                    <Select
                      labelId={`role-select-label-${user.id}`}
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value as string)}
                      label="Роль"
                      disabled={user.id === currentUserId}
                    >
                      <MenuItem value="USER">USER</MenuItem>
                      <MenuItem value="CURATOR">CURATOR</MenuItem>
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default UserManagement; 