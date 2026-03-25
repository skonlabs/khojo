import { Navigate } from "react-router-dom";

// Redirect any direct hits to this route to the main dashboard.
export default function Index() {
  return <Navigate to="/" replace />;
}
