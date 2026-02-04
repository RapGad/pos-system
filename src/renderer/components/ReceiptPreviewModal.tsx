import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Fade
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSettings } from '../hooks/useSettings';

interface ReceiptPreviewModalProps {
  open: boolean;
  htmlContent: string;
  onClose: () => void;
  onPrint: () => void;
  printing: boolean;
  saleData?: any; // Sale data to show change prominently
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  open,
  htmlContent,
  onClose,
  onPrint,
  printing,
  saleData
}) => {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '₵';
  
  return (
    <Dialog 
      open={open} 
      onClose={printing ? undefined : onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '85vh',
          maxHeight: '90vh',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      TransitionComponent={Fade}
    >
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        boxShadow: 3,
        zIndex: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CheckCircleIcon sx={{ fontSize: 32, color: '#4caf50', bgcolor: 'white', borderRadius: '50%' }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">Sale Completed</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Ready to Print Receipt</Typography>
          </Box>
        </Box>
        {!printing && (
          <Button 
            onClick={onClose} 
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} 
            variant="outlined"
            size="small"
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
        )}
      </Box>

      {/* Prominent Change Display Banner - Only for cash with change */}
      {saleData?.change_given != null && saleData.change_given > 0 && (
        <Box sx={{
          bgcolor: '#4caf50',
          color: 'white',
          p: 3,
          textAlign: 'center',
          boxShadow: 2
        }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            CHANGE TO GIVE
          </Typography>
          <Typography variant="h2" fontWeight="bold" sx={{ 
            fontSize: '3.5rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '0.05em'
          }}>
            {currency}{(saleData.change_given / 100).toFixed(2)}
          </Typography>
          <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid rgba(255,255,255,0.3)' }}>
            <Typography variant="body1" sx={{ opacity: 0.95, mb: 0.5 }}>
              Amount Paid: {currency}{(saleData.amount_paid / 100).toFixed(2)}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              Total: {currency}{(saleData.total_amount / 100).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      )}

      <DialogContent sx={{ 
        p: 0, 
        bgcolor: '#e0e0e0', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          overflowY: 'auto',
          py: 4
        }}>
          <Paper elevation={6} sx={{ 
            width: 'auto', 
            minWidth: '300px',
            maxWidth: '100%',
            bgcolor: 'white',
            overflow: 'hidden',
            borderRadius: 1
          }}>
            <iframe
              srcDoc={htmlContent}
              style={{
                width: '320px', // Slightly wider than the content to avoid scrollbars if possible
                height: '600px', // Fixed height for preview or auto? Let's try a reasonable min-height
                minHeight: '400px',
                border: 'none',
                backgroundColor: 'white',
                display: 'block'
              }}
              // Adjust height based on content if possible, but iframe isolation makes it tricky. 
              // For now, fixed size or scrollable iframe.
              title="Receipt Preview"
              onLoad={(e) => {
                // Optional: Auto-adjust height if same-origin (srcDoc is same origin)
                const iframe = e.currentTarget;
                if (iframe.contentWindow) {
                  const height = iframe.contentWindow.document.body.scrollHeight;
                  iframe.style.height = `${height + 20}px`;
                }
              }}
            />
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'white', borderTop: '1px solid #eee', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={onClose} 
          disabled={printing}
          size="large"
          sx={{ minWidth: 120 }}
        >
          Skip Print
        </Button>
        <Button 
          variant="contained" 
          onClick={onPrint} 
          disabled={printing}
          startIcon={<PrintIcon />}
          size="large"
          sx={{ 
            minWidth: 180, 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: 4
          }}
        >
          {printing ? 'Printing...' : 'Print Receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptPreviewModal;
