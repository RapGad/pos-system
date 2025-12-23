import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

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
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Receipt Preview</Typography>
        {!printing && (
          <Button startIcon={<CloseIcon />} onClick={onClose} color="inherit">
            Close
          </Button>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, width: '100%', height: '100%', p: 2, display: 'flex', justifyContent: 'center' }}>
          <iframe
            srcDoc={htmlContent}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            title="Receipt Preview"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={onClose} 
          disabled={printing}
          fullWidth
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={onPrint} 
          disabled={printing}
          startIcon={<PrintIcon />}
          fullWidth
          size="large"
        >
          {printing ? 'Printing...' : 'Print Receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptPreviewModal;
