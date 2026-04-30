import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  SparklesIcon,
  PlayIcon,
  ArrowsPointingInIcon,
  QuestionMarkCircleIcon,
  MapIcon,
  CubeIcon,
  Square2StackIcon,
  BuildingOffice2Icon,
  CursorArrowRaysIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import useStore from '../../store/useStore';
import StudioCameraBookmarks from './StudioCameraBookmarks';

export default function EditorStudioStrip() {
  const {
    mode,
    setMode,
    cinemaChrome,
    setCinemaChrome,
    studioViewLayout,
    setStudioViewLayout,
    activeTool,
    setActiveTool,
  } = useStore(
    useShallow((s) => ({
      mode: s.mode,
      setMode: s.setMode,
      cinemaChrome: s.cinemaChrome,
      setCinemaChrome: s.setCinemaChrome,
      studioViewLayout: s.studioViewLayout,
      setStudioViewLayout: s.setStudioViewLayout,
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
    }))
  );

  const viewModes = [
    { id: 'plan', label: '2D', icon: MapIcon, title: '2D floor plan — draw walls & furnish' },
    { id: 'split', label: 'Split', icon: Square2StackIcon, title: 'Split view — 2D plan + live 3D' },
    { id: 'scene', label: '3D', icon: CubeIcon, title: '3D scene — materials & lighting' },
    {
      id: 'elevation',
      label: 'Elev',
      icon: BuildingOffice2Icon,
      title: 'Elevation — wall heights & openings (planner)',
    },
  ];

  const sceneTools = [
    { id: 'select', label: 'Select', icon: CursorArrowRaysIcon, title: 'Select (Esc)' },
    { id: 'move', label: 'Move', icon: ArrowsUpDownIcon, title: 'Move (G)' },
    { id: 'rotate', label: 'Rotate', icon: ArrowPathIcon, title: 'Rotate (R)' },
    { id: 'scale', label: 'Scale', icon: ArrowsPointingOutIcon, title: 'Scale (S)' },
  ];

  const isPresent = mode === 'preview' && !cinemaChrome;
  const isCinema = mode === 'preview' && cinemaChrome;

  const openTour = () => {
    document.dispatchEvent(new CustomEvent('novira:open-studio-tour'));
  };

  return (
    <div className="studio-context-strip" role="navigation" aria-label="Studio mode">
      <div className="studio-context-strip__brand">
        <span className="studio-context-strip__wordmark">Novira</span>
        <span className="studio-context-strip__tag">3D scene · floor plan</span>
      </div>

      <div className="studio-context-strip__center">
        <div className="studio-mode-seg studio-mode-seg--quad" role="group" aria-label="View layout (Live Home style)">
          {viewModes.map((vm) => {
            const Icon = vm.icon;
            const active = studioViewLayout === vm.id;
            return (
              <button
                key={vm.id}
                type="button"
                data-active={active}
                onClick={() => setStudioViewLayout(vm.id)}
                title={vm.title}
              >
                <span className="studio-mode-seg__label">
                  <Icon style={{ width: 15, height: 15, opacity: 0.9 }} aria-hidden />
                  <span className="studio-mode-seg__text">{vm.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <StudioCameraBookmarks />

        {(studioViewLayout === 'scene' || studioViewLayout === 'split') && mode === 'build' && (
          <div className="studio-view-tools" role="toolbar" aria-label="Transform tools">
            {sceneTools.map((t) => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`studio-view-tools__btn${active ? ' studio-view-tools__btn--active' : ''}`}
                  title={t.title}
                  aria-label={t.title}
                  aria-pressed={active}
                  onClick={() => setActiveTool(t.id)}
                >
                  <Icon style={{ width: 16, height: 16 }} aria-hidden />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="studio-mode-seg studio-mode-seg--triple" role="group" aria-label="Workspace mode">
          <button
            type="button"
            data-active={mode === 'build'}
            onClick={() => setMode('build')}
            title="Edit layout, materials, and lighting"
          >
            <span className="studio-mode-seg__label">
              <SparklesIcon style={{ width: 15, height: 15, opacity: 0.9 }} />
              Design
            </span>
          </button>
          <button
            type="button"
            data-active={isPresent}
            onClick={() => {
              setCinemaChrome(false);
              setMode('preview');
            }}
            title="Minimal UI — sidebars & HUDs hidden; asset library via pill"
          >
            <span className="studio-mode-seg__label">
              <PlayIcon style={{ width: 15, height: 15, opacity: 0.9 }} />
              Present
            </span>
          </button>
          <button
            type="button"
            data-active={isCinema}
            onClick={() => {
              setCinemaChrome(true);
              setMode('preview');
            }}
            title="Full-bleed canvas — hides top chrome; use on-screen control to exit"
          >
            <span className="studio-mode-seg__label">
              <ArrowsPointingInIcon style={{ width: 15, height: 15, opacity: 0.9 }} />
              Cinema
            </span>
          </button>
        </div>
      </div>

      <div className="studio-context-strip__actions">
        <button type="button" className="studio-icon-btn" onClick={openTour} title="Studio tour">
          <QuestionMarkCircleIcon style={{ width: 20, height: 20 }} />
        </button>
      </div>
    </div>
  );
}
