const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Every achievement with its progress `p` (0–1). `icon` is an AchievementIcon name.
export function achievementsOf(d) {
  return [
    { icon: 'trophy', label: 'Primera inversión', desc: 'Invertiste en tu primer proyecto', p: d.holdings > 0 ? 1 : 0 },
    { icon: 'shield', label: 'KYC completo', desc: 'Identidad verificada', p: 1 },
    { icon: 'star', label: '6 meses activo', desc: 'Medio año invirtiendo', p: clamp(d.months / 6) },
    { icon: 'compass', label: 'Diversificado', desc: 'Proyectos en 3 rubros o más', p: clamp(d.cats.length / 3) },
    { icon: 'drop', label: 'Primer $1K de yield', desc: 'Rentas cobradas acumuladas', p: clamp(d.yieldEarned / 1000) },
    { icon: 'calendar', label: '1 año en KEYCHAIN', desc: 'Doce meses de antigüedad', p: clamp(d.months / 12) },
    { icon: 'diamond', label: '$50K invertido', desc: 'Llegá al Nivel 5', p: clamp(d.invested / 50000) },
    { icon: 'rocket', label: '10 proyectos', desc: 'Un portafolio amplio', p: clamp(d.holdings / 10) },
  ];
}
