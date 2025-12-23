import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Grid, Paper, TextField, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Button 
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useReports } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const isCashier = user?.role === 'cashier';
  const { 
    dailySales, 
    productPerformance, 
    inventoryValuation,
    fetchDailySales, 
    fetchProductPerformance,
    fetchInventoryValuation
  } = useReports();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  
  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const userId = isCashier ? user?.id : undefined;
    if (tab === 0) {
      fetchDailySales(date, userId);
      fetchProductPerformance(date, date, userId);
    } else if (tab === 1) {
      fetchInventoryValuation();
    }
  }, [date, fetchDailySales, fetchProductPerformance, fetchInventoryValuation, isCashier, user?.id, tab]);

  const handleExportSalesCSV = () => {
    const headers = ['Product', 'Category', 'Units Sold', 'Revenue', 'Profit'];
    const csvData = productPerformance.map(item => [
      item.name,
      item.category,
      item.units_sold,
      (item.revenue / 100).toFixed(2),
      (item.profit / 100).toFixed(2)
    ]);
    
    const summary = [
      [],
      ['Summary'],
      ['Total Revenue', (dailySales?.total_revenue || 0) / 100],
      ['Total Transactions', dailySales?.total_transactions || 0],
      ['Cash Total', (dailySales?.cash_total || 0) / 100],
      ['Card Total', (dailySales?.card_total || 0) / 100],
    ];

    const csvContent = [headers, ...csvData, ...summary].map(e => e.join(",")).join("\n");
    downloadCSV(csvContent, `sales_report_${date}.csv`);
  };

  const handleExportStockCSV = () => {
    if (!inventoryValuation) return;
    const headers = ['Metric', 'Value'];
    const csvData = [
      ['Total Products', inventoryValuation.total_products],
      ['Inventory Value (Cost)', (inventoryValuation.total_cost_value / 100).toFixed(2)],
      ['Inventory Value (Retail)', (inventoryValuation.total_retail_value / 100).toFixed(2)],
      ['Potential Profit', ((inventoryValuation.total_retail_value - inventoryValuation.total_cost_value) / 100).toFixed(2)],
    ];

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    downloadCSV(csvContent, `stock_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>Reports</Typography>

      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Sales Report" />
        {!isCashier && <Tab label="Stock Report" />}
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />} 
                onClick={handleExportSalesCSV}
                disabled={productPerformance.length === 0}
              >
                Export CSV
              </Button>
              <TextField
                type="date"
                size="small"
                label="Select Date"
                InputLabelProps={{ shrink: true }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: 4, borderColor: 'primary.main' }}>
              <Typography color="textSecondary" variant="body2">Total Revenue</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {currency}{((dailySales?.total_revenue || 0) / 100).toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: 4, borderColor: 'success.main' }}>
              <Typography color="textSecondary" variant="body2">Transactions</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {dailySales?.total_transactions || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: 4, borderColor: 'info.main' }}>
              <Typography color="textSecondary" variant="body2">Cash Payments</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {currency}{((dailySales?.cash_total || 0) / 100).toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: 4, borderColor: 'warning.main' }}>
              <Typography color="textSecondary" variant="body2">Card Payments</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {currency}{((dailySales?.card_total || 0) / 100).toFixed(2)}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Product Performance</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Units Sold</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    {!isCashier && <TableCell align="right">Profit</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productPerformance.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell align="right">{item.units_sold}</TableCell>
                      <TableCell align="right">{currency}{(item.revenue / 100).toFixed(2)}</TableCell>
                      {!isCashier && <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                        {currency}{(item.profit / 100).toFixed(2)}
                      </TableCell>}
                    </TableRow>
                  ))}
                  {productPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isCashier ? 4 : 5} align="center">No sales data for this period</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 1 && !isCashier && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />} 
                onClick={handleExportStockCSV}
              >
                Export CSV
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6">Inventory Value (Cost)</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {currency}{((inventoryValuation?.total_cost_value || 0) / 100).toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
              <Typography variant="h6">Inventory Value (Retail)</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {currency}{((inventoryValuation?.total_retail_value || 0) / 100).toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
              <Typography variant="h6">Total Products</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {inventoryValuation?.total_products || 0}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Potential Profit</Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {currency}{(((inventoryValuation?.total_retail_value || 0) - (inventoryValuation?.total_cost_value || 0)) / 100).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Calculated as Total Retail Value - Total Cost Value of current active stock.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
