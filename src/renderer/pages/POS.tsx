import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Box, Grid, Paper, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Button,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useProducts, type Product } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { useSettings } from '../hooks/useSettings';
import ReceiptPreviewModal from '../components/ReceiptPreviewModal';

const POS: React.FC = () => {
  const { products, totalProducts, categories, fetchProducts, fetchCategories } = useProducts();
  const { cart, addToCart, removeFromCart, updateQuantity, total, checkout, clearCart } = useCart();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Customer Name state
  const [customerName, setCustomerName] = useState('');
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerError, setPrinterError] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search & Category filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({ 
        search: search,
        categoryId: selectedCategory || undefined,
        page,
        pageSize: rowsPerPage
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, fetchProducts]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
    searchInputRef.current?.focus();
  }, [fetchCategories]);

  const handleProductSelect = (product: Product) => {
    const result = addToCart(product);
    if (!result.success) {
      setError(result.error || 'Failed to add product');
    }
    setSearch('');
    searchInputRef.current?.focus();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCheckout = async (method: 'cash' | 'card') => {
    // Check for printers first
    try {
      // @ts-ignore
      const printers = await window.electronAPI.invoke('printer:get-printers');
      if (!printers || printers.length === 0) {
        setPrinterError(true);
        // Close payment dialog if open to show the error clearly
        setPaymentOpen(false);
        return;
      }
    } catch (err) {
      console.error('Failed to check printers:', err);
      // If check fails, we might want to block or allow. 
      // User said "when there is no printer, i dont want any sales".
      // So we block.
      setPrinterError(true);
      setPaymentOpen(false);
      return;
    }

    const currentTotal = total;
    const currentItems = [...cart];
    const receiptNum = `REC-${Date.now()}`; // Generate receipt number
    
    const saleData = {
      receipt_number: receiptNum,
      total_amount: currentTotal,
      items: currentItems,
      payment_method: method,
      customer_name: customerName,
      created_at: new Date().toISOString()
    };

    const result = await checkout(method, customerName);
    
    if (result.success) {
      setPaymentOpen(false);
      setLastReceiptNumber(receiptNum); // Store for display
      setPrinterError(false); // Reset printer error
      setCustomerName(''); // Reset customer name
      
      try {
        // Generate preview HTML
        // @ts-ignore
        const html = await window.electronAPI.invoke('printer:generate-preview', saleData);
        
        setPreviewHtml(html);
        setCurrentSale(saleData);
        setPreviewOpen(true);
      } catch (err) {
        console.error('Preview generation failed:', err);
        // Fallback to success dialog if preview fails
        setSuccessOpen(true);
        clearCart();
      }
    } else {
      setError(result.error || 'Checkout failed');
    }
  };

  const handlePrintConfirm = async () => {
    setIsPrinting(true);
    try {
      // @ts-ignore
      await window.electronAPI.invoke('printer:print-receipt', currentSale);
      setPreviewOpen(false);
      setSuccessOpen(true);
      clearCart();
    } catch (err) {
      console.error('Printing failed:', err);
      setPrinterError(true);
      setPreviewOpen(false);
      setSuccessOpen(true);
      clearCart();
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setSuccessOpen(true);
    clearCart();
  };

  return (
    <Box sx={{ flexGrow: 1, height: 'calc(100vh - 64px)', width: '100%', p: 2, bgcolor: '#f4f6f8' }}>
      <Grid container spacing={3} sx={{ height: '100%', m: 0, width: '100%' }}>
      
      {/* Left: Current Ticket */}
      <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper elevation={3} sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100%',
          bgcolor: '#fff',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            <Typography variant="h6" fontWeight="bold">Current Ticket</Typography>
          </Box>

          <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
            {cart.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                <Typography variant="body1">Ticket is empty</Typography>
                <Typography variant="caption">Scan items to start</Typography>
              </Box>
            ) : (
              cart.map(item => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ py: 1 }}>
                    <ListItemText
                      primary={<Typography fontWeight="medium">{item.name}</Typography>}
                      secondary={`${currency}${(item.price / 100).toFixed(2)} x ${item.quantity}`}
                    />
                    <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="bold" color="primary">
                        {currency}{((item.price * item.quantity) / 100).toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 1 }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ mx: 1, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <IconButton edge="end" size="small" color="error" onClick={() => removeFromCart(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            )}
          </List>

          <Box sx={{ p: 2, bgcolor: '#f9fafb', borderTop: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" color="text.secondary">Total</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {currency}{(total / 100).toFixed(2)}
              </Typography>
            </Box>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6 }}>
                 <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Clear
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={cart.length === 0}
                  onClick={() => setPaymentOpen(true)}
                  sx={{ fontWeight: 'bold' }}
                >
                  Pay
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>

      {/* Right: Products */}
      <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
          
          {/* Search & Categories */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Scan barcode or search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                inputRef={searchInputRef}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
              <Chip 
                label="All Items" 
                onClick={() => setSelectedCategory(null)}
                color={selectedCategory === null ? 'primary' : 'default'}
                clickable
              />
              {categories.map(cat => (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  onClick={() => setSelectedCategory(cat.id)}
                  color={selectedCategory === cat.id ? 'primary' : 'default'}
                  clickable
                />
              ))}
            </Box>
          </Paper>

          {/* Product Table */}
          <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{product.barcode}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {currency}{(product.price / 100).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={product.stock_quantity} 
                          size="small" 
                          color={product.stock_quantity <= (settings?.low_stock_threshold || 10) ? 'error' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button 
                          variant="contained" 
                          size="small" 
                          startIcon={<AddIcon />}
                          onClick={() => handleProductSelect(product)}
                          disabled={product.stock_quantity <= 0}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No products found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={totalProducts}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Box>
      </Grid>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle align="center">Total Amount</DialogTitle>
        <DialogContent>
          <Typography variant="h3" align="center" color="primary" fontWeight="bold" gutterBottom>
            {currency}{(total / 100).toFixed(2)}
          </Typography>
          
          <TextField
            fullWidth
            label="Customer Name (Optional)"
            variant="outlined"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <Typography variant="body2" align="center" color="text.secondary" paragraph>
            Select payment method to complete sale
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 2, p: 3 }}>
          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            onClick={() => handleCheckout('cash')}
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            Cash Payment
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            size="large" 
            onClick={() => handleCheckout('card')}
            sx={{ py: 1.5 }}
          >
            Card / Terminal
          </Button>
          <Button fullWidth onClick={() => setPaymentOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Sale Completed!</Typography>
          
          {printerError && (
            <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
              Receipt printing failed. Please check printer connection.
            </Alert>
          )}

          <Typography variant="body1" color="text.secondary" gutterBottom>
            Receipt Number:
          </Typography>
          <Typography variant="h4" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1, borderRadius: 1, my: 2 }}>
            {lastReceiptNumber}
          </Typography>
          <Button variant="contained" onClick={() => setSuccessOpen(false)} fullWidth>
            Start New Sale
          </Button>
        </Box>
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={printerError} 
        autoHideDuration={6000} 
        onClose={() => setPrinterError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setPrinterError(false)} severity="error" variant="filled" sx={{ width: '100%' }}>
          Printer Error: No printer detected or printing failed. Sales are blocked without a printer.
        </Alert>
      </Snackbar>

      <ReceiptPreviewModal
        open={previewOpen}
        htmlContent={previewHtml}
        onClose={handlePreviewClose}
        onPrint={handlePrintConfirm}
        printing={isPrinting}
      />

      </Grid>
    </Box>
  );
};

export default POS;
