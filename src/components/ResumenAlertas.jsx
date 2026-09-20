import { useEffect, useState } from 'react';

const ALERTAS_URL = (import.meta.env.VITE_ALERTAS_URL || 'http://localhost:5002').replace(/\/$/, '');

export default function ResumenAlertas() {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        // Segunda llamada directa a Alertas: GET /alertas/resumen
        const response = await fetch(`${ALERTAS_URL}/api/alertas/resumen`);
        if (!response.ok) return;
        setResumen(await response.json());
      } catch {
        // silencioso: es un widget secundario, no debe romper el header
      }
    };
    cargar();
  }, []);

  if (!resumen) return null;

  return (
    <div className="alertas-resumen">
      <span className="alertas-pill alertas-pill-rojo">{resumen.rojo} rojo</span>
      <span className="alertas-pill alertas-pill-amarillo">{resumen.amarillo} amarillo</span>
      <span className="alertas-pill alertas-pill-verde">{resumen.verde} verde</span>
    </div>
  );
}
