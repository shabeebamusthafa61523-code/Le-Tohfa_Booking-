/**
 * generateAdvanceInvoice
 * Opens a professional A4-formatted Advance Invoice in a new browser tab.
 * - 📱 Fully Responsive on Mobile & Desktop (looks like a clean A4 sheet)
 * - ⬇️ Save as PDF  → triggers browser print dialog (select "Save as PDF")
 * - 📸 Save as Photo → html2canvas (CDN) captures invoice as high-res PNG
 *
 * @param {Object} booking - The booking object from MongoDB
 */
export const generateAdvanceInvoice = (booking) => {
  const invoiceNumber = `LT-${new Date(booking.createdAt || booking.startDate).getFullYear()}-${String(booking._id).slice(-6).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹ 0';
    return `₹ ${Number(amount).toLocaleString('en-IN')}`;
  };

  // ── PRICING LOGIC ──────────────────────────────────────────
  const type = (booking.bookingType || '').toLowerCase();
  let basicAmount = 25000;
  let additionalNote = null;

  if (type === 'staycation') {
    basicAmount = 15000;
    additionalNote = 'Per head over 20 persons: additional ₹200 per person';
  } else if (type === 'daycation') {
    basicAmount = 12000;
    additionalNote = 'Per head over 20 persons: additional ₹100 per person';
  }

  const bookingTypeLabel =
    type === 'staycation' ? 'Staycation'
    : type === 'daycation' ? 'Daycation'
    : 'Event / Other';

  // Split "3:00 PM to 12:00 PM" → checkIn = "3:00 PM", checkOut = "12:00 PM"
  const timeRaw = booking.checkInTime || '';
  const timeParts = timeRaw.split(/\s+to\s+/i);
  const checkInTime  = timeParts[0]?.trim() || timeRaw || '—';
  const checkOutTime = timeParts[1]?.trim() || timeRaw || '—';

  const totalAmount  = booking.totalAmount || 0;
  const balance      = (totalAmount || basicAmount) - (booking.advanceAmount || 0);
  const logoUrl      = `${window.location.origin}/logo.png`;
  const guestName    = booking.guestName || 'Guest';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
      <title>Advance Invoice - ${guestName} - ${invoiceNumber}</title>

      <!-- html2canvas from CDN for Save as Photo -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

      <style>
        * { margin:0; padding:0; box-sizing:border-box; }

        body {
          font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
          background: #eef2f7;
          color: #1a1a1a;
          min-height: 100vh;
          padding: 24px 12px 40px;
          -webkit-font-smoothing: antialiased;
        }

        /* ── ACTION BAR ── */
        .action-bar {
          max-width: 794px;
          margin: 0 auto 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-close  { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .btn-pdf    { background:linear-gradient(135deg,#16a34a,#059669); color:#fff; box-shadow:0 4px 12px rgba(22,163,74,0.3); }
        .btn-photo  { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; box-shadow:0 4px 12px rgba(124,58,237,0.3); }
        .btn-loading { opacity:0.7; pointer-events:none; }

        /* ── INVOICE A4 SHEET CONTAINER ── */
        .invoice-wrapper {
          width: 100%;
          max-width: 794px; /* Standard A4 Width at 96 DPI */
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          padding: 48px 52px;
          position: relative;
        }

        /* ── HEADER ── */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 3px solid #16a34a;
          gap: 16px;
        }
        .brand img { height: 72px; width: auto; object-fit: contain; }
        .invoice-badge { text-align: right; }
        .invoice-badge h2 { font-size:26px; font-weight:800; color:#1a1a1a; letter-spacing:-0.5px; }
        .invoice-badge .inv-number { font-size:13px; color:#16a34a; font-weight:700; margin-top:4px; }
        .invoice-badge .inv-date   { font-size:12px; color:#6b7280; margin-top:2px; }

        /* ── STATUS BANNER ── */
        .status-banner {
          display: inline-block;
          padding: 5px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .status-confirmed { background:#dcfce7; color:#166534; border:1px solid #86efac; }
        .status-pending   { background:#fef9c3; color:#854d0e; border:1px solid #fde047; }
        .status-completed { background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; }
        .status-cancelled { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }

        /* ── SECTION TITLE ── */
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        /* ── GUEST INFO GRID ── */
        .guest-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 26px;
        }
        .info-card {
          background: #f8fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px 18px;
        }
        .info-card .label     { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
        .info-card .value     { font-size:15px; font-weight:700; color:#111827; }
        .info-card .sub-value { font-size:13px; color:#6b7280; margin-top:3px; }

        /* ── DETAILS TABLE ── */
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 26px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .details-table thead tr { background:#16a34a; color:#fff; }
        .details-table thead th {
          padding: 11px 15px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .details-table tbody tr { border-bottom:1px solid #f0f0f0; }
        .details-table tbody tr:last-child { border-bottom:none; }
        .details-table tbody tr:nth-child(even) { background:#f9fafb; }
        .details-table tbody td { padding:12px 15px; font-size:14px; color:#374151; }
        .details-table tbody td.label-col {
          font-weight:600; color:#6b7280; font-size:12px;
          text-transform:uppercase; letter-spacing:0.04em; width:42%;
        }

        /* ── AMOUNTS BOX ── */
        .amounts-box {
          background: #f0fdf4;
          border: 2px solid #86efac;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: ${additionalNote ? '14px' : '26px'};
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 0;
          font-size: 14px;
          color: #374151;
        }
        .amount-row.total-row {
          border-top: 2px solid #16a34a;
          margin-top: 8px;
          padding-top: 12px;
          font-size: 17px;
          font-weight: 800;
          color: #166534;
        }
        .amount-row .amount-value { font-weight:700; }

        /* ── CHARGES NOTE ── */
        .charges-note {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 26px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .charges-note .note-icon { font-size:17px; flex-shrink:0; margin-top:1px; }
        .charges-note .note-text { font-size:13px; color:#92400e; font-weight:600; line-height:1.5; }
        .charges-note .note-title { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#b45309; margin-bottom:3px; }

        /* ── FOOTER ── */
        .invoice-footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
        }
        .footer-note { font-size:12px; color:#9ca3af; max-width:320px; line-height:1.6; }
        .stamp-area .stamp-line { width:140px; border-bottom:1px dashed #d1d5db; margin-bottom:5px; }
        .stamp-area p { font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; text-align:center; }

        /* ── MOBILE RESPONSIVE MEDIA QUERIES ── */
        @media screen and (max-width: 640px) {
          body { padding: 12px 8px 24px; }
          .action-bar { justify-content: center; gap: 8px; margin-bottom: 12px; }
          .action-btn { padding: 8px 14px; font-size: 13px; flex: 1; justify-content: center; }
          .invoice-wrapper { padding: 24px 18px; border-radius: 10px; }
          .header { flex-direction: row; align-items: center; margin-bottom: 20px; padding-bottom: 16px; }
          .brand img { height: 52px; }
          .invoice-badge h2 { font-size: 20px; }
          .invoice-badge .inv-number { font-size: 11px; }
          .guest-section { grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-card { padding: 12px 14px; }
          .info-card .value { font-size: 14px; }
          .details-table tbody td { padding: 10px 12px; font-size: 13px; }
          .amounts-box { padding: 16px 18px; }
          .amount-row { font-size: 13px; }
          .amount-row.total-row { font-size: 15px; }
          .invoice-footer { flex-direction: row; gap: 12px; }
        }

        /* ── PRINT MEDIA STYLES (A4 SHEET PRINTING) ── */
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body { background:#fff; padding:0; }
          .action-bar { display:none !important; }
          .invoice-wrapper {
            box-shadow:none;
            border-radius:0;
            padding:0;
            max-width:100%;
            width:100%;
          }
        }
      </style>
    </head>
    <body>

      <!-- ACTION BAR -->
      <div class="action-bar">
        <button class="action-btn btn-close"  onclick="window.close()">✕ Close</button>
        <button class="action-btn btn-photo"  onclick="saveAsPhoto()" id="photoBtn">📸 Save as Photo</button>
        <button class="action-btn btn-pdf"    onclick="window.print()">⬇️ Save as PDF</button>
      </div>

      <!-- INVOICE CARD (A4 Sheet Preview) -->
      <div class="invoice-wrapper" id="invoiceCard">

        <!-- HEADER -->
        <div class="header">
          <div class="brand">
            <img src="${logoUrl}" alt="Logo" crossorigin="anonymous" onerror="this.style.display='none'" />
          </div>
          <div class="invoice-badge">
            <h2>ADVANCE INVOICE</h2>
            <div class="inv-number">${invoiceNumber}</div>
            <div class="inv-date">Date: ${invoiceDate}</div>
          </div>
        </div>

        <!-- STATUS BADGE -->
        <span class="status-banner status-${booking.status || 'pending'}">
          ${(booking.status || 'pending').charAt(0).toUpperCase() + (booking.status || 'pending').slice(1)} Booking
        </span>

        <!-- GUEST INFO -->
        <div class="section-title">Guest Information</div>
        <div class="guest-section">
          <div class="info-card">
            <div class="label">Guest Name</div>
            <div class="value">${guestName}</div>
            <div class="sub-value">📞 ${booking.phone || '—'}</div>
          </div>
          <div class="info-card">
            <div class="label">Booking Type</div>
            <div class="value">${bookingTypeLabel}</div>
            <div class="sub-value">🕐 Check-in: ${checkInTime}</div>
          </div>
        </div>

        <!-- BOOKING DETAILS TABLE -->
        <div class="section-title">Booking Details</div>
        <table class="details-table">
          <thead>
            <tr><th>Detail</th><th>Information</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="label-col">Check-in Date &amp; Time</td>
              <td><strong>${formatDate(booking.startDate)}</strong><br/><span style="color:#6b7280;font-size:13px;">🕐 ${checkInTime}</span></td>
            </tr>
            <tr>
              <td class="label-col">Check-out Date &amp; Time</td>
              <td><strong>${formatDate(booking.endDate)}</strong><br/><span style="color:#6b7280;font-size:13px;">🕐 ${checkOutTime}</span></td>
            </tr>
            <tr>
              <td class="label-col">Booking Type</td>
              <td>${bookingTypeLabel}</td>
            </tr>
          </tbody>
        </table>

        <!-- PAYMENT SUMMARY -->
        <div class="section-title">Payment Summary</div>
        <div class="amounts-box">
          <div class="amount-row">
            <span>Basic Package Amount</span>
            <span class="amount-value">${formatCurrency(basicAmount)}</span>
          </div>
          ${totalAmount ? `
          <div class="amount-row" style="border-top:1px dashed #86efac;padding-top:8px;margin-top:4px;">
            <span style="font-weight:700;">Total Amount</span>
            <span class="amount-value" style="color:#1e40af;">${formatCurrency(totalAmount)}</span>
          </div>` : ''}
          <div class="amount-row total-row">
            <span>✅ Advance Amount Paid</span>
            <span class="amount-value">${formatCurrency(booking.advanceAmount)}</span>
          </div>
          <div class="amount-row" style="font-size:13px;color:#6b7280;margin-top:8px;">
            <span>Balance Due</span>
            <span>${formatCurrency(balance >= 0 ? balance : 0)}</span>
          </div>
        </div>

        <!-- ADDITIONAL CHARGES NOTE -->
        ${additionalNote ? `
        <div class="charges-note">
          <div class="note-icon">⚠️</div>
          <div class="note-text">
            <div class="note-title">Additional Charges Apply</div>
            ${additionalNote}
          </div>
        </div>
        ` : ''}

        <!-- FOOTER -->
        <div class="invoice-footer">
          <div class="footer-note">
            Thank you for choosing LETOHFA Booking!<br/>
            This is a computer-generated advance receipt.<br/>
            For queries, please contact the resort management.
          </div>
          <div class="stamp-area">
            <div class="stamp-line"></div>
            <p>Authorized Signature</p>
          </div>
        </div>

      </div>

      <script>
        function saveAsPhoto() {
          const btn = document.getElementById('photoBtn');
          btn.textContent = '⏳ Saving...';
          btn.classList.add('btn-loading');

          const card = document.getElementById('invoiceCard');
          html2canvas(card, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: -window.scrollY,
          }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Invoice-${guestName.replace(/\\s+/g, '_')}-${invoiceNumber}.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            btn.textContent = '📸 Save as Photo';
            btn.classList.remove('btn-loading');
          }).catch(err => {
            alert('Could not capture image. Please try Save as PDF instead.');
            btn.textContent = '📸 Save as Photo';
            btn.classList.remove('btn-loading');
          });
        }
      </script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=840,height=960,scrollbars=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert('Please allow popups for this site to view the invoice.');
  }
};
