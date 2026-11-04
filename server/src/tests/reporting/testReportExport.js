import assert from 'assert';
import { ReportExportService } from '../../services/reporting/reportExportService.js';
import { Report } from '../../models/index.js';
import { ForbiddenError } from '../../errors/AppError.js';

export async function runTestReportExport({ orgId, patientId }) {
  console.log('\n🧪 Testing Report PDF Export & Security (testReportExport.js)...');

  // 1. Create a draft report
  const draftReport = await Report.create({
    patientId,
    organizationId: orgId,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-08'),
    overview: 'Draft clinical overview for PDF generation verification.',
    redFlags: [],
    yellowFlags: [],
    positiveProgress: ['Maintained consistent activity'],
    trends: { adherencePct: 92, sleepAvg: 7.2, activityAvg: 25, hydrationAvg: 1800 },
    status: 'DRAFT',
    version: 1,
  });

  // 2. Generate PDF for draft report
  const { pdfBuffer, filename } = await ReportExportService.exportReportToPdf({
    reportId: draftReport._id,
    organizationId: orgId,
  });

  assert(Buffer.isBuffer(pdfBuffer), 'Export result must be a Buffer');
  assert(pdfBuffer.length > 500, 'PDF buffer must contain binary content');
  assert(filename.endsWith('.pdf'), 'Filename must end with .pdf');

  // PDF header check (%PDF-)
  const header = pdfBuffer.slice(0, 5).toString('ascii');
  assert.strictEqual(header, '%PDF-', 'Buffer must begin with valid PDF header (%PDF-)');
  console.log('  ✔ [PASS] PDF Export generated successfully (valid %PDF- binary header, length:', pdfBuffer.length, 'bytes)');

  // 3. Cross-Tenant export check: Wrong organization ID must be forbidden
  let wrongOrgFailed = false;
  try {
    await ReportExportService.exportReportToPdf({
      reportId: draftReport._id,
      organizationId: '507f1f77bcf86cd799439099', // Different organization
    });
  } catch (err) {
    wrongOrgFailed = true;
    assert(err instanceof ForbiddenError || err.message.includes('another organization'));
  }
  assert(wrongOrgFailed, 'Cross-tenant PDF export must be blocked');
  console.log('  ✔ [PASS] Security: Cross-tenant PDF export strictly blocked');

  // Clean up
  await Report.deleteMany({ _id: draftReport._id });
  return true;
}

export default runTestReportExport;

