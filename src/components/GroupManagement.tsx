import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Paper,
} from '@mui/material';
import { API_URL } from '../config';

interface GroupManagementProps {
  token: string | null;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ token }) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!token) {
      setError('Токен не найден. Пожалуйста, войдите.');
      setLoading(false);
      return;
    }

    if (!groupName.trim()) {
      setError('Название группы не может быть пустым.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать группу.');
      }

      setSuccess(`Группа "${data.name}" успешно создана!`);
      setGroupName(''); // Очищаем поле ввода
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Управление группами
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Создать новую группу
        </Typography>
        <form onSubmit={handleCreateGroup}>
          <TextField
            label="Название группы"
            variant="outlined"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать группу'}
          </Button>
        </form>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>
      {/* Здесь можно будет добавить список групп и другие функции */}
    </Container>
  );
};

export default GroupManagement; 