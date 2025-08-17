import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function SupplierPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect suppliers to their dashboard
    if (user?.role === 'supplier') {
      setLocation('/supplier/dashboard');
    } else {
      setLocation('/');
    }
  }, [user, setLocation]);

  return null;
}