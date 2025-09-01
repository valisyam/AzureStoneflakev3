
// Refresh user data in the browser console
import { queryClient } from './src/lib/queryClient';
queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

