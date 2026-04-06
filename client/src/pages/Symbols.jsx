// DORMANT — not linked from navigation. Candidate for deletion.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { quickTagDream, generatePersonalThemes, hasApiKey } from '../lib/ai';
import { format, parseISO } from 'date-fns';

// ── SVG Icon Components ──────────────────────────────────────────────────────

function ShadowIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="shad-g" cx="50%" cy="85%" r="45%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="88" rx="34" ry="10" fill="url(#shad-g)" />
      <ellipse cx="50" cy="30" rx="11" ry="11" fill={color} fillOpacity="0.68" />
      <path d="M33 92 C36 62 42 55 50 52 C58 55 64 62 67 92Z" fill={color} fillOpacity="0.55" />
      <path d="M28 78 Q20 72 22 64" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35" />
      <path d="M72 78 Q80 72 78 64" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.25" />
      <path d="M25 86 Q16 80 18 70" stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.18" />
    </svg>
  );
}

function AnimusIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="44" y="35" width="12" height="50" fill={color} fillOpacity="0.4" rx="1" />
      <rect x="43" y="30" width="5" height="7" fill={color} fillOpacity="0.5" rx="0.5" />
      <rect x="50" y="29" width="6" height="8" fill={color} fillOpacity="0.5" rx="0.5" />
      <rect x="58" y="30" width="5" height="7" fill={color} fillOpacity="0.5" rx="0.5" />
      <line x1="35" y1="85" x2="65" y2="85" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="50" y1="28" x2="43" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="50" y1="28" x2="46" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="50" y1="28" x2="50" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="50" y1="28" x2="54" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="50" y1="28" x2="57" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}

function AnimaIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M38 28 A22 22 0 1 0 38 72 A22 22 0 1 0 38 28Z" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M62 28 A22 22 0 1 0 62 72 A22 22 0 1 0 62 28Z" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
      <path d="M50 28 C63 35 63 65 50 72 C55 65 55 35 50 28Z" fill={color} fillOpacity="0.55" />
      <path d="M50 28 C37 35 37 65 50 72 C45 65 45 35 50 28Z" fill={color} fillOpacity="0.28" />
      <circle cx="50" cy="31" r="3" fill={color} fillOpacity="0.65" />
      <circle cx="50" cy="69" r="2.5" fill={color} fillOpacity="0.55" />
    </svg>
  );
}

function GreatMotherIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M54 18 C47 22 43 31 45 40 C43 33 47 25 54 21 C61 21 67 30 65 40 C68 30 61 18 54 18Z" fill={color} fillOpacity="0.58" />
      <path d="M30 88 C28 68 33 50 50 45 C67 50 72 68 70 88Z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      <ellipse cx="50" cy="68" rx="19" ry="14" fill={color} fillOpacity="0.18" />
      <path d="M36 51 Q50 44 64 51" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M35 88 Q28 96 22 92" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <path d="M50 88 Q50 98 50 95" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
      <path d="M65 88 Q72 96 78 92" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
  );
}

function WiseGuideIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="wise-g" cx="70%" cy="36%" r="30%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="36" rx="14" ry="14" fill="url(#wise-g)" />
      <path d="M38 90 Q40 58 50 50 Q60 58 62 90Z" fill={color} fillOpacity="0.42" />
      <ellipse cx="50" cy="38" rx="9" ry="9" fill={color} fillOpacity="0.6" />
      <path d="M38 50 Q36 43 42 38 Q50 30 58 38 Q64 43 62 50 Q55 46 50 48 Q45 46 38 50Z" fill={color} fillOpacity="0.2" />
      <line x1="66" y1="88" x2="70" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="70" cy="36" r="6" fill={color} fillOpacity="0.5" />
      <circle cx="70" cy="36" r="3.5" fill={color} fillOpacity="0.7" />
    </svg>
  );
}

function ChildIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="child-g" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="42" ry="42" fill="url(#child-g)" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
        const rad = angle * Math.PI / 180;
        return (
          <line
            key={angle}
            x1={50 + 26 * Math.cos(rad)} y1={50 + 26 * Math.sin(rad)}
            x2={50 + 40 * Math.cos(rad)} y2={50 + 40 * Math.sin(rad)}
            stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.35"
          />
        );
      })}
      <circle cx="50" cy="38" r="12" fill={color} fillOpacity="0.5" />
      <ellipse cx="50" cy="62" rx="9" ry="12" fill={color} fillOpacity="0.35" />
    </svg>
  );
}

function TricksterIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path
        d="M50 50 C50 44 55 40 60 42 C66 44 68 50 65 55 C62 60 56 61 51 58 C45 55 43 49 46 43 C49 37 56 34 63 36 C71 38 75 46 73 54 C71 62 64 67 56 66 C47 65 41 58 40 49 C39 40 44 31 53 28 C62 25 72 29 77 38"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7"
      />
      <path d="M15 80 L22 70 L30 80 L38 70 L46 80" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <path d="M72 20 L78 26 L72 32 L66 26Z" fill={color} fillOpacity="0.45" />
    </svg>
  );
}

function SelfIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="self-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#self-g)" />
      <circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" strokeOpacity="0.5" fillOpacity="0" />
      <circle cx="50" cy="50" r="18" stroke={color} strokeWidth="1.5" strokeOpacity="0.45" fillOpacity="0" />
      <circle cx="50" cy="50" r="7" fill={color} fillOpacity="0.65" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const rad = angle * Math.PI / 180;
        return (
          <line
            key={angle}
            x1={50 + 8 * Math.cos(rad)} y1={50 + 8 * Math.sin(rad)}
            x2={50 + 30 * Math.cos(rad)} y2={50 + 30 * Math.sin(rad)}
            stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4"
          />
        );
      })}
    </svg>
  );
}

function AnimalsIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="50" cy="64" rx="19" ry="16" fill={color} fillOpacity="0.5" />
      <ellipse cx="30" cy="46" rx="10" ry="9" fill={color} fillOpacity="0.42" />
      <ellipse cx="44" cy="46" rx="10" ry="9" fill={color} fillOpacity="0.42" />
      <ellipse cx="58" cy="46" rx="10" ry="9" fill={color} fillOpacity="0.42" />
      <ellipse cx="72" cy="46" rx="10" ry="9" fill={color} fillOpacity="0.42" />
      <line x1="28" y1="35" x2="26" y2="29" stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="50" y1="35" x2="50" y2="28" stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="72" y1="35" x2="74" y2="29" stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
    </svg>
  );
}

function BodyIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="body-g" cx="50%" cy="55%" r="45%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="38" ry="32" fill="url(#body-g)" />
      <path d="M50 70 C30 57 22 44 28 34 C32 27 40 25 46 30 C48 32 50 35 50 35 C50 35 52 32 54 30 C60 25 68 27 72 34 C78 44 70 57 50 70Z" fill={color} fillOpacity="0.58" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const rad = angle * Math.PI / 180;
        return (
          <line
            key={angle}
            x1={50 + 34 * Math.cos(rad)} y1={50 + 34 * Math.sin(rad)}
            x2={50 + 44 * Math.cos(rad)} y2={50 + 44 * Math.sin(rad)}
            stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.3"
          />
        );
      })}
    </svg>
  );
}

function JourneysIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M12 85 Q24 78 36 87 Q48 96 60 80 Q72 64 84 70 Q92 74 95 62" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M12 85 Q24 78 36 87 Q48 96 60 80 Q72 64 84 70 Q92 74 95 62" stroke={color} strokeWidth="1" strokeLinecap="round" strokeDasharray="3 5" strokeOpacity="0.25" />
      <path d="M80 38 Q88 30 96 38 L96 52 L80 52Z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="18" y1="72" x2="18" y2="62" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.45" />
      <ellipse cx="18" cy="58" rx="5" ry="6" fill={color} fillOpacity="0.3" />
      <line x1="28" y1="72" x2="28" y2="64" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.45" />
      <ellipse cx="28" cy="60" rx="4" ry="5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

function HousesIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="22" y="52" width="56" height="38" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M15 55 L50 18 L85 55Z" fill={color} fillOpacity="0.38" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <rect x="40" y="58" width="20" height="18" rx="2" fill={color} fillOpacity="0.55" />
      <rect x="40" y="58" width="20" height="18" rx="2" fill="white" fillOpacity="0.28" />
      <line x1="50" y1="58" x2="50" y2="76" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="40" y1="67" x2="60" y2="67" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      <rect x="43" y="76" width="14" height="14" rx="1" fill={color} fillOpacity="0.38" />
    </svg>
  );
}

function NatureIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="24" cy="30" rx="12" ry="7" fill={color} fillOpacity="0.35" />
      <ellipse cx="32" cy="27" rx="9" ry="6" fill={color} fillOpacity="0.3" />
      <path d="M68 22 C64 30 58 34 60 42 C62 46 65 47 68 45 C71 47 74 46 76 42 C78 34 72 30 68 22Z" fill={color} fillOpacity="0.5" />
      <path d="M12 82 L26 62 L40 82Z" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M60 72 Q68 65 76 72 Q84 79 92 72" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.55" />
      <circle cx="50" cy="50" r="8" stroke={color} strokeWidth="1" strokeOpacity="0.2" fillOpacity="0" />
    </svg>
  );
}

function TransformationIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="trans-g" cx="50%" cy="90%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="88" rx="30" ry="10" fill="url(#trans-g)" />
      <path d="M50 20 C42 33 30 40 33 54 C36 62 44 66 50 64 C56 66 64 62 67 54 C70 40 58 33 50 20Z" fill={color} fillOpacity="0.62" />
      <path d="M50 26 C44 36 35 42 37 53 C39 59 45 63 50 61 C55 63 61 59 63 53 C65 42 56 36 50 26Z" fill="white" fillOpacity="0.28" />
      <path d="M33 60 C26 55 22 62 26 70" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M67 60 C74 55 78 62 74 70" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

function EmotionsIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M8 58 Q20 43 32 58 Q44 73 56 58 Q68 43 80 58 Q88 67 95 60" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M8 72 Q20 57 32 72 Q44 87 56 72 Q68 57 80 72 Q88 81 95 74" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.28" />
      <path d="M50 30 C55 24 63 26 63 33 C63 41 55 44 47 40 C39 36 37 28 42 22 C47 16 56 15 63 19 C70 23 73 33 69 41" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.48" />
    </svg>
  );
}

function RelationalIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="38" cy="50" r="24" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="62" cy="50" r="24" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
      <circle cx="30" cy="50" r="3" fill={color} fillOpacity="0.5" />
      <circle cx="70" cy="50" r="3" fill={color} fillOpacity="0.5" />
      <circle cx="50" cy="50" r="3" fill={color} fillOpacity="0.6" />
    </svg>
  );
}

function VoiceIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M28 45 Q50 33 72 45 Q75 60 68 70 Q50 80 32 70 Q25 60 28 45Z" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <path d="M35 52 Q50 44 65 52 Q68 62 60 70 Q50 75 40 70 Q32 62 35 52Z" fill={color} fillOpacity="0.5" />
      <path d="M78 53 A6 6 0 0 1 78 67" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M83 47 A12 12 0 0 1 83 73" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.45" />
      <path d="M88 41 A18 18 0 0 1 88 79" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35" />
      <ellipse cx="50" cy="66" rx="8" ry="4" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

function BelongingIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="50" cy="38" rx="7" ry="7" fill={color} fillOpacity="0.6" />
      <ellipse cx="50" cy="56" rx="5" ry="9" fill={color} fillOpacity="0.5" />
      <circle cx="50" cy="50" r="32" stroke={color} strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.3" fillOpacity="0" />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = angle * Math.PI / 180;
        const cx = 50 + 30 * Math.cos(rad);
        const cy = 50 + 30 * Math.sin(rad);
        return (
          <g key={i}>
            <line x1="50" y1="50" x2={cx} y2={cy} stroke={color} strokeWidth="1" strokeOpacity="0.15" />
            <circle cx={cx} cy={cy - 4} r="4" fill={color} fillOpacity="0.42" />
            <ellipse cx={cx} cy={cy + 4} rx="3" ry="4.5" fill={color} fillOpacity="0.32" />
          </g>
        );
      })}
    </svg>
  );
}

function FeminineIcon({ color }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <radialGradient id="fem-g" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="30" ry="28" fill="url(#fem-g)" />
      <path d="M42 88 Q38 68 40 58 Q44 50 50 46 Q56 50 60 58 Q62 68 58 88Z" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
      <ellipse cx="50" cy="35" rx="10" ry="10" fill={color} fillOpacity="0.55" />
      <path d="M44 56 Q35 48 22 38" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
      <path d="M56 56 Q65 48 78 38" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
      <circle cx="20" cy="34" r="2.5" fill={color} fillOpacity="0.6" />
      <circle cx="50" cy="18" r="2.5" fill={color} fillOpacity="0.6" />
      <circle cx="80" cy="34" r="2.5" fill={color} fillOpacity="0.6" />
    </svg>
  );
}

function OtherIcon({ color }) {
  const dots = [
    { cx: 28, cy: 32, r: 3.5 },
    { cx: 50, cy: 22, r: 2.5 },
    { cx: 72, cy: 35, r: 4 },
    { cx: 62, cy: 58, r: 3 },
    { cx: 38, cy: 65, r: 4.5 },
    { cx: 20, cy: 55, r: 2 },
    { cx: 80, cy: 62, r: 3 },
    { cx: 55, cy: 80, r: 2.5 },
  ];
  const lines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [3, 7],
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {lines.map(([a, b], i) => (
        <line key={i}
          x1={dots[a].cx} y1={dots[a].cy}
          x2={dots[b].cx} y2={dots[b].cy}
          stroke={color} strokeWidth="1" strokeOpacity="0.28"
        />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} fillOpacity="0.55" />
      ))}
    </svg>
  );
}

// ── Matching helpers ──────────────────────────────────────────────────────────

function containsWholeWord(tag, words) {
  return words.some(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + 's?\\b', 'i').test(tag);
  });
}

