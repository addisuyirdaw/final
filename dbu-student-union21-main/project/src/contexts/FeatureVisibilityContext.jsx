import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FeatureVisibilityContext = createContext({
  electionVisible: true,
  leadershipVisible: true,
  clubsVisible: true,
  servicesVisible: true,
  complaintsVisible: true,
  refresh: () => {}
});

export const FeatureVisibilityProvider = ({ children }) => {
  const [features, setFeatures] = useState({
    electionVisible: true,
    leadershipVisible: true,
    clubsVisible: true,
    servicesVisible: true,
    complaintsVisible: true
  });

  const fetchConfig = useCallback(async () => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD
          ? 'https://dbu-student-union-api.onrender.com/api'
          : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000/api`);

      const res = await fetch(`${API_BASE_URL}/config`);
      const data = await res.json();
      if (data && data.success) {
        setFeatures({
          electionVisible: typeof data.electionVisible === 'boolean' ? data.electionVisible : true,
          leadershipVisible: typeof data.leadershipVisible === 'boolean' ? data.leadershipVisible : true,
          clubsVisible: typeof data.clubsVisible === 'boolean' ? data.clubsVisible : true,
          servicesVisible: typeof data.servicesVisible === 'boolean' ? data.servicesVisible : true,
          complaintsVisible: typeof data.complaintsVisible === 'boolean' ? data.complaintsVisible : true
        });
      }
    } catch (err) {
      console.warn('Could not fetch system config, using default features', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <FeatureVisibilityContext.Provider value={{ ...features, refresh: fetchConfig }}>
      {children}
    </FeatureVisibilityContext.Provider>
  );
};

export const useFeatureVisibility = () => useContext(FeatureVisibilityContext);

// Export old names for backward compatibility to avoid compilation errors elsewhere if referenced
export const ElectionVisibilityProvider = FeatureVisibilityProvider;
export const useElectionVisibility = () => {
  const context = useContext(FeatureVisibilityContext);
  return {
    electionVisible: context.electionVisible,
    refresh: context.refresh
  };
};
export default FeatureVisibilityContext;
