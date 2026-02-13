import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useEffect } from "react";
import "./CustomModal.css";

const MySwal = withReactContent(Swal);

type CustomModalProps = {
  show: boolean;
  isLoading?: boolean;
  message?: string;
  variant?: "success" | "error" | "warning" | "info";
  onHide: () => void;
  onConfirm?: () => void;
  title?: string | null;
  showPrintButton?: boolean;
  onPrintRequest?: (_invoiceDataForPrint: unknown) => void;
  invoiceDataForPrint?: unknown;
};

const CustomModal = ({
  show,
  isLoading = false,
  message = "",
  variant = "success",
  onHide,
  onConfirm,
  title = null,
  showPrintButton = false,
  onPrintRequest,
  invoiceDataForPrint,
}: CustomModalProps) => {
  useEffect(() => {
    if (!show) {
      Swal.close();
      return;
    }

    const swalOptions = {
      customClass: {
        popup: "custom-swal-popup",
        title: "custom-swal-title",
        htmlContainer: "custom-swal-content",
        confirmButton: "custom-swal-confirm-button",
        cancelButton: "custom-swal-cancel-button",
        actions: "custom-swal-actions",
      },
      buttonsStyling: false,
    } as const;

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
        title: title || (variant === "success" ? "Éxito" : "Error"),
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
  }, [
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
  ]);

  return null;
};

export default CustomModal;

