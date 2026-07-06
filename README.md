# QuatroLetras

App web para mostrar letras de canciones a pantalla completa en tablet durante presentaciones en vivo.

## Uso

1. Abre `index.html` en el navegador del tablet (Chrome o Safari).
2. Crea canciones con el botón **+ Nueva canción**.
3. Pulsa **▶** en cualquier canción para mostrarla a pantalla completa.
4. Toca la pantalla para ver los controles (tamaño de letra, pantalla completa, cerrar).
5. Si tienes varias canciones, toca la letra para abrir el selector rápido.

## Controles en modo presentación

| Acción | Cómo |
|--------|------|
| Siguiente estrofa | Pedal avanzar (Page Down por defecto) |
| Estrofa anterior | Pedal retroceder (Page Up por defecto) |
| Siguiente canción | Pedal avanzar en la **última estrofa** |
| Elegir canción | Pedal retroceder en la **primera estrofa** → listado; usa los pedales para navegar |
| Cambiar canción (táctil) | Toca la letra para abrir el selector |
| Letra más grande/pequeña | Botones A+ / A− |
| Pantalla completa | Botón ⛶ o tecla `F` |
| Salir | Botón ✕ o `Esc` |

## Pedal turner (2 botones)

La app muestra **una estrofa a la vez** (separadas por líneas en blanco en la letra).

| Pedal | Comportamiento |
|-------|----------------|
| **Avanzar** | Siguiente estrofa → al final de la canción, pasa a la **siguiente canción** |
| **Retroceder** | Estrofa anterior → en la primera estrofa, abre el **listado** para elegir otra |

En el listado abierto:
- **Avanzar** = siguiente canción (la muestra al instante)
- **Retroceder** = canción anterior; en la primera, cierra el listado

Puedes reconfigurar las teclas del pedal en la pantalla principal (sección **Pedal turner**). La mayoría de pedales USB envían **Page Down** y **Page Up**; también funcionan las flechas del teclado.

## Instalar en tablet (opcional)

En Chrome/Safari: menú → **Añadir a pantalla de inicio**. La app funciona sin conexión una vez cargada.

## Datos

Las canciones se guardan en el navegador (localStorage). No se envían a ningún servidor.

## Setlist y orden

Cada canción tiene un **número correlativo** (1, 2, 3…) según su posición en el setlist. Ese orden define:

- Cómo se muestran en la lista y en el selector
- El avance con el **pedal** (siguiente canción = número siguiente)

Para reordenar: usa los botones **↑ ↓** o **arrastra** el ícono ⠿ en cada fila.
