## Objetivo
Hacer más grande y legible el logo de CuraTrack en el header del Landing, manteniendo el diseño responsive y sin romper el layout del nav.

## Cambios técnicos
**Archivo:** `src/pages/Landing.tsx`

1. **Nav container**: aumentar la altura para acompañar el logo más grande.
   - Antes: `h-24`
   - Después: `h-24 md:h-28`

2. **Logo `<img>`**: escalar el tamaño en cada breakpoint y asegurar render correcto.
   - Antes: `h-16 md:h-20 w-auto`
   - Después: `h-20 md:h-24 lg:h-28 w-auto object-contain`

## Snippet propuesto
```tsx
<div className="container mx-auto flex items-center justify-between h-24 md:h-28 px-6">
  <img src={logo} alt="CuraTrack" className="h-20 md:h-24 lg:h-28 w-auto object-contain" />
  {/* botones sin cambios */}
</div>
```

## Resultado esperado
- Logo claramente más visible en desktop (~112px de alto) y en mobile (80px).
- Nav levemente más alto en pantallas medianas/grandes para alojarlo cómodamente.
- Sin desbordes ni distorsión, sin afectar otras secciones del Landing.