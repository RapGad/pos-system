import React, { useState } from 'react';
import {
  Typography, Box, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, List,
  ListItem, ListItemText, ListItemSecondaryAction, Divider, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import { useProducts, type Product, type Category } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const isCashier = user?.role === 'cashier';
  const { 
    products, totalProducts, categories, fetchProducts, createProduct, updateProduct, deleteProduct,
    createCategory, updateCategory, deleteCategory 
  } = useProducts();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  
  const [open, setOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category_id: '',
    price: '',
    cost: '',
    stock_quantity: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    stockStatus: 'all' as 'all' | 'low' | 'out'
  });

  // Fetch products when filters or pagination change
  React.useEffect(() => {
    fetchProducts({
      search: filters.search,
      categoryId: filters.categoryId === '' ? undefined : Number(filters.categoryId),
      stockStatus: filters.stockStatus,
      page,
      pageSize: rowsPerPage
    });
  }, [fetchProducts, filters, page, rowsPerPage]);

  const handleFilterChange = (name: string, value: any) => {
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

  const handleExportCSV = () => {
    const headers = ['ID', 'Barcode', 'Name', 'Category', 'Cost', 'Price', 'Stock'];
    const csvData = products.map(p => [
      p.id,
      p.barcode,
      p.name,
      p.category_name,
      (p.cost / 100).toFixed(2),
      (p.price / 100).toFixed(2),
      p.stock_quantity
    ]);
    
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode || '',
        name: product.name,
        category_id: product.category_id.toString(),
        price: (product.price / 100).toFixed(2),
        cost: (product.cost / 100).toFixed(2),
        stock_quantity: product.stock_quantity.toString()
      });
    } else {
      setEditingProduct(null);
      setFormData({
        barcode: '',
        name: '',
        category_id: '',
        price: '',
        cost: '',
        stock_quantity: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    const productData = {
      barcode: formData.barcode,
      name: formData.name,
      category_id: parseInt(formData.category_id),
      price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
      cost: Math.round(parseFloat(formData.cost) * 100),
      stock_quantity: parseInt(formData.stock_quantity)
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData, user?.role);
    } else {
      await createProduct(productData, user?.role);
    }
    handleClose();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id, user?.role);
    }
  };

  const handleCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, newCategoryName, user?.role);
    } else {
      await createCategory(newCategoryName, user?.role);
    }
    setNewCategoryName('');
    setEditingCategory(null);
  };

  const handleCategoryDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id, user?.role);
      } catch (err: any) {
        setError(err.message || 'Failed to delete category');
      }
    }
  };

  return (
    <Grid container spacing={2} sx={{ p: 3, height: '100vh' }}>
      <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4">Inventory Management</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={handleExportCSV}>Export CSV</Button>
              {!isCashier && (
                <>
                  <Button 
                    variant="outlined" 
                    startIcon={<CategoryIcon />} 
                    onClick={() => setCategoryDialogOpen(true)}
                  >
                    Categories
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                    Add Product
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              label="Search Products"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              select
              size="small"
              label="Category"
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Stock Status"
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Stock</MenuItem>
              <MenuItem value="low">Low Stock</MenuItem>
              <MenuItem value="out">Out of Stock</MenuItem>
            </TextField>
          </Box>

          {/* Product Table */}
          <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Barcode</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  {!isCashier && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const isLowStock = product.stock_quantity <= (settings?.low_stock_threshold || 10);
                  return (
                    <TableRow 
                      key={product.id} 
                      hover
                      sx={{ 
                        bgcolor: isLowStock ? '#fff9f9' : 'inherit',
                        '& td': { color: isLowStock ? 'error.main' : 'inherit' }
                      }}
                    >
                      <TableCell>{product.barcode || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{product.name}</TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell align="right">{currency}{(product.cost / 100).toFixed(2)}</TableCell>
                      <TableCell align="right">{currency}{(product.price / 100).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: isLowStock ? 'bold' : 'normal' }}>
                        {product.stock_quantity}
                      </TableCell>
                      {!isCashier && (
                        <TableCell align="right">
                          <IconButton onClick={() => handleOpen(product)} color="primary" size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(product.id)} color="error" size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
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
      </Grid>

      {/* Product Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Barcode"
                fullWidth
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                label="Category"
                fullWidth
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label={`Price (${currency})`}
                type="number"
                fullWidth
                required
                inputProps={{ step: "0.01" }}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label={`Cost (${currency})`}
                type="number"
                fullWidth
                required
                inputProps={{ step: "0.01" }}
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Stock Quantity"
                type="number"
                fullWidth
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Manage Categories</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1 }}>
            <TextField
              size="small"
              label="Category Name"
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button variant="contained" onClick={handleCategorySubmit}>
              {editingCategory ? 'Update' : 'Add'}
            </Button>
          </Box>
          <List>
            {categories.map((cat) => (
              <React.Fragment key={cat.id}>
                <ListItem>
                  <ListItemText primary={cat.name} />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => {
                      setEditingCategory(cat);
                      setNewCategoryName(cat.name);
                    }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleCategoryDelete(cat.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCategoryDialogOpen(false);
            setEditingCategory(null);
            setNewCategoryName('');
          }}>Close</Button>
        </DialogActions>
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
    </Grid>
  );
};

export default Inventory;
