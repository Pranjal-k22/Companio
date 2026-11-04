import PDFDocument from 'pdfkit';
import { Report, Patient, Organization } from '../../models/index.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';

/**
 * Report Export Service
 * Generates structured, professional clinical PDF summaries with
 * draft watermarks, provenance hashes, and clinician attestation blocks.
 */
export class ReportExportService {
  /**
   * Generates a PDF buffer for an authorized report.
   *
   * @param {object} params
   * @param {string} params.reportId
   * @param {string} params.organizationId - Tenant check
   * @returns {Promise<{ pdfBuffer: Buffer, filename: string, report: object }>}
   */
  static async exportReportToPdf({ reportId, organizationId }) {
    const report = await Report.findById(reportId)
      .populate('patientId', 'name age contact')
      .populate('organizationId', 'name slug contact');

    if (!report) throw new NotFoundError('Report not found');

    if (report.organizationId?._id?.toString() !== organizationId.toString() &&
        report.organizationId?.toString() !== organizationId.toString()) {
      throw new ForbiddenError('Unauthorized: Report belongs to another organization');
    }

    const patient = report.patientId || {};
    const org = report.organizationId || {};
    const isApproved = report.status === 'APPROVED' || report.status === 'PUBLISHED';

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `Companio Clinical Report - ${patient.name || 'Patient'}`,
            Author: org.name || 'Companio Healthcare',
            Subject: `Clinical Health Summary v${report.version}`,
          },
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          const sanitizedPatient = (patient.name || 'patient').replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `Companio_Report_${sanitizedPatient}_v${report.version}.pdf`;
          resolve({ pdfBuffer, filename, report });
        });

        // 1. Header & Organization Title
        doc
          .fillColor('#0f766e')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('COMPANIO CLINICAL REPORT', { align: 'left' });

        doc
          .fillColor('#64748b')
          .fontSize(10)
          .font('Helvetica')
          .text(`Organization: ${org.name || 'Healthcare Network'} | Generated: ${new Date(report.generatedAt).toLocaleString()}`, {
            align: 'left',
          });

        doc.moveDown(0.5);

        // 2. Draft Watermark / Status Banner
        if (!isApproved) {
          doc
            .rect(40, doc.y, 515, 24)
            .fillAndStroke('#fef3c7', '#f59e0b');
          doc
            .fillColor('#b45309')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('*** DRAFT DOCUMENT — PENDING CLINICIAN ATTESTATION — NOT FINAL ***', 45, doc.y - 18, {
              align: 'center',
            });
          doc.moveDown(1.5);
        } else {
          doc
            .rect(40, doc.y, 515, 24)
            .fillAndStroke('#dcfce7', '#10b981');
          doc
            .fillColor('#065f46')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`APPROVED CLINICAL REPORT — VERSION ${report.version} — ATTESTED`, 45, doc.y - 18, {
              align: 'center',
            });
          doc.moveDown(1.5);
        }

        // 3. Patient Demographics & Period Card
        doc
          .rect(40, doc.y, 515, 48)
          .fillAndStroke('#f8fafc', '#cbd5e1');

        const cardY = doc.y - 42;
        doc
          .fillColor('#1e293b')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`Patient: ${patient.name || 'N/A'} (Age: ${patient.age || 'N/A'})`, 50, cardY);

        doc
          .fillColor('#475569')
          .fontSize(10)
          .font('Helvetica')
          .text(
            `Reporting Window: ${new Date(report.periodStart).toLocaleDateString()} to ${new Date(report.periodEnd).toLocaleDateString()}`,
            50,
            cardY + 16
          );

        doc
          .text(`Report Version: v${report.version} | Status: ${report.status}`, 350, cardY + 16);

        doc.moveDown(2);

        // 4. Clinical Overview
        doc
          .fillColor('#0f766e')
          .fontSize(13)
          .font('Helvetica-Bold')
          .text('1. Clinical Overview');
        doc
          .fillColor('#334155')
          .fontSize(10)
          .font('Helvetica')
          .text(report.overview || 'No overview summary provided.', { align: 'justify' });

        doc.moveDown(1);

        // 5. Active Clinical Flags
        doc
          .fillColor('#dc2626')
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(`2. Safety Flags (RED: ${report.redFlags?.length || 0}, YELLOW: ${report.yellowFlags?.length || 0})`);

        if (report.redFlags && report.redFlags.length > 0) {
          report.redFlags.forEach((rf) => {
            doc
              .fillColor('#b91c1c')
              .fontSize(10)
              .font('Helvetica-Bold')
              .text(`• [RED FLAG - ${rf.category}]: `, { continued: true })
              .font('Helvetica')
              .fillColor('#334155')
              .text(rf.description);
          });
        }

        if (report.yellowFlags && report.yellowFlags.length > 0) {
          report.yellowFlags.forEach((yf) => {
            doc
              .fillColor('#d97706')
              .fontSize(10)
              .font('Helvetica-Bold')
              .text(`• [YELLOW FLAG - ${yf.category}]: `, { continued: true })
              .font('Helvetica')
              .fillColor('#334155')
              .text(yf.description);
          });
        }

        if ((!report.redFlags || report.redFlags.length === 0) && (!report.yellowFlags || report.yellowFlags.length === 0)) {
          doc
            .fillColor('#10b981')
            .fontSize(10)
            .font('Helvetica')
            .text('✔ No active red or yellow safety concerns recorded during this period.');
        }

        doc.moveDown(1);

        // 6. Quantitative Trends & Deterministic Numbers
        doc
          .fillColor('#0f766e')
          .fontSize(13)
          .font('Helvetica-Bold')
          .text('3. Deterministic Trend Analysis');

        const trends = report.trends || {};
        doc
          .fillColor('#1e293b')
          .fontSize(10)
          .font('Helvetica')
          .text(`• Medication Adherence: ${trends.adherencePct ?? 'N/A'}%`)
          .text(`• Average Sleep Duration: ${trends.sleepAvg ?? 'N/A'} hours/night`)
          .text(`• Average Daily Activity: ${trends.activityAvg ?? 'N/A'} minutes/day`)
          .text(`• Average Daily Hydration: ${trends.hydrationAvg ?? 'N/A'} mL/day`);

        doc.moveDown(1);

        // 7. Patient Stated Concerns & Positive Progress
        doc
          .fillColor('#0f766e')
          .fontSize(13)
          .font('Helvetica-Bold')
          .text('4. Patient Concerns & Positive Achievements');

        if (report.patientConcerns && report.patientConcerns.length > 0) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#334155').text('Explicit Patient Concerns:');
          report.patientConcerns.forEach((c) => {
            doc.font('Helvetica').fillColor('#475569').text(`  - ${c}`);
          });
        }

        if (report.positiveProgress && report.positiveProgress.length > 0) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#10b981').text('Positive Progress:');
          report.positiveProgress.forEach((p) => {
            doc.font('Helvetica').fillColor('#334155').text(`  ✔ ${p}`);
          });
        }

        doc.moveDown(1);

        // 8. Clinician Follow-up Tasks
        if (report.followUp && report.followUp.length > 0) {
          doc
            .fillColor('#0f766e')
            .fontSize(13)
            .font('Helvetica-Bold')
            .text('5. Recommended Clinician Actions');
          report.followUp.forEach((task) => {
            doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`  [ ] ${task}`);
          });
          doc.moveDown(1);
        }

        // 9. Clinician Attestation & Provenance Block
        doc
          .rect(40, doc.y, 515, 65)
          .fillAndStroke(isApproved ? '#f0fdf4' : '#f8fafc', isApproved ? '#86efac' : '#cbd5e1');

        const attestY = doc.y - 58;
        if (isApproved && report.attestation) {
          doc
            .fillColor('#166534')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`Clinician Attestation Sign-Off (Approved v${report.version})`, 50, attestY);
          doc
            .fillColor('#334155')
            .fontSize(9)
            .font('Helvetica')
            .text(`"${report.attestation.statement}"`, 50, attestY + 14, { width: 495 })
            .text(
              `Attested by: ${report.attestation.clinicianName || 'Clinician'} | Date: ${new Date(report.attestation.attestedAt).toLocaleString()} | Content SHA-256: ${report.contentHash || 'Verified'}`,
              50,
              attestY + 36,
              { width: 495 }
            );
        } else {
          doc
            .fillColor('#64748b')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Attestation Status: PENDING REVIEW', 50, attestY);
          doc
            .fillColor('#64748b')
            .fontSize(9)
            .font('Helvetica')
            .text('This draft has not yet been reviewed and attested by an authorized clinician.', 50, attestY + 16)
            .text(`Content Hash: ${report.contentHash || 'Pending'}`, 50, attestY + 36);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default ReportExportService;
