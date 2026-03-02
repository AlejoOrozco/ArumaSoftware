import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useEffect, useRef } from "react";
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
  const onHideRef = useRef(onHide);
  const onConfirmRef = useRef(onConfirm);
  const onPrintRequestRef = useRef(onPrintRequest);
  onHideRef.current = onHide;
  onConfirmRef.current = onConfirm;
  onPrintRequestRef.current = onPrintRequest;

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
      allowOutsideClick: false,
      allowEscapeKey: false,
    } as const;

    if (isLoading) {
      MySwal.fire({
        ...swalOptions,
        title: title || "Procesando",
        text: message || "Por favor, espera...",
        icon: "info",
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
          onConfirmRef.current?.();
          onHideRef.current();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          onPrintRequestRef.current?.(invoiceDataForPrint);
          onHideRef.current();
        }
      });
    }
  }, [
    show,
    isLoading,
    message,
    variant,
    title,
    showPrintButton,
    invoiceDataForPrint,
  ]);

  return null;
};

export default CustomModal;

