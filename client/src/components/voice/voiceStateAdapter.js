/**
 * COMPANIO VOICE STATE ADAPTER
 * 
 * Maps backend socket/dialogue protocol events to the 16 canonical UI VoiceOrb states.
 * Strictly adheres to backend capabilities without inventing undocumented network states.
 * 
 * CANONICAL VOICE ORB STATES:
 * 1.  connecting    - Upstream WebSocket/STT connection establishing (Backend: CONNECTING_STT / socket connecting)
 * 2.  consent       - Healthcare consent pre-flight check (Backend: CONSENT_CHECKED)
 * 3.  micNeeded     - [UI-ONLY] Browser microphone permission prompt or permission required
 * 4.  listening     - Active microphone streaming, awaiting patient speech (Backend: LISTENING)
 * 5.  processing    - Speech endpoint reached, deterministic keyword check (Backend: PROCESSING / STT final)
 * 6.  thinking      - Gemini LLM clinical reasoning & inference (Backend: GENERATING / voice:agent:thinking)
 * 7.  speaking      - ElevenLabs TTS audio playback active (Backend: SPEAKING / agent-audio-chunk)
 * 8.  bargeIn       - [UI-ONLY] Transient speech interruption (<150ms reset to listening)
 * 9.  paused        - Session audio capture suspended (Backend: PAUSED / voice:session:pause)
 * 10. reconnecting  - Network socket interrupted, attempting reconnect (Backend: RECONNECTING)
 * 11. recovering    - Resuming session state via cryptographic resume token (Backend: voice:session:resume)
 * 12. uncertain     - [UI-ONLY] Unacknowledged turn or recognition timeout, prompting senior to repeat
 * 13. urgent        - Clinical emergency detected (Backend: flag-created critical / safety net 911)
 * 14. readBack      - Plain-language observation confirmation before chart commit (Backend / Dialogue)
 * 15. completed     - Session successfully finalized and committed to chart (Backend: COMPLETED / FINALIZING)
 * 16. failed        - Terminal failure or unrecoverable network error (Backend: FAILED / ABORTED / voice:error)
 */

export const ORB_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONSENT: 'consent',
  MIC_NEEDED: 'micNeeded',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  BARGE_IN: 'bargeIn',
  PAUSED: 'paused',
  RECONNECTING: 'reconnecting',
  RECOVERING: 'recovering',
  UNCERTAIN: 'uncertain',
  URGENT: 'urgent',
  READ_BACK: 'readBack',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Categorization of states into Backend-driven vs UI-only
 */
export const STATE_PROVENANCE = {
  idle: 'UI_ONLY',
  connecting: 'BACKEND_SIGNAL',
  consent: 'BACKEND_SIGNAL',
  micNeeded: 'UI_ONLY',
  listening: 'BACKEND_SIGNAL',
  processing: 'BACKEND_SIGNAL',
  thinking: 'BACKEND_SIGNAL',
  speaking: 'BACKEND_SIGNAL',
  bargeIn: 'UI_ONLY',
  paused: 'BACKEND_SIGNAL',
  reconnecting: 'BACKEND_SIGNAL',
  recovering: 'BACKEND_SIGNAL',
  uncertain: 'UI_ONLY',
  urgent: 'BACKEND_SIGNAL',
  readBack: 'DIALOGUE_STEP',
  completed: 'BACKEND_SIGNAL',
  failed: 'BACKEND_SIGNAL',
};

/**
 * Standard accessible copy for each state according to Companio clinical safety requirements.
 */
export const STATE_COPY = {
  idle: "Ready when you are. Tap Start Check-in to turn on your microphone.",
  connecting: 'Connecting to your health companion...',
  consent: 'Checking healthcare consent...',
  micNeeded: 'Microphone access needed. Please tap Allow when prompted.',
  listening: "I'm listening.",
  processing: 'Processing what you said...',
  thinking: 'Let me think about that.',
  speaking: 'Companio is responding.',
  bargeIn: 'I heard you speak. Stopping audio...',
  paused: 'Check-in paused.',
  reconnecting: "Your connection was interrupted. I'm trying to reconnect.",
  recovering: 'Restoring your check-in session...',
  uncertain: "I couldn't confirm that your last answer was received. Could you please repeat it?",
  urgent: 'Emergency assistance may be required.',
  readBack: 'Please confirm what we recorded today.',
  completed: 'Your check-in is complete. You can review what we recorded.',
  failed: 'We were unable to complete the check-in. Your care team has been notified.',
};

/**
 * Maps raw backend state strings from `voice:state:change` or socket events to Orb state
 * @param {string} backendState
 * @returns {string} One of ORB_STATES
 */
export function mapBackendToOrbState(backendState) {
  if (!backendState) return ORB_STATES.LISTENING;

  switch (backendState.toUpperCase()) {
    case 'CREATED':
    case 'CONNECTING_STT':
    case 'CONNECTING':
      return ORB_STATES.CONNECTING;

    case 'CONSENT_CHECKED':
      return ORB_STATES.CONSENT;

    case 'LISTENING':
      return ORB_STATES.LISTENING;

    case 'PROCESSING':
      return ORB_STATES.PROCESSING;

    case 'GENERATING':
    case 'THINKING':
      return ORB_STATES.THINKING;

    case 'SPEAKING':
      return ORB_STATES.SPEAKING;

    case 'PAUSED':
      return ORB_STATES.PAUSED;

    case 'RECONNECTING':
      return ORB_STATES.RECONNECTING;

    case 'RECOVERING':
      return ORB_STATES.RECOVERING;

    case 'FINALIZING':
    case 'COMPLETED':
      return ORB_STATES.COMPLETED;

    case 'ABORTED':
    case 'FAILED':
      return ORB_STATES.FAILED;

    default:
      return ORB_STATES.LISTENING;
  }
}

/**
 * Maps Companio's 16+ clinical voice states into Orbloom's 6 valid OrbState values:
 * "idle" | "listening" | "thinking" | "speaking" | "success" | "error"
 *
 * @param {string} orbState
 * @returns {'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error'}
 */
export function mapCompanioToOrbloomState(orbState) {
  switch (orbState) {
    case ORB_STATES.LISTENING:
    case ORB_STATES.BARGE_IN:
    case ORB_STATES.UNCERTAIN:
      return 'listening';

    case ORB_STATES.CONNECTING:
    case ORB_STATES.PROCESSING:
    case ORB_STATES.THINKING:
    case ORB_STATES.RECONNECTING:
    case ORB_STATES.RECOVERING:
      return 'thinking';

    case ORB_STATES.SPEAKING:
      return 'speaking';

    case ORB_STATES.COMPLETED:
      return 'success';

    case ORB_STATES.URGENT:
    case ORB_STATES.FAILED:
      return 'error';

    case ORB_STATES.IDLE:
    case ORB_STATES.CONSENT:
    case ORB_STATES.MIC_NEEDED:
    case ORB_STATES.PAUSED:
    case ORB_STATES.READ_BACK:
    default:
      return 'idle';
  }
}


