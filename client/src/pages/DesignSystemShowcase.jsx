import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Select,
  Toggle,
  Dialog,
  Toast,
  StatusBadge,
  SourceBadge,
  EmptyState,
  StatCardSkeleton,
  PatientCardSkeleton,
  VitalsChartSkeleton,
  TableSkeleton,
  InlineValidation,
  PageHeader,
  ThemeToggle,
  TextSizeToggle,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import VoiceOrb from '../components/voice/VoiceOrb';
import { ORB_STATES, STATE_COPY } from '../components/voice/voiceStateAdapter';
import {
  Mic,
  Calendar,
  Heart,
  Search,
  Bell,
  Mail,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';

export default function DesignSystemShowcase() {
  const { themeMode, resolvedTheme, fontSize } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toggleActive, setToggleActive] = useState(true);
  const [showDemoToast, setShowDemoToast] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('active');

  // VoiceOrb interactive showcase state
  const [showcaseOrbState, setShowcaseOrbState] = useState(ORB_STATES.LISTENING);
  const [simulatedAudioLevel, setSimulatedAudioLevel] = useState(0.25);
  const [orbReducedMotion, setOrbReducedMotion] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-text-body transition-colors duration-250 p-4 sm:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header & Dev Environment Controls */}
        <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-tint text-primary mb-2">
                Dev Showcase (Excluded from Prod Nav)
              </span>
              <h1 className="text-3xl font-extrabold text-text-strong">
                Companio "Bloom" Design System Showcase
              </h1>
              <p className="text-text-muted mt-1 text-sm sm:text-base">
                Verifying all shared UI primitives in Day & Night modes and 100%, 125%, 150% root font scaling.
              </p>
            </div>

            {/* Quick switcher pill controls */}
            <div className="flex flex-wrap items-center gap-4 bg-surface-sunken p-3 rounded-card border border-border">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted uppercase">Active Theme</span>
                <ThemeToggle />
              </div>
              <div className="h-10 w-[1px] bg-border hidden sm:block" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted uppercase">Zoom Level</span>
                <TextSizeToggle showLabel={false} />
              </div>
            </div>
          </div>

          {/* Active Configuration Summary Pill */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium text-text-muted">
            <span>Theme Mode: <strong className="text-text-strong uppercase">{themeMode}</strong></span>
            <span>•</span>
            <span>Resolved Visual Mode: <strong className="text-primary uppercase">{resolvedTheme}</strong></span>
            <span>•</span>
            <span>Root Font Scale: <strong className="text-text-strong">{fontSize}%</strong></span>
            <span>•</span>
            <span>Color Palette: <strong className="text-text-strong">Ivory (#EAE6DE) / Blue (#226192) / Coral (#EF8557)</strong></span>
          </div>
        </div>

        {/* Section 1: Page Header Primitive */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">1. PageHeader Primitive</h2>
            <p className="text-sm text-text-muted">Standard header for patient and clinician views.</p>
          </div>
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift">
            <PageHeader
              title="Daily Health Check-in"
              description="Review your clinical summary, vital indicators, and ongoing conversation transcript."
              badge={<StatusBadge variant="success">Active Session</StatusBadge>}
              onBack={() => {}}
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="md">Export Summary</Button>
                  <Button variant="primary" size="md" leftIcon={Mic}>Start Check-in</Button>
                </div>
              }
            />
          </div>
        </section>

        {/* Section 2: Living Fluid VoiceOrb (16 States & Real Spring Dynamics) */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">2. Living Fluid VoiceOrb (16 States)</h2>
            <p className="text-sm text-text-muted">
              Constructed only from Bloom tokens (Blue #226192, Light Blue #7FB0D8, Coral #EF8557).
              Features real spring scaling, calm idle breathing, and 16 distinct clinical states.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* VoiceOrb Visual Container */}
              <div className="flex flex-col items-center justify-center p-6 rounded-card bg-surface-sunken/60 border border-border w-full lg:w-96 shrink-0">
                <VoiceOrb
                  state={showcaseOrbState}
                  level={simulatedAudioLevel}
                  size={200}
                  reducedMotion={orbReducedMotion}
                />

                <div aria-live="polite" className="mt-4 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                    Active State: {showcaseOrbState}
                  </span>
                  <p className="text-sm font-semibold text-text-strong mt-1">
                    "{STATE_COPY[showcaseOrbState] || STATE_COPY.listening}"
                  </p>
                </div>
              </div>

              {/* State Selectors & Audio Dynamics Workbench */}
              <div className="space-y-4 flex-1 w-full">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2">
                    Select Voice State (16 Canonical States)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(ORB_STATES).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setShowcaseOrbState(st)}
                        className={`px-3 py-1.5 rounded-input text-xs font-semibold transition-all ${
                          showcaseOrbState === st
                            ? 'bg-primary text-on-primary font-bold shadow-sm'
                            : 'bg-surface-sunken text-text-body hover:bg-surface-warm hover:text-text-strong border border-border'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-input bg-surface-sunken/40 border border-border space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Audio Dynamics Simulation
                  </h4>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-text-body w-28">
                      Audio Level: {(simulatedAudioLevel * 100).toFixed(0)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={simulatedAudioLevel}
                      onChange={(e) => setSimulatedAudioLevel(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-text-muted">
                      Spring scale: breathing at 0%, expands naturally with voice volume.
                    </span>
                    <Toggle
                      label="Reduced Motion"
                      checked={orbReducedMotion}
                      onChange={setOrbReducedMotion}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Buttons & IconButtons */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">3. Buttons & Touch Ergonomics</h2>
            <p className="text-sm text-text-muted">
              Standard patient button ≥ 56px (`lg`), voice/hero button ≥ 64px (`xl`), WCAG minimum 44px (`sm`).
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">Button Variants (Size: Medium, 48px)</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="quiet">Quiet Action</Button>
                <Button variant="danger-free">Safe Reset</Button>
                <Button variant="critical" leftIcon={PhoneCall}>Call Emergency Services (911)</Button>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">Patient Touch Target Sizes</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary" size="sm">Small (44px min)</Button>
                <Button variant="primary" size="md">Medium (48px standard)</Button>
                <Button variant="primary" size="lg" leftIcon={Heart}>Patient Standard (56px)</Button>
                <Button variant="primary" size="xl" leftIcon={Mic}>Voice Check-in (64px)</Button>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">States: Loading & Disabled</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary" size="lg" isLoading>Processing...</Button>
                <Button variant="secondary" size="lg" disabled>Disabled Action</Button>
                <Button variant="quiet" size="md" disabled>Quiet Disabled</Button>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">Accessible IconButtons (Mandatory Label & Min 44px-56px Target)</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <IconButton icon={Mic} label="Microphone input" variant="primary" size="xl" />
                <IconButton icon={Heart} label="Heart vitals" variant="secondary" size="lg" />
                <IconButton icon={Bell} label="Notifications" variant="quiet" size="md" />
                <IconButton icon={Search} label="Search records" variant="quiet" size="sm" />
                <IconButton icon={RefreshCw} label="Refreshing" variant="secondary" size="lg" isLoading />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Form Controls & Inline Validation */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">4. Form Controls & Non-Red Validation</h2>
            <p className="text-sm text-text-muted">
              12px radii, visible 1px border, 3px focus ring with 2px offset. Non-red error styling for standard forms.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Eleanor Vance"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Enter patient name as registered on Medicare card."
                size="lg"
              />

              <Input
                label="Contact Email"
                placeholder="eleanor@example.com"
                leftIcon={Mail}
                error="Please enter a valid healthcare provider email address."
                size="md"
              />

              <Select
                label="Care Schedule Preference"
                options={[
                  { value: 'morning', label: 'Morning Voice Check-in (09:00 AM)' },
                  { value: 'afternoon', label: 'Afternoon Check-in (02:00 PM)' },
                  { value: 'evening', label: 'Evening Check-in (07:00 PM)' },
                ]}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                size="lg"
              />
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-input bg-surface-sunken/50 border border-border space-y-4">
                <h4 className="font-semibold text-text-strong">Switches & Preferences</h4>
                <Toggle
                  label="Daily Medication Reminders"
                  description="Receive plain-language audio prompt during morning check-in."
                  checked={toggleActive}
                  onChange={setToggleActive}
                />
                <Toggle
                  label="Caregiver Proxy Notifications"
                  description="Share approved observation summaries with verified caregiver."
                  checked={false}
                  onChange={() => {}}
                />
                <Toggle
                  label="Disabled Feature Preview"
                  description="System configuration locked by clinical supervisor."
                  checked={true}
                  disabled
                  onChange={() => {}}
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-text-strong">Inline Validation Indicators</h4>
                <div className="flex flex-col gap-2">
                  <InlineValidation type="error" message="Required field: Please select a valid appointment time." />
                  <InlineValidation type="caution" message="Caution: Medication dosage changed in the last 48 hours." />
                  <InlineValidation type="success" message="Saved to chart successfully." />
                  <InlineValidation type="info" message="Next check-in scheduled for tomorrow at 09:00 AM." />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Status Badges & Data Provenance Badges */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">5. Clinical Status & Data Provenance Badges</h2>
            <p className="text-sm text-text-muted">
              Explicit visual separation of clinical flags and transparent AI data provenance.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">Clinical Severity Badges (Icon + Label)</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <StatusBadge variant="critical">RED FLAG: Acute Shortness of Breath</StatusBadge>
                <StatusBadge variant="caution">YELLOW FLAG: Mild Dizziness</StatusBadge>
                <StatusBadge variant="success">Adherent (95%)</StatusBadge>
                <StatusBadge variant="pending">Pending Attestation</StatusBadge>
                <StatusBadge variant="info">Scheduled</StatusBadge>
                <StatusBadge variant="neutral">Draft</StatusBadge>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-strong mb-3">Healthcare Data Provenance Badges</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <SourceBadge source="PATIENT_REPORTED" />
                <SourceBadge source="LLM_EXTRACTION" />
                <SourceBadge source="CAREGIVER_REPORTED" />
                <SourceBadge source="CLINICIAN_ATTESTED" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Modal Dialog with Focus Trap & Toasts */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">6. Modal Dialog & Accessible Feedback</h2>
            <p className="text-sm text-text-muted">
              Dialog features focus trapping, Esc key handling, backdrop dismiss, and focus restoration to trigger.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary" size="lg" onClick={() => setIsDialogOpen(true)}>
                Open Accessible Dialog (Test Focus Trap)
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowDemoToast((prev) => !prev)}
              >
                {showDemoToast ? 'Hide Demo Toasts' : 'Show Demo Toasts'}
              </Button>
            </div>

            {showDemoToast && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Toast
                  variant="success"
                  title="Session Finalized"
                  message="Observations successfully saved to chart with clinician notification."
                  onClose={() => {}}
                />
                <Toast
                  variant="caution"
                  title="Caregiver Proxy Pending"
                  message="Consent authorization pending patient signature verification."
                  onClose={() => {}}
                />
                <Toast
                  variant="critical"
                  title="Safety Net Intercept"
                  message="Emergency triage rule triggered. Clinician notified via secure pager."
                  onClose={() => {}}
                />
                <Toast
                  variant="info"
                  title="Audio Worklet Initialized"
                  message="Microphone sample rate calibrated to 16,000 Hz."
                  onClose={() => {}}
                />
              </div>
            )}

            {/* Modal Dialog Instance */}
            <Dialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              title="Confirm Clinical Attestation"
              description="Review the patient observation extraction before committing it permanently to the medical record."
            >
              <div className="space-y-4">
                <div className="p-4 rounded-input bg-surface-sunken border border-border text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-strong">Extracted LOINC: 8867-4 (Heart Rate)</span>
                    <SourceBadge source="LLM_EXTRACTION" size="sm" />
                  </div>
                  <p className="text-text-body">
                    Value: <strong>74 bpm</strong> — resting cadence reported during session.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="secondary" size="md" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setIsDialogOpen(false);
                      alert('Attestation confirmed!');
                    }}
                  >
                    Confirm & Sign Chart
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
        </section>

        {/* Section 7: Empty States & Zero-Data Experience */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">7. Honest Empty States (Zero Fake Data)</h2>
            <p className="text-sm text-text-muted">
              Honest zero-state handling with actionable guidance instead of mock records.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift">
            <EmptyState
              icon={Calendar}
              title="No Upcoming Consultations"
              description="You do not have any clinical appointments scheduled for this week. You can request a tele-health appointment or complete your daily voice check-in."
              actionLabel="Schedule Appointment"
              onAction={() => alert('Schedule appointment clicked')}
              secondaryActionLabel="Start Check-in"
              onSecondaryAction={() => alert('Start check-in clicked')}
            />
          </div>
        </section>

        {/* Section 8: Skeleton Loading States */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">8. Skeleton Loading Placeholders</h2>
            <p className="text-sm text-text-muted">
              Continuous Bloom token alignment (surface-sunken / border) during async queries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCardSkeleton />
            <PatientCardSkeleton />
            <div className="md:col-span-2 lg:col-span-1">
              <VitalsChartSkeleton />
            </div>
            <div className="col-span-full bg-surface border border-border rounded-card p-6 shadow-soft-lift">
              <h4 className="text-sm font-semibold text-text-muted uppercase mb-4">Table Skeleton</h4>
              <TableSkeleton rows={3} cols={4} />
            </div>
          </div>
        </section>

        {/* Section 9: Contrast Verification Reference */}
        <section className="space-y-4 pb-12">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-bold text-text-strong">9. WCAG 2.1 Contrast Reference (Verified via npm run check:contrast)</h2>
            <p className="text-sm text-text-muted">
              All 10 semantic token pairs pass WCAG AA, with patient body copy and headings achieving WCAG AAA.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-soft-lift">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-sunken border-b border-border text-text-strong font-semibold">
                  <tr>
                    <th className="p-3">Color Pair</th>
                    <th className="p-3">Day Ratio</th>
                    <th className="p-3">Day Level</th>
                    <th className="p-3">Night Ratio</th>
                    <th className="p-3">Night Level</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs sm:text-sm">
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">text-strong on canvas</td>
                    <td className="p-3">13.29:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3">13.72:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">text-strong on surface</td>
                    <td className="p-3">14.73:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3">11.96:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">text-body on canvas</td>
                    <td className="p-3">8.33:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3">10.85:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">text-body on surface</td>
                    <td className="p-3">9.23:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3">9.46:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">text-muted on canvas</td>
                    <td className="p-3">5.80:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3">7.75:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">on-primary on primary</td>
                    <td className="p-3">6.58:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3">7.41:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">on-accent on accent (Coral)</td>
                    <td className="p-3">5.73:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3">6.64:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">critical-text on critical-bg</td>
                    <td className="p-3">5.35:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3">7.01:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-text-strong">caution-text on caution-bg</td>
                    <td className="p-3">5.71:1</td>
                    <td className="p-3"><StatusBadge variant="info" size="sm">AA</StatusBadge></td>
                    <td className="p-3">8.44:1</td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">AAA</StatusBadge></td>
                    <td className="p-3"><StatusBadge variant="success" size="sm">PASS</StatusBadge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
