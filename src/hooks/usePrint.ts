import { type RefObject } from "react";
import { useReactToPrint } from "react-to-print";

/**
 * Base styles injected into the print iframe so content is never white/blank.
 * Use with ignoreGlobalStyles: true so only these (and your custom pageStyle) apply.
 */
export const DEFAULT_PRINT_PAGE_STYLE = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    display: block !important;
    visibility: visible !important;
    background: #fff !important;
    color: #000 !important;
    margin: 0;
    padding: 0;
  }
  body > * {
    display: block !important;
    visibility: visible !important;
    color: #000 !important;
    background: #fff !important;
  }
`;

export type UsePrintOptions = {
  /** Ref to the DOM node that will be printed (e.g. receipt or summary container) */
  contentRef: RefObject<HTMLElement | null>;
  /** Extra CSS for this print job (layout, fonts, etc.). Base visibility styles are always added. */
  pageStyle?: string;
  /** Called after print dialog closes */
  onAfterPrint?: () => void;
  /** Optional document title for the print window */
  documentTitle?: string;
};

/**
 * Reusable print hook. Pass a ref to the content you want to print and optional styles.
 * Returns a function to call when you want to print (e.g. on button click or after setting data).
 * Ensures printed content is visible (no white page) by injecting base styles and optionally ignoring global styles.
 */
export function usePrint(options: UsePrintOptions) {
  const { contentRef, pageStyle = "", onAfterPrint, documentTitle } = options;

  const printFn = useReactToPrint({
    contentRef,
    pageStyle: DEFAULT_PRINT_PAGE_STYLE + pageStyle,
    ignoreGlobalStyles: true,
    ...(documentTitle !== undefined && documentTitle !== "" && { documentTitle }),
    ...(onAfterPrint !== undefined && { onAfterPrint }),
  });

  return {
    /** Call this to open the print dialog. Ensure contentRef.current is set and has content first. */
    print: printFn,
  };
}

/** Use with usePrint for receipt content (Invoice). */
export const RECEIPT_PRINT_PAGE_STYLE = `
  @page { margin: 5mm; size: 80mm auto; }
  .receipt-container {
    font-family: 'Courier New', Courier, monospace;
    width: 280px;
    padding: 10px;
    margin: 0;
  }
  .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
  .receipt-shop-name { font-size: 1.2rem; font-weight: bold; margin: 0; color: #000; }
  .receipt-header p { margin: 0; font-size: 0.8rem; color: #000; }
  .receipt-info { margin-bottom: 10px; font-size: 0.8rem; color: #000; }
  .receipt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; color: #000; }
  .receipt-table th, .receipt-table td { padding: 4px 2px; text-align: left; color: #000; }
  .receipt-table th:nth-child(2), .receipt-table td:nth-child(2) { text-align: center; }
  .receipt-table th:nth-child(3), .receipt-table td:nth-child(3),
  .receipt-table th:nth-child(4), .receipt-table td:nth-child(4) { text-align: right; }
  .receipt-table thead { border-bottom: 1px dashed #000; }
  .receipt-total { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000; text-align: right; font-size: 1.1rem; color: #000; }
  .receipt-payment { margin-top: 8px; padding-top: 8px; border-top: 1px dotted #000; text-align: center; font-size: 0.9rem; color: #000; }
  .receipt-payment p { margin: 0; }
  .receipt-footer { margin-top: 10px; text-align: center; font-size: 0.8rem; color: #000; }
`;

/** Use with usePrint for day summary (Close Day). Optimized for thermal/receipt paper (80mm). */
export const DAY_SUMMARY_PRINT_PAGE_STYLE = `
  @page { margin: 3mm; size: 80mm auto; }
  body > * {
    position: static !important;
    left: auto !important;
    top: auto !important;
    width: 100% !important;
    max-width: 80mm !important;
    box-sizing: border-box;
  }
  .day-summary-print {
    padding: 0 2mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9px;
    color: #000;
    background: #fff;
    max-width: 80mm;
  }
  .day-summary-print h1 { font-size: 11px; margin: 0 0 2px 0; color: #000; text-align: center; }
  .day-summary-print .day-summary-date { font-size: 9px; margin-bottom: 4px; color: #000; text-align: center; }
  .day-summary-print .day-summary-cards { display: block; margin-bottom: 6px; }
  .day-summary-print .day-summary-card { border: 1px solid #000; padding: 3px 4px; text-align: center; background: #fff; color: #000; margin-bottom: 3px; }
  .day-summary-print .day-summary-card h3 { margin: 0 0 2px 0; font-size: 9px; color: #000; }
  .day-summary-print .day-summary-card .amount { font-size: 11px; font-weight: bold; color: #000; }
  .day-summary-print .day-summary-card .detail { font-size: 8px; color: #000; }
  .day-summary-print .day-summary-invoices h2 { font-size: 10px; margin: 4px 0 3px 0; color: #000; }
  .day-summary-print .day-summary-invoice-item { border: 1px solid #000; padding: 3px 4px; margin-bottom: 4px; break-inside: avoid; background: #fff; }
  .day-summary-print .day-summary-invoice-item .row { display: block; margin-bottom: 1px; font-size: 9px; }
  .day-summary-print .day-summary-invoice-item .id { font-weight: 600; color: #000; }
  .day-summary-print .day-summary-invoice-item .total { font-weight: bold; color: #000; }
  .day-summary-print .day-summary-products { margin-top: 3px; padding-top: 3px; border-top: 1px dashed #000; font-size: 8px; color: #000; }
  .day-summary-print .day-summary-products ul { margin: 1px 0 0 8px; padding: 0; }
  .day-summary-print .day-summary-products li { margin-bottom: 1px; }
`;
