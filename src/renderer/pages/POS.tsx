import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Box, Grid, Paper, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Button,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Chip, Card, CardActionArea
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

const POS: React.FC = () => {
  const { products, categories, fetchProducts, fetchCategories } = useProducts();
  const { cart, addToCart, removeFromCart, updateQuantity, total, checkout, clearCart } = useCart();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search & Category filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({ 
        search: search,
        categoryId: selectedCategory || undefined
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
    
    const result = await checkout(method);
    
    if (result.success) {
      setPaymentOpen(false);
      setLastReceiptNumber(receiptNum); // Store for display
      setPrinterError(false); // Reset printer error
      
      try {
        // Print receipt via Electron API
        // @ts-ignore
        await window.electronAPI.invoke('printer:print-receipt', {
          receipt_number: receiptNum,
          total_amount: currentTotal,
          items: currentItems,
          payment_method: method
        });
      } catch (err) {
        console.error('Printing failed:', err);
        setPrinterError(true);
        // We don't set main error here to avoid confusing the user about the sale success
      } finally {
        // Show success dialog even if printing fails, as the sale was recorded
        setSuccessOpen(true);
        clearCart();
      }
    } else {
      setError(result.error || 'Checkout failed');
    }
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

          {/* Product Grid */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Grid container spacing={2}>
              {products.map(product => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardActionArea 
                      onClick={() => handleProductSelect(product)} 
                      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: 2 }}
                    >
                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                        <Box 
                          sx={{ 
                            width: 60, 
                            height: 60, 
                            bgcolor: 'primary.light', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'primary.main',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            mb: 1
                          }}
                        >
                          {product.name.charAt(0).toUpperCase()}
                        </Box>
                        <Typography variant="subtitle1" align="center" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.category_name}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary" align="center">
                        {currency}{(product.price / 100).toFixed(2)}
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Grid>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle align="center">Total Amount</DialogTitle>
        <DialogContent>
          <Typography variant="h3" align="center" color="primary" fontWeight="bold" gutterBottom>
            {currency}{(total / 100).toFixed(2)}
          </Typography>
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

      </Grid>
    </Box>
  );
};

export default POS;