function exactMatch(tag, words) {
  const t = tag.toLowerCase().trim();
  return words.some(w => t === w.toLowerCase() || t === 'the ' + w.toLowerCase());
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key: 'shadow', label: 'The Shadow', color: '#3d2b4a', Icon: ShadowIcon,
    match: t => containsWholeWord(t, [
      'shadow','darkness','dark figure','villain','monster','enemy','threat',
      'shame','hidden','repressed','suppressed','denied','rejected','feared',
      'stalker','pursuer','being chased','nightmare','sinister','evil figure',
      'dark side','shadow self','shadow work',
    ]) && !containsWholeWord(t, ['shadowing','foreshadow']),
  },
  {
    key: 'animus', label: 'The Animus', color: '#4a5c7c', Icon: AnimusIcon,
    match: t => containsWholeWord(t, [
      'animus','wise old man','wise man','authority figure','authority conflict',
      'authority failure','king','warrior','father figure','male guide',
      'stage manager','conductor','mentor figure','assertion',
      'lovemaking','romantic idealization',
    ]) || exactMatch(t, ['hero','the hero','animus','wise old man','authority',
      'masculine energy','inner masculine']),
  },
  {
    key: 'anima', label: 'The Anima', color: '#c9748a', Icon: AnimaIcon,
    match: t => containsWholeWord(t, [
      'anima','muse','beloved','enchantress','moon goddess',
      'mysterious woman','inner feminine','soul image','creative feminine',
      'feminine guide','girls as future self',
    ]) || exactMatch(t, ['anima','the anima','feminine soul','inner woman']),
  },
  {
    key: 'great-mother', label: 'The Great Mother', color: '#4a7c74', Icon: GreatMotherIcon,
    match: t => containsWholeWord(t, [
      'great mother','earth mother','mother archetype','devouring mother',
      'nurturing mother','womb','fertile','abundant','nourishment','container',
      'mother figure','grandmother figure','caretaking','caregiver',
    ]) || exactMatch(t, ['caretaking','nourishment','mother wound']),
  },
  {
    key: 'wise-guide', label: 'The Wise Guide', color: '#7c5c3a', Icon: WiseGuideIcon,
    match: t => containsWholeWord(t, [
      'wise woman','wise guide','oracle','spiritual guide',
      'therapist figure','teacher figure','magical helper',
      'transformed mentor','inner voice of reason','sage','elder',
    ]) || exactMatch(t, ['wise woman','wise guide','the wise woman',
      'wise old woman','transformed mentor']),
  },
  {
    key: 'child', label: 'The Child', color: '#c9974a', Icon: ChildIcon,
    match: t => containsWholeWord(t, [
      'inner child','divine child','magical child','wounded child','child archetype',
      'childlike wonder','innocence','vulnerability','playfulness',
      'little girl','little boy',
    ]) || exactMatch(t, ['inner child','child archetype','divine child','wounded child']),
  },
  {
    key: 'trickster', label: 'The Trickster', color: '#c96a4a', Icon: TricksterIcon,
    match: t => containsWholeWord(t, [
      'trickster','chaos energy','necessary chaos','chaotic','paradox',
      'unexpected reversal','disruption','interference','shape-shift','fool',
      'coyote energy','trickster energy','scapegoat','scapegoating',
    ]) || exactMatch(t, ['trickster','the trickster','chaos','paradox',
      'necessary chaos','scapegoat','scapegoating']),
  },
  {
    key: 'self', label: 'The Self', color: '#b8924a', Icon: SelfIcon,
    match: t => containsWholeWord(t, [
      'individuation','wholeness','mandala','integration','transcendence',
      'divine light','sacred','radiance','holy','completion','unity',
      'higher self','true self','authentic self','self realization',
    ]) || exactMatch(t, ['the self','individuation','wholeness','integration',
      'authentic self','true self']),
  },
  {
    key: 'animals', label: 'Animals & Creatures', color: '#5a7c4a', Icon: AnimalsIcon,
    match: t => {
      const ANIMALS = [
        'snake','wolf','bird','horse','cat','dog','bear','deer','spider',
        'fox','lion','tiger','fish','owl','rabbit','rat','dolphin','whale',
        'crow','raven','eagle','hawk','butterfly','dragon','coyote','frog',
        'turtle','bat','bee','ant','mouse','pig','cow','bull','sheep','lamb',
        'elephant','swan','duck','parrot','squirrel','raccoon','peacock',
        'sparrow','robin','hummingbird','stag','puppy','kitten','cub','foal',
        'alligator','crocodile','jaguar','panther','cheetah','zebra','giraffe',
        'hippo','gorilla','monkey','penguin','seal','otter','beaver','badger',
        'hedgehog','porcupine','skunk','lynx','bobcat','cougar','moose',
        'bison','buffalo','boar','goat','ram','rooster','hen','turkey','goose',
        'pigeon','dove','vulture','falcon','osprey','heron','crane','stork',
        'flamingo','toucan','macaw','cockatoo','canary','finch','swallow',
        'wren','thrush','magpie','jay','starling','nightingale','caterpillar',
        'moth','dragonfly','firefly','ladybug','grasshopper','cricket',
        'scorpion','tarantula','crab','lobster','octopus','squid','jellyfish',
        'seahorse','shark','salmon','trout','bass','carp','willow bird',
        'killer whale','black snake','white snake','pink snake','blue bird',
        'ducklings','black bird',
      ];
      return ANIMALS.some(a =>
        new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'i').test(t)
      );
    },
  },
  {
    key: 'body', label: 'The Body', color: '#9a4a4a', Icon: BodyIcon,
    match: t => {
      const BODY = [
        'blood','wound','healing','birth','death','pregnancy','pregnant',
        'illness','pain','hunger','breath','breathing','hands','heart',
        'stomach','throat','chest','skin','bones','bone','hair','teeth','tooth',
        'legs','arms','feet','foot','flesh','scar','surgery','organs','spine',
        'head','face','eyes','mouth','body','dying','dead body','severed',
        'bare feet','heart pain','body wisdom','wound healing','death anxiety',
        'cancer','physical','somatic','embodied','sensory','numb','paralyzed',
        'frozen body','sleep paralysis','muscle','brain','gut','belly','womb',
        'back','shoulder','neck','knee','ankle','elbow','wrist','finger','toe',
        'nail','lip','tongue','ear','nose','forehead','chin','jaw','cheek',
        'breast','hip','pelvis','reproductive','menstrual','visceral',
        'brown skin','long hair','blue head',
      ];
      return BODY.some(w =>
        new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'i').test(t)
      );
    },
  },
  {
    key: 'journeys', label: 'Thresholds & Journeys', color: '#6b4d80', Icon: JourneysIcon,
    match: t => containsWholeWord(t, [
      'door','bridge','road','forest','path','cave','stairs','staircase',
      'threshold','crossing','travel','flying','falling','running','lost',
      'maze','corridor','tunnel','passage','gate','portal','journey','quest',
      'wandering','descending','ascending','climbing','swimming','driving',
      'leaving','arriving','escape','pursuit','being chased','running away',
      'elevator','ladder','descent','ascent','underworld','vortex','rabbit hole',
    ]),
  },
  {
    key: 'structures', label: 'Structures & Spaces', color: '#5c6b7c', Icon: HousesIcon,
    match: t => containsWholeWord(t, [
      'house','room','basement','attic','school','hospital','church','theater',
      'theatre','prison','hotel','garden','city','building','office','store',
      'market','library','museum','castle','palace','apartment','childhood home',
      'old house','unfamiliar building','bathroom','kitchen','bedroom',
      'classroom','cathedral','temple','sanctuary','stadium','warehouse',
      'factory','laboratory','cabin','cottage','mansion','estate','campus',
      'neighborhood','village','town','street','alley','plaza','courtyard',
      'tower','hallway','windowless',
    ]),
  },
  {
    key: 'nature', label: 'Natural Elements', color: '#4a7c5c', Icon: NatureIcon,
    match: t => containsWholeWord(t, [
      'water','fire','earth','air','storm','flood','earthquake','mountain',
      'ocean','river','lake','rain','snow','ice','wind','lightning','thunder',
      'sun','moon','stars','sky','clouds','seasons','spring','summer',
      'autumn','winter','nature','landscape','weather','volcano','lava',
      'tornado','hurricane','tsunami','avalanche','desert','jungle','swamp',
      'marsh','meadow','field','cliff','valley','canyon','waterfall','mist',
      'fog','rainbow','aurora','eclipse','comet','meteor','galaxy','cosmos',
    ]),
  },
  {
    key: 'transformation', label: 'Transformation', color: '#c97a3a', Icon: TransformationIcon,
    match: t => containsWholeWord(t, [
      'transformation','metamorphosis','dissolving','explosion','destruction',
      'renewal','rebirth','dying and rising','phoenix','cocoon','chrysalis',
      'emerging','shedding','molting','shapeshifting','transmutation','alchemy',
      'death rebirth','purification','initiation','awakening','enlightenment',
      'breakthrough','collapse','crumbling','disintegration','resurrection',
      'transfiguration',
    ]),
  },
  {
    key: 'emotions', label: 'Core Emotions', color: '#9a6a7a', Icon: EmotionsIcon,
    match: t => {
      const EMOTIONS = [
        'grief','joy','rage','fear','shame','love','longing','despair','wonder',
        'peace','anxiety','terror','ecstasy','confusion','hope','guilt','pride',
        'envy','jealousy','awe','dread','loneliness','freedom','trapped',
        'abandoned','cherished','betrayed','forgiven','lost','found','empty',
        'alive','numb','anger','sadness','happiness','excitement','boredom',
        'frustration','satisfaction','disappointment','relief','surprise',
        'disgust','admiration','hatred','resentment','gratitude','compassion',
        'regret','remorse','nostalgia','euphoria','melancholy','apathy',
        'enthusiasm','passion','desire','tenderness','affection','devotion',
        'humility','vulnerability','courage','resilience','exhaustion',
        'overwhelm','powerlessness','liberation','isolation','connection',
        'rejection','acceptance','worthiness','inadequacy','trust','safety',
        'danger','intimacy','clarity','uncertainty','contentment','restlessness',
      ];
      const words = t.trim().split(/\s+/).length;
      if (words > 3) return false;
      return EMOTIONS.some(e =>
        new RegExp('^(the |a |an )?' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(t.trim())
      );
    },
  },
  {
    key: 'relational', label: 'Relational Figures', color: '#6b7c4a', Icon: RelationalIcon,
    match: t => containsWholeWord(t, [
      'husband','wife','partner','boyfriend','girlfriend','ex-husband','ex-wife',
      'ex-boyfriend','ex-girlfriend','fiancé','fiancée','best friend',
      'acquaintance','neighbor','colleague','coworker','boss','employee',
      'stranger','intruder','visitor','guest','sibling','stepbrother','stepsister',
      'stepparent','stepfather','stepmother','mother-in-law','father-in-law',
      'aunt','uncle','cousin','niece','nephew','grandparent','grandchild',
      'stepson','stepdaughter','congregation','gathering','household',
    ]) || exactMatch(t, ['ex','lover','friend','enemy','brother','sister',
      'parent','son','daughter','family','couple','community','crowd','group','team']),
  },
  {
    key: 'voice', label: 'Voice & Expression', color: '#7a6b9a', Icon: VoiceIcon,
    match: t => containsWholeWord(t, [
      'singing','voiceless','silenced','frozen mouth','cannot speak',
      'performing','performance','performer','microphone','lyrics','screaming',
      'whispering','being heard','unheard','mute','articulate','inarticulate',
      'communication','creative expression','artistic expression','storytelling',
      'public speaking','presentation','choir','musical','opera','concert',
      'recital','audition','vocal','instrument','musician','conductor',
      'mouth full','frozen','paralyzed voice','lost voice','taffy',
    ]) || exactMatch(t, ['voice','song','music','stage','audience','expression',
      'language','words','writing','poetry','journaling']),
  },
  {
    key: 'belonging', label: 'Belonging & Identity', color: '#7a8c6b', Icon: BelongingIcon,
    match: t => containsWholeWord(t, [
      'belonging','fitting in','outsider','authentic','social mask',
      'accepted','rejected','seen','unseen','invisible','recognized',
      'misunderstood','conformity','rebellion','social conformity',
      'false self','social anxiety','social pressure','standing out',
      'self-abandonment','people pleasing','approval','validation',
      'self worth','self esteem','self image','self concept','who am i',
      'persona','imposter','fraud',
    ]) || exactMatch(t, ['identity','authentic self','true self','role','mask']),
  },
  {
    key: 'feminine', label: 'Feminine Power', color: '#9a7a4a', Icon: FeminineIcon,
    match: t => containsWholeWord(t, [
      'liberation','feminine power','agency','constraint','wild woman',
      'untamed','domesticated','unleashed','feminine rage','sisterhood',
      'embodied','repression','sovereignty','reclaiming','self-determination',
      'bodily autonomy','female rage','witch','priestess','warrior woman',
      'amazon','huntress','creatrix','sacred feminine','divine feminine',
      'moon energy','earth energy','womanhood','girlhood','maiden','crone',
    ]) || exactMatch(t, ['freedom','desire','sexuality','strength','softness',
      'empowerment','wildness','feminist']),
  },
];

