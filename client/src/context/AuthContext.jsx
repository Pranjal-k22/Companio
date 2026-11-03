import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('companio_token') || null);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch logged in user profile and memberships on initial app load if token exists
  useEffect(() => {
    const fetchUserAndOrgs = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);

          // Retrieve user organization memberships
          try {
            const orgsRes = await API.get('/organizations');
            if (orgsRes.data.success) {
              const orgs = orgsRes.data.data?.organizations || orgsRes.data.organizations || [];
              setUserOrganizations(orgs);

              const storedOrgId = localStorage.getItem('companio_organization_id');
              const matchedOrg = orgs.find((o) => o.id === storedOrgId);
              if (matchedOrg) {
                setActiveOrganization(matchedOrg);
              } else if (orgs.length > 0) {
                setActiveOrganization(orgs[0]);
                localStorage.setItem('companio_organization_id', orgs[0].id);
              }
            }
          } catch (orgErr) {
            console.warn('[AuthContext] Failed to load organization memberships:', orgErr?.message);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session expired or invalid token:', err?.response?.data?.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndOrgs();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('companio_token', newToken);
        setToken(newToken);
        setUser(userData);

        // Fetch organizations for logged in user
        try {
          const orgsRes = await API.get('/organizations', {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (orgsRes.data.success) {
            const orgs = orgsRes.data.data?.organizations || orgsRes.data.organizations || [];
            setUserOrganizations(orgs);
            if (orgs.length > 0) {
              setActiveOrganization(orgs[0]);
              localStorage.setItem('companio_organization_id', orgs[0].id);
            }
          }
        } catch {
          // ignore background org fetch error on login
        }

        return userData;
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // Switch Active Organization
  const switchOrganization = async (orgId) => {
    try {
      const res = await API.post('/auth/active-organization', { organizationId: orgId });
      if (res.data.success) {
        localStorage.setItem('companio_organization_id', orgId);
        const newOrg = userOrganizations.find((o) => o.id === orgId) || res.data.data?.activeOrganization;
        setActiveOrganization(newOrg);
        return newOrg;
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to switch organization.';
      throw new Error(msg);
    }
  };

  // Register handler
  const register = async (userData) => {
    setError(null);
    try {
      const res = await API.post('/auth/register', userData);
      if (res.data.success) {
        const { token: newToken, user: newUser } = res.data;
        localStorage.setItem('companio_token', newToken);
        setToken(newToken);
        setUser(newUser);
        return newUser;
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('companio_token');
    localStorage.removeItem('companio_organization_id');
    setToken(null);
    setUser(null);
    setActiveOrganization(null);
    setUserOrganizations([]);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeOrganization,
        userOrganizations,
        switchOrganization,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
