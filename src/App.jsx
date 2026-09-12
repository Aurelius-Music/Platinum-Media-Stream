import LiveRoom from './LiveRoom.jsx';
import EgressTemplate from './EgressTemplate.jsx';

export default function App() {
  // LiveKit's broadcast service loads this same site at /egress — route it
  // to the broadcast template instead of the normal join screen.
  const isEgress = window.location.pathname.startsWith('/egress');
  return isEgress ? <EgressTemplate /> : <LiveRoom />;
}
