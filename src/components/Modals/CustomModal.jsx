import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import './CustomModal.css';

const MySwal = withReactContent(Swal);

const CustomModal = ({
  show,
  isLoading,
  message,
  variant,
  onHide,
  onConfirm,
  title,
  showPrintButton,
  onPrintRequest,
  invoiceDataForPrint,
}) => {
  useEffect(() => {
    if (!show) {
      Swal.close();
      return;
    }

    const swalOptions = {
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
        confirmButton: 'custom-swal-confirm-button',
        cancelButton: 'custom-swal-cancel-button',
        actions: 'custom-swal-actions',
      },
      buttonsStyling: false,
    };

    if (isLoading) {
      MySwal.fire({
        ...swalOptions,
        title: title || "Procesando",
        text: message || "Por favor, espera...",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
    } else {
      MySwal.fire({
        ...swalOptions,
        title: title || (variant === 'success' ? "Éxito" : "Error"),
        text: message,
        icon: variant,
        showCancelButton: showPrintButton,
        confirmButtonText: "Cerrar",
        cancelButtonText: "Imprimir Recibo",
      }).then((result) => {
        if (result.isConfirmed) {
          if (onConfirm) onConfirm();
          onHide();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          if (onPrintRequest) onPrintRequest(invoiceDataForPrint);
        } else {
          if (onConfirm) onConfirm();
          onHide();
        }
      });
    }
  }, [show, isLoading, message, variant, onHide, onConfirm, title, showPrintButton, onPrintRequest, invoiceDataForPrint]);

  return null;
};

CustomModal.propTypes = {
  show: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool,
  message: PropTypes.string,
  variant: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
  showPrintButton: PropTypes.bool,
  onPrintRequest: PropTypes.func,
  invoiceDataForPrint: PropTypes.object,
};

CustomModal.defaultProps = {
    isLoading: false,
    message: '',
    variant: 'success',
    title: null,
    onConfirm: null,
    showPrintButton: false,
    onPrintRequest: null,
    invoiceDataForPrint: null,
};

export default CustomModal;
