import type { ReactNode } from 'react';
import type { DemoRun, Progress } from './api';
import { Dots, HitoReceipt } from './Guide';
import type { GuideStep, Hito } from './guide-data';

export type GuideContext = { step: GuideStep; ready: boolean; run: DemoRun | null; p: Progress; hito: Hito; mine: number };
export type GuideContent = { kicker: string; title: string; body: ReactNode; status?: ReactNode };

const strong = (t: ReactNode) => <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{t}</strong>;
const parts = (n: number) => `${n} ${n === 1 ? 'parte' : 'partes'}`;

/** What the guide says at each moment, in plain words (one idea per step). */
export function guideContent({ step, ready, run, p, hito, mine }: GuideContext): GuideContent {
  const others = 5 - mine;
  switch (step) {
    case 0: return {
      kicker: 'Proyecto destacado · Demo',
      title: 'Así funciona invertir en una propiedad',
      body: <>{strong('Villa Mirador')} es una casa de alquiler dividida en {strong('5 partes')} de {strong('1 USD')}. Quien tiene una parte cobra {strong('1/5 de lo que gane la casa')}. Vos elegís cuántas partes comprar y seguís el dinero en el mapa.</>,
    };
    case 1: return {
      kicker: 'Paso 1 de 5',
      title: ready ? `¡Listo! Tus ${mine} USD llegaron` : 'Ponés el dinero',
      body: ready
        ? <>Tu dinero ya está en la plataforma. En el mapa sale de la izquierda hacia {mine === 1 ? 'tu wallet (W1)' : `tus ${mine} wallets`}.</>
        : run?.status === 'awaiting_payment'
          ? <>Enviá el pago con estos datos. Apenas llegue, la demo sigue sola.</>
          : <>Elegí {strong('cuántas partes')} querés y {strong('cómo pagar')}. Si solo querés mirar, elegí {strong('«Ver la demo gratis»')}.</>,
    };
    case 2: return {
      kicker: 'Paso 2 de 5',
      title: 'Se compran las 5 partes',
      body: others > 0
        ? <>Con tu dinero se compran {strong(`tus ${parts(mine)}`)} (W1{mine > 1 ? `–W${mine}` : ''}). {strong(others === 1 ? 'Otro inversionista' : `Otros ${others} inversionistas`)} compran el resto. Cada compra queda en la blockchain.</>
        : <>Tus 5 USD compran {strong('las 5 partes')}: sos dueño del {strong('100% de la casa')}. Cada compra queda en la blockchain.</>,
      status: <Dots done={p.invested} label={`${p.invested} de 5 partes compradas`} />,
    };
    case 3: return {
      kicker: 'Paso 3 de 5',
      title: 'La casa genera ganancia',
      body: p.deposit || ready
        ? <>{hito.story} La empresa puso {strong('5 USD de ganancia')} en el contrato para repartirlos.</>
        : <>Pasó un mes. Elegí {strong('qué pasó en la villa')} y tocá {strong('«Repartir la ganancia»')}. Vos hacés de empresa dueña del proyecto.</>,
      status: p.deposit || ready ? <HitoReceipt hito={hito} /> : undefined,
    };
    case 4: return {
      kicker: 'Paso 4 de 5',
      title: 'El contrato reparte solo',
      body: <>{strong('5 USD ÷ 5 partes = 1 USD por parte')}. Cada dueño cobra según lo que tiene: a vos te tocan {strong(`${mine} USD`)}. Nadie hace cuentas a mano.</>,
      status: <Dots done={p.claimed} label={`${p.claimed} de 5 cobraron`} />,
    };
    case 5: return {
      kicker: 'Paso 5 de 5',
      title: 'Tu ganancia llega a tu wallet',
      body: <>{mine === 1 ? 'Tu parte te envía' : `Tus ${parts(mine)} te envían`} lo que cobraron. {others > 0 ? 'Los otros inversionistas se quedan con lo suyo. ' : ''}Mirá tu saldo arriba.</>,
      status: <Dots done={p.swept} total={mine} label={`+${p.swept} de ${mine} USD en tu wallet`} />,
    };
    default: return {
      kicker: 'Resumen',
      title: 'Esto es lo que pasó',
      body: (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Pusiste {strong(`${mine} USD`)} → compraste {strong(`${parts(mine)} de 5`)} ({mine * 20}% de la casa).</li>
          <li>La casa ganó {strong('5 USD')} ({hito.title.toLowerCase()}) → te tocaron {strong(`${mine} USD`)}.</li>
          {mine < 5 && <li>Con las 5 partes te habría tocado {strong('todo')}: 5 USD.</li>}
          {run && !run.simulated && <li>Te devolvemos tus {strong(`${mine} USDT reales`)}.</li>}
        </ul>
      ),
    };
  }
}

