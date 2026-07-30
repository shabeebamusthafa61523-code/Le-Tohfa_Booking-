/**
 * generateAdvanceInvoice
 * Opens a professional A4 single-page Advance Invoice in a new browser tab.
 * - 📄 Guaranteed Single Page A4 Layout (no overflow or page breaks)
 * - ⬇️ Save as PDF → Auto-downloads PDF directly to mobile Downloads/Files folder via Blob URL & Web Share
 * - 📸 Save as Photo → Auto-saves high-res PNG directly to Gallery / Photos on Mobile & Desktop
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

      <!-- html2canvas and jspdf CDN for direct clean PDF and PNG downloads -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

      <style>
        * { margin:0; padding:0; box-sizing:border-box; }

        html, body {
          background: #eef2f7;
          color: #1a1a1a;
          font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        body {
          min-height: 100vh;
          padding: 20px 12px 30px;
        }

        /* ── ACTION BAR ── */
        .action-bar {
          max-width: 760px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-close  { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .btn-pdf    { background:linear-gradient(135deg,#16a34a,#059669); color:#fff; box-shadow:0 4px 12px rgba(22,163,74,0.3); }
        .btn-photo  { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; box-shadow:0 4px 12px rgba(124,58,237,0.3); }
        .btn-loading { opacity:0.7; pointer-events:none; }

        /* ── COMPACT SINGLE PAGE A4 INVOICE CARD ── */
        .invoice-wrapper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.10);
          padding: 36px 42px;
          position: relative;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* ── HEADER ── */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 3px solid #16a34a;
          gap: 16px;
        }
        .brand img { height: 60px; width: auto; object-fit: contain; }
        .invoice-badge { text-align: right; }
        .invoice-badge h2 { font-size:24px; font-weight:800; color:#1a1a1a; letter-spacing:-0.5px; }
        .invoice-badge .inv-number { font-size:12px; color:#16a34a; font-weight:700; margin-top:3px; }
        .invoice-badge .inv-date   { font-size:11px; color:#6b7280; margin-top:2px; }

        /* ── STATUS BANNER ── */
        .status-banner {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 18px;
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
          margin-bottom: 8px;
        }

        /* ── GUEST INFO GRID ── */
        .guest-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        .info-card {
          background: #f8fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .info-card .label     { font-size:10px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
        .info-card .value     { font-size:14px; font-weight:700; color:#111827; }
        .info-card .sub-value { font-size:12px; color:#6b7280; margin-top:2px; }

        /* ── DETAILS TABLE ── */
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .details-table thead tr { background:#16a34a; color:#fff; }
        .details-table thead th {
          padding: 9px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .details-table tbody tr { border-bottom:1px solid #f0f0f0; }
        .details-table tbody tr:last-child { border-bottom:none; }
        .details-table tbody tr:nth-child(even) { background:#f9fafb; }
        .details-table tbody td { padding:10px 12px; font-size:13px; color:#374151; }
        .details-table tbody td.label-col {
          font-weight:600; color:#6b7280; font-size:11px;
          text-transform:uppercase; letter-spacing:0.04em; width:40%;
        }

        /* ── AMOUNTS BOX ── */
        .amounts-box {
          background: #f0fdf4;
          border: 2px solid #86efac;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: ${additionalNote ? '12px' : '18px'};
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          font-size: 13px;
          color: #374151;
        }
        .amount-row.total-row {
          border-top: 2px solid #16a34a;
          margin-top: 6px;
          padding-top: 10px;
          font-size: 16px;
          font-weight: 800;
          color: #166534;
        }
        .amount-row .amount-value { font-weight:700; }

        /* ── CHARGES NOTE ── */
        .charges-note {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .charges-note .note-icon { font-size:15px; flex-shrink:0; margin-top:1px; }
        .charges-note .note-text { font-size:12px; color:#92400e; font-weight:600; line-height:1.4; }
        .charges-note .note-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#b45309; margin-bottom:2px; }

        /* ── FOOTER ── */
        .invoice-footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
        }
        .footer-note { font-size:11px; color:#9ca3af; max-width:320px; line-height:1.5; }
        .stamp-area .stamp-line { width:130px; border-bottom:1px dashed #d1d5db; margin-bottom:4px; }
        .stamp-area p { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; text-align:center; }

        /* ── MOBILE RESPONSIVE MEDIA QUERIES ── */
        @media screen and (max-width: 640px) {
          body { padding: 10px 6px 18px; }
          .action-bar { justify-content: center; gap: 6px; margin-bottom: 10px; }
          .action-btn { padding: 8px 12px; font-size: 12px; flex: 1; justify-content: center; }
          .invoice-wrapper { padding: 20px 14px; border-radius: 8px; }
          .header { margin-bottom: 16px; padding-bottom: 12px; }
          .brand img { height: 46px; }
          .invoice-badge h2 { font-size: 18px; }
          .invoice-badge .inv-number { font-size: 10px; }
          .guest-section { grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
          .info-card { padding: 10px 12px; }
          .info-card .value { font-size: 13px; }
          .details-table tbody td { padding: 8px 10px; font-size: 12px; }
          .amounts-box { padding: 16px 18px; margin-bottom: 14px; }
          .amount-row { font-size: 12px; }
          .amount-row.total-row { font-size: 14px; }
        }

        /* ── CLEAN SINGLE PAGE A4 PRINTING (NO BROWSER HEADERS/FOOTERS) ── */
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .action-bar { display: none !important; }
          .invoice-wrapper {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 32px 40px !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>

      <!-- ACTION BAR -->
      <div class="action-bar">
        <button class="action-btn btn-close"  onclick="window.close()">✕ Close</button>
        <button class="action-btn btn-photo"  onclick="saveAsPhoto()" id="photoBtn">📸 Save as Photo</button>
        <button class="action-btn btn-pdf"    onclick="downloadPDF()" id="pdfBtn">⬇️ Download PDF</button>
      </div>

      <!-- INVOICE CARD (A4 Single Page Sheet) -->
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
              <td><strong>${formatDate(booking.startDate)}</strong><br/><span style="color:#6b7280;font-size:12px;">🕐 ${checkInTime}</span></td>
            </tr>
            <tr>
              <td class="label-col">Check-out Date &amp; Time</td>
              <td><strong>${formatDate(booking.endDate)}</strong><br/><span style="color:#6b7280;font-size:12px;">🕐 ${checkOutTime}</span></td>
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
          <div class="amount-row" style="border-top:1px dashed #86efac;padding-top:6px;margin-top:3px;">
            <span style="font-weight:700;">Total Amount</span>
            <span class="amount-value" style="color:#1e40af;">${formatCurrency(totalAmount)}</span>
          </div>` : ''}
          <div class="amount-row total-row">
            <span>✅ Advance Amount Paid</span>
            <span class="amount-value">${formatCurrency(booking.advanceAmount)}</span>
          </div>
          <div class="amount-row" style="font-size:12px;color:#6b7280;margin-top:6px;">
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
        // OFF-SCREEN 794px CLONE RENDERER (Guarantees 100% Un-truncated A4 PDF on Mobile & Desktop)
        function renderCanvasForExport(callback) {
          const originalCard = document.getElementById('invoiceCard');
          
          const offscreenContainer = document.createElement('div');
          offscreenContainer.style.position = 'absolute';
          offscreenContainer.style.left = '-9999px';
          offscreenContainer.style.top = '0';
          offscreenContainer.style.width = '794px';
          offscreenContainer.style.background = '#ffffff';
          offscreenContainer.style.padding = '0';
          offscreenContainer.style.margin = '0';
          
          const cloneCard = originalCard.cloneNode(true);
          cloneCard.style.padding = '44px 50px';
          cloneCard.style.width = '794px';
          cloneCard.style.maxWidth = '794px';
          cloneCard.style.borderRadius = '0';
          cloneCard.style.boxShadow = 'none';

          offscreenContainer.appendChild(cloneCard);
          document.body.appendChild(offscreenContainer);

          html2canvas(cloneCard, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: cloneCard.scrollHeight,
          }).then(canvas => {
            document.body.removeChild(offscreenContainer);
            callback(canvas);
          }).catch(err => {
            document.body.removeChild(offscreenContainer);
            console.error('Canvas capture error:', err);
            callback(null);
          });
        }

        // AUTO-DOWNLOAD PDF ON MOBILE & DESKTOP (Triggers direct file save instead of only viewing)
        function downloadPDF() {
          const btn = document.getElementById('pdfBtn');
          btn.textContent = '⏳ Downloading PDF...';
          btn.classList.add('btn-loading');

          renderCanvasForExport(function(canvas) {
            if (!canvas) {
              window.print();
              btn.textContent = '⬇️ Download PDF';
              btn.classList.remove('btn-loading');
              return;
            }

            try {
              const imgData = canvas.toDataURL('image/jpeg', 0.98);
              const { jsPDF } = window.jspdf;
              const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
              });

              const pageW = 210; // A4 width mm
              const pageH = 297; // A4 height mm

              let imgW = pageW;
              let imgH = (canvas.height * pageW) / canvas.width;

              if (imgH > pageH) {
                const ratio = (pageH - 6) / imgH;
                imgH = pageH - 6;
                imgW = imgW * ratio;
              }

              const xMargin = (pageW - imgW) / 2;
              const yMargin = (pageH - imgH) / 2;

              pdf.addImage(imgData, 'JPEG', xMargin, yMargin, imgW, imgH);
              
              // Generate PDF Blob for direct auto-download on mobile devices
              const pdfBlob = pdf.output('blob');
              const pdfFileName = 'Invoice-${guestName.replace(/\\s+/g, '_')}-${invoiceNumber}.pdf';
              const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

              // Web Share API support for mobile (opens native share sheet to save directly to Files/Downloads)
              if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                navigator.share({
                  files: [pdfFile],
                  title: 'LeTohfa Invoice PDF',
                  text: 'Advance Invoice for ${guestName}'
                }).then(() => {
                  btn.textContent = '⬇️ Download PDF';
                  btn.classList.remove('btn-loading');
                }).catch(() => {
                  triggerDirectPdfFileSave(pdfBlob, pdfFileName);
                });
              } else {
                triggerDirectPdfFileSave(pdfBlob, pdfFileName);
              }
            } catch (e) {
              console.error(e);
              window.print();
              btn.textContent = '⬇️ Download PDF';
              btn.classList.remove('btn-loading');
            }
          });

          function triggerDirectPdfFileSave(blob, fileName) {
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
              btn.textContent = '⬇️ Download PDF';
              btn.classList.remove('btn-loading');
            }, 400);
          }
        }

        // Auto-save Photo to Gallery / Photos on Mobile & Desktop
        function saveAsPhoto() {
          const btn = document.getElementById('photoBtn');
          btn.textContent = '⏳ Saving to Gallery...';
          btn.classList.add('btn-loading');

          renderCanvasForExport(function(canvas) {
            if (!canvas) {
              alert('Could not capture photo. Try Download PDF.');
              btn.textContent = '📸 Save as Photo';
              btn.classList.remove('btn-loading');
              return;
            }

            canvas.toBlob(blob => {
              if (!blob) {
                alert('Failed to generate image blob');
                btn.textContent = '📸 Save as Photo';
                btn.classList.remove('btn-loading');
                return;
              }

              const fileName = 'Invoice-${guestName.replace(/\\s+/g, '_')}-${invoiceNumber}.png';
              const file = new File([blob], fileName, { type: 'image/png' });

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                  files: [file],
                  title: 'LeTohfa Invoice',
                  text: 'Advance Invoice for ${guestName}'
                }).then(() => {
                  btn.textContent = '📸 Save as Photo';
                  btn.classList.remove('btn-loading');
                }).catch(() => {
                  triggerDirectDownload(blob, fileName);
                });
              } else {
                triggerDirectDownload(blob, fileName);
              }
            }, 'image/png', 1.0);
          });

          function triggerDirectDownload(blob, fileName) {
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
              btn.textContent = '📸 Save as Photo';
              btn.classList.remove('btn-loading');
            }, 300);
          }
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
