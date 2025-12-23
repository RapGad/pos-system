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

interface ReceiptPreviewModalProps {
  open: boolean;
  htmlContent: string;
  onClose: () => void;
  onPrint: () => void;
  printing: boolean;
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  open,
  htmlContent,
  onClose,
  onPrint,
  printing
}) => {
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
