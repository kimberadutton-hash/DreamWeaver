import { useAuth } from '../contexts/AuthContext';

export function useNavTier() {
  const { profile, dreamCount } = useAuth();

  const hasGuide = Boolean(profile?.analyst_name?.trim());

  // The Thread (Dream Archive): always unlocked
  // The Loom (Shadow Work, Active Imagination, Daily Practice): 3 dreams
  // The Web (Ask the Archive, My Journey): 10 dreams
  const unlocked = {
    dreamArchive: true,
    shadowWork: dreamCount >= 3,
    activeImagination: dreamCount >= 3,
    dailyPractice: dreamCount >= 3,
    askArchive: dreamCount >= 10,
    myJourney: dreamCount >= 10,
  };

  const unlockRequirement = {
    shadowWork: '3 dreams',
    activeImagination: '3 dreams',
    dailyPractice: '3 dreams',
    askArchive: '10 dreams',
    myJourney: '10 dreams',
  };

  return { hasGuide, unlocked, unlockRequirement };
}
