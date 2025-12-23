import React, { useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, useTheme, List, ListItem, ListItemText } from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon, 
  ShoppingCart as ShoppingCartIcon, 
  AttachMoney as AttachMoneyIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useReports } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';
import DashboardChart from '../components/DashboardChart';
import { useSettings } from '../hooks/useSettings';

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ 
          p: 1, 
          borderRadius: 2, 
          backgroundColor: `${color}15`, 
          color: color,
          display: 'flex',
          mr: 2
        }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { salesHistory, inventoryValuation, fetchSalesHistory, fetchInventoryValuation } = useReports();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const theme = useTheme();

  useEffect(() => {
    const userId = user?.role === 'cashier' ? user.id : undefined;
    fetchSalesHistory(30, userId);
    if (user?.role !== 'cashier') {
      fetchInventoryValuation();
    }
  }, [fetchSalesHistory, fetchInventoryValuation, user]);

  const totalRevenue = salesHistory.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = salesHistory.reduce((sum, day) => sum + day.transactions, 0);
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back, {user?.username}
        </Typography>
        <Typography color="text.secondary">
          Here's what's happening with your store today.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Total Revenue (30d)" 
            value={`${currency}${((totalRevenue || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<AttachMoneyIcon />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Total Transactions" 
            value={totalTransactions}
            icon={<ShoppingCartIcon />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Average Ticket" 
            value={`${currency}${((averageTicket || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<TrendingUpIcon />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Active Products" 
            value={inventoryValuation?.total_products || '--'}
            icon={<InventoryIcon />}
            color={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <DashboardChart 
            data={salesHistory} 
            title="Sales Trend (Last 30 Days)" 
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Low Stock Alerts</Typography>
              </Box>
              <List>
                {inventoryValuation?.low_stock_products && inventoryValuation.low_stock_products.length > 0 ? (
                  inventoryValuation.low_stock_products.map((p: any) => (
                    <ListItem key={p.id} divider>
                      <ListItemText 
                        primary={p.name} 
                        secondary={`Stock: ${p.stock_quantity}`} 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No low stock items</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
