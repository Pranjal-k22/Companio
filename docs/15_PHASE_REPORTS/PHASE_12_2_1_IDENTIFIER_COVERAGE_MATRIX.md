# COMPANIO — PHASE 12.2.1: IDENTIFIER COVERAGE MATRIX
## Comprehensive 18-Category HIPAA Safe Harbor (45 CFR § 164.514(b)(2)) Verification

**Document Reference:** `docs/PHASE_12_2_1_IDENTIFIER_COVERAGE_MATRIX.md`  
**Milestone:** Phase 12.2.1 — De-identification Assurance & Pilot-Safe Architecture Audit  
**Author:** Principal Privacy Engineer  
**Date:** 2026-11-04  
**Regulatory Standard:** HIPAA Privacy Rule 45 CFR § 164.514(b)(2)(i)(A)–(R)  

---

## 1. Statutory Identifier Coverage Matrix

The following matrix documents every identifier enumerated under 45 CFR § 164.514(b)(2)(i), its technical implementation in `server/src/services/privacy/deidentificationService.js`, coverage across structured database fields versus free-text clinical transcripts, verified replacement tokens, and known heuristic limitations.

| # | Safe Harbor Statutory Category | CFR Citation | Structured DB Handling | Free-Text / Narrative Regex Rule | Replacement Token | Automated Test Status | Technical Limitations & False Positive Controls |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Names** (Individual, relatives, household, employers) | § 164.514(b)(2)(i)(A) | `Patient.name`, `emergencyContact.name`, `User.name` stripped in `deidentifyPatientProfile()` | `\b${escapedName}\b` + `NAME_PREFIX_REGEX` (`Dr.`, `Mr.`, `Daughter`, `Spouse`, etc.) | `[PATIENT_NAME]` / `[REDACTED_NAME]` | **VERIFIED (Suite 1.1, Adv 1)** | Unlisted names without titles or relationship markers require Named Entity Recognition (NER); non-English names may evade English relational prefixes. |
| **2** | **Geographic Subdivisions** (Street, city, county, precinct, ZIP) | § 164.514(b)(2)(i)(B) | `Patient.address` stripped; `emergencyContact.address` omitted | `STREET_ADDRESS` (1–5 digits + roadway suffix + unit) & `ZIP` (`\b\d{5}(?:-\d{4})?\b`) | `[REDACTED_STREET_ADDRESS]`, `[REDACTED_ZIP]` | **VERIFIED (Suite 1.2, Adv 3)** | Informal city/town mentions (e.g. *"I drove to Austin"*) require gazetteer lookups; all ZIPs scrubbed regardless of the 20,000 population 3-digit exception. |
| **3** | **Date Elements** (Birth, admission, discharge, death; month & day prohibited) | § 164.514(b)(2)(i)(C) | `Patient.dob` omitted; timestamps converted to UTC year | `DATE` (slash, dash, textual month + day + year) & `MONTH_DAY` (month + day without year) | `[REDACTED_DATE]`, `[REDACTED_DATE_FRAGMENT]` | **VERIFIED (Suite 1.3, Suite 2.3)** | Relative date references (e.g. *"last Tuesday"*, *"two days ago"*) survive unless contextual NLP parser is attached; blood pressure (`120/80`) protected from slash date false positive. |
| **4** | **Ages Over 89** (Must aggregate into single category of age 90 or older) | § 164.514(b)(2)(i)(C) | `safeHarborAgeCategory(age)` returns `[AGE_90_OR_OLDER]` for any age >= 90 | Narrative age scrubbed if linked to DOB; demographic profile enforces aggregate rule | `[AGE_90_OR_OLDER]` | **VERIFIED (Negative Suite 2.1)** | Strictly forbids individual 5-year cohorts above 89 (`[AGE_90_94]`, `[AGE_95_99]`). Verified for ages 90, 91, 94, 95, 99, 100, 105, 110. |
| **5** | **Telephone Numbers** | § 164.514(b)(2)(i)(D) | `Patient.contact.phone`, `emergencyContact.phone` stripped | `PHONE_OR_FAX` (NANP & international with country codes, parens, dashes, dots, extensions) | `[REDACTED_PHONE]` | **VERIFIED (Suite 1.5, Adv 2)** | Clinical ratios (e.g. *"120/80 mmHg"*, *"5/10 pain"*) protected by requiring standard 10/11-digit telephone formatting and valid area code boundaries. |
| **6** | **Fax Numbers** | § 164.514(b)(2)(i)(E) | No structured fax field stored in schema | Evaluated via `PHONE_OR_FAX` and fax prefix matching | `[REDACTED_PHONE]` | **VERIFIED (Suite 1.6)** | Shares telecom pattern space with telephone numbers; prefixed mentions (`Fax: (800)...`) neutralized. |
| **7** | **Email Addresses** | § 164.514(b)(2)(i)(F) | `Patient.contact.email` stripped from profiles | RFC 5322 standard email regex: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi` | `[REDACTED_EMAIL]` | **VERIFIED (Suite 1.7)** | Obfuscated emails (e.g. *"user [at] domain [dot] com"*) evade standard regex unless lexical normalizer precedes. |
| **8** | **Social Security Numbers** | § 164.514(b)(2)(i)(G) | Never collected or stored in database models | Standard 9-digit SSN regex (`\b\d{3}-\d{2}-\d{4}\b` and `\bSSN[\s:#]*\d{9}\b`) | `[REDACTED_SSN]` | **VERIFIED (Suite 1.8, Adv 3)** | Evaluated before telephone numbers to prevent 9/10-digit collision; continuous 9-digit numbers without prefix require context. |
| **9** | **Medical Record Numbers (MRN)** | § 164.514(b)(2)(i)(H) | Stripped from external contexts; stored in internal clinical audit only | Prefixed alphanumeric patterns: `MRN`, `REC`, `CHART`, `EHR`, `PATIENT_ID` + 6–14 chars | `[REDACTED_MRN]` | **VERIFIED (Suite 1.9)** | Non-prefixed raw numerical hospital record numbers (e.g. standalone 8-digit integers) cannot be distinguished from measurements without semantic ontology. |
| **10** | **Health Plan Beneficiary Numbers** | § 164.514(b)(2)(i)(I) | No insurance identifiers stored in Companio core schemas | Patterns for Medicare Beneficiary Identifiers (MBI: `1EG4-TE5-MK72`), Medicaid IDs, policy tokens | `[REDACTED_HEALTH_PLAN_ID]` | **VERIFIED (Suite 1.10)** | Supports hyphenated and continuous MBI formats; private insurer group numbers with arbitrary prefixes require prefix matching. |
| **11** | **Account Numbers** | § 164.514(b)(2)(i)(J) | Financial billing tables omitted from platform scope | Prefixed billing accounts (`ACCT`, `ACCOUNT` + 8–16 digits) and 16-digit credit card patterns | `[REDACTED_ACCOUNT]` | **VERIFIED (Suite 1.11)** | Bank routing numbers (ABA) require specialized 9-digit checksum validation. |
| **12** | **Certificate & License Numbers** | § 164.514(b)(2)(i)(K) | Clinician NPI stored in `User.npi`; stripped from patient payloads | State driver licenses (`DL`, `LIC` + 8–12 chars) and 10-digit National Provider Identifiers (NPI) | `[REDACTED_LICENSE]` | **VERIFIED (Suite 1.12)** | State driver license formatting varies across 50 jurisdictions; un-prefixed driver license numbers evade regex. |
| **13** | **Vehicle Identifiers** (VIN, License Plates) | § 164.514(b)(2)(i)(L) | Omitted from platform schemas | 17-character standard ISO 3779 VIN regex and license plate tokens | `[REDACTED_VEHICLE_ID]` | **VERIFIED (Suite 1.13)** | Unprefixed license plates (e.g. *"7XYZ890"*) cannot be distinguished from passwords or product SKUs without prefix `Plate:`. |
| **14** | **Device Identifiers & Serial Numbers** | § 164.514(b)(2)(i)(M) | Hardware IDs stored only in device streaming adapters | EUI-48 MAC addresses (`[0-9A-Fa-f]{2}[:-]{5}`), Pacemaker/UDI serial numbers | `[REDACTED_DEVICE_ID]` | **VERIFIED (Suite 1.14)** | Consumer wearable Bluetooth identifiers (UUIDs) covered under unique code category. |
| **15** | **Web URLs** | § 164.514(b)(2)(i)(N) | Not permitted in patient check-in entries | Standard URL regex (`https?://`, `ftp://`, `www.`) | `[REDACTED_URL]` | **VERIFIED (Suite 1.15)** | Authorized internal portal authentication link (`https://app.companio.health/clinician/triage`) whitelisted in pre-flight firewall; all others scrubbed. |
| **16** | **Internet Protocol (IP) Addresses** | § 164.514(b)(2)(i)(O) | `ConsentRecord.ipAddress` stored in audit collection; stripped from exports | IPv4 dotted-quad (`0-255.0-255.0-255.0-255`) and standard IPv6 8-group hex addresses | `[REDACTED_IP]` | **VERIFIED (Suite 1.16)** | Local loopback addresses (`127.0.0.1`, `::1`) in dev logs scrubbed identically to public routable IPs. |
| **17** | **Biometric Identifiers** (Voiceprints, Fingerprints) | § 164.514(b)(2)(i)(P) | Audio chunks downsampled in memory; raw audio persistence strictly disabled (`AUDIO_RETENTION_MODE=disabled`) | Mentions of biometric recordings (`voiceprint_01.wav`, `fingerprint`, `retinal scan`) | `[REDACTED_IMAGE_OR_BIOMETRIC]` | **VERIFIED (Suite 1.17)** | Streaming live voice audio to AssemblyAI is inherently biometric. Safe Harbor cannot de-identify voice audio without pitch shifting/distortion that destroys clinical prosody. |
| **18** | **Full Face Photographs & Comparable Images** | § 164.514(b)(2)(i)(Q) | No facial images stored; avatar uploads disabled in patient portal | Photographic file extensions (`.jpg`, `.jpeg`, `.png`, `.tiff`) and image references | `[REDACTED_IMAGE_OR_BIOMETRIC]` | **VERIFIED (Suite 1.18)** | Image metadata (EXIF GPS coordinates) stripped if any binary attachments are processed. |
| **19** | **Any Other Unique Identifying Characteristic or Code** | § 164.514(b)(2)(i)(R) & § 164.514(c) | MongoDB 24-char ObjectIds replaced with 45 CFR § 164.514(c) compliant HMAC tokens | `DATABASE_OBJECTID` (`\b[0-9a-fA-F]{24}\b`) & standard UUID regex | `[REDACTED_RECORD_ID]`, `[REDACTED_UUID]` | **VERIFIED (Suite 1.19, Suite 3.1)** | Raw MongoDB ObjectIds embed 32-bit creation timestamps and machine IDs; outbound notification payloads must NEVER transmit raw ObjectIds. |

---

## 2. Analysis: Structured Data vs. Free-Text Content

### 2.1 Structured Data Fields
Structured database collections in Companio (`patients`, `checkins`, `flags`, `reports`, `users`, `consents`) offer high determinism:
- Direct PII attributes (`name`, `contact.phone`, `contact.email`, `emergencyContact`) are isolated in known schema paths.
- Generalization functions (`deidentifyPatientProfile()`) deterministically discard unneeded properties via explicit field whitelisting rather than blacklisting.
- **Risk Level:** **LOW** when strict schema whitelisting is maintained.

### 2.2 Free-Text Clinical Narratives & Voice Transcripts
Transcripts produced by AssemblyAI and clinical observation notes contain unconstrained natural language:
- Patients freely speak personal anecdotes, family names, geographic landmarks, and dates.
- Heuristic regex matching reliably captures formatted identifiers (phones, SSNs, emails, standard dates, zip codes).
- **Vulnerability:** Contextual identifiers lacking distinct lexical formatting (e.g. *"I was talking to my daughter Sarah who lives near the old mill in Austin"*) can evade regex rules if the name is not in `options.patientName` or `options.customNames`.
- **Risk Level:** **HIGH** without signed Business Associate Agreements (BAAs) with external LLM and speech providers.

---

## 3. Statutory Conclusion

The implementation in `server/src/services/privacy/deidentificationService.js` actively addresses all 18 HIPAA Safe Harbor categories. However, because heuristic regex and dictionary matching on free-text narratives can never provide mathematical certainty of zero residual contextual identifiers, **the system cannot be claimed as an independently assessed Safe Harbor or Expert Determination implementation**. It operates as a vital **defense-in-depth data minimization layer** while the platform remains locked in **synthetic-data mode**.

