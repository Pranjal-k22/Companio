# Clinical Observation Data Model & LOINC Mapping

**System**: Companio Healthcare Platform  
**Document**: Observation Data Specification & Standardized Terminologies  
**Status**: Production / Phase 6 Verified  

---

## 1. Overview

The `Observation` model represents a single, atomic, validated clinical health assertion made during a Companio voice check-in or clinician interaction. It decouples atomic health measurements from monolithic check-in documents, providing full audit provenance, confidence scores, and standardized LOINC terminology mappings.

---

## 2. Schema Specification (`server/src/models/Observation.js`)

```typescript
interface Observation {
  _id: ObjectId;
  organizationId: ObjectId;         // Multi-tenant organization scoping
  patientId: ObjectId;              // Patient reference
  conversationId?: ObjectId;        // Voice conversation reference
  dialogueSessionId?: ObjectId;     // Clinical dialogue session reference
  checkinId?: ObjectId;             // Projected Checkin document reference
  turnId?: string;                  // Correlated turn identifier

  // Standardized Concept Codes
  observationCode: string;          // Internal code (e.g., 'SLEEP_DURATION')
  observationCategory: string;      // 'medication' | 'symptom' | 'sleep' | 'hydration' | etc.
  observationDisplay: string;       // Human-readable clinical label
  loincMapping?: {                  // Verified LOINC Terminology Mapping
    code: string;                   // Official LOINC identifier (e.g., '93832-4')
    display: string;                // LOINC concept name
    system: 'http://loinc.org';
  };

  // Typed Value Payloads
  valueType: 'quantity' | 'string' | 'boolean' | 'composite' | 'missing';
  valueQuantity?: {
    value: number;
    unit?: string;
    isApproximate: boolean;         // True if preceded by "about", "around", "roughly"
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueComposite?: Record<string, any>;

  // Missing Value Semantics
  missingReason?: 'NOT_ASKED' | 'DECLINED' | 'UNKNOWN' | 'UNABLE_TO_ASSESS' | 'NOT_APPLICABLE' | 'TECHNICAL_FAILURE';

  // Units
  originalUnit?: string;
  normalizedUnit?: string;

  // Provenance & Audit Trail
  sourceText?: string;              // Exact transcript utterance
  sourceType: 'PATIENT_REPORTED' | 'CLINICIAN_ENTERED' | 'DEVICE_MEASURED' | 'EXTERNAL_IMPORT' | 'SYSTEM_DERIVED';
  performerType: 'PATIENT' | 'CLINICIAN' | 'SYSTEM';
  extractionMethod: 'AI_EXTRACTED' | 'DIRECT_ASSERTION' | 'RULE_DERIVED' | 'FALLBACK_NLP';

  // Quality & Verification Lifecycle
  qualityStatus: 'VALID' | 'OUT_OF_RANGE' | 'AMBIGUOUS' | 'CONTRADICTED' | 'APPROXIMATE';
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  confirmationStatus: 'PROPOSED' | 'CONFIRMED' | 'DISPUTED' | 'RETRACTED';

  // Versioning & Non-Destructive Corrections
  supersedesObservationId?: ObjectId;
  correctionReason?: string;

  effectiveDateTime: Date;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Verified LOINC Code Mapping Registry

Companio maps internal clinical observation codes to verified, official LOINC standards:

| Internal Observation Code | LOINC Code | LOINC Display Name | System |
| :--- | :--- | :--- | :--- |
| `MED_ADHERENCE` | `59556-1` | Medication adherence | http://loinc.org |
| `SLEEP_DURATION` | `93832-4` | Sleep duration | http://loinc.org |
| `SLEEP_QUALITY` | `93831-6` | Sleep quality | http://loinc.org |
| `FLUID_INTAKE` | `9052-2` | Oral fluid intake 24 hour | http://loinc.org |
| `PHYSICAL_ACTIVITY` | `89555-7` | Physical activity [Time] Per day | http://loinc.org |
| `PAIN_SEVERITY` | `72514-3` | Pain severity - 0-10 verbal numeric rating | http://loinc.org |
| `WELLBEING_SCORE` | `71802-3` | General well-being score | http://loinc.org |
| `FALL_INCIDENT` | `87625-0` | Falls in the past year | http://loinc.org |
| `BODY_WEIGHT` | `29463-7` | Body weight | http://loinc.org |
| `SOCIAL_ISOLATION` | `93033-9` | Social isolation score | http://loinc.org |
| `MED_REFILL` | `67711-2` | Medication refill status | http://loinc.org |
| `MOBILITY_STATUS` | `89383-4` | Mobility score | http://loinc.org |
| `ACUTE_SYMPTOM` | `75325-1` | Symptom | http://loinc.org |

---

## 4. Dual-Write Projection to `Checkin` Model

To preserve backward compatibility with all existing clinician dashboards, Recharts trends, and weekly report generators, `ObservationQualityEngine.projectToCheckin()` performs an idempotent projection from confirmed `Observation` records into the `Checkin` collection:

1. `adherence`: Synthesized from `MED_ADHERENCE`.
2. `sleep`: Synthesized from `SLEEP_DURATION`.
3. `hydration`: Synthesized from `FLUID_INTAKE` (normalized from glasses to mL: $1\text{ glass} = 250\text{ mL}$).
4. `activity`: Synthesized from `PHYSICAL_ACTIVITY`.
5. `symptoms`: Synthesized from `ACUTE_SYMPTOM`.
6. `wellbeingScore`: Synthesized from `WELLBEING_SCORE`.
7. `falls`, `mobility`, `weight`: Synthesized from weekly surveillance observations.

The projection uses atomic upsert by `conversationId`, guaranteeing zero duplicate check-in documents.

