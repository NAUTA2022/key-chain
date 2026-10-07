// Every "buy / invest / pay" CTA in the platform opens KEYCHAIN's own
// checkout through this helper.
//
// order = {
//   title,                      // what's being paid ("Inversión", "Alquiler"…)
//   items: [{ name, img?, qty, unit, meta? }],
//   fee = 0,                    // platform fee in USD (already quoted to the user)
//   source,                     // "Tokenizaciones", "Mercado Secundario"…
//   done: { route, data, label } // where "continue" goes after paying
//   back: { route, data }        // where "Volver" goes
// }
export function goCheckout(nav, order) {
  nav('checkout', order);
}

export const orderTotals = (order) => {
  const subtotal = (order.items || []).reduce((s, it) => s + it.qty * it.unit, 0);
  const fee = order.fee || 0;
  return { subtotal, fee, total: subtotal + fee };
};
