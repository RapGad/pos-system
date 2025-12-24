import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, MenuItem,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Chip, TablePagination
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSales } from '../hooks/useSales';
import { useSettings } from '../hooks/useSettings';

const Sales: React.FC = () => {
  const { sales, totalSales, selectedSale, fetchSales, fetchSaleDetails, setSelectedSale } = useSales();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    paymentMethod: '',
    receiptNumber: ''
  });

  useEffect(() => {
    fetchSales({
      ...filters,
      page,
      pageSize: rowsPerPage
    });
  }, [fetchSales, filters, page, rowsPerPage]);

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPage(0); // Reset to first page on filter change
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (saleId: number) => {
    fetchSaleDetails(saleId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Transactions</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Receipt Number"
              value={filters.receiptNumber}
              onChange={(e) => handleFilterChange('receiptNumber', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Payment Method"
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Card</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button variant="outlined" onClick={() => {
              setFilters({ dateFrom: '', dateTo: '', paymentMethod: '', receiptNumber: '' });
              fetchSales();
            }}>
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Receipt #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Payment</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id} hover>
                <TableCell>{sale.receipt_number}</TableCell>
                <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                <TableCell>{sale.username}</TableCell>
                <TableCell>
                  <Chip 
                    label={sale.payment_method.toUpperCase()} 
                    size="small" 
                    color={sale.payment_method === 'cash' ? 'success' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{currency}{(sale.total_amount / 100).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleViewDetails(sale.id)} color="primary">
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No sales found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalSales}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <Dialog open={!!selectedSale} onClose={() => setSelectedSale(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          Sale Details - {selectedSale?.receipt_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedSale && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography variant="body1">{new Date(selectedSale.created_at).toLocaleString()}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Cashier</Typography>
                <Typography variant="body1">{selectedSale.username}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSale.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{currency}{(item.price_at_sale / 100).toFixed(2)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{currency}{((item.price_at_sale * item.quantity) / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Grand Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {currency}{(selectedSale.total_amount / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSale(null)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!selectedSale) return;
              
              // Map sale data to match what the printer expects
              const printerData = {
                ...selectedSale,
                items: selectedSale.items.map((item: any) => ({
                  ...item,
                  name: item.product_name, // Map product_name to name
                  price: item.price_at_sale // Ensure price is available
                }))
              };
              
              try {
                // @ts-ignore
                await window.electronAPI.invoke('printer:print-receipt', printerData);
              } catch (err) {
                console.error('Failed to print receipt:', err);
                alert('Failed to print receipt. Please check printer connection.');
              }
            }}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
