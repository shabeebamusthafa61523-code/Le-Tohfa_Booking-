import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Download,
  Image as ImageIcon,
  Printer,
  Check,
  User,
  Users,
  Search,
  X,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  Edit3,
  DollarSign,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const InvoiceBuilder = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const invoicePreviewRef = useRef(null);

  // Bookings list for picker
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  // Edit Details Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Export loading states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Helper date formatter
  const getTodayFormatted = () => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Form State initialized to reference sample template
  const [formData, setFormData] = useState({
    // Header
    invoiceDate: getTodayFormatted(),
    badgeText: 'BOOKING CONFIRMED',
    currencySymbol: '₹', // '₹' | '■' | 'Rs'

    // Guest Info
    guestPrefix: 'Ms', // 'Ms' | 'Mr' | 'Mrs' | 'Dr' | ''
    guestName: 'Mumthaz',
    phone: '8891778384',

    // Booking Details
    bookingType: 'Daycation', // 'Daycation' | 'Staycation' | 'Event'
    numberOfPersons: 55,
    checkInDate: getTodayFormatted(),
    checkInTime: '9:00 AM',
    checkOutDate: getTodayFormatted(),
    checkOutTime: '9:00 PM',

    // Pricing & Extra Person Breakdown
    basicPackageAmount: 12000,
    baseIncludedPersons: 20,
    extraPersonRate: 100,
    manualExtraCount: '', // if left empty, auto-calculates (numberOfPersons - baseIncludedPersons)
    discount: 0,
    advanceAmount: 2000,
    paymentStatus: 'Balance Pending', // 'Balance Pending' | 'Fully Paid' | 'Advance Confirmed'

    // Explanatory Footer Note
    useAutoNote: true,
    customNote: '',
  });

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all bookings for the selector dropdown
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get('/api/bookings');
        setBookings(res.data || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchBookings();
  }, []);

  // Handle URL query parameter ?bookingId=...
  useEffect(() => {
    const urlBookingId = searchParams.get('bookingId');
    if (urlBookingId && bookings.length > 0) {
      loadBookingIntoForm(urlBookingId);
    }
  }, [searchParams, bookings]);

  // Load a chosen booking into the invoice form
  const loadBookingIntoForm = (bookingId) => {
    const b = bookings.find((item) => String(item._id) === String(bookingId));
    if (!b) return;

    setSelectedBookingId(bookingId);

    const type = b.bookingType || 'Staycation';
    const isDay = type.toLowerCase() === 'daycation';

    // Format Start & End Dates nicely
    const formatNiceDate = (dStr) => {
      if (!dStr) return getTodayFormatted();
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch (e) {}
      return dStr;
    };

    const inDate = formatNiceDate(b.startDate);
    const outDate = formatNiceDate(b.endDate || b.startDate);

    // Parse time
    const timeRaw = b.checkInTime || (isDay ? '9:00 AM to 9:00 PM' : '3:00 PM to 12:00 PM');
    const timeParts = timeRaw.split(/\s+to\s+/i);
    const checkInT = timeParts[0]?.trim() || (isDay ? '9:00 AM' : '3:00 PM');
    const checkOutT = timeParts[1]?.trim() || (isDay ? '9:00 PM' : '12:00 PM');

    // Default package amounts
    const basicPackage = isDay ? 12000 : 15000;
    const extraRate = isDay ? 100 : 200;

    // Detect prefix from guest name if present
    let rawName = (b.guestName || '').trim();
    let prefix = 'Mr';
    if (/^ms[\.\s]/i.test(rawName)) {
      prefix = 'Ms';
      rawName = rawName.replace(/^ms[\.\s]+/i, '');
    } else if (/^mrs[\.\s]/i.test(rawName)) {
      prefix = 'Mrs';
      rawName = rawName.replace(/^mrs[\.\s]+/i, '');
    } else if (/^dr[\.\s]/i.test(rawName)) {
      prefix = 'Dr';
      rawName = rawName.replace(/^dr[\.\s]+/i, '');
    } else if (/^mr[\.\s]/i.test(rawName)) {
      prefix = 'Mr';
      rawName = rawName.replace(/^mr[\.\s]+/i, '');
    }

    // Determine 3 states automatically:
    // 1. Previous Date (past) -> BOOKING COMPLETED
    // 2. Pending -> BOOKING PENDING
    // 3. Current / Future -> BOOKING CONFIRMED
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const bookingEndDate = b.endDate || b.startDate;
    const isPreviousDate = Boolean(bookingEndDate && bookingEndDate < todayStr);

    let autoBadge = 'BOOKING CONFIRMED';
    let autoPaymentStatus = 'Balance Pending';

    if (isPreviousDate || b.status === 'completed') {
      autoBadge = 'BOOKING COMPLETED';
      autoPaymentStatus = 'Payment Completed';
    } else if (b.status === 'pending') {
      autoBadge = 'BOOKING PENDING';
      autoPaymentStatus = 'Balance Pending';
    } else {
      autoBadge = 'BOOKING CONFIRMED';
      autoPaymentStatus = 'Balance Pending';
    }

    // Detect number of persons from booking:
    // 1. Direct field (b.numberOfPersons or b.persons or b.headcount)
    // 2. Extracted from booking notes (e.g. "55 persons", "35 pax", "25 guests", "40 people")
    // 3. Inferred from total amount: if total > basicPackage, calculate extra headcount
    // 4. Default to base included capacity (20)
    let detectedPersons = 20;
    if (b.numberOfPersons && Number(b.numberOfPersons) > 0) {
      detectedPersons = Number(b.numberOfPersons);
    } else if (b.persons && Number(b.persons) > 0) {
      detectedPersons = Number(b.persons);
    } else if (b.headcount && Number(b.headcount) > 0) {
      detectedPersons = Number(b.headcount);
    } else if (b.notes) {
      const match = b.notes.match(/(\d+)\s*(persons|person|pax|people|guests|head|members)/i);
      if (match && Number(match[1]) > 0) {
        detectedPersons = Number(match[1]);
      }
    } else if (b.totalAmount && Number(b.totalAmount) > basicPackage && extraRate > 0) {
      const extraAmt = Number(b.totalAmount) - basicPackage;
      const inferredExtra = Math.round(extraAmt / extraRate);
      if (inferredExtra > 0 && inferredExtra <= 300) {
        detectedPersons = 20 + inferredExtra;
      }
    }

    setFormData((prev) => ({
      ...prev,
      guestPrefix: prefix,
      guestName: rawName || 'Guest',
      phone: b.phone || '',
      bookingType: type,
      numberOfPersons: detectedPersons,
      checkInDate: inDate,
      checkInTime: checkInT,
      checkOutDate: outDate,
      checkOutTime: checkOutT,
      basicPackageAmount: basicPackage,
      extraPersonRate: extraRate,
      advanceAmount: Number(b.advanceAmount || 0),
      discount: Number(b.discount || 0),
      paymentStatus: autoPaymentStatus,
      badgeText: autoBadge,
    }));

    setBookingSearchQuery(`${rawName} (${b.startDate})`);
    setIsSearchDropdownOpen(false);
    toast.success(`Loaded booking for ${rawName}!`);
  };

  // Filter bookings by Guest Name, Start/End Date (e.g. 2026-08 or Nov), Phone
  const filteredBookings = useMemo(() => {
    if (!bookingSearchQuery.trim()) return bookings;
    const q = bookingSearchQuery.toLowerCase().trim();
    return bookings.filter((b) => {
      const name = (b.guestName || '').toLowerCase();
      const phone = (b.phone || '').toLowerCase();
      const startD = (b.startDate || '').toLowerCase();
      const endD = (b.endDate || '').toLowerCase();
      const type = (b.bookingType || '').toLowerCase();

      let formattedDateMatch = false;
      if (b.startDate) {
        try {
          const parts = b.startDate.split('-');
          if (parts.length === 3) {
            const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const fullMonth = dt.toLocaleString('en-US', { month: 'long' }).toLowerCase();
            const shortMonth = dt.toLocaleString('en-US', { month: 'short' }).toLowerCase();
            const fullFormatted = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
            if (fullMonth.includes(q) || shortMonth.includes(q) || fullFormatted.includes(q)) {
              formattedDateMatch = true;
            }
          }
        } catch (e) {}
      }

      return (
        name.includes(q) ||
        phone.includes(q) ||
        startD.includes(q) ||
        endD.includes(q) ||
        type.includes(q) ||
        formattedDateMatch
      );
    });
  }, [bookings, bookingSearchQuery]);

  // Calculations
  const extraPersonsCount = useMemo(() => {
    if (formData.manualExtraCount !== '' && !isNaN(Number(formData.manualExtraCount))) {
      return Number(formData.manualExtraCount);
    }
    const diff = Number(formData.numberOfPersons || 0) - Number(formData.baseIncludedPersons || 0);
    return Math.max(0, diff);
  }, [formData.numberOfPersons, formData.baseIncludedPersons, formData.manualExtraCount]);

  const additionalPersonsAmount = useMemo(() => {
    return extraPersonsCount * Number(formData.extraPersonRate || 0);
  }, [extraPersonsCount, formData.extraPersonRate]);

  const subtotalAmount = useMemo(() => {
    return Number(formData.basicPackageAmount || 0) + additionalPersonsAmount;
  }, [formData.basicPackageAmount, additionalPersonsAmount]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - Number(formData.discount || 0));
  }, [subtotalAmount, formData.discount]);

  const balanceAmount = useMemo(() => {
    return Math.max(0, totalAmount - Number(formData.advanceAmount || 0));
  }, [totalAmount, formData.advanceAmount]);

  // Auto-generated Explanatory Note matching sample exactly
  const autoGeneratedNote = useMemo(() => {
    const sym = formData.currencySymbol;
    const bText = (formData.badgeText || '').toLowerCase();
    const isRev = bText.includes('revised');
    const isUpd = bText.includes('updated');
    const intro = isRev
      ? 'This document is a revised invoice'
      : isUpd
      ? 'This document is an updated invoice'
      : 'This booking invoice';

    return `Note: ${intro} reflecting ${formData.numberOfPersons} persons, ${sym} ${Number(formData.basicPackageAmount).toLocaleString('en-IN')} basic package, ${sym} ${additionalPersonsAmount.toLocaleString('en-IN')} additional${Number(formData.discount || 0) > 0 ? `, less ${sym} ${Number(formData.discount).toLocaleString('en-IN')} discount` : ''}, and ${sym} ${totalAmount.toLocaleString('en-IN')} total payment. Advance ${sym} ${Number(formData.advanceAmount).toLocaleString('en-IN')} + balance ${sym} ${balanceAmount.toLocaleString('en-IN')} = ${sym} ${totalAmount.toLocaleString('en-IN')}.`;
  }, [formData, additionalPersonsAmount, subtotalAmount, totalAmount, balanceAmount]);

  const displayedNote = formData.useAutoNote ? autoGeneratedNote : formData.customNote;

  // Helper for 3 badge states: Confirmed (Green), Completed (Blue), Pending (Yellow)
  const getBadgeStyles = (statusText) => {
    const s = (statusText || '').toLowerCase();
    if (s.includes('completed')) {
      return {
        background: '#e0f2fe',
        border: '1.5px solid #7dd3fc',
        color: '#0369a1',
      };
    }
    if (s.includes('pending')) {
      return {
        background: '#fef9c3',
        border: '1.5px solid #fde047',
        color: '#854d0e',
      };
    }
    // Default: Booking Confirmed (Green)
    return {
      background: '#e6f9ed',
      border: '1.5px solid #86efac',
      color: '#166534',
    };
  };

  // Helper for formatted currency in preview
  const fmtCurr = (val) => {
    return `${formData.currencySymbol} ${Number(val || 0).toLocaleString('en-IN')}`;
  };

  // Render high-res canvas for exports (uses offscreen standard 740px clone so mobile exports are 100% crisp A4)
  const captureInvoiceCanvas = async () => {
    if (!invoicePreviewRef.current) return null;
    const originalCard = invoicePreviewRef.current;

    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '0';
    offscreen.style.width = '740px';
    offscreen.style.background = '#ffffff';
    offscreen.style.zIndex = '-99999';

    const cloneCard = originalCard.cloneNode(true);
    cloneCard.style.width = '740px';
    cloneCard.style.maxWidth = '740px';
    cloneCard.style.padding = '36px 40px';
    cloneCard.style.borderRadius = '0';
    cloneCard.style.boxShadow = 'none';

    // Remove any mobile-specific override classes from clone
    cloneCard.classList.remove('invoice-canvas-mobile');

    // Swap interactive inline person input with clean plain text in export
    const inlinePerson = cloneCard.querySelector('.inline-person-container');
    if (inlinePerson) {
      inlinePerson.style.display = 'none';
    }
    const exportPerson = cloneCard.querySelector('.export-person-text');
    if (exportPerson) {
      exportPerson.style.display = 'inline';
    }

    offscreen.appendChild(cloneCard);
    document.body.appendChild(offscreen);

    try {
      const canvas = await html2canvas(cloneCard, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 740,
        height: cloneCard.scrollHeight,
        logging: false,
      });
      document.body.removeChild(offscreen);
      return canvas;
    } catch (err) {
      if (document.body.contains(offscreen)) {
        document.body.removeChild(offscreen);
      }
      console.error('Offscreen canvas capture error:', err);
      return await html2canvas(originalCard, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    }
  };

  // 1. Download High-Res Image (PNG) with Mobile WebShare
  const handleDownloadImage = async () => {
    setIsExportingImage(true);
    try {
      const canvas = await captureInvoiceCanvas();
      if (!canvas) {
        toast.error('Failed to capture invoice canvas.');
        return;
      }

      const fileName = `LeTohfa_Invoice_${formData.guestName.replace(/\s+/g, '_')}_${Date.now()}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Could not generate image blob.');
          return;
        }

        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Le'Tohfa Invoice - ${formData.guestName}`,
              text: `Invoice for ${formData.guestName} (${formData.bookingType})`,
            });
            toast.success('Invoice shared successfully!');
            return;
          } catch (e) {}
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 400);

        toast.success('High-resolution invoice image downloaded!');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      toast.error('Error generating image.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // 2. Download Printable A4 PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const canvas = await captureInvoiceCanvas();
      if (!canvas) {
        toast.error('Failed to capture invoice for PDF.');
        return;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = 210;
      const pageH = 297;

      let imgW = pageW - 16; // 8mm margins
      let imgH = (canvas.height * imgW) / canvas.width;

      if (imgH > pageH - 16) {
        const ratio = (pageH - 16) / imgH;
        imgH = pageH - 16;
        imgW = imgW * ratio;
      }

      const xMargin = (pageW - imgW) / 2;
      const yMargin = (pageH - imgH) / 2;

      pdf.addImage(imgData, 'JPEG', xMargin, yMargin, imgW, imgH);

      const fileName = `LeTohfa_Invoice_${formData.guestName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Le'Tohfa Invoice PDF - ${formData.guestName}`,
            text: `Invoice PDF for ${formData.guestName}`,
          });
          toast.success('PDF shared successfully!');
          return;
        } catch (e) {}
      }

      pdf.save(fileName);
      toast.success('A4 PDF Invoice downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Error generating PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-page-container" style={{ maxWidth: '960px', margin: '1.25rem auto', padding: '0 1rem' }}>
      
      <style>{`
        /* Responsive CSS Rules for Mobile & Tablet */
        @media (max-width: 640px) {
          .invoice-page-container {
            padding: 0 0.5rem !important;
            margin: 0.5rem auto !important;
          }
          .invoice-header-box {
            padding: 0.85rem !important;
            margin-bottom: 0.85rem !important;
          }
          .invoice-toolbar-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .invoice-actions-bar {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.45rem !important;
            width: 100% !important;
          }
          .invoice-actions-bar button {
            justify-content: center !important;
            padding: 0.55rem 0.5rem !important;
            font-size: 0.82rem !important;
          }
          .invoice-canvas-wrapper {
            padding: 0.6rem !important;
            border-radius: 8px !important;
            margin-bottom: 1.25rem !important;
          }
          .invoice-canvas-card {
            padding: 20px 14px !important;
            border-radius: 6px !important;
          }
          .invoice-logo-img {
            height: 52px !important;
          }
          .invoice-date-text {
            font-size: 1.05rem !important;
          }
          .invoice-badge-box {
            font-size: 0.78rem !important;
            padding: 5px 12px !important;
          }
          .invoice-guest-box {
            grid-template-columns: 1fr !important;
          }
          .invoice-guest-left {
            border-right: none !important;
            border-bottom: 1.5px solid #cbd5e1 !important;
          }
          .invoice-table th, .invoice-table td {
            padding: 7px 8px !important;
            font-size: 0.8rem !important;
          }
          .invoice-total-row td {
            font-size: 0.95rem !important;
            padding: 8px 10px !important;
          }
          .modal-responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .modal-guest-header-grid {
            grid-template-columns: 80px 1fr !important;
          }
          .modal-card-box {
            padding: 1rem !important;
            max-height: 94vh !important;
            width: 96vw !important;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-canvas, #printable-invoice-canvas * {
            visibility: visible;
          }
          #printable-invoice-canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .inline-person-container {
            display: none !important;
          }
          .export-person-text {
            display: inline !important;
          }
        }
      `}</style>

      {/* ======================================================== */}
      {/* 1. SELECT EXISTING BOOKING + ACTIONS TOOLBAR */}
      {/* ======================================================== */}
      <div className="card invoice-header-box" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Header Title & Action Buttons */}
        <div className="invoice-toolbar-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileText color="#16a34a" size={24} />
              Invoice Generator
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, marginTop: '0.15rem' }}>
              Select a guest booking below or click <strong>"Edit Details"</strong> to customize.
            </p>
          </div>

          <div className="invoice-actions-bar" style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* EDIT DETAILS BUTTON */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                gap: '0.35rem',
                background: 'var(--table-header-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Edit guest information, headcount, pricing, dates, and notes"
            >
              <Edit3 size={15} color="#0284c7" /> Edit Details
            </button>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="btn btn-primary"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                gap: '0.35rem',
                background: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Download single-page printable PDF"
            >
              <Download size={15} />
              {isExportingPdf ? 'Saving...' : 'PDF'}
            </button>

            {/* Image Download Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Save as Image (PNG) for WhatsApp / Photos"
            >
              <ImageIcon size={15} />
              {isExportingImage ? 'Saving...' : 'Image'}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
              title="Browser Print Preview"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

        {/* 1. SELECT EXISTING BOOKING (Search by Date, Name, Phone) */}
        <div style={{ position: 'relative', width: '100%' }} ref={searchDropdownRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={15} color="#16a34a" /> 1. Select Existing Booking
            </span>
            {(selectedBookingId || bookingSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBookingId('');
                  setBookingSearchQuery('');
                  setIsSearchDropdownOpen(false);
                  toast.info('Cleared booking selection. Editing custom values.');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Search Input Box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="form-input"
              value={bookingSearchQuery}
              onChange={(e) => {
                setBookingSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="Search by Guest Name (e.g. Mumthaz) or Date (e.g. 2026-08, Nov)..."
              style={{ paddingLeft: '32px', paddingRight: bookingSearchQuery ? '32px' : '10px', fontSize: '0.86rem', margin: 0 }}
            />
            {bookingSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setBookingSearchQuery('');
                  setIsSearchDropdownOpen(true);
                }}
                style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown Menu Popover */}
          {isSearchDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                zIndex: 200,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {/* Results Count Header */}
              <div style={{ padding: '0.45rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'} found</span>
                <span>Type to search name, date, phone</span>
              </div>

              {filteredBookings.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No bookings matching "{bookingSearchQuery}".
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    You can click "Edit Details" above to type custom guest information.
                  </div>
                </div>
              ) : (
                filteredBookings.map((b) => {
                  const isSelected = String(b._id) === String(selectedBookingId);
                  const isDay = (b.bookingType || '').toLowerCase() === 'daycation';

                  return (
                    <div
                      key={b._id}
                      onClick={() => {
                        loadBookingIntoForm(b._id);
                      }}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--table-header-bg)' : 'transparent',
                        transition: 'background 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--table-hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Left: Name and Details */}
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{b.guestName}</span>
                          {isSelected && <Check size={14} color="#16a34a" />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
                          <span>🗓️ {b.startDate}{b.endDate && b.endDate !== b.startDate ? ` to ${b.endDate}` : ''}</span>
                          <span>☎ {b.phone}</span>
                        </div>
                      </div>

                      {/* Right: Type Badge & Amount */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: isDay ? '#e0f2fe' : '#dcfce7',
                            color: isDay ? '#0369a1' : '#166534',
                            border: `1px solid ${isDay ? '#bae6fd' : '#86efac'}`,
                            display: 'inline-block',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {b.bookingType || 'Staycation'}
                        </span>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#16a34a' }}>
                          ₹{Number(b.advanceAmount || 0).toLocaleString()} Adv
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. INVOICE PREVIEW CANVAS (Prominent, Centered & Clean) */}
      {/* ======================================================== */}
      <div
        className="invoice-canvas-wrapper"
        style={{
          background: '#e2e8f0',
          padding: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'center',
          overflowX: 'auto',
          marginBottom: '2rem',
        }}
      >
        <div
          id="printable-invoice-canvas"
          className="invoice-canvas-card"
          ref={invoicePreviewRef}
          style={{
            width: '100%',
            maxWidth: '720px',
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: `'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif`,
            padding: '36px 40px',
            borderRadius: '8px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          
          {/* Top Header: Logo & Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <img
                src="/logo2.png"
                alt="Le'Tohfa Malappuram"
                className="invoice-logo-img"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
                style={{ height: '68px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="invoice-date-text" style={{ fontSize: '1.25rem', fontWeight: '500', color: '#0f172a', letterSpacing: '-0.01em' }}>
                Date: {formData.invoiceDate}
              </div>
            </div>
          </div>

          {/* Status Badge: Dynamic 3-State Styling (Confirmed/Completed/Pending) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
            <div
              className="invoice-badge-box"
              style={{
                ...getBadgeStyles(formData.badgeText),
                padding: '6px 18px',
                borderRadius: '4px',
                fontWeight: '800',
                fontSize: '0.88rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {formData.badgeText}
            </div>
          </div>

          {/* Section: GUEST INFORMATION */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                color: '#1d4ed8',
                fontWeight: '700',
                fontSize: '1.05rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              GUEST INFORMATION
            </div>

            <div
              className="invoice-guest-box"
              style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '4px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#ffffff',
              }}
            >
              {/* Left Column: Guest Name & Phone */}
              <div className="invoice-guest-left" style={{ padding: '12px 16px', borderRight: '1.5px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  GUEST NAME
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a' }}>
                  {formData.guestPrefix ? `${formData.guestPrefix} ` : ''}{formData.guestName}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>☎</span> {formData.phone || '—'}
                </div>
              </div>

              {/* Right Column: Booking Type & Check-In */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  BOOKING TYPE
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a' }}>
                  {formData.bookingType}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#0f172a', marginTop: '2px' }}>
                  ■ Check-in: {formData.checkInTime}
                </div>
              </div>
            </div>
          </div>

          {/* Section: BOOKING DETAILS */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                color: '#1d4ed8',
                fontWeight: '700',
                fontSize: '1.05rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              BOOKING DETAILS
            </div>

            <table
              className="invoice-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #cbd5e1',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#00a651', color: '#ffffff' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.04em', width: '42%' }}>
                    DETAIL
                  </th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.04em' }}>
                    INFORMATION
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', borderRight: '1.5px solid #cbd5e1' }}>
                    NUMBER OF PERSONS
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: '0.9rem', color: '#0f172a' }}>
                    {/* Interactive Inline Number of Persons Editor */}
                    <div className="inline-person-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={formData.numberOfPersons}
                        onChange={(e) => setFormData({ ...formData, numberOfPersons: Math.max(1, Number(e.target.value) || 1) })}
                        style={{
                          width: '74px',
                          padding: '3px 8px',
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          color: '#0f172a',
                          background: '#f8fafc',
                          border: '1.5px solid #0284c7',
                          borderRadius: '6px',
                          textAlign: 'center',
                          outline: 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        title="Edit headcount directly"
                      />
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>persons</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#0369a1',
                          fontWeight: '700',
                          background: '#e0f2fe',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bae6fd',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        ✏️ Click to change
                      </span>
                    </div>

                    {/* Clean plain text used during PDF / Image Export and Print */}
                    <span className="export-person-text" style={{ display: 'none', fontWeight: '700' }}>
                      {formData.numberOfPersons} persons
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', borderRight: '1.5px solid #cbd5e1' }}>
                    CHECK-IN DATE & TIME
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: '0.9rem', color: '#0f172a' }}>
                    {formData.checkInDate} — {formData.checkInTime}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', borderRight: '1.5px solid #cbd5e1' }}>
                    CHECK-OUT DATE & TIME
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: '0.9rem', color: '#0f172a' }}>
                    {formData.checkOutDate} — {formData.checkOutTime}
                  </td>
                </tr>
                <tr style={{ background: '#ffffff' }}>
                  <td style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', borderRight: '1.5px solid #cbd5e1' }}>
                    BOOKING TYPE
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: '0.9rem', color: '#0f172a' }}>
                    {formData.bookingType}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: PAYMENT SUMMARY */}
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                color: '#1d4ed8',
                fontWeight: '700',
                fontSize: '1.05rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              PAYMENT SUMMARY
            </div>

            <table
              className="invoice-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #86efac',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <tbody>
                {/* Basic Package Amount */}
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e2e8f0', width: '60%' }}>
                    Basic Package Amount
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                    {fmtCurr(formData.basicPackageAmount)}
                  </td>
                </tr>

                {/* Additional Persons Calculation */}
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                    Additional Persons
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '0.92rem', color: '#0f172a' }}>
                    {extraPersonsCount} × {formData.currencySymbol} {formData.extraPersonRate} = <strong>{fmtCurr(additionalPersonsAmount)}</strong>
                  </td>
                </tr>

                {/* Subtotal (only shown if discount applies) */}
                {Number(formData.discount || 0) > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <td style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                      Subtotal
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                      {fmtCurr(subtotalAmount)}
                    </td>
                  </tr>
                )}

                {/* Discount (if > 0) */}
                {Number(formData.discount || 0) > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <td style={{ padding: '8px 14px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                      Discount
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '0.95rem', fontWeight: '700', color: '#dc2626' }}>
                      - {fmtCurr(formData.discount)}
                    </td>
                  </tr>
                )}

                {/* TOTAL AMOUNT: Highlighted soft green row */}
                <tr className="invoice-total-row" style={{ background: '#e6f9ed', borderBottom: '1px solid #86efac' }}>
                  <td style={{ padding: '10px 14px', fontSize: '0.98rem', fontWeight: '900', color: '#15803d', textTransform: 'uppercase', borderRight: '1px solid #86efac' }}>
                    TOTAL AMOUNT
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '1.08rem', fontWeight: '900', color: '#15803d' }}>
                    {fmtCurr(totalAmount)}
                  </td>
                </tr>

                {/* PAYMENT STATUS */}
                <tr style={{ background: '#ffffff' }}>
                  <td style={{ padding: '9px 14px', fontSize: '0.9rem', fontWeight: '800', color: '#15803d', textTransform: 'uppercase', borderRight: '1px solid #e2e8f0' }}>
                    PAYMENT STATUS
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.95rem', fontWeight: '800', color: '#15803d' }}>
                    {formData.paymentStatus}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footnote Note */}
          {displayedNote && (
            <div style={{ marginTop: '22px', fontSize: '0.78rem', color: '#334155', lineHeight: '1.5', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
              <strong>Note:</strong> {displayedNote}
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EDIT DETAILS MODAL (Opens when clicking 'Edit Details') */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem',
          boxSizing: 'border-box',
        }}>
          <div className="card modal-card-box" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: 'auto',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.15s ease-out',
          }}>
            
            {/* Modal Title & Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Edit3 size={18} color="#0284c7" /> Edit Invoice Details
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0, marginTop: '0.15rem' }}>
                  Modify guest information, schedule, headcount rates, and explanatory notes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Section A: Header & Status */}
              <div style={{ background: 'var(--table-header-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Sparkles size={15} color="#0284c7" /> Header & Status
                </span>

                <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Currency Symbol</label>
                    <select
                      className="form-select"
                      value={formData.currencySymbol}
                      onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    >
                      <option value="₹">₹ (Indian Rupee)</option>
                      <option value="■">■ (Square Bullet glyph)</option>
                      <option value="Rs">Rs (Rupees text)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Booking Status (3 States)</label>
                  <select
                    className="form-select"
                    value={formData.badgeText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        badgeText: val,
                        paymentStatus: val === 'BOOKING COMPLETED' ? 'Payment Completed' : 'Balance Pending',
                      });
                    }}
                    style={{ fontWeight: '700', fontSize: '0.9rem' }}
                  >
                    <option value="BOOKING CONFIRMED">🟢 BOOKING CONFIRMED (Current / Upcoming)</option>
                    <option value="BOOKING COMPLETED">🔵 BOOKING COMPLETED (Past Date / Settled)</option>
                    <option value="BOOKING PENDING">🟡 BOOKING PENDING</option>
                  </select>

                  {/* 3 Quick-Tap State Buttons */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {[
                      { val: 'BOOKING CONFIRMED', icon: '🟢', bg: '#dcfce7', border: '#86efac', text: '#166534' },
                      { val: 'BOOKING COMPLETED', icon: '🔵', bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' },
                      { val: 'BOOKING PENDING', icon: '🟡', bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
                    ].map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          badgeText: st.val,
                          paymentStatus: st.val === 'BOOKING COMPLETED' ? 'Payment Completed' : 'Balance Pending',
                        })}
                        style={{
                          background: formData.badgeText === st.val ? st.bg : 'var(--card-bg)',
                          border: '1.5px solid',
                          borderColor: formData.badgeText === st.val ? st.border : 'var(--border-color)',
                          color: formData.badgeText === st.val ? st.text : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{st.icon}</span> {st.val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section B: Guest Information & Schedule */}
              <div style={{ background: 'var(--table-header-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <User size={15} color="#16a34a" /> Guest Information & Timings
                </span>

                <div className="modal-guest-header-grid" style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <select
                      className="form-select"
                      value={formData.guestPrefix}
                      onChange={(e) => setFormData({ ...formData, guestPrefix: e.target.value })}
                    >
                      <option value="Ms">Ms</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Dr">Dr</option>
                      <option value="">None</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Guest Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Booking Type</label>
                    <select
                      className="form-select"
                      value={formData.bookingType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const isDay = newType === 'Daycation';
                        setFormData({
                          ...formData,
                          bookingType: newType,
                          basicPackageAmount: isDay ? 12000 : 15000,
                          extraPersonRate: isDay ? 100 : 200,
                          checkInTime: isDay ? '9:00 AM' : '3:00 PM',
                          checkOutTime: isDay ? '9:00 PM' : '12:00 PM',
                        });
                      }}
                    >
                      <option value="Daycation">Daycation (9 AM - 9 PM)</option>
                      <option value="Staycation">Staycation (3 PM - 12 PM)</option>
                      <option value="Event">Event / Other</option>
                    </select>
                  </div>
                </div>

                {/* Timings */}
                <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Check-In Date & Time</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.checkInDate}
                      onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                      style={{ marginBottom: '0.35rem' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Check-Out Date & Time</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.checkOutDate}
                      onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                      style={{ marginBottom: '0.35rem' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Pricing & Headcount Calculator */}
              <div style={{ background: 'var(--table-header-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <DollarSign size={15} color="#eab308" /> Headcount & Pricing Calculator
                </span>

                <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Total Number of Persons</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.numberOfPersons}
                      onChange={(e) => setFormData({ ...formData, numberOfPersons: Number(e.target.value) })}
                      min={1}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Basic Package Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.basicPackageAmount}
                      onChange={(e) => setFormData({ ...formData, basicPackageAmount: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                {/* Additional Persons Formula Inputs */}
                <div style={{ background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                  <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Base Included Headcount</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.baseIncludedPersons}
                        onChange={(e) => setFormData({ ...formData, baseIncludedPersons: Number(e.target.value) })}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate Per Extra Person (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.extraPersonRate}
                        onChange={(e) => setFormData({ ...formData, extraPersonRate: Number(e.target.value) })}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Calculated Extra:</span>
                    <span style={{ color: '#16a34a' }}>
                      {extraPersonsCount} × ₹{formData.extraPersonRate} = ₹{additionalPersonsAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Discount & Advance */}
                <div className="modal-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Discount Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.discount === 0 ? '' : formData.discount}
                      placeholder="0 (No discount)"
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Advance Paid (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Payment Status Label</label>
                  <select
                    className="form-select"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  >
                    <option value="Balance Pending">Balance Pending</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Advance Received">Advance Received</option>
                    <option value="Payment Completed">Payment Completed</option>
                  </select>
                </div>
              </div>

              {/* Section D: Explanatory Note */}
              <div style={{ background: 'var(--table-header-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Document Note
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700' }}>
                    <input
                      type="checkbox"
                      checked={formData.useAutoNote}
                      onChange={(e) => setFormData({ ...formData, useAutoNote: e.target.checked })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    Auto-generate
                  </label>
                </div>

                {formData.useAutoNote ? (
                  <div style={{ background: 'var(--card-bg)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.45', border: '1px solid var(--border-color)' }}>
                    {autoGeneratedNote}
                  </div>
                ) : (
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.customNote}
                    onChange={(e) => setFormData({ ...formData, customNote: e.target.value })}
                    placeholder="Type custom document note here..."
                    style={{ fontSize: '0.8rem' }}
                  />
                )}
              </div>

            </div>

            {/* Modal Footer with Done Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.25rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Check size={16} /> Done & View Invoice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default InvoiceBuilder;
