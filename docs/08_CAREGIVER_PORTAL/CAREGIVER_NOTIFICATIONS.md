# 🔔 Companio — Caregiver Notification Governance & PHI Minimization (Phase 8)

**Document Reference**: `docs/08_CAREGIVER_PORTAL/CAREGIVER_NOTIFICATIONS.md`  
**Status**: ACTIVE / PRODUCTION-GRADE  
**Author**: Principal Healthcare Privacy Engineer & Communications Lead  
**Governing Standard**: HIPAA Minimum Necessary Rule (45 CFR § 164.502(b))  

---

## 1. Notification Philosophy

Caregivers often want to know whether their loved one completed their daily check-in or if an upcoming doctor appointment is approaching. However, transmitting clinical details (such as diagnosis names, specific medication dosages, or sensitive symptoms) across unencrypted communication channels like SMS, email, or mobile push notifications is a severe HIPAA violation.

Companio implements a **Strict PHI Minimization Policy** for all caregiver communications.

---

## 2. Notification Dispatch Rules

A notification is dispatched to a caregiver **only** when all of the following conditions are met:
1. `CaregiverRelationship.status === 'ACTIVE'`.
2. The caregiver's `CaregiverAccessGrant` explicitly includes the `NOTIFICATION_RECEIVE` scope.
3. The caregiver has enabled notifications for that event type in their preferences (`CaregiverNotifications.jsx`).
4. The patient has **not** revoked `CLINICIAN_SHARING` consent.

If any check fails, the notification is silently suppressed and logged to internal security monitoring.

---

## 3. PHI Minimization Rules & Content Sanitization

| Event Trigger | Unsanitized / Prohibited Content | Compliant Sanitized Dispatch |
| :--- | :--- | :--- |
| **Check-in Completed** | *"Eleanor finished check-in: reported 7h sleep, no angina, Lisinopril taken."* | *"Eleanor completed today's daily wellness check-in at 9:30 AM."* |
| **Missed Check-in** | *"Eleanor missed her 9 AM check-in. She might have fallen."* | *"Eleanor has not completed her morning check-in yet. You may want to check in on her."* |
| **Upcoming Appointment** | *"Dr. Miller appointment at Oncology clinic for breast biopsy."* | *"Upcoming consultation scheduled for tomorrow, Thursday at 2:00 PM."* |
| **Safety Net Flag Raised** | *"RED ALERT: Eleanor reported chest pain radiating to left arm."* | *"Our care team has received an urgent notification regarding Eleanor and is reaching out. If you believe this is an immediate medical emergency, please call 911."* |

---

## 4. Channels & Delivery Resilience

- **In-App Notification Feed**: Stored in `CaregiverNotification` collection, viewable in real-time at `/caregiver/notifications`.
- **SMS / Twilio**: Sent using verified alphanumeric IDs; body strictly adheres to the 160-character HIPAA-safe template.
- **Email / Resend**: Branded transactional notification with zero PHI in subject line or header. Links require authenticated portal login.

