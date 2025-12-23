import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, Grid, 
  MenuItem, Alert, Snackbar 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../hooks/useAuth';

interface Settings {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_footer: string;
  printer_device_name: string;
  printer_paper_width: '80mm' | '58mm';
  currency_symbol: string;
  tax_percentage: number;
  low_stock_threshold: number;
}

interface Printer {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    store_name: '',
    store_address: '',
    store_phone: '',
    receipt_footer: '',
    printer_device_name: '',
    printer_paper_width: '80mm',
    currency_symbol: '$',
    tax_percentage: 0,
    low_stock_threshold: 10
  });
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      const [currentSettings, printerList] = await Promise.all([
        // @ts-ignore
        window.electronAPI.invoke('settings:get'),
        // @ts-ignore
        window.electronAPI.invoke('printer:get-printers')
      ]);
      
      setSettings(currentSettings);
      setPrinters(printerList);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // @ts-ignore
      await window.electronAPI.invoke('settings:save', { settings, userRole: user?.role });
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>Settings</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>Store Information</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Store Name"
              value={settings.store_name}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Store Address"
              value={settings.store_address}
              onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone Number"
              value={settings.store_phone}
              onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>Business Configuration</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Currency Symbol"
              value={settings.currency_symbol}
              onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Tax Percentage (%)"
              value={settings.tax_percentage}
              onChange={(e) => setSettings({ ...settings, tax_percentage: Number(e.target.value) })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Low Stock Threshold"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })}
              helperText="Alert level for low inventory"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>Receipt Configuration</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Receipt Footer Message"
              multiline
              rows={2}
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              helperText="This message will appear at the bottom of the receipt"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              select
              fullWidth
              label="Receipt Printer"
              value={settings.printer_device_name}
              onChange={(e) => setSettings({ ...settings, printer_device_name: e.target.value })}
              helperText="Select the printer to use for receipts"
            >
              <MenuItem value="">
                <em>Default System Printer</em>
              </MenuItem>
              {printers.map((printer) => (
                <MenuItem key={printer.name} value={printer.name}>
                  {printer.displayName || printer.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Paper Width"
              value={settings.printer_paper_width || '80mm'}
              onChange={(e) => setSettings({ ...settings, printer_paper_width: e.target.value as '80mm' | '58mm' })}
              helperText="Select thermal paper width"
            >
              <MenuItem value="80mm">80mm (Standard)</MenuItem>
              <MenuItem value="58mm">58mm (Small)</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, border: '1px solid #ffcdd2', bgcolor: '#fff9f9' }}>
        <Typography variant="h6" color="error" gutterBottom sx={{ fontWeight: 'medium' }}>Danger Zone</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Resetting the database will delete all products, sales, users, and settings. 
          This action is irreversible. You will be logged out after the reset.
        </Typography>
        <Button 
          variant="outlined" 
          color="error"
          onClick={async () => {
            if (window.confirm('CRITICAL WARNING: Are you sure you want to reset the entire database? All data will be lost forever.')) {
              try {
                // @ts-ignore
                const success = await window.electronAPI.invoke('database:reset', { userRole: user?.role });
                if (success) {
                  window.location.reload(); // Reload to trigger logout/redirect
                }
              } catch (error: any) {
                console.error('Failed to reset database:', error);
                setMessage({ type: 'error', text: error.message || 'Failed to reset database' });
              }
            }
          }}
        >
          Reset Database
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ px: 4, py: 1.5, borderRadius: 2 }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>

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

export default Settings;
