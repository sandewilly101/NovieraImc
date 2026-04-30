import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  CubeIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const STORAGE_KEY = 'novira-studio-tour-v2';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Novira',
    body: 'Build event mockups in 3D — venues, booths, rigging, and branding — with a workflow tuned for producers and spatial designers. Use Design, Present, or Cinema on the studio strip for editing, client-ready chrome, or full-bleed review.',
    icon: SparklesIcon,
    accent: 'linear-gradient(135deg, #a78bfa, #6366f1)',
  },
  {
    id: 'placement',
    title: 'Place and refine in 3D',
    body: 'Shift+S opens the cursor and placement menu (spawn and imports can follow the 3D cursor). On Move: Alt+arrows nudge in X/Z, Alt+PgUp/PgDn for Y. Home frames the selection; Shift+Home frames the scene. Ctrl+Shift+H isolates. Press ? anytime for shortcuts.',
    icon: ViewfinderCircleIcon,
    accent: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  },
  {
    id: 'venue',
    title: 'Start from a venue kit',
    body: 'Layout → Premade Venues: drop in a ballroom, expo hall, or corporate shell. Every wall, truss, and LED tile stays fully editable.',
    icon: CubeIcon,
    accent: 'linear-gradient(135deg, #2dd4bf, #6366f1)',
  },
  {
    id: 'branding',
    title: 'Brand the scene',
    body: 'Shading applies logos to booths and banners. Lighting for looks; Rendering for lux preview, sound zones, live cost, and 4K exports.',
    icon: PhotoIcon,
    accent: 'linear-gradient(135deg, #fbbf24, #f97316)',
  },
  {
    id: 'export',
    title: 'Ship to the client',
    body: '4K stills, walkthrough WebM, 360° cubemap ZIP or single-file equirectangular PNG, technical PDF, GLB, and in-canvas WebXR (Quest / desktop) — client-ready outputs with honest scope limits baked into the product.',
    icon: ArrowDownTrayIcon,
    accent: 'linear-gradient(135deg, #ec4899, #a78bfa)',
  },
];

const TOPICS = [
  { id: 'all', label: 'Quick full tour', description: 'Guided walkthrough of every essential area.' },
  { id: 'welcome', label: 'Getting started', description: 'Understand Novira workflow and studio modes.' },
  { id: 'placement', label: 'Placement and controls', description: 'Cursor, transform, and navigation shortcuts.' },
  { id: 'venue', label: 'Venue templates', description: 'Insert editable venue kits fast.' },
  { id: 'branding', label: 'Materials and render setup', description: 'Apply logos, lighting, and look-dev.' },
  { id: 'export', label: 'Client delivery', description: 'Choose the right output for client handoff.' },
];

export default function StudioOnboarding() {
  const [open, setOpen] = useState(false);
  const [topicId, setTopicId] = useState('all');
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('pick');

  const sequence = useMemo(() => {
    if (topicId === 'all') return STEPS;
    const hit = STEPS.find((x) => x.id === topicId);
    return hit ? [hit] : [STEPS[0]];
  }, [topicId]);

  const dismiss = useCallback((remember) => {
    if (remember) {
      try {
        localStorage.setItem(STORAGE_KEY, 'done');
        localStorage.removeItem('novira-studio-tour-v1');
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    setPhase('pick');
    setTopicId('all');
    setStep(0);
    document.dispatchEvent(new CustomEvent('novira-studio-tour-closed'));
  }, []);

  useEffect(() => {
    const onTour = () => {
      setOpen(true);
      setPhase('pick');
      setTopicId('all');
      setStep(0);
    };
    document.addEventListener('novira:open-studio-tour', onTour);
    return () => document.removeEventListener('novira:open-studio-tour', onTour);
  }, []);

  useEffect(() => {
    let t;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'done') {
        t = window.setTimeout(() => {
          setOpen(true);
          setPhase('pick');
          setTopicId('all');
          setStep(0);
        }, 1400);
      }
    } catch {
      t = window.setTimeout(() => {
        setOpen(true);
        setPhase('pick');
        setTopicId('all');
        setStep(0);
      }, 1400);
    }
    return () => clearTimeout(t);
  }, []);

  const s = sequence[step];
  const Icon = s.icon;
  const last = step === sequence.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="studio-onboard-layer"
          className="studio-onboard-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-onboard-title"
        >
          <button
            type="button"
            className="studio-onboard-backdrop"
            aria-label="Close tour"
            onClick={() => dismiss(false)}
          />
          <motion.div
            className="studio-onboard-card"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          >
            <div className="studio-onboard-card__glow" style={{ background: s.accent }} aria-hidden />
            <button type="button" className="studio-onboard-close" onClick={() => dismiss(false)} aria-label="Close">
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </button>

            <div className="studio-onboard-icon-wrap" style={{ background: s.accent }}>
              <Icon style={{ width: 28, height: 28, color: '#fff' }} />
            </div>

            <h2 id="studio-onboard-title" className="studio-onboard-title">
              {phase === 'pick' ? 'Choose what to tour' : s.title}
            </h2>
            {phase === 'pick' ? (
              <>
                <p className="studio-onboard-body">
                  Pick a topic to explore, or run the full guided tour. You can cancel anytime.
                </p>
                <div className="studio-onboard-topic-list" role="listbox" aria-label="Tour topics">
                  {TOPICS.map((topic) => {
                    const active = topicId === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        className={`studio-onboard-topic${active ? ' active' : ''}`}
                        onClick={() => setTopicId(topic.id)}
                        aria-pressed={active}
                      >
                        <span className="studio-onboard-topic__label">{topic.label}</span>
                        <span className="studio-onboard-topic__desc">{topic.description}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="studio-onboard-body">{s.body}</p>
            )}

            <div className="studio-onboard-dots" aria-hidden>
              {(phase === 'pick' ? [0] : sequence).map((_, i) => (
                <span key={i} className={`studio-onboard-dot${i === step ? ' active' : ''}`} />
              ))}
            </div>

            <div className="studio-onboard-actions">
              <button type="button" className="studio-onboard-btn ghost" onClick={() => dismiss(false)}>
                Cancel
              </button>
              {phase === 'pick' ? (
                <>
                  <button type="button" className="studio-onboard-btn ghost" onClick={() => dismiss(true)}>
                    Skip tour
                  </button>
                  <button
                    type="button"
                    className="studio-onboard-btn primary"
                    onClick={() => {
                      setStep(0);
                      setPhase('tour');
                    }}
                  >
                    Start tour
                  </button>
                </>
              ) : !last ? (
                <>
                  {step > 0 && (
                    <button type="button" className="studio-onboard-btn ghost" onClick={() => setStep((x) => x - 1)}>
                      Back
                    </button>
                  )}
                  <button type="button" className="studio-onboard-btn primary" onClick={() => setStep((x) => x + 1)}>
                    Next
                  </button>
                </>
              ) : (
                <button type="button" className="studio-onboard-btn primary" onClick={() => dismiss(true)}>
                  Start designing
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
