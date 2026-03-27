import { useAuth } from '../contexts/AuthContext';

export function useNavTier() {
  const { profile, dreamCount } = useAuth();

  const hasGuide = Boolean(profile?.analyst_name?.trim());

  const tier = dreamCount >= 20 ? 3 : dreamCount >= 10 ? 2 : dreamCount >= 3 ? 1 : 0;

  const unlocked = {
    recordDream: true,
    dailyPractice: true,
    reference: true,
    settings: true,
    dreamArchive: tier >= 1,
    wakingLife: tier >= 1,
    myJourney: tier >= 2,
    askArchive: tier >= 2,
    analystFocus: hasGuide && tier >= 1,
    sessionLetter: hasGuide && tier >= 1,
    activeImagination: tier >= 3,
    dreamSeries: tier >= 3,
    timeline: tier >= 3,
    shadowWork: hasGuide && tier >= 3,
    import: tier >= 3,
  };

  const visibleLocked = {
    dreamArchive: tier < 1,
    wakingLife: tier < 1,
    myJourney: tier < 2,
    analystFocus: !hasGuide && tier >= 1,
    sessionLetter: !hasGuide && tier >= 1,
    activeImagination: tier < 3,
    dreamSeries: tier < 3,
    timeline: tier < 3,
    shadowWork: tier >= 3 && !hasGuide,
  };

  const unlockRequirement = {
    dreamArchive: '3 dreams',
    wakingLife: '3 dreams',
    myJourney: '10 dreams',
    analystFocus: 'a guide — add one in Settings',
    sessionLetter: 'a guide — add one in Settings',
    activeImagination: '20 dreams',
    dreamSeries: '20 dreams',
    timeline: '20 dreams',
    shadowWork: hasGuide ? '20 dreams' : 'a guide and 20 dreams',
    import: '20 dreams',
  };

  return { tier, hasGuide, dreamCount, unlocked, visibleLocked, unlockRequirement };
}
