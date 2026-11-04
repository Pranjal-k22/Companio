import { LOINC_MAPPINGS } from '../../models/Observation.js';

/**
 * FHIR R4 Standards Mapping Service
 * Provides standard-compliant transformations of Companio reports and observations
 * into HL7 FHIR Release 4 resource representations.
 */
export class FhirMappingService {
  /**
   * Transforms an internal Report document into a FHIR DiagnosticReport resource.
   *
   * @param {object} report - Report Mongoose document
   * @param {object} [patient] - Patient document
   * @param {object} [organization] - Organization document
   * @returns {object} FHIR R4 DiagnosticReport
   */
  static mapToDiagnosticReport(report, patient = null, organization = null) {
    const fhirStatus =
      report.status === 'APPROVED' || report.status === 'PUBLISHED'
        ? 'final'
        : report.status === 'AMENDED'
        ? 'amended'
        : 'preliminary';

    return {
      resourceType: 'DiagnosticReport',
      id: report._id.toString(),
      meta: {
        versionId: String(report.version || 1),
        lastUpdated: new Date(report.updatedAt || report.generatedAt).toISOString(),
      },
      status: fhirStatus,
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
              code: 'GE',
              display: 'General',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11506-3',
            display: 'Progress note',
          },
        ],
        text: 'Weekly Health and Wellness Progress Report',
      },
      subject: {
        reference: `Patient/${report.patientId?._id || report.patientId}`,
        display: patient?.name || 'Patient',
      },
      effectivePeriod: {
        start: new Date(report.periodStart).toISOString(),
        end: new Date(report.periodEnd).toISOString(),
      },
      issued: new Date(report.generatedAt).toISOString(),
      performer: report.attestation?.clinicianUserId
        ? [
            {
              reference: `Practitioner/${report.attestation.clinicianUserId}`,
              display: report.attestation.clinicianName || 'Attesting Clinician',
            },
          ]
        : [],
      conclusion: report.overview,
      presentedForm: [
        {
          contentType: 'text/plain',
          data: Buffer.from(report.overview || '').toString('base64'),
          title: `Report v${report.version}`,
        },
      ],
    };
  }

  /**
   * Transforms an atomic Observation into a FHIR Observation resource.
   *
   * @param {object} observation - Observation document
   * @returns {object} FHIR R4 Observation
   */
  static mapToObservation(observation) {
    const loinc = observation.loincMapping || LOINC_MAPPINGS[observation.observationCode] || {};

    const resource = {
      resourceType: 'Observation',
      id: observation._id.toString(),
      status: observation.status === 'VERIFIED' ? 'final' : 'preliminary',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: observation.observationCategory || 'survey',
              display: observation.observationCategory || 'Survey',
            },
          ],
        },
      ],
      code: {
        coding: loinc.code
          ? [
              {
                system: loinc.system || 'http://loinc.org',
                code: loinc.code,
                display: loinc.display || observation.observationDisplay,
              },
            ]
          : [],
        text: observation.observationDisplay,
      },
      subject: {
        reference: `Patient/${observation.patientId}`,
      },
      effectiveDateTime: new Date(observation.effectiveDateTime).toISOString(),
    };

    if (observation.valueType === 'quantity' && observation.valueQuantity?.value !== undefined) {
      resource.valueQuantity = {
        value: observation.valueQuantity.value,
        unit: observation.valueQuantity.unit || 'unit',
        system: 'http://unitsofmeasure.org',
      };
    } else if (observation.valueType === 'boolean' && observation.valueBoolean !== undefined) {
      resource.valueBoolean = observation.valueBoolean;
    } else if (observation.valueString) {
      resource.valueString = observation.valueString;
    } else if (observation.missingReason) {
      resource.dataAbsentReason = {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
            code: observation.missingReason.toLowerCase().replace(/_/g, '-'),
            display: observation.missingReason,
          },
        ],
      };
    }

    return resource;
  }
}

export default FhirMappingService;

