// src/components/RoutePersistor.jsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Grava a rota atual a cada navegação e restaura na 1ª carga.
 * Use em nível alto do app (logo após o BrowserRouter).
 */
export default function RoutePersistor() {
  const location = useLocation();
  const navigate = useNavigate();
  const booted = useRef(false);

  // restaura na 1ª carga
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const last = localStorage.getItem("nf:lastPath");
    if (last && last !== location.pathname + location.search) {
      navigate(last, { replace: true });
    }
  }, []); // só na 1a vez

  // salva a cada mudança
  useEffect(() => {
    localStorage.setItem("nf:lastPath", location.pathname + location.search);
  }, [location]);

  return null;
}
