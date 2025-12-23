import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import type { SalesHistory } from '../hooks/useReports';
import { useSettings } from '../hooks/useSettings';

interface DashboardChartProps {
  data: SalesHistory[];
  title: string;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ data, title }) => {
  const theme = useTheme();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';

  return (
    <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ flexGrow: 1, width: '100%', mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              tickFormatter={(value) => `${currency}${value / 100}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8
              }}
              formatter={(value: any) => {
                if (value === undefined || value === null) return ['', 'Revenue'];
                const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                return [`${currency}${(numericValue / 100).toFixed(2)}`, 'Revenue'];
              }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke={theme.palette.primary.main} 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default DashboardChart;