// ── Categorization ────────────────────────────────────────────────────────────

// Category labels — never show these as chips inside their own card
const CATEGORY_LABEL_SET = new Set([
  ...CATEGORIES.map(c => c.label.toLowerCase()),
  ...CATEGORIES.map(c => c.key.toLowerCase()),
]);

function categorizeTag(tag) {
  const t = tag.trim();
  if (CATEGORY_LABEL_SET.has(t.toLowerCase())) return null; // skip label-as-tag
  for (const cat of CATEGORIES) {
    if (cat.match(t)) return cat.key;
  }
  return 'uncategorized';
}

function buildData(dreams) {
  const itemMap = {}; // lowerKey → { display, dreams[] }

  dreams.forEach(dream => {
    const items = [
      ...(dream.archetypes || []),
      ...(dream.symbols || []),
      ...(dream.tags || []),
      ...(Array.isArray(dream.mood) ? dream.mood : (dream.mood ? dream.mood.split(', ').filter(Boolean) : [])),
    ];
    const seen = new Set();
    items.forEach(raw => {
      if (!raw?.trim()) return;
      const key = raw.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      if (!itemMap[key]) itemMap[key] = { display: raw.trim(), dreams: [] };
      itemMap[key].dreams.push(dream);
    });
  });

  const catItems = {};
  CATEGORIES.forEach(c => { catItems[c.key] = []; });
  catItems.uncategorized = [];

  Object.entries(itemMap).forEach(([, { display, dreams }]) => {
    const dest = categorizeTag(display);
    if (dest === null) return;
    catItems[dest].push({ key: display.toLowerCase(), display, count: dreams.length, dreams });
  });

  Object.keys(catItems).forEach(k => {
    catItems[k].sort((a, b) => b.count - a.count);
  });

  return catItems;
}

// ── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({ category, items, onNavigateDream }) {
  const [expanded, setExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const { label, color, Icon } = category;

  const dreamCount = new Set(items.flatMap(i => i.dreams.map(d => d.id))).size;
  const top3 = items.slice(0, 3);

  function handleChipClick(e, item) {
    e.stopPropagation();
    setActiveItem(prev => prev?.key === item.key ? null : item);
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}28`, backgroundColor: `${color}05` }}
    >
      {/* Collapsed header */}
      <button
        onClick={() => { setExpanded(v => !v); if (expanded) setActiveItem(null); }}
        className="w-full text-left p-5 flex gap-4 items-start transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
      >
        <div className="w-[72px] h-[72px] shrink-0">
          <Icon color={color} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display italic text-xl leading-tight" style={{ color }}>
              {label}
            </h2>
            <svg
              viewBox="0 0 20 20" fill="none"
              className="w-4 h-4 mt-1 shrink-0 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color }}
            >
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-xs font-body mt-0.5" style={{ color, opacity: 0.55 }}>
            appears in {dreamCount} dream{dreamCount !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {top3.map(item => (
              <span
                key={item.key}
                className="px-2.5 py-0.5 rounded-full text-xs font-body"
                style={{ backgroundColor: `${color}18`, color, opacity: 0.82 }}
              >
                {item.display}
              </span>
            ))}
            {items.length > 3 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-body text-ink/30 dark:text-white/25">
                +{items.length - 3} more
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '1200px' : '0px' }}
      >
        <div className="px-5 pb-5 pt-1">
          <div className="h-px mb-4" style={{ backgroundColor: `${color}20` }} />
          <div className="flex flex-wrap gap-2">
            {items.map(item => {
              const isActive = activeItem?.key === item.key;
              return (
                <button
                  key={item.key}
                  onClick={e => handleChipClick(e, item)}
                  className="px-3 py-1.5 rounded-full text-sm font-body transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? color : `${color}14`,
                    color: isActive ? 'white' : color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {item.display}
                  <span className="ml-1.5 text-xs" style={{ opacity: 0.5 }}>×{item.count}</span>
                </button>
              );
            })}
          </div>

          {/* Related dreams */}
          {activeItem && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${color}18` }}>
              <p className="text-xs font-body mb-3" style={{ color, opacity: 0.65 }}>
                Dreams featuring "{activeItem.display}"
              </p>
              <div className="space-y-2">
                {activeItem.dreams.map(dream => (
                  <button
                    key={dream.id}
                    onClick={() => onNavigateDream(dream.id)}
                    className="w-full text-left p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: `${color}08` }}
                  >
                    <p className="text-xs font-body text-ink/35 dark:text-white/30 mb-0.5">
                      {dream.dream_date ? format(parseISO(dream.dream_date), 'MMM d, yyyy') : ''}
                    </p>
                    <p className="font-display italic text-base text-ink dark:text-white">
                      {dream.title || 'Untitled Dream'}
                    </p>
                    {dream.body && (
                      <p className="text-xs font-body text-ink/40 dark:text-white/35 mt-0.5 line-clamp-2">
                        {dream.body.slice(0, 110)}…
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Symbols() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [catData, setCatData] = useState(null);
  const [allDreams, setAllDreams] = useState([]);
  const [totalDreams, setTotalDreams] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tagging, setTagging] = useState(false);
  const [tagProgress, setTagProgress] = useState(null);
  const [tagError, setTagError] = useState('');
  const [savedThemes, setSavedThemes] = useState(null); // null = not loaded yet, [] = loaded but empty

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [dreamsRes, themesRes] = await Promise.all([
      supabase
        .from('dreams')
        .select('id, dream_date, title, body, tags, archetypes, symbols, mood, has_analysis')
        .eq('user_id', user.id),
      supabase
        .from('user_themes')
        .select('themes, generated_at, dream_count_at_generation')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);
    const data = dreamsRes.data;
    if (!data) { setLoading(false); setSavedThemes([]); return; }
    setAllDreams(data);
    setTotalDreams(data.length);
    setCatData(buildData(data));
    setSavedThemes(themesRes.data?.themes || []);
    setLoading(false);
  }

  const untaggedDreams = allDreams.filter(d =>
    !d.tags?.length && !d.archetypes?.length && !d.symbols?.length
  );

  async function handleQuickTagAll() {
    if (!untaggedDreams.length) return;
    setTagging(true);
    setTagError('');
    setTagProgress({ done: 0, total: untaggedDreams.length });
    let updatedDreams = [...allDreams];
    for (let i = 0; i < untaggedDreams.length; i++) {
      const dream = untaggedDreams[i];
      try {
        const result = await quickTagDream({ body: dream.body, mood: dream.mood });
        await supabase.from('dreams').update({
          tags: result.tags || [], symbols: result.symbols || [], archetypes: result.archetypes || [],
        }).eq('id', dream.id);
        updatedDreams = updatedDreams.map(d =>
          d.id === dream.id ? { ...d, tags: result.tags || [], symbols: result.symbols || [], archetypes: result.archetypes || [] } : d
        );
        setCatData(buildData(updatedDreams));
        setAllDreams(updatedDreams);
      } catch (err) {
        if (['no_key', 'invalid_key', 'no_credits'].includes(err.type)) { setTagError(err.message); break; }
      }
      setTagProgress({ done: i + 1, total: untaggedDreams.length });
    }
    setTagging(false);
    setTagProgress(null);
  }

  const visibleCategories = catData
    ? CATEGORIES.filter(c => catData[c.key]?.length > 0)
    : [];

  const totalUnique = catData
    ? Object.values(catData).reduce((n, items) => n + items.length, 0)
    : 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-display italic text-xl text-ink/40">Mapping the unconscious…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display italic text-5xl text-ink dark:text-white mb-2">
          Symbols &amp; Archetypes
        </h1>
        <p className="font-body text-base text-ink/50 dark:text-white/40">
          The recurring language of your unconscious
        </p>
        {totalDreams > 0 && (
          <p className="text-xs font-body text-ink/35 dark:text-white/30 mt-2">
            {totalDreams} dream{totalDreams !== 1 ? 's' : ''} · {totalUnique} unique symbols · {visibleCategories.length} active categories
          </p>
        )}
      </div>

      {/* Untagged banner */}
      {untaggedDreams.length > 0 && (
        <div className="mb-8 flex items-center justify-between gap-4 px-5 py-3 rounded-xl bg-plum/5 border border-plum/15">
          <div>
            <p className="text-sm font-body text-ink/70 dark:text-white/60">
              <span className="font-medium">{untaggedDreams.length} dream{untaggedDreams.length !== 1 ? 's' : ''}</span> haven't been tagged yet.
              {tagProgress && <span className="ml-2 text-plum dark:text-gold"> Tagging {tagProgress.done}/{tagProgress.total}…</span>}
            </p>
            {tagError && <p className="text-xs text-red-500 mt-1 font-body">{tagError} <Link to="/settings" className="underline">Settings →</Link></p>}
            {!hasApiKey() && !tagError && <p className="text-xs text-ink/40 font-body mt-0.5">Requires an API key in <Link to="/settings" className="underline">Settings</Link>.</p>}
          </div>
          <button
            onClick={handleQuickTagAll}
            disabled={tagging || !hasApiKey()}
            className="shrink-0 text-sm font-body font-medium text-plum dark:text-gold hover:opacity-70 disabled:opacity-40"
          >
            {tagging ? 'Working…' : '◈ Quick-tag all'}
          </button>
        </div>
      )}

      {/* Category grid */}
      {visibleCategories.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-display italic text-2xl text-ink/25 dark:text-white/20">No symbols yet.</p>
          <p className="font-body text-sm text-ink/20 dark:text-white/15 mt-2">
            Analyze your dreams or use Quick-tag to populate this page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCategories.map(cat => (
            <CategoryCard
              key={cat.key}
              category={cat}
              items={catData[cat.key] || []}
              onNavigateDream={id => navigate(`/dream/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Uncategorized — flat collapsible list */}
      {catData?.uncategorized?.length > 0 && (
        <UncategorizedSection items={catData.uncategorized} onNavigateDream={id => navigate(`/dream/${id}`)} />
      )}

      {/* Personal recurring themes */}
      {savedThemes !== null && (
        <RecurringThemes
          allDreams={allDreams}
          totalDreams={totalDreams}
          savedThemes={savedThemes}
          userId={user.id}
          onThemesSaved={setSavedThemes}
        />
      )}
    </div>
  );
}

// ── UncategorizedSection ──────────────────────────────────────────────────────

function UncategorizedSection({ items, onNavigateDream }) {
  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  return (
    <div className="mt-6 pt-5 border-t border-black/8 dark:border-white/8">
      <button
        onClick={() => { setOpen(v => !v); if (open) setActiveItem(null); }}
        className="flex items-center gap-2 text-xs font-body text-ink/30 dark:text-white/25 hover:text-ink/55 dark:hover:text-white/45 transition-colors"
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>Other Symbols ({items.length})</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {items.map(item => {
              const isActive = activeItem?.key === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveItem(prev => prev?.key === item.key ? null : item)}
                  className={`px-3 py-1 rounded-full text-xs font-body border transition-all duration-150 ${
                    isActive
                      ? 'bg-ink/15 dark:bg-white/15 border-ink/20 dark:border-white/20 text-ink dark:text-white'
                      : 'bg-black/4 dark:bg-white/5 border-black/8 dark:border-white/8 text-ink/45 dark:text-white/35 hover:bg-black/8 dark:hover:bg-white/10'
                  }`}
                >
                  {item.display}
                  <span className="ml-1 opacity-50">×{item.count}</span>
                </button>
              );
            })}
          </div>

          {activeItem && (
            <div className="pl-2 space-y-2">
              <p className="text-xs font-body text-ink/35 dark:text-white/25">
                Dreams featuring "{activeItem.display}"
              </p>
              {activeItem.dreams.map(dream => (
                <button
                  key={dream.id}
                  onClick={() => onNavigateDream(dream.id)}
                  className="block w-full text-left px-3 py-2 rounded-lg bg-black/3 dark:bg-white/4 hover:bg-black/6 dark:hover:bg-white/7 transition-colors"
                >
                  <p className="text-xs font-body text-ink/30 dark:text-white/25">
                    {dream.dream_date ? format(parseISO(dream.dream_date), 'MMM d, yyyy') : ''}
                  </p>
                  <p className="font-display italic text-sm text-ink dark:text-white">
                    {dream.title || 'Untitled Dream'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RecurringThemes ───────────────────────────────────────────────────────────

const MIN_DREAMS = 10;

function RecurringThemes({ allDreams, totalDreams, savedThemes, userId, onThemesSaved }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);

  const hasThemes = savedThemes?.length > 0;
  const enoughDreams = totalDreams >= MIN_DREAMS;

  function collectArchiveData() {
    const tags = new Set();
    const titles = [];
    const moods = new Set();
    allDreams.forEach(d => {
      (d.tags || []).forEach(t => t && tags.add(t));
      (d.archetypes || []).forEach(t => t && tags.add(t));
      (d.symbols || []).forEach(t => t && tags.add(t));
      if (d.title) titles.push(d.title);
      if (d.mood) d.mood.split(', ').filter(Boolean).forEach(m => moods.add(m));
    });
    return {
      tags: [...tags].slice(0, 200),
      titles: titles.slice(0, 100),
      moods: [...moods],
    };
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setConfirmRegen(false);
    try {
      const { tags, titles, moods } = collectArchiveData();
      const themes = await generatePersonalThemes({ tags, titles, moods, totalDreams });

      // Upsert into user_themes
      await supabase.from('user_themes').upsert({
        user_id: userId,
        themes,
        generated_at: new Date().toISOString(),
        dream_count_at_generation: totalDreams,
      }, { onConflict: 'user_id' });

      onThemesSaved(themes);
    } catch (err) {
      setError(err.message || 'Couldn\'t generate themes right now — please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-16 pt-10 border-t border-black/10 dark:border-white/10">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-widest font-body text-gold/70 dark:text-gold/60 mb-1">
            Personally Yours
          </p>
          <h2 className="font-display italic text-3xl text-ink dark:text-white">
            My Recurring Themes
          </h2>
        </div>
        {hasThemes && !confirmRegen && (
          <button
            onClick={() => setConfirmRegen(true)}
            className="text-xs font-body text-ink/30 dark:text-white/25 hover:text-ink/60 dark:hover:text-white/50 transition-colors"
          >
            ↺ Regenerate
          </button>
        )}
      </div>

      {/* Regenerate confirmation */}
      {confirmRegen && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-body text-amber-800 dark:text-amber-300 flex-1">
            Regenerate your personal themes? This will replace your current themes.
          </p>
          <button onClick={handleGenerate} className="text-sm font-body font-medium text-amber-800 dark:text-amber-300 hover:opacity-70">
            Confirm
          </button>
          <button onClick={() => setConfirmRegen(false)} className="text-sm font-body text-amber-700/60 dark:text-amber-400/60 hover:opacity-70">
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <p className="text-sm font-body text-red-700 dark:text-red-400">{error}</p>
          <button onClick={handleGenerate} className="text-sm font-body font-medium text-red-700 dark:text-red-400 hover:opacity-70 shrink-0">
            Try again
          </button>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="py-12 text-center">
          <p className="font-display italic text-xl text-ink/40 dark:text-white/30 animate-pulse">
            Reading the patterns in your unconscious…
          </p>
        </div>
      )}

      {/* No themes yet */}
      {!generating && !hasThemes && (
        <div className="mt-4 px-8 py-10 rounded-2xl border border-gold/20 bg-gold/[0.03] text-center">
          <p className="font-body text-sm text-ink/60 dark:text-white/50 max-w-md mx-auto leading-relaxed mb-6">
            Discover the psychological patterns that are uniquely yours. Unlike the universal archetypes above,
            these themes emerge from your personal dream history.
          </p>
          {enoughDreams ? (
            <button
              onClick={handleGenerate}
              disabled={!hasApiKey()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-body text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#b8924a' }}
            >
              ✦ Discover My Themes
            </button>
          ) : (
            <p className="text-sm font-body text-ink/35 dark:text-white/30 italic">
              Add more dreams to unlock your personal themes — we recommend at least {MIN_DREAMS} to see meaningful patterns.
              <span className="ml-1 not-italic">({totalDreams}/{MIN_DREAMS})</span>
            </p>
          )}
          {enoughDreams && !hasApiKey() && (
            <p className="text-xs font-body text-ink/35 dark:text-white/25 mt-3">
              Requires an API key in <a href="/settings" className="underline">Settings</a>.
            </p>
          )}
        </div>
      )}

      {/* Themes grid */}
      {!generating && hasThemes && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedThemes.map((theme, i) => (
            <ThemeCard key={i} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ThemeCard ─────────────────────────────────────────────────────────────────

function ThemeCard({ theme }) {
  const color = theme.color || '#b8924a';

  return (
    <div
      className="rounded-2xl p-5 border relative"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}07` }}
    >
      {/* AI badge */}
      <span
        className="absolute top-4 right-4 text-base leading-none"
        style={{ color, opacity: 0.5 }}
        title="AI-generated from your archive"
      >
        ✦
      </span>

      <h3 className="font-display italic text-xl leading-tight pr-6" style={{ color }}>
        {theme.name}
      </h3>
      <p className="text-sm font-body text-ink/65 dark:text-white/55 mt-2 leading-relaxed">
        {theme.description}
      </p>

      {/* Keyword chips */}
      {theme.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {theme.keywords.map(kw => (
            <span
              key={kw}
              className="px-2.5 py-0.5 rounded-full text-xs font-body"
              style={{ backgroundColor: `${color}18`, color, opacity: 0.85 }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs font-body mt-3" style={{ color, opacity: 0.35 }}>
        AI-generated based on your archive
      </p>
    </div>
  );
}
