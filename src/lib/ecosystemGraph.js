import { AMBER, WHITE, BLUE } from './ecosystemData';

// ─── HIERARCHICAL COLLIDER SYSTEM ──────────────────────────────────────────
// Each branch (country → category → company → project) owns an angular wedge
// sized by how much content it carries. A branch's wedge always fully contains
// the wedges of everything nested inside it, and never crosses into a sibling's
// wedge — so new countries/categories/companies/projects can be added at any
// time and the layout just re-slices proportionally, with zero collisions.
// Shared by both the 2D (SVG) and 3D (three.js) Ecosystem views so their
// hierarchy and non-overlap guarantees stay identical.
export const companyWeight  = (comp) => Math.max(1, comp.projects?.length || 0);
export const categoryWeight = (cat)  => cat.companies?.reduce((s, c) => s + companyWeight(c), 0) || 1;
export const countryWeight  = (country) => country.categories?.reduce((s, c) => s + categoryWeight(c), 0) || 1;

export const WEDGE_OUTER = 585;
export const WEDGE_INNER = { country: 100, category: 230, company: 360 };
export const WEDGE_COLOR = { country: AMBER, category: WHITE, company: BLUE };

export function wedgeGuide(a0, a1, rInner, rOuter) {
  const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const [ox1, oy1] = pt(rOuter, a0);
  const [ox2, oy2] = pt(rOuter, a1);
  const [ix1, iy1] = pt(rInner, a0);
  const [ix2, iy2] = pt(rInner, a1);
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return {
    arc: `M ${ox1} ${oy1} A ${rOuter} ${rOuter} 0 ${large} 1 ${ox2} ${oy2}`,
    r1: `M ${ix1} ${iy1} L ${ox1} ${oy1}`,
    r2: `M ${ix2} ${iy2} L ${ox2} ${oy2}`,
  };
}

// ─── BUILD GRAPH ─────────────────────────────────────────────────────────────
// Sunburst-style recursive partitioning: at every level the available angle is
// split among children in proportion to how much they carry (countryWeight /
// categoryWeight / companyWeight), and each child only ever uses MARGIN of its
// share — leaving a permanent gap that is its collider boundary. Because a
// child's interval is always strictly inside its parent's, no branch can ever
// overlap a sibling branch or anything nested inside it, at any depth.
// Coordinates are 2D polar (x, y); the 3D view maps y → z on the ground plane.
export function buildGraph(data) {
  const nodes = [], edges = [];
  const TAU = 2 * Math.PI;
  const MARGIN = 0.86; // fraction of each sector a branch (and its collider) actually occupies

  const totalW = data.countries.reduce((s, c) => s + countryWeight(c), 0) || 1;
  let cursor = -Math.PI / 2;

  data.countries.forEach((country) => {
    const sectorSize = (countryWeight(country) / totalW) * TAU;
    const sectorCenter = cursor + sectorSize / 2;
    cursor += sectorSize;
    const half = (sectorSize * MARGIN) / 2;
    const aStart = sectorCenter - half, aEnd = sectorCenter + half;

    // Country node at sector bisector
    const cX = Math.cos(sectorCenter) * 165;
    const cY = Math.sin(sectorCenter) * 165;
    nodes.push({ type: 'country', id: country.id, name: country.name, flag: country.flag, x: cX, y: cY, data: country, secA0: aStart, secA1: aEnd });
    edges.push({ x1: 0, y1: 0, x2: cX, y2: cY, tier: 'core' });

    const catTotalW = country.categories.reduce((s, c) => s + categoryWeight(c), 0) || 1;
    let catCursor = aStart;
    country.categories.forEach((cat) => {
      const catSliceSize = (categoryWeight(cat) / catTotalW) * (aEnd - aStart);
      const catCenter = catCursor + catSliceSize / 2;
      catCursor += catSliceSize;
      const catHalf = (catSliceSize * MARGIN) / 2;
      const cA0 = catCenter - catHalf, cA1 = catCenter + catHalf;

      const catNodeId = cat.id + '_' + country.id;
      const catX = Math.cos(catCenter) * 290;
      const catY = Math.sin(catCenter) * 290;
      nodes.push({ type: 'category', id: catNodeId, name: cat.name, icon: cat.icon, x: catX, y: catY, data: cat, countryId: country.id, countryName: country.name, countryFlag: country.flag, secA0: cA0, secA1: cA1 });
      edges.push({ x1: cX, y1: cY, x2: catX, y2: catY, tier: 'country' });

      const compTotalW = cat.companies.reduce((s, c) => s + companyWeight(c), 0) || 1;
      let compCursor = cA0;
      cat.companies.forEach((comp) => {
        const compSliceSize = (companyWeight(comp) / compTotalW) * (cA1 - cA0);
        const compCenter = compCursor + compSliceSize / 2;
        compCursor += compSliceSize;
        const compHalf = (compSliceSize * MARGIN) / 2;
        const pA0 = compCenter - compHalf, pA1 = compCenter + compHalf;

        const compX = Math.cos(compCenter) * 415;
        const compY = Math.sin(compCenter) * 415;
        nodes.push({ type: 'company', id: comp.id, name: comp.name, x: compX, y: compY, data: comp, catId: cat.id, catName: cat.name, countryName: country.name, countryFlag: country.flag, secA0: pA0, secA1: pA1 });
        edges.push({ x1: catX, y1: catY, x2: compX, y2: compY, tier: 'sub' });

        const numProjs = comp.projects.length || 1;
        const projSlice = (pA1 - pA0) / numProjs;
        comp.projects.forEach((proj, pj) => {
          const projCenter = pA0 + projSlice * (pj + 0.5);
          const projX = Math.cos(projCenter) * 550;
          const projY = Math.sin(projCenter) * 550;
          nodes.push({ type: 'project', id: proj.id, name: proj.name, x: projX, y: projY, data: proj, compName: comp.name, compId: comp.id, catName: cat.name, countryFlag: country.flag });
          edges.push({ x1: compX, y1: compY, x2: projX, y2: projY, tier: 'leaf' });
        });
      });
    });
  });

  // Cross-link edges (dashed) between same-company nodes in different categories/countries
  if (data.crossLinks) {
    data.crossLinks.forEach(({ nodeIds }) => {
      const positions = nodeIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);
      for (let a = 0; a < positions.length - 1; a++) {
        for (let b = a + 1; b < positions.length; b++) {
          edges.push({ x1: positions[a].x, y1: positions[a].y, x2: positions[b].x, y2: positions[b].y, tier: 'cross' });
        }
      }
    });
  }
  return { nodes, edges };
}
