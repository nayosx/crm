# AGENTS.md

## Proyecto
- Aplicacion CRM en Angular.
- El proyecto usa Angular + PrimeNG + `node_modules/drstyles` como base visual y de componentes.
- Revisar y respetar la documentacion disponible en `node_modules/drstyles` cuando se trabajen pantallas, estilos o patrones visuales.
- Priorizar cambios pequenos, claros y alineados con la estructura existente del proyecto.
- Antes de tocar logica compartida, revisar si impacta `sidebar`, `home`, navegacion o modulos de lavanderia.

## Preferencias de trabajo
- No invertir tiempo en tests unitarios salvo que el usuario lo pida explicitamente.
- En solicitudes de mantenimiento o ajuste, priorizar implementacion y validacion funcional sobre cobertura de tests.
- Evitar cambios innecesarios fuera del alcance pedido.

## Navegacion y UI
- Mantener consistencia entre menu lateral, accesos directos de `home` y rutas reales de la aplicacion.
- Si se agrega una nueva opcion navegable al sistema, validar si tambien debe reflejarse en `sidebar` y `home`.
- No duplicar configuraciones de navegacion si se puede usar una sola fuente de verdad.

## Modulo de lavanderia
- Tener especial cuidado con flujos de estados, vistas de colas y navegacion de regreso.
- Evitar romper la experiencia entre `pending`, `process`, `delivery`, `detail` y `socket-queues`.

## Notas permanentes
- Agregar aqui decisiones, restricciones o acuerdos del proyecto que deban leerse siempre antes de trabajar.
- Toda accion de UI que dispare procesos async visibles para el usuario, como llamadas API, sockets, cambios de estado o sincronizaciones, debe mostrar feedback de carga claro.
- Si la accion impacta estado critico del negocio o puede provocar dobles clics y estados inconsistentes, usar `LoaderDialogComponent` o un patron equivalente de bloqueo temporal mientras termina la operacion.
