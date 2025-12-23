import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, Alert, Snackbar,
  Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'cashier';
  created_at: string;
}

const Users: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier'
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const permissions = [
    { feature: 'Process Sales', admin: true, manager: true, cashier: true },
    { feature: 'View Reports', admin: true, manager: true, cashier: 'Own Only' },
    { feature: 'Manage Inventory', admin: true, manager: true, cashier: false },
    { feature: 'Manage Users', admin: true, manager: false, cashier: false },
    { feature: 'System Settings', admin: true, manager: false, cashier: false },
    { feature: 'Delete Sales', admin: true, manager: false, cashier: false },
  ];

  const fetchUsers = useCallback(async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.invoke('auth:get-users');
      setUsers(result);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpen = (u: User | null = null) => {
    if (u) {
      setEditingUser(u);
      setFormData({ username: u.username, password: '', role: u.role });
    } else {
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'cashier' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // @ts-ignore
        await window.electronAPI.invoke('auth:update-user', {
          id: editingUser.id,
          ...formData,
          userRole: user?.role
        });
        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        if (!formData.password) {
          setMessage({ type: 'error', text: 'Password is required for new users' });
          return;
        }
        // @ts-ignore
        await window.electronAPI.invoke('auth:create-user', { ...formData, userRole: user?.role });
        setMessage({ type: 'success', text: 'User created successfully' });
      }
      handleClose();
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      setMessage({ type: 'error', text: 'Failed to save user' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        // @ts-ignore
        await window.electronAPI.invoke('auth:delete-user', { id, userRole: user?.role });
        setMessage({ type: 'success', text: 'User deleted successfully' });
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        setMessage({ type: 'error', text: 'Failed to delete user' });
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>Access Denied</Typography>
        <Typography>Only administrators can manage users and permissions.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>User & Access Management</Typography>

      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Users List" />
        <Tab label="Role Permissions" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Add New User
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Username</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Created At</TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>{u.username}</TableCell>
                    <TableCell>
                      <Chip 
                        label={u.role.toUpperCase()} 
                        color={u.role === 'admin' ? 'secondary' : u.role === 'manager' ? 'primary' : 'default'} 
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpen(u)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDelete(u.id)} 
                        color="error" 
                        size="small"
                        disabled={u.id === user.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Feature / Permission</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Admin</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Manager</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cashier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((p, index) => (
                <TableRow key={index} hover>
                  <TableCell>{p.feature}</TableCell>
                  <TableCell align="center">
                    {p.admin === true ? <Chip label="YES" color="success" size="small" /> : p.admin}
                  </TableCell>
                  <TableCell align="center">
                    {p.manager === true ? <Chip label="YES" color="success" size="small" /> : p.manager === false ? <Chip label="NO" color="error" size="small" /> : p.manager}
                  </TableCell>
                  <TableCell align="center">
                    {p.cashier === true ? <Chip label="YES" color="success" size="small" /> : p.cashier === false ? <Chip label="NO" color="error" size="small" /> : <Chip label={p.cashier} color="info" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Username"
            fullWidth
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
            type="password"
            fullWidth
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <TextField
            select
            label="Role"
            fullWidth
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="manager">Manager</MenuItem>
            <MenuItem value="cashier">Cashier</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!message} 
        autoHideDuration={6000} 
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setMessage(null)} severity={message?.type || 'info'} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
