// issuer: 'keychain' = propio de KEYCHAIN/Factoract | 'verified' = empresa verificada | 'community' = sin verificar
export const RWA_ASSETS = [
  { id: 1, cat: 'Autos', country: 'EE.UU.', company: 'AutoMax', issuer: 'keychain',
    name: 'Flota Tesla Model 3', location: 'Los Ángeles, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 450000, tokenPrice: 45, totalTokens: 10000, sold: 67, apy: 12.4, stage: 'Operativo', lifespan: '6 años', contract: '0x4a9fE2b81cC3a91D7Bd82c4F1e6A9d82c4F1e6A9', desc: 'Flota de 10 Tesla Model 3 operando en plataforma de ride-hailing. Ingresos mensuales distribuidos pro-rata entre holders.', perf: [40,42,41,45,44,47,46,49,51,50,53,55] },

  { id: 2, cat: 'Autos', country: 'EE.UU.', company: 'CarRent', issuer: 'verified',
    name: 'Porsche 911 Carrera', location: 'Miami, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 120000, tokenPrice: 120, totalTokens: 1000, sold: 42, apy: 9.8, stage: 'Recaudación', lifespan: '8 años', contract: '0x7bC4d91A2eF5a3B8c6D9e0F1a2B3c4D5e6F7a8B9', desc: 'Vehículo de colección con renta premium para eventos y producciones. Apreciación histórica del 4% anual.', perf: [100,98,102,106,104,110,112,109,115,118,116,120] },

  { id: 3, cat: 'Campos', country: 'Argentina', company: 'AgroToken', issuer: 'keychain',
    name: 'Campo Agrícola Pergamino', location: 'Buenos Aires, Argentina',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2400000, tokenPrice: 100, totalTokens: 24000, sold: 81, apy: 14.2, stage: 'Operativo', lifespan: '25 años', contract: '0x1aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0', desc: '240 hectáreas de soja y maíz en zona núcleo. Rinde auditado por consultora agronómica independiente.', perf: [88,90,92,95,94,98,100,103,105,108,110,114] },

  { id: 4, cat: 'Campos', country: 'Argentina', company: 'VitivinARG', issuer: 'community',
    name: 'Viñedo Valle de Uco', location: 'Mendoza, Argentina',
    images: [
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1800000, tokenPrice: 75, totalTokens: 24000, sold: 38, apy: 11.8, stage: 'Recaudación', lifespan: '30 años', contract: '0x9cD8e7F6a5B4c3D2e1F0a9B8c7D6e5F4a3B2c1D0', desc: '85 hectáreas de Malbec premium con bodega boutique. Contrato de compra garantizado con exportadora.', perf: [70,71,72,74,73,75,77,78,80,81,83,85] },

  { id: 5, cat: 'Drones', country: 'Argentina', company: 'DroneAgro', issuer: 'verified',
    name: 'Flota Drones Agrícolas DJI', location: 'Córdoba, Argentina',
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 380000, tokenPrice: 38, totalTokens: 10000, sold: 92, apy: 18.6, stage: 'Operativo', lifespan: '4 años', contract: '0x2eF3a4B5c6D7e8F9a0B1c2D3e4F5a6B7c8D9e0F1', desc: '20 drones DJI Agras T40 para pulverización de precisión. Contratos de servicio con 14 productores.', perf: [30,32,34,33,36,38,40,42,41,44,46,48] },

  { id: 6, cat: 'Edificios', country: 'Argentina', company: 'PropChain', issuer: 'keychain',
    name: 'Edificio Corporativo Palermo', location: 'CABA, Argentina',
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1590650046871-92c887180603?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 8500000, tokenPrice: 250, totalTokens: 34000, sold: 56, apy: 8.9, stage: 'Recaudación', lifespan: '50 años', contract: '0x5aB6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a3B4', desc: 'Torre AAA de 12 pisos con 94% de ocupación. Inquilinos corporativos con contratos a 5 años.', perf: [230,232,235,238,240,242,245,243,247,250,252,255] },

  { id: 7, cat: 'Inmuebles', country: 'España', company: 'EuroRent', issuer: 'verified',
    name: 'Complejo Residencial Madrid', location: 'Madrid, España',
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 3200000, tokenPrice: 160, totalTokens: 20000, sold: 73, apy: 7.6, stage: 'Operativo', lifespan: '40 años', contract: '0x8dE9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7', desc: '16 unidades en alquiler de larga estadía en Chamberí. Rentabilidad estable con demanda sostenida.', perf: [148,150,151,153,154,156,157,158,160,161,163,165] },

  { id: 8, cat: 'Edificios', country: 'EE.UU.', company: 'LogiCorp', issuer: 'community',
    name: 'Torre Logística Miami', location: 'Miami, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 12000000, tokenPrice: 400, totalTokens: 30000, sold: 29, apy: 10.4, stage: 'Recaudación', lifespan: '45 años', contract: '0x3fA4b5C6d7E8f9A0b1C2d3E4f5A6b7C8d9E0f1A2', desc: 'Centro de distribución last-mile de 18.000 m². Pre-alquilado a operador logístico internacional.', perf: [380,385,382,390,392,395,398,396,400,402,405,410] },

  // ─── Sample listings below (ids 9-50) — 10 per rubro total ───────────────
  { id: 9, cat: 'Autos', country: 'EE.UU.', company: 'AutoMax', issuer: 'verified',
    name: 'Flota Uber Toyota Corolla Híbrido', location: 'Chicago, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 337531, tokenPrice: 29, totalTokens: 11639, sold: 42, apy: 15.8, stage: 'Recaudación', lifespan: '8 años', contract: '0x0ccefCB5C9E3C60a03E57dAcBdd151DF5B491037', desc: 'Flota de 15 Toyota Corolla híbridos operando en plataformas de ride-hailing. Mantenimiento incluido y seguro full cobertura.', perf: [17,18,19,19,20,22,22,24,26,27,27,29] },

  { id: 10, cat: 'Autos', country: 'EE.UU.', company: 'CarRent', issuer: 'verified',
    name: 'Ferrari 488 GTB Edición Limitada', location: 'Los Ángeles, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 266931, tokenPrice: 223, totalTokens: 1197, sold: 70, apy: 10.6, stage: 'Operativo', lifespan: '7 años', contract: '0xd22CeaBeD72a1D7fb11b9E0EEddbab5427Fd5f6f', desc: 'Superdeportivo de colección con renta premium para eventos y sesiones fotográficas. Apreciación histórica sostenida.', perf: [138,144,150,160,170,175,189,195,201,204,219,223] },

  { id: 11, cat: 'Autos', country: 'Argentina', company: 'AutoMax', issuer: 'keychain',
    name: 'Flota BYD Eléctrica Delivery', location: 'Buenos Aires, Argentina',
    images: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 291600, tokenPrice: 27, totalTokens: 10800, sold: 77, apy: 16, stage: 'Operativo', lifespan: '7 años', contract: '0x8c9ffe96dBE811DccDCCD1880aedCee0Cc63304f', desc: 'Flota de 20 utilitarios eléctricos BYD para logística de última milla en CABA y GBA.', perf: [15,16,18,18,21,20,23,22,24,24,27,27] },

  { id: 12, cat: 'Autos', country: 'España', company: 'CarRent', issuer: 'keychain',
    name: 'Lamborghini Huracán Evo', location: 'Madrid, España',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 126170, tokenPrice: 155, totalTokens: 814, sold: 20, apy: 8.3, stage: 'Recaudación', lifespan: '4 años', contract: '0xf3eC9D2f2FbA6cfF11b674d35c95aa2eAC1CDAe8', desc: 'Vehículo de alta gama para renta de eventos exclusivos y turismo de lujo en la Costa del Sol.', perf: [92,97,103,110,117,120,129,134,138,142,148,155] },

  { id: 13, cat: 'Autos', country: 'Argentina', company: 'AutoMax', issuer: 'verified',
    name: 'Flota Pickup Ford Ranger Agro', location: 'Córdoba, Argentina',
    images: [
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 236151, tokenPrice: 19, totalTokens: 12429, sold: 53, apy: 9.3, stage: 'Recaudación', lifespan: '7 años', contract: '0xfEF3E3F2C8506bE77696185AAD4665C45F58Dd8d', desc: 'Flota de pickups 4x4 alquiladas a contratistas rurales para la campaña agrícola.', perf: [12,11,13,13,14,15,15,15,17,18,18,19] },

  { id: 14, cat: 'Autos', country: 'EE.UU.', company: 'CarRent', issuer: 'keychain',
    name: 'Mercedes-Benz Clase G Blindado', location: 'Miami, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 197010, tokenPrice: 198, totalTokens: 995, sold: 20, apy: 16, stage: 'Recaudación', lifespan: '7 años', contract: '0xdACdEFaD316781BaCCBD07EB6Daa90ef8eAD29cD', desc: 'Unidad blindada nivel B6 en renta corporativa para ejecutivos y diplomáticos.', perf: [126,132,139,143,156,162,162,173,177,183,193,198] },

  { id: 15, cat: 'Autos', country: 'España', company: 'AutoMax', issuer: 'keychain',
    name: 'Flota Taxis Eléctricos BYD', location: 'Barcelona, España',
    images: [
      'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 234182, tokenPrice: 26, totalTokens: 9007, sold: 53, apy: 16.8, stage: 'Recaudación', lifespan: '8 años', contract: '0xb33F696EEfd9bC74a1a93476524C04E9C9AA5ECA', desc: 'Flota de 25 taxis eléctricos homologados operando bajo licencia municipal.', perf: [15,16,18,18,18,21,21,22,24,25,25,26] },

  { id: 16, cat: 'Autos', country: 'Argentina', company: 'CarRent', issuer: 'community',
    name: 'Range Rover Sport Colección', location: 'Buenos Aires, Argentina',
    images: [
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 324690, tokenPrice: 79, totalTokens: 4110, sold: 50, apy: 15.8, stage: 'Recaudación', lifespan: '10 años', contract: '0xDc7D0CABCbadfeAEBBDC4e7FcF27E7e04C9Fd495', desc: 'SUV premium en renta ejecutiva de largo plazo para empresas y turismo corporativo.', perf: [48,52,55,58,61,61,64,67,72,74,76,79] },

  { id: 17, cat: 'Campos', country: 'Argentina', company: 'AgroToken', issuer: 'community',
    name: 'Campo Sojero Rosario', location: 'Rosario, Argentina',
    images: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2808435, tokenPrice: 105, totalTokens: 26747, sold: 73, apy: 8.8, stage: 'Operativo', lifespan: '15 años', contract: '0x3fDaE0Bc68B7bD8bfdAb43F3faBe182bbDa5b0eB', desc: '380 hectáreas de soja de primera en zona núcleo santafesina. Arrendado a productor de trayectoria.', perf: [68,71,74,77,82,84,87,90,95,96,101,105] },

  { id: 18, cat: 'Campos', country: 'Argentina', company: 'VitivinARG', issuer: 'keychain',
    name: 'Viñedo Cafayate Premium', location: 'Salta, Argentina',
    images: [
      'https://images.unsplash.com/photo-1637181156153-bedd1098f8c1?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1637181156153-bedd1098f8c1?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1416450, tokenPrice: 71, totalTokens: 19950, sold: 89, apy: 17.8, stage: 'Operativo', lifespan: '20 años', contract: '0xa2F421d95C7cDEF3f690faDA5d9Ea284EF7EaD37', desc: '60 hectáreas de Torrontés y Malbec de altura con bodega propia y exportación directa.', perf: [39,42,44,48,52,54,57,60,63,65,67,71] },

  { id: 19, cat: 'Campos', country: 'España', company: 'VitivinARG', issuer: 'verified',
    name: 'Olivar Andaluz Centenario', location: 'Jaén, España',
    images: [
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1691823, tokenPrice: 119, totalTokens: 14217, sold: 59, apy: 16, stage: 'Operativo', lifespan: '25 años', contract: '0x68A7DbA72B48701aF112DBA8fC3AC3C1fBE6BA8F', desc: 'Plantación de olivos centenarios con producción de aceite de oliva virgen extra premiado.', perf: [77,79,85,85,90,93,99,103,108,109,115,119] },

  { id: 20, cat: 'Campos', country: 'Argentina', company: 'AgroToken', issuer: 'verified',
    name: 'Campo Ganadero Corrientes', location: 'Corrientes, Argentina',
    images: [
      'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2354046, tokenPrice: 87, totalTokens: 27058, sold: 79, apy: 11.2, stage: 'Operativo', lifespan: '30 años', contract: '0x8F0A27EAcEa0aABFdEF2B6EF860AdE193aDEBDcd', desc: '1.200 hectáreas de pastizal natural para cría e invernada de ganado bovino.', perf: [57,59,61,65,69,69,75,75,78,82,84,87] },

  { id: 21, cat: 'Campos', country: 'Argentina', company: 'AgroToken', issuer: 'community',
    name: 'Huerta de Cítricos Tucumán', location: 'Tucumán, Argentina',
    images: [
      'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1761155, tokenPrice: 71, totalTokens: 24805, sold: 48, apy: 13.2, stage: 'Recaudación', lifespan: '40 años', contract: '0x58306cD0222b5945Fa821432a3E2d165671ee46D', desc: '150 hectáreas de limón fino con planta de empaque propia y exportación a Europa.', perf: [47,48,50,52,56,58,59,63,63,65,68,71] },

  { id: 22, cat: 'Campos', country: 'Argentina', company: 'AgroToken', issuer: 'community',
    name: 'Campo Maicero Pergamino Norte', location: 'Pergamino, Argentina',
    images: [
      'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1955030, tokenPrice: 110, totalTokens: 17773, sold: 56, apy: 14.4, stage: 'Operativo', lifespan: '15 años', contract: '0xBa4f7F3FcD67C4CA67Ab1FA02c11916cB9d5d69a', desc: '210 hectáreas de maíz en rotación con soja, riego complementario por pivote central.', perf: [70,71,74,81,85,89,90,93,97,101,105,110] },

  { id: 23, cat: 'Campos', country: 'Argentina', company: 'VitivinARG', issuer: 'keychain',
    name: 'Viñedo Uco Valley Reserva', location: 'Mendoza, Argentina',
    images: [
      'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1568151, tokenPrice: 117, totalTokens: 13403, sold: 76, apy: 18.9, stage: 'Operativo', lifespan: '30 años', contract: '0x82F1Aedffd6a2b1843c2CEaFa9BFdC5791A3edb7', desc: '45 hectáreas de Malbec de altura, línea reserva con contratos de exportación a EE.UU.', perf: [80,84,88,93,95,98,102,102,105,109,114,117] },

  { id: 24, cat: 'Campos', country: 'España', company: 'AgroToken', issuer: 'verified',
    name: 'Viñedo Rioja Alta', location: 'La Rioja, España',
    images: [
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1405116, tokenPrice: 138, totalTokens: 10182, sold: 33, apy: 9.2, stage: 'Recaudación', lifespan: '20 años', contract: '0x2BBbBaf906D7BBc18e24B0ad4f25bc0D9f6B66bB', desc: 'Bodega boutique de 30 hectáreas en denominación de origen calificada Rioja.', perf: [83,84,92,98,100,107,113,118,120,126,132,138] },

  { id: 25, cat: 'Drones', country: 'EE.UU.', company: 'DroneAgro', issuer: 'verified',
    name: 'Drones de Inspección Solar', location: 'Austin, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1506947411487-a56738267384?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1506947411487-a56738267384?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 372096, tokenPrice: 32, totalTokens: 11628, sold: 63, apy: 14.7, stage: 'Operativo', lifespan: '3 años', contract: '0xaf96EBFC3A05CDe294d4EdDFeC1B74eE009ab8f9', desc: 'Flota de 12 drones térmicos para inspección de parques solares utility-scale.', perf: [20,20,21,23,24,24,27,27,28,31,30,32] },

  { id: 26, cat: 'Drones', country: 'España', company: 'SkyOps', issuer: 'keychain',
    name: 'Flota Drones de Delivery Urbano', location: 'Valencia, España',
    images: [
      'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1473186639016-1451879a06f0?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 375130, tokenPrice: 46, totalTokens: 8155, sold: 88, apy: 15.9, stage: 'Operativo', lifespan: '6 años', contract: '0x550f0E752820dfCBe4128Ed8790c0de5FFCCA42c', desc: 'Operación de delivery last-mile con drones certificados en zona urbana autorizada.', perf: [29,31,32,34,35,36,38,39,41,43,44,46] },

  { id: 27, cat: 'Drones', country: 'Argentina', company: 'DroneAgro', issuer: 'community',
    name: 'Drones de Mapeo Catastral', location: 'Buenos Aires, Argentina',
    images: [
      'https://images.unsplash.com/photo-1488263590619-bc1fff43b6c1?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1488263590619-bc1fff43b6c1?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 225825, tokenPrice: 25, totalTokens: 9033, sold: 29, apy: 17.4, stage: 'Recaudación', lifespan: '4 años', contract: '0x4d6A356e42321CfaBC034FB3d97f7329e9477ED7', desc: 'Servicio de relevamiento topográfico y catastral con drones RTK de alta precisión.', perf: [18,17,18,19,19,20,21,22,22,23,25,25] },

  { id: 28, cat: 'Drones', country: 'EE.UU.', company: 'SkyOps', issuer: 'verified',
    name: 'Flota Drones de Seguridad Perimetral', location: 'Houston, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 588202, tokenPrice: 46, totalTokens: 12787, sold: 24, apy: 15.6, stage: 'Recaudación', lifespan: '6 años', contract: '0xAEbAe0aaab0577d1cDbC7A697f4aeEaf67fB5cd1', desc: 'Vigilancia autónoma 24/7 de predios industriales con drones de patrullaje.', perf: [27,29,30,31,34,35,36,39,41,42,43,46] },

  { id: 29, cat: 'Drones', country: 'Argentina', company: 'DroneAgro', issuer: 'verified',
    name: 'Drones Fumigadores de Precisión', location: 'Córdoba, Argentina',
    images: [
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 253384, tokenPrice: 38, totalTokens: 6668, sold: 96, apy: 17.1, stage: 'Operativo', lifespan: '3 años', contract: '0x4bfA93F68cC06aCCeC694C5CdBF7Cd3f55A2a828', desc: 'Flota de drones agrícolas para aplicación variable de agroquímicos de precisión.', perf: [22,25,27,28,28,31,32,32,34,36,37,38] },

  { id: 30, cat: 'Drones', country: 'Argentina', company: 'SkyOps', issuer: 'keychain',
    name: 'Flota Drones Topográficos Mineros', location: 'San Juan, Argentina',
    images: [
      'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 268716, tokenPrice: 42, totalTokens: 6398, sold: 43, apy: 9.2, stage: 'Recaudación', lifespan: '6 años', contract: '0x1e76A20f6c7bE8bBb9d7ff2C6Ca9834F64f1B579', desc: 'Relevamiento volumétrico de pilas de mineral en operaciones mineras a cielo abierto.', perf: [26,27,28,30,31,34,34,36,38,40,41,42] },

  { id: 31, cat: 'Drones', country: 'EE.UU.', company: 'DroneAgro', issuer: 'keychain',
    name: 'Drones de Filmación Cinematográfica', location: 'Los Ángeles, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 468658, tokenPrice: 62, totalTokens: 7559, sold: 89, apy: 11.1, stage: 'Operativo', lifespan: '5 años', contract: '0xb231Ca18152c0cE8e79fDf43E47ae4C7B173BCf5', desc: 'Equipo de drones cinema-grade en renta para producciones audiovisuales.', perf: [43,44,46,48,50,52,53,56,58,57,60,62] },

  { id: 32, cat: 'Drones', country: 'España', company: 'DroneAgro', issuer: 'verified',
    name: 'Flota Drones Forestales Anti-incendio', location: 'Girona, España',
    images: [
      'https://images.unsplash.com/photo-1473186639016-1451879a06f0?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1473186639016-1451879a06f0?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 270060, tokenPrice: 30, totalTokens: 9002, sold: 43, apy: 17.6, stage: 'Recaudación', lifespan: '5 años', contract: '0x315194A0D40cdbdF197Bc8Aa85C64Fb688972d35', desc: 'Drones de detección temprana de incendios forestales con cámaras térmicas.', perf: [19,19,21,22,22,24,25,26,26,27,29,30] },

  { id: 33, cat: 'Drones', country: 'Argentina', company: 'SkyOps', issuer: 'community',
    name: 'Drones de Inspección de Torres Eléctricas', location: 'Mendoza, Argentina',
    images: [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 212112, tokenPrice: 27, totalTokens: 7856, sold: 62, apy: 18, stage: 'Operativo', lifespan: '4 años', contract: '0x1Ad597cB3bd35b3ae1c59F22faE4F3C7EEc16Cf9', desc: 'Inspección autónoma de líneas de alta tensión para distribuidoras eléctricas.', perf: [17,17,19,19,21,21,22,24,24,26,26,27] },

  { id: 34, cat: 'Inmuebles', country: 'España', company: 'EuroRent', issuer: 'keychain',
    name: 'Apartamentos Barcelona Eixample', location: 'Barcelona, España',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1798974, tokenPrice: 153, totalTokens: 11758, sold: 95, apy: 13.3, stage: 'Operativo', lifespan: '25 años', contract: '0xBD939eAa569Ac52D518AfB5df90a92a5fD0Ad0c1', desc: '12 apartamentos turísticos en el Eixample con ocupación promedio del 85%.', perf: [87,93,104,109,110,121,125,129,138,141,150,153] },

  { id: 35, cat: 'Inmuebles', country: 'EE.UU.', company: 'HomeChain', issuer: 'community',
    name: 'Residencial Miami Brickell', location: 'Miami, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 4534698, tokenPrice: 202, totalTokens: 22449, sold: 77, apy: 10.5, stage: 'Operativo', lifespan: '20 años', contract: '0x55D0f7C4b2DCFB694fb6E90A0C6BC1C78Eab28aa', desc: 'Torre residencial de 40 unidades en el distrito financiero de Brickell.', perf: [127,141,141,147,159,162,170,173,183,190,195,202] },

  { id: 36, cat: 'Inmuebles', country: 'Argentina', company: 'HomeChain', issuer: 'community',
    name: 'Condominio Puerto Madero', location: 'CABA, Argentina',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 3548193, tokenPrice: 209, totalTokens: 16977, sold: 30, apy: 13.5, stage: 'Recaudación', lifespan: '35 años', contract: '0xEda671De8D88dfB8d38Ebdc1cfDFff424E4FB63E', desc: 'Complejo de 24 departamentos premium frente al río en Puerto Madero.', perf: [118,132,135,140,152,157,169,174,183,193,201,209] },

  { id: 37, cat: 'Inmuebles', country: 'España', company: 'EuroRent', issuer: 'community',
    name: 'Departamentos Valencia Playa', location: 'Valencia, España',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 3133250, tokenPrice: 151, totalTokens: 20750, sold: 52, apy: 17.9, stage: 'Recaudación', lifespan: '20 años', contract: '0xBFEc0CFDBCc645A64E6Ce2de0D070EFb127E209e', desc: '18 departamentos de alquiler vacacional a metros de la Playa de la Malvarrosa.', perf: [105,108,114,114,119,126,132,135,139,143,144,151] },

  { id: 38, cat: 'Inmuebles', country: 'EE.UU.', company: 'HomeChain', issuer: 'verified',
    name: 'Residencial Brooklyn Heights', location: 'Nueva York, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 5406432, tokenPrice: 283, totalTokens: 19104, sold: 88, apy: 13.1, stage: 'Operativo', lifespan: '30 años', contract: '0x59B72E48F2b2DdcF3181B75dABDad4CECfA20283', desc: 'Edificio residencial de 30 unidades en uno de los barrios más demandados de NY.', perf: [163,175,184,193,204,221,232,243,252,258,273,283] },

  { id: 39, cat: 'Inmuebles', country: 'Argentina', company: 'HomeChain', issuer: 'community',
    name: 'Dúplex Premium Palermo Soho', location: 'CABA, Argentina',
    images: [
      'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2010150, tokenPrice: 150, totalTokens: 13401, sold: 90, apy: 18, stage: 'Operativo', lifespan: '40 años', contract: '0x89366DC5ddF6BD590dad69e7605a813789B40DE4', desc: '10 dúplex de diseño en el corazón de Palermo Soho con renta corta estadía.', perf: [96,100,104,110,118,118,124,130,137,143,146,150] },

  { id: 40, cat: 'Inmuebles', country: 'España', company: 'HomeChain', issuer: 'verified',
    name: 'Apartamentos Sevilla Centro', location: 'Sevilla, España',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2030422, tokenPrice: 146, totalTokens: 13907, sold: 45, apy: 8.3, stage: 'Recaudación', lifespan: '30 años', contract: '0xBdCE24CA8C45Ff80aEDD187beADaa913c654aAd2', desc: '14 apartamentos turísticos totalmente reformados en el casco histórico.', perf: [103,107,109,112,117,123,126,128,131,139,144,146] },

  { id: 41, cat: 'Inmuebles', country: 'EE.UU.', company: 'EuroRent', issuer: 'verified',
    name: 'Residencial Austin Tech District', location: 'Austin, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 2229120, tokenPrice: 160, totalTokens: 13932, sold: 51, apy: 14.3, stage: 'Recaudación', lifespan: '40 años', contract: '0xc0BebdD6CF0b278Ee75fAd4BE6dbbce4aD829861', desc: '22 unidades residenciales orientadas a profesionales del sector tecnológico.', perf: [108,116,120,121,130,132,138,141,146,152,152,160] },

  { id: 42, cat: 'Inmuebles', country: 'EE.UU.', company: 'HomeChain', issuer: 'keychain',
    name: 'Loft Industrial Chicago', location: 'Chicago, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1930916, tokenPrice: 142, totalTokens: 13598, sold: 83, apy: 6.3, stage: 'Operativo', lifespan: '40 años', contract: '0xFa1ECa59da9c0e27fbECb1AC26Ef91559B83DF6a', desc: '16 lofts reconvertidos de una ex fábrica textil en el West Loop.', perf: [96,101,103,109,116,115,122,126,131,136,136,142] },

  { id: 43, cat: 'Edificios', country: 'Argentina', company: 'PropChain', issuer: 'community',
    name: 'Torre Oficinas Puerto Madero', location: 'CABA, Argentina',
    images: [
      'https://images.unsplash.com/photo-1631085474949-d8a367d9d26d?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1631085474949-d8a367d9d26d?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 9915300, tokenPrice: 300, totalTokens: 33051, sold: 70, apy: 18.9, stage: 'Operativo', lifespan: '30 años', contract: '0xa3dED4924e626511B71dee24691ee4CbAB2FAC6F', desc: 'Torre AAA de 18 pisos con certificación LEED Gold y ocupación del 88%.', perf: [175,187,199,216,224,235,242,255,264,283,283,300] },

  { id: 44, cat: 'Edificios', country: 'Argentina', company: 'PropChain', issuer: 'keychain',
    name: 'Centro Comercial Rosario', location: 'Rosario, Argentina',
    images: [
      'https://images.unsplash.com/photo-1758022959319-5089f72d66cd?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1758022959319-5089f72d66cd?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 8122116, tokenPrice: 284, totalTokens: 28599, sold: 47, apy: 10, stage: 'Recaudación', lifespan: '45 años', contract: '0x0c0C994CE9aBbd8c1EbFB79F877f19Ad625002b1', desc: 'Shopping de 22.000 m² con 90 locales y anclas nacionales de primer nivel.', perf: [167,178,185,198,209,218,228,244,258,264,275,284] },

  { id: 45, cat: 'Edificios', country: 'EE.UU.', company: 'LogiCorp', issuer: 'verified',
    name: 'Torre Corporativa Houston', location: 'Houston, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1703224204050-695c5dffc734?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1703224204050-695c5dffc734?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 9695952, tokenPrice: 336, totalTokens: 28857, sold: 88, apy: 8.1, stage: 'Operativo', lifespan: '30 años', contract: '0x77FE3d8feABe9f7c0e1aF9fa7e351fa3Da40896a', desc: 'Edificio corporativo de 24 pisos alquilado a firmas del sector energético.', perf: [187,200,223,231,249,259,272,290,298,312,317,336] },

  { id: 46, cat: 'Edificios', country: 'España', company: 'PropChain', issuer: 'keychain',
    name: 'Edificio de Oficinas Madrid', location: 'Madrid, España',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 8520361, tokenPrice: 353, totalTokens: 24137, sold: 67, apy: 14.3, stage: 'Operativo', lifespan: '45 años', contract: '0xAcE7eE3A3b4C221d23C580ffBF0ac727Dcedf05f', desc: 'Oficinas clase A en el distrito financiero de AZCA, ocupación plena.', perf: [207,224,242,248,257,279,290,296,313,330,342,353] },

  { id: 47, cat: 'Edificios', country: 'Argentina', company: 'LogiCorp', issuer: 'keychain',
    name: 'Depósito Industrial Córdoba', location: 'Córdoba, Argentina',
    images: [
      'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 3191760, tokenPrice: 156, totalTokens: 20460, sold: 58, apy: 10.4, stage: 'Operativo', lifespan: '30 años', contract: '0xd8D2446E8BfB04Aa20C065E2AEACE65bbDF1F21c', desc: 'Centro de distribución de 12.000 m² pre-alquilado a operador logístico nacional.', perf: [89,98,106,110,117,122,128,131,140,147,152,156] },

  { id: 48, cat: 'Edificios', country: 'EE.UU.', company: 'LogiCorp', issuer: 'keychain',
    name: 'Torre Financiera Miami', location: 'Miami, EE.UU.',
    images: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=560&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 17254572, tokenPrice: 438, totalTokens: 39394, sold: 59, apy: 9.2, stage: 'Operativo', lifespan: '45 años', contract: '0x01839Cdc871aEE890b9A6be9aa17E3F8653bE23d', desc: 'Torre financiera de 30 pisos con inquilinos del sector bancario internacional.', perf: [297,309,313,327,345,363,380,385,402,403,422,438] },

  { id: 49, cat: 'Edificios', country: 'España', company: 'LogiCorp', issuer: 'community',
    name: 'Centro de Datos Madrid', location: 'Madrid, España',
    images: [
      'https://images.unsplash.com/photo-1554435493-93422e8220c8?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1554435493-93422e8220c8?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 13135621, tokenPrice: 421, totalTokens: 31201, sold: 84, apy: 8, stage: 'Operativo', lifespan: '30 años', contract: '0xAA17bBE06C26e44c3f041cf2dfAada0Ba8a553dD', desc: 'Data center Tier III de 8.000 m² con contratos a 10 años con hyperscalers.', perf: [242,255,262,293,299,324,330,359,373,381,412,421] },

  { id: 50, cat: 'Edificios', country: 'Argentina', company: 'PropChain', issuer: 'keychain',
    name: 'Edificio Boutique Palermo Hollywood', location: 'CABA, Argentina',
    images: [
      'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=900&h=560&fit=crop&auto=format&q=80',
    ],
    img: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 4942140, tokenPrice: 205, totalTokens: 24108, sold: 54, apy: 14.9, stage: 'Recaudación', lifespan: '30 años', contract: '0xaf3F27D2d0adD8cf5813f0cf7AdeB477fb8aEB03', desc: 'Edificio de oficinas boutique de 6 pisos en polo creativo y tecnológico.', perf: [135,146,150,152,165,165,175,183,190,190,197,205] },

  // ─── QA fixtures (ids 51-57) — one asset per funding/feed/ownership state ──
  // so every combination the product needs to support has a concrete example
  // to click into. See the `devNote` field on each: it drives the dismissible
  // "for developers" banner in ProductDetail. DEVELOPERS: delete this whole
  // block (and the QA entry in RWA_CATS below) before shipping to production.
  { id: 51, cat: 'QA', country: 'Argentina', company: 'AgroToken', issuer: 'community',
    name: '[QA] Proyecto Nuevo — Sin Financiamiento', location: 'Santa Fe, Argentina',
    images: ['https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 0, apy: 10, stage: 'Recaudación', lifespan: '20 años', contract: '0x1000000000000000000000000000000000000A', desc: 'Fixture de QA — proyecto recién publicado, todavía sin ningún token vendido.', perf: [0,0,0,0,0,0,0,0,0,0,0,0],
    devNote: 'Estado: NUEVO sin financiamiento (sold=0%, stage="Recaudación", feedEnabled=false). No debería mostrar las pestañas Feed ni Actualizaciones.' },

  { id: 52, cat: 'QA', country: 'EE.UU.', company: 'AutoMax', issuer: 'community',
    name: '[QA] En Financiamiento — 40%', location: 'Austin, EE.UU.',
    images: ['https://images.unsplash.com/photo-1494905998402-395d579af36f?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 40, apy: 11, stage: 'Recaudación', lifespan: '8 años', contract: '0x1000000000000000000000000000000000000B', desc: 'Fixture de QA — ronda de financiamiento al 40%, sin actividad operativa todavía.', perf: [10,14,18,20,24,27,30,33,36,38,39,40],
    devNote: 'Estado: en financiamiento al 40% (sold=40%, stage="Recaudación", feedEnabled=false). Sin Feed ni Actualizaciones — todavía no hay nada que reportar.' },

  { id: 53, cat: 'QA', country: 'España', company: 'PropChain', issuer: 'verified',
    name: '[QA] En Financiamiento 50% — Feed Habilitado', location: 'Bilbao, España',
    images: ['https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 50, apy: 12, stage: 'Recaudación', lifespan: '30 años', contract: '0x1000000000000000000000000000000000000C', desc: 'Fixture de QA — sigue en ronda, pero el emisor ya empezó a construir/comprar el activo y quiere publicar avances.', perf: [15,18,22,26,29,32,35,38,41,44,47,50], feedEnabled: true,
    devNote: 'Estado: en financiamiento al 50% con feedEnabled=true — ya empezó a construir/comprar el activo mientras sigue la ronda. Debe mostrar Feed y Actualizaciones a pesar de stage="Recaudación" (sold<100).' },

  { id: 54, cat: 'QA', country: 'Argentina', company: 'HomeChain', issuer: 'keychain',
    name: '[QA] Financiado Completamente (100%)', location: 'CABA, Argentina',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 100, apy: 13, stage: 'Recaudación', lifespan: '25 años', contract: '0x1000000000000000000000000000000000000D', desc: 'Fixture de QA — la ronda acaba de cerrar al 100%, todavía no pasó a stage "Operativo".', perf: [30,38,45,53,60,67,74,81,88,93,97,100],
    devNote: 'Estado: FINANCIADO completamente (sold=100%) pero aún stage="Recaudación" (recién cerró, no pasó a Operativo todavía). Debe mostrar Feed/Actualizaciones por la regla sold>=100.' },

  { id: 55, cat: 'QA', country: 'Argentina', company: 'Tu Empresa', issuer: 'verified',
    name: '[QA] Mi Proyecto (Emisor)', location: 'CABA, Argentina',
    images: ['https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 100, apy: 14, stage: 'Operativo', lifespan: '10 años', contract: '0x1000000000000000000000000000000000000E', desc: 'Fixture de QA — proyecto operativo del cual el usuario actual es el emisor, no solo inversor.', perf: [40,48,55,62,68,74,80,86,91,95,98,100], isMine: true,
    devNote: 'Estado: "Mi Proyecto" (isMine=true). El panel para publicar en el Feed (composer) solo debe aparecer en este activo — en todos los demás, aunque tengan Feed, la vista debe ser de solo lectura.' },

  { id: 56, cat: 'QA', country: 'Argentina', company: 'AgroToken', issuer: 'community',
    name: '[QA] En Financiamiento 40% — Invertí', location: 'Rosario, Argentina',
    images: ['https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 40, apy: 11, stage: 'Recaudación', lifespan: '20 años', contract: '0x1000000000000000000000000000000000000F', desc: 'Fixture de QA — ronda al 40%, y el usuario ya invirtió (ver MY_HOLDINGS).', perf: [10,14,18,20,24,27,30,33,36,38,39,40],
    devNote: 'Estado: en financiamiento al 40% Y el usuario ya invirtió (MY_HOLDINGS). Sin Feed (sold<100, feedEnabled=false) — en la tarjeta "Tu inversión" NO debe aparecer el botón "Ver avances", solo "Vender".' },

  { id: 57, cat: 'QA', country: 'España', company: 'PropChain', issuer: 'verified',
    name: '[QA] En Financiamiento 50% (Feed) — Invertí', location: 'Valencia, España',
    images: ['https://images.unsplash.com/photo-1631085474949-d8a367d9d26d?w=900&h=560&fit=crop&auto=format&q=80'],
    img: 'https://images.unsplash.com/photo-1631085474949-d8a367d9d26d?w=900&h=560&fit=crop&auto=format&q=80',
    valuation: 1000000, tokenPrice: 100, totalTokens: 10000, sold: 50, apy: 12, stage: 'Recaudación', lifespan: '30 años', contract: '0x10000000000000000000000000000000000010', desc: 'Fixture de QA — ronda al 50% con feed habilitado, y el usuario ya invirtió (ver MY_HOLDINGS).', perf: [15,18,22,26,29,32,35,38,41,44,47,50], feedEnabled: true,
    devNote: 'Estado: en financiamiento al 50% con feedEnabled=true Y el usuario ya invirtió (MY_HOLDINGS). Debe tener Feed/Actualizaciones Y el botón "Ver avances" debe aparecer en "Tu inversión".' },
];

// 'QA' groups the developer-only test fixtures (ids 51-57) above — remove it
// here too once those fixtures are deleted for production.
export const RWA_CATS      = ['Todos', 'Autos', 'Campos', 'Drones', 'Inmuebles', 'Edificios', 'QA'];
export const RWA_COUNTRIES = ['Todos', 'Argentina', 'EE.UU.', 'España'];
export const RWA_COMPANIES = ['Todos', 'AutoMax', 'CarRent', 'AgroToken', 'VitivinARG', 'DroneAgro', 'SkyOps', 'PropChain', 'EuroRent', 'LogiCorp', 'HomeChain', 'Tu Empresa'];

export const SECONDARY_LISTINGS = [
  { id: 1, assetId: 3, seller: 'Martín Quiroga', sellerRep: 4.9, qty: 120, askPrice: 92, realPrice: 100, listed: 'hace 2 h', tokenLife: '23.4 años restantes' },
  { id: 2, assetId: 1, seller: 'Ana Pereyra', sellerRep: 4.7, qty: 300, askPrice: 41.5, realPrice: 45, listed: 'hace 5 h', tokenLife: '4.8 años restantes' },
  { id: 3, assetId: 5, seller: 'Lucas Giménez', sellerRep: 4.8, qty: 85, askPrice: 42, realPrice: 38, listed: 'hace 1 día', tokenLife: '3.1 años restantes' },
  { id: 4, assetId: 6, seller: 'Sofía Brandán', sellerRep: 5.0, qty: 40, askPrice: 232, realPrice: 250, listed: 'hace 1 día', tokenLife: '48.2 años restantes' },
  { id: 5, assetId: 7, seller: 'Diego Funes', sellerRep: 4.6, qty: 60, askPrice: 168, realPrice: 160, listed: 'hace 3 días', tokenLife: '38.5 años restantes' },
  { id: 6, assetId: 4, seller: 'Carla Mestre', sellerRep: 4.9, qty: 200, askPrice: 69, realPrice: 75, listed: 'hace 4 días', tokenLife: '29.1 años restantes' },
];

export const MY_HOLDINGS = [
  { assetId: 3, tokens: 150, invested: 15000, current: 17100, yieldEarned: 2130, since: 'Mar 2025' },
  { assetId: 1, tokens: 220, invested: 9900,  current: 12100, yieldEarned: 1228, since: 'Jun 2025' },
  { assetId: 5, tokens: 100, invested: 3800,  current: 4800,  yieldEarned: 707,  since: 'Ene 2026' },
  { assetId: 6, tokens: 24,  invested: 6000,  current: 6120,  yieldEarned: 534,  since: 'Feb 2026' },
  // QA fixtures — pairs with assets 56/57 above (invested-while-fundraising
  // states). Remove alongside the QA block in RWA_ASSETS for production.
  { assetId: 56, tokens: 20, invested: 2000, current: 2050, yieldEarned: 0,  since: 'Sep 2026' },
  { assetId: 57, tokens: 15, invested: 1800, current: 1850, yieldEarned: 40, since: 'Ago 2026' },
];

export const MY_BALANCES = [
  { sym: 'USDC', name: 'USD Coin',        qty: 12450.80, usd: 12450.80, dot: '#2775CA' },
  { sym: 'MATIC', name: 'Polygon',         qty: 8230,     usd: 4856.70,  dot: '#8247E5' },
  { sym: 'FACT', name: 'Factoract Token', qty: 45000,    usd: 3825.00,  dot: 'var(--accent)' },
  { sym: 'ETH',  name: 'Ethereum',         qty: 0.84,     usd: 2940.00,  dot: '#627EEA' },
];

export const FACT_TOKEN = {
  price: 0.085, raised: 3640000, goal: 5000000, holders: 4182,
  contract: '0xFaC70Ac7000000000000000000000000000000F1',
  rounds: [
    { name: 'Seed',          price: 0.04,  status: 'Completada', alloc: '8%',  tge: '5%',  cliff: '12 m', vesting: '24 m' },
    { name: 'Privada',       price: 0.06,  status: 'Completada', alloc: '12%', tge: '8%',  cliff: '6 m',  vesting: '18 m' },
    { name: 'Pública (ICO)', price: 0.085, status: 'Activa',     alloc: '20%', tge: '15%', cliff: '—',    vesting: '12 m' },
  ],
  tokenomics: [
    { label: 'Venta pública',             value: 20, color: 'var(--accent)' },
    { label: 'Ecosistema y recompensas',  value: 25, color: '#8247E5' },
    { label: 'Tesorería',                 value: 18, color: '#2775CA' },
    { label: 'Equipo y advisors',         value: 15, color: '#F5A623' },
    { label: 'Venta privada / seed',      value: 12, color: '#E05B4C' },
    { label: 'Liquidez',                  value: 10, color: '#5BC4BE' },
  ],
  utility: ['Descuento 50% en fees de plataforma', 'Acceso anticipado a nuevos proyectos', 'Gobernanza: votación de listados', 'Staking con APY 9–14%', 'Cashback en compras del mercado primario'],
};

export const ACADEMY_POSTS = [
  { id: 1, cat: 'Tokenización', title: '¿Qué es la tokenización de activos reales (RWA)?', excerpt: 'La guía definitiva para entender cómo los activos físicos se convierten en tokens digitales negociables.', img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop&auto=format&q=80', read: '8 min', date: '02 Jun 2026', featured: true },
  { id: 2, cat: 'Guías', title: 'Cómo invertir en tu primer proyecto paso a paso', excerpt: 'Desde conectar tu wallet hasta recibir tu primera distribución de rendimientos.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop&auto=format&q=80', read: '6 min', date: '28 May 2026' },
  { id: 3, cat: 'RWA', title: 'Campos agrícolas: el RWA con mayor demanda en LATAM', excerpt: 'Por qué la tierra productiva es el activo estrella de la tokenización en la región.', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=450&fit=crop&auto=format&q=80', read: '10 min', date: '21 May 2026' },
  { id: 4, cat: 'DeFi', title: 'Vesting y cliffs: entendé el calendario de tu token', excerpt: 'TGE, cliff, vesting lineal — todos los términos que necesitás dominar antes de un ICO.', img: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&h=450&fit=crop&auto=format&q=80', read: '7 min', date: '14 May 2026' },
  { id: 5, cat: 'Guías', title: 'Mercado secundario: cuándo comprar con descuento', excerpt: 'Cómo evaluar listados P2P, comparar precio real vs. precio pedido y detectar oportunidades.', img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop&auto=format&q=80', read: '9 min', date: '07 May 2026' },
  { id: 6, cat: 'Tokenización', title: 'Smart contracts en Polygon: así protegemos tu inversión', excerpt: 'Auditorías, custodia y la arquitectura on-chain detrás de cada proyecto de FACTORACT.', img: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=450&fit=crop&auto=format&q=80', read: '11 min', date: '30 Abr 2026' },
];

export const NOTIFICATIONS = [
  { id: 1, type: 'yield',  title: 'Distribución recibida',    desc: '+$465.00 USDC de Campo Agrícola Pergamino',       time: 'hace 12 min', unread: true  },
  { id: 2, type: 'market', title: 'Nuevo proyecto disponible', desc: 'Torre Logística Miami ya está en mercado primario', time: 'hace 2 h',    unread: true  },
  { id: 3, type: 'kyc',    title: 'KYC aprobado',              desc: 'Tu verificación Sumsub fue completada con éxito',  time: 'hace 1 día',  unread: true  },
  { id: 4, type: 'sale',   title: 'Orden ejecutada',           desc: 'Vendiste 50 tokens de Flota Tesla a $44.00',       time: 'hace 2 días', unread: false },
  { id: 5, type: 'vesting',title: 'Desbloqueo de vesting',     desc: '3,750 FACT liberados a tu wallet',                 time: 'hace 3 días', unread: false },
];

export const fmtUSD  = (n) => '$' + n.toLocaleString('es-AR', { maximumFractionDigits: n < 10 ? 3 : 0 });
export const fmtUSD2 = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
