import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Navigates to /splash on every app load to ensure the splash screen
 * always runs first and handles routing logic.
 * Uses a one-time flag to prevent infinite redirect loops.
 */
export default function AppEntrypoint() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're at the root path AND haven't already been to splash
    if (
      location.pathname === "/" &&
      !sessionStorage.getItem("lumina-redirected-to-splash")
    ) {
      sessionStorage.setItem("lumina-redirected-to-splash", "1");
      navigate("/splash", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
