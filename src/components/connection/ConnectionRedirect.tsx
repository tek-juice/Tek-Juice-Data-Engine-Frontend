import { Navigate } from 'react-router-dom';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

/** /connection -> the selected website's setup page. */
export default function ConnectionRedirect() {
  const { website, loading } = useIntelligenceRun();
  if (loading) return null;
  return <Navigate to={website ? `/websites/${website.id}/setup` : '/websites/connect'} replace />;
}
