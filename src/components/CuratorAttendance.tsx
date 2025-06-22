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
  Box,
  Alert,
  CircularProgress,
  Checkbox,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { API_URL } from '../config';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AttendanceRecord {
  groupId: number;
  groupName: string;
  studentId: number;
  studentEmail: string;
  studentName?: string;
  attendedToday: boolean;
  attendanceTime: string | null;
}

interface HistoricalAttendanceRecord {
  userId: number;
  date: string;
  isValid: boolean;
  user: { name: string | null; email: string };
  group: { name: string | null };
}

interface Group {
  id: number;
  name: string;
  students?: { userId: number; user: { id: number; email: string; name?: string } }[];
}

interface CuratorAttendanceProps {
  token: string | null;
}

const CuratorAttendance: React.FC<CuratorAttendanceProps> = ({ token }) => {
  const [currentDayAttendance, setCurrentDayAttendance] = useState<AttendanceRecord[]>([]);
  const [historicalAttendance, setHistoricalAttendance] = useState<HistoricalAttendanceRecord[]>([]);
  const [loadingCurrentDay, setLoadingCurrentDay] = useState<boolean>(true);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [errorCurrentDay, setErrorCurrentDay] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterGroupId, setFilterGroupId] = useState<number | ''>('');
  const [filterStudentId, setFilterStudentId] = useState<number | ''>('');
  const [curatorGroups, setCuratorGroups] = useState<Group[]>([]);
  const [selectedGroupForCurrentDay, setSelectedGroupForCurrentDay] = useState<number | ''>('');

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  useEffect(() => {
    if (token) {
      const fetchCuratorGroups = async () => {
        try {
          const response = await fetch(`${API_URL}/groups`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error('Не удалось загрузить группы куратора.');
          }
          const data = await response.json();
          setCuratorGroups(data);
        } catch (err: any) {
          console.error('Ошибка при загрузке групп куратора:', err.message);
        }
      };
      fetchCuratorGroups();
    }
  }, [token]);

  useEffect(() => {
    const fetchCurrentDayAttendance = async () => {
      if (!token) {
        setErrorCurrentDay('Токен не найден. Пожалуйста, войдите.');
        setLoadingCurrentDay(false);
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        if (selectedGroupForCurrentDay) {
          queryParams.append('groupId', selectedGroupForCurrentDay.toString());
        }
        
        const response = await fetch(`${API_URL}/attendance/curator-group-attendance?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Не удалось получить данные о посещаемости за сегодня.');
        }

        const data = await response.json();
        setCurrentDayAttendance(data);
      } catch (err: any) {
        setErrorCurrentDay(err.message);
      } finally {
        setLoadingCurrentDay(false);
      }
    };

    fetchCurrentDayAttendance();
  }, [token, selectedGroupForCurrentDay]);

  const fetchHistoricalAttendance = async () => {
    if (!token) {
      setErrorHistory('Токен не найден. Пожалуйста, войдите.');
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    setErrorHistory(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterStartDate) {
        queryParams.append('startDate', filterStartDate);
      }
      if (filterEndDate) {
        queryParams.append('endDate', filterEndDate);
      }
      if (filterGroupId) {
        queryParams.append('groupId', filterGroupId.toString());
      }
      if (filterStudentId) {
        queryParams.append('studentId', filterStudentId.toString());
      }

      const response = await fetch(`${API_URL}/attendance/curator-group-attendance-history?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось получить исторические данные о посещаемости.');
      }

      const data = await response.json();
      setHistoricalAttendance(data);
    } catch (err: any) {
      setErrorHistory(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 1 && token) {
      fetchHistoricalAttendance();
    }
  }, [selectedTab, token]);

  const handleApplyFilters = () => {
    fetchHistoricalAttendance();
  };

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterGroupId('');
    setFilterStudentId('');
    fetchHistoricalAttendance();
  };

  const availableStudentsForFilter = filterGroupId
    ? curatorGroups.find(group => group.id === filterGroupId)?.students || []
    : curatorGroups.flatMap(group => group.students || []);

  const renderCurrentDayAttendance = () => {
    if (loadingCurrentDay) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Загрузка данных о посещаемости за сегодня...</Typography>
        </Box>
      );
    }

    if (errorCurrentDay) {
      return <Alert severity="error">{errorCurrentDay}</Alert>;
    }

    const groupedAttendance = currentDayAttendance.reduce((acc, record) => {
      if (!acc[record.groupName]) {
        acc[record.groupName] = [];
      }
      acc[record.groupName].push(record);
      return acc;
    }, {} as { [key: string]: AttendanceRecord[] });

    return (
      <Box>
        <FormControl sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel>Выберите группу</InputLabel>
          <Select
            value={selectedGroupForCurrentDay}
            onChange={(e) => setSelectedGroupForCurrentDay(e.target.value as number | '')}
            label="Выберите группу"
          >
            <MenuItem value="">Все группы</MenuItem>
            {curatorGroups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {Object.entries(groupedAttendance).map(([groupName, records]) => (
          <Box key={groupName} sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2 }}>
              Группа: {groupName}
            </Typography>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="attendance table">
                <TableHead>
                  <TableRow>
                    <TableCell>Студент</TableCell>
                    <TableCell>Почта</TableCell>
                    <TableCell align="center">Отметился сегодня</TableCell>
                    <TableCell>Время отметки</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.studentId}>
                      <TableCell>{record.studentName || 'N/A'}</TableCell>
                      <TableCell>{record.studentEmail}</TableCell>
                      <TableCell align="center">
                        {record.attendedToday ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <CancelIcon color="error" />
                        )}
                      </TableCell>
                      <TableCell>
                        {record.attendanceTime
                          ? new Date(record.attendanceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Не отмечался'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Box>
    );
  };

  const renderHistoricalAttendance = () => {
    if (loadingHistory) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Загрузка истории посещаемости...</Typography>
        </Box>
      );
    }

    if (errorHistory) {
      return <Alert severity="error">{errorHistory}</Alert>;
    }


    const groupedByStudent = historicalAttendance.reduce((acc, record) => {
      const studentKey = `${record.userId}-${record.user.email}`;
      if (!acc[studentKey]) {
        acc[studentKey] = {
          name: record.user.name || 'N/A',
          email: record.user.email,
          groups: {},
          attendance: [],
        };
      }
      const attendanceDate = new Date(record.date);
      const dateString = attendanceDate.toLocaleDateString();
      const timeString = attendanceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      acc[studentKey].attendance.push({
        date: dateString,
        time: timeString,
        groupName: record.group?.name || 'N/A',
        isValid: record.isValid,
      });

      if (record.group?.name) {
        acc[studentKey].groups[record.group.name] = true;
      }

      return acc;
    }, {} as { [key: string]: { name: string; email: string; groups: { [key: string]: boolean }; attendance: { date: string; time: string; groupName: string; isValid: boolean }[] } });

    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Дата начала"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Дата окончания"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={filterGroupId}
              onChange={(e) => {
                setFilterGroupId(e.target.value as number);
                setFilterStudentId('');
              }}
              label="Группа"
            >
              <MenuItem value="">Все группы</MenuItem>
              {curatorGroups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Студент</InputLabel>
            <Select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value as number)}
              label="Студент"
              disabled={!filterGroupId && !curatorGroups.some(g => g.students && g.students.length > 0)}
            >
              <MenuItem value="">Все студенты</MenuItem>
              {availableStudentsForFilter.map((student) => (
                <MenuItem key={student.userId} value={student.userId}>
                  {student.user.name || student.user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleApplyFilters} sx={{ alignSelf: 'center' }}>
            Применить фильтры
          </Button>
          <Button variant="outlined" onClick={handleResetFilters} sx={{ alignSelf: 'center' }}>
            Сбросить фильтры
          </Button>
        </Box>

        {historicalAttendance.length === 0 && !loadingHistory && !errorHistory && (
          <Alert severity="info">Нет данных по выбранным фильтрам.</Alert>
        )}

        {historicalAttendance.length > 0 ? (
          <>
            <Box sx={{ my: 4, p: 2, border: '1px dashed grey', textAlign: 'center' }}>
              <Typography variant="h6">Динамика посещаемости по дням</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={prepareChartData()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Количество отметок" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <Button variant="outlined" sx={{ mb: 2 }} onClick={exportToExcel}>
              Экспорт в Excel
            </Button>

            {Object.entries(groupedByStudent).map(([studentKey, studentData]) => (
              <Box key={studentKey} sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2 }}>
                  {studentData.name} ({studentData.email}) - Группы: {Object.keys(studentData.groups).join(', ')}
                </Typography>
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="historical attendance table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Время</TableCell>
                        <TableCell>Группа</TableCell>
                        <TableCell align="center">Валидно</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentData.attendance.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.time}</TableCell>
                          <TableCell>{record.groupName}</TableCell>
                          <TableCell align="center">
                            {record.isValid ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <CancelIcon color="error" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </>
        ) : null}
      </Box>
    );
  };

  const prepareChartData = () => {
    const dailyAttendance: { [date: string]: number } = {};
    historicalAttendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      dailyAttendance[date] = (dailyAttendance[date] || 0) + 1;
    });

    const sortedData = Object.keys(dailyAttendance)
      .map(date => ({ date, count: dailyAttendance[date] }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedData;
  };

  const exportToExcel = () => {
    if (historicalAttendance.length === 0) {
      alert('Нет данных для экспорта.');
      return;
    }

    const dataForExcel = historicalAttendance.map(record => ({
      'ID Студента': record.userId,
      'Имя Студента': record.user.name || 'N/A',
      'Email Студента': record.user.email,
      'Дата': new Date(record.date).toLocaleDateString(),
      'Время': new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'Группа': record.group?.name || 'N/A',
      'Отметился': record.isValid ? 'Да' : 'Нет',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Посещаемость');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'attendance_report.xlsx');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Посещаемость групп
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={selectedTab} onChange={handleChangeTab} aria-label="attendance tabs">
          <Tab label="Посещаемость за сегодня" />
          <Tab label="История посещаемости" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {selectedTab === 0 && renderCurrentDayAttendance()}
        {selectedTab === 1 && renderHistoricalAttendance()}
      </Box>
    </Container>
  );
};

export default CuratorAttendance; 